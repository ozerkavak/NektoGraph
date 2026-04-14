import { IQuadStore, IDataFactory, NodeID } from '@triplestore/core';
import {
    SparqlQuery, Triple, Variable, Term, Pattern, BgpPattern, GraphPattern, UnionPattern,
    PropertyPath, isPropertyPath, NamedNode, VariableExpression, AggregateExpression,
    MinusPattern, FilterPattern, Expression, GroupPattern, BindPattern, Ordering,
    OptionalPattern, ValuesPattern, ServicePattern, TripleTerm, isTriple, SparqlUpdate
} from './ast';
import { Optimizer } from './optimizer';
import { ExpressionEvaluator } from './evaluator';
import { Aggregator } from './aggregator';

export type RawBinding = bigint[];

export class SPARQLEngine {
    private optimizer = new Optimizer();
    private evaluator: ExpressionEvaluator;
    private aggregator: Aggregator;
    private ignoredGraphs: Set<bigint> = new Set(); // Graphs to exclude from Default Graph queries

    constructor(private store: IQuadStore, private factory: IDataFactory) {
        this.evaluator = new ExpressionEvaluator(factory);
        this.aggregator = new Aggregator(factory);
    }

    public setIgnoredGraphs(graphIDs: NodeID[]) {
        this.ignoredGraphs = new Set(graphIDs);
    }

    async execute(query: SparqlQuery | SparqlUpdate, baseGraph?: NodeID): Promise<AsyncIterableIterator<RawBinding | Triple> | boolean | void> {
        if ((query as any).type === 'update') {
            return this.executeUpdate(query as SparqlUpdate, baseGraph);
        }
        const q = query as SparqlQuery;
        if (q.queryType === 'ASK') {
            const { stream } = await this.executeInternal(q);
            for await (const _ of stream) return true;
            return false;
        }
        if (q.queryType === 'CONSTRUCT') {
            return this.processConstruct(q);
        }
        if (q.queryType === 'DESCRIBE') {
            return this.processDescribe(q);
        }
        const result = await this.executeInternal(q);
        return result.stream as AsyncIterableIterator<RawBinding>;
    }

    public async executeUpdate(update: SparqlUpdate, baseGraph?: NodeID): Promise<void> {
        for (const op of update.updates) {
            const graph = op.graph ? this.factory.namedNode(op.graph) : (baseGraph || undefined);

            if (op.updateType === 'insert' || op.updateType === 'insertdelete') {
                for (const bgp of op.insert || []) {
                    for (const triple of bgp.triples) {
                        const s = this.termToId(triple.subject);
                        const p = this.termToId(triple.predicate as Term);
                        const o = this.termToId(triple.object);
                        this.store.add(s, p, o, graph);
                    }
                }
            }
            if (op.updateType === 'delete' || op.updateType === 'insertdelete') {
                for (const bgp of op.delete || []) {
                    for (const triple of bgp.triples) {
                        const s = this.termToId(triple.subject);
                        const p = this.termToId(triple.predicate as Term);
                        const o = this.termToId(triple.object);
                        this.store.delete(s, p, o, graph);
                    }
                }
            }
        }
    }

    private async executeInternal(query: SparqlQuery, inputMap?: Map<string, number>, inputStream?: AsyncIterable<RawBinding>): Promise<{ stream: AsyncIterable<RawBinding>, varMap: Map<string, number> }> {
        if (query.queryType !== 'SELECT' && query.queryType !== 'ASK' && query.queryType !== 'CONSTRUCT' && query.queryType !== 'DESCRIBE') {
            throw new Error(`Only SELECT, ASK, CONSTRUCT and DESCRIBE queries are supported.Got: ${query.queryType} `);
        }

        const varMap = inputMap ? new Map(inputMap) : new Map<string, number>();
        const varNames = this.getVariableNames(query);
        varNames.forEach((name) => {
            if (!varMap.has(name)) varMap.set(name, varMap.size);
        });

        // Use provided stream or initial wildcard stream
        let stream: AsyncIterable<RawBinding> = inputStream || this.initialStream(varMap.size);

        if (inputStream && varMap.size > inputMap!.size) {
            stream = this.resizeBindings(stream, varMap.size);
        }


        // 4. Pattern Execution (Standard SPARQL WHERE clause)
        if (query.where && Array.isArray(query.where)) {
            for (const pattern of query.where) {
                stream = this.processPattern(stream, pattern, varMap);
            }
        }
        else if ((query as any).input) {
            // Support for Algebra-style root operations (Project/Filter/etc)
            stream = this.processPattern(stream, (query as any).input as any as Pattern, varMap);
        }

        if (this.hasGroupingOrAggregation(query)) {
            stream = this.processGrouping(stream, query, varMap);
        }

        // Project / Extend: Evaluate SELECT expressions (non-aggregates)
        // e.g. SELECT ("TEST" AS ?label)
        stream = this.processExtension(stream, query, varMap);

        // Distinct / Reduced
        if (query.distinct || query.reduced) {
            stream = this.processDistinct(stream, query, varMap);
        }

        // Order By
        if (query.order && query.order.length > 0) {
            stream = await this.processOrdering(stream, query.order, varMap);
        }

        // Offset / Limit
        if (query.offset || query.limit) {
            stream = this.processSlicing(stream, query.offset, query.limit);
        }

        return { stream, varMap };
    }

    // Process CONSTRUCT
    private async *processConstruct(query: SparqlQuery): AsyncIterableIterator<Triple> {
        const { stream, varMap } = await this.executeInternal(query);
        const template = query.template || [];

        for await (const binding of stream) {
            // Per-solution map for blank nodes in template
            const bnodeMap = new Map<string, NodeID>();

            for (const t of template) {
                const s = this.constructTerm(t.subject, binding, varMap, bnodeMap);
                const p = this.constructTerm(t.predicate as Term, binding, varMap, bnodeMap);
                const o = this.constructTerm(t.object, binding, varMap, bnodeMap);

                if (s && p && o) {
                    // All must be bound to yield a triple
                    yield { subject: s, predicate: p, object: o };
                }
            }
        }
    }

    // Process DESCRIBE
    private async *processDescribe(query: SparqlQuery): AsyncIterableIterator<Triple> {
        const resources = new Set<NodeID>();

        if (query.where && query.where.length > 0) {
            const { stream, varMap } = await this.executeInternal(query);
            for await (const binding of stream) {
                if (this.isWildcard(query.variables)) {
                    for (const id of binding) {
                        if (id !== 0n) resources.add(id);
                    }
                } else {
                    // Describe specific variables
                    const vars = query.variables as any[];
                    for (const v of vars) {
                        if (typeof v === 'object' && v && 'termType' in v && v.termType === 'Variable') {
                            const idx = varMap.get(v.value);
                            if (idx !== undefined && binding[idx] !== 0n) {
                                resources.add(binding[idx]);
                            }
                        }
                    }
                }
            }
        }

        if (Array.isArray(query.variables) && !this.isWildcard(query.variables)) {
            const vars = query.variables as any[];
            for (const v of vars) {
                if (typeof v === 'object' && v && 'termType' in v && v.termType === 'NamedNode') {
                    resources.add(this.factory.namedNode(v.value));
                }
            }
        }

        const yieldedKeys = new Set<string>();
        for (const subjectId of resources) {
            const matches = this.store.match(subjectId, null, null, null);
            for (const [s, p, o] of matches) {
                const key = `${s}| ${p}| ${o} `;
                if (!yieldedKeys.has(key)) {
                    yieldedKeys.add(key);
                    yield {
                        subject: this.factory.decode(s) as unknown as Term,
                        predicate: this.factory.decode(p) as unknown as Term,
                        object: this.factory.decode(o) as unknown as Term
                    };
                }
            }
        }
    }

    private constructTerm(term: Term, binding: RawBinding, varMap: Map<string, number>, bnodeMap: Map<string, NodeID>): Term | null {
        if (term.termType === 'Variable') {
            const idx = varMap.get(term.value);
            if (idx === undefined) return null; // Variable not in WHERE clause
            const id = binding[idx];
            if (id === 0n) return null; // Unbound variable
            return this.factory.decode(id) as unknown as Term;
        }
        else if (term.termType === 'BlankNode') {
            // Template blank node logic
            const label = term.value;
            if (!bnodeMap.has(label)) {
                const newId = this.factory.blankNode(); // Auto-gen unique
                bnodeMap.set(label, newId);
            }
            const id = bnodeMap.get(label)!;
            return this.factory.decode(id) as unknown as Term;
        }
        else if (isTriple(term)) {
            const s = this.constructTerm(term.subject, binding, varMap, bnodeMap);
            const p = this.constructTerm(term.predicate as Term, binding, varMap, bnodeMap);
            const o = this.constructTerm(term.object, binding, varMap, bnodeMap);
            if (!s || !p || !o) return null;
            return {
                termType: 'Triple',
                subject: s,
                predicate: p,
                object: o
            } as any;
        }
        else {
            return term;
        }
    }

    // Process CONSTRUCT




    private async *resizeBindings(input: AsyncIterable<RawBinding>, newSize: number): AsyncIterable<RawBinding> {
        for await (const b of input) {
            const newB = new Array(newSize).fill(0n);
            for (let i = 0; i < b.length; i++) newB[i] = b[i];
            yield newB;
        }
    }

    // Evaluate non-aggregate expressions in SELECT clause
    private async *processExtension(input: AsyncIterable<RawBinding>, query: SparqlQuery, varMap: Map<string, number>): AsyncIterable<RawBinding> {
        const extensions: { idx: number, expr: Expression }[] = [];
        if (query.variables && !this.isWildcard(query.variables)) {
            const vars = query.variables as (Variable | VariableExpression)[];
            for (const v of vars) {
                if ('expression' in v) {
                    // Check if it's NOT an aggregate (aggregates handled in processGrouping)
                    if ((v.expression as any).type !== 'aggregate') {
                        const idx = varMap.get(v.variable.value);
                        if (idx !== undefined) {
                            extensions.push({ idx, expr: v.expression });
                        }
                    }
                }
            }
        }

        if (extensions.length === 0) {
            yield* input;
            return;
        }

        for await (const binding of input) {
            const newBinding = [...binding];
            for (const ext of extensions) {
                const val = this.evaluator.evaluateBinder(ext.expr, binding, varMap);
                if (val) {
                    newBinding[ext.idx] = this.termToId(val);
                }
            }
            yield newBinding;
        }
    }

    private async processOrdering(input: AsyncIterable<RawBinding>, orders: Ordering[], varMap: Map<string, number>): Promise<AsyncIterable<RawBinding>> {
        const all = [];
        for await (const b of input) all.push(b);

        all.sort((a, b) => {
            for (const order of orders) {
                const valA = this.evaluator.evaluateExpressionValueSync(order.expression, a, varMap);
                const valB = this.evaluator.evaluateExpressionValueSync(order.expression, b, varMap);

                if (valA === valB) continue;
                if (valA == null) return 1;
                if (valB == null) return -1;

                let cmp = 0;
                if (valA < valB) cmp = -1;
                else if (valA > valB) cmp = 1;

                if (order.descending) cmp *= -1;
                if (cmp !== 0) return cmp;
            }
            return 0;
        });

        return (async function* () { yield* all; })();
    }



    private async *processDistinct(input: AsyncIterable<RawBinding>, query: SparqlQuery, varMap: Map<string, number>): AsyncIterable<RawBinding> {
        const seen = new Set<string>();

        // Determine projected indices
        let projectedIndices: number[] | null = null;
        if (query.variables && !this.isWildcard(query.variables)) {
            projectedIndices = [];
            for (const v of query.variables as (Variable | VariableExpression)[]) {
                const name = 'variable' in v ? v.variable.value : v.value;
                const idx = varMap.get(name);
                if (idx !== undefined) projectedIndices.push(idx);
            }
        }

        for await (const binding of input) {
            // Build key from Projected variables only
            let key = "";
            if (projectedIndices) {
                // Use a separator that won't appear in BigInt/numbers easily? 
                // BigInt is stringified.
                // We use '|' separator.
                for (const idx of projectedIndices) {
                    const val = binding[idx];
                    // 0n is Unbound.
                    key += (val ? val.toString() : '0') + "|";
                }
            } else {
                // Wildcard: use full binding
                key = binding.map(b => b.toString()).join('|');
            }

            if (!seen.has(key)) {
                seen.add(key);
                yield binding;
            }
        }
    }

    private async *processSlicing(input: AsyncIterable<RawBinding>, offset: number = 0, limit?: number): AsyncIterable<RawBinding> {
        let count = 0;
        let yielded = 0;
        for await (const b of input) {
            if (count < offset) {
                count++;
                continue;
            }
            if (limit !== undefined && yielded >= limit) {
                break;
            }
            yield b;
            yielded++;
        }
    }

    public getVariableNames(query: SparqlQuery): string[] {
        const vars = new Set<string>();

        const traverseTerm = (t: Term) => {
            if (t.termType === 'Variable') vars.add(t.value);
            else if (t.termType === 'BlankNode') vars.add('_:' + t.value);
            else if (isTriple(t)) {
                traverseTerm(t.subject);
                traverseTerm(t.predicate);
                traverseTerm(t.object);
            }
        };

        const traverse = (patterns: Pattern[]) => {
            for (const p of patterns) {
                if (p.type === 'bgp') {
                    for (const t of p.triples) {
                        traverseTerm(t.subject);
                        if (!isPropertyPath(t.predicate)) {
                            traverseTerm(t.predicate);
                        }
                        traverseTerm(t.object);
                    }
                } else if (p.type === 'graph') {
                    if (p.name.termType === 'Variable') vars.add(p.name.value);
                    traverse(p.patterns);
                } else if (p.type === 'union' || p.type === 'minus' || p.type === 'optional' || p.type === 'group' || p.type === 'service') {
                    traverse(p.patterns);
                } else if (p.type === 'filter') {
                    traverseExpression(p.expression);
                } else if (p.type === 'bind') {
                    vars.add(p.variable.value);
                    traverseExpression(p.expression);
                } else if (p.type === 'values') {
                    for (const row of p.values) {
                        for (const v of Object.keys(row)) {
                            if (v.startsWith('?')) vars.add(v.substring(1));
                            else vars.add(v);
                        }
                    }
                } else if (p.type === 'query') {
                    if (this.isWildcard(p.variables)) {
                        traverse(p.where);
                    } else if (p.variables) {
                        const queryVars = p.variables as any[];
                        queryVars.forEach(v => {
                            if (typeof v === 'object' && v && 'value' in v) vars.add(v.value);
                        });
                    }
                }
            }
        }
        // Helper function to traverse expressions for variables
        function traverseExpression(expr: Expression | Term | Pattern) {
            if ('termType' in expr) {
                traverseTerm(expr as Term);
                return;
            }
            if ('type' in expr) {
                if (expr.type === 'operation') {
                    for (const arg of expr.args) {
                        traverseExpression(arg);
                    }
                } else if (expr.type !== 'aggregate') {
                    traverse([expr as Pattern]);
                }
            }
        }

        if (query.where && Array.isArray(query.where)) {
            traverse(query.where);
        }
        else if ((query as any).input) {
             traverse([(query as any).input]);
        }

        // 2. Variables from SELECT clause (aliased variables)
        if (query.variables && !this.isWildcard(query.variables)) {
            const selectVars = query.variables as any[]; // Relaxed cast to handle VariableExpression | NamedNode
            for (const v of selectVars) {
                if ('variable' in v) { // VariableExpression
                    vars.add(v.variable.value);
                } else if (v.termType === 'Variable') { // Variable
                    vars.add(v.value);
                }
                // Skip NamedNode
            }
        }

        return Array.from(vars);
    }

    private isWildcard(vars: any): boolean {
        if (!Array.isArray(vars) || vars.length !== 1) return false;
        const v = vars[0];
        return v === '*' || (typeof v === 'object' && v !== null && (v.termType === 'Wildcard' || v.value === '*'));
    }

    private hasGroupingOrAggregation(query: SparqlQuery): boolean {
        if (query.group && query.group.length > 0) return true;
        if (query.having && query.having.length > 0) return true;
        if (query.variables && !this.isWildcard(query.variables)) {
            const selectVars = query.variables as (Variable | VariableExpression)[];
            return selectVars.some(v => 'expression' in v && (v.expression as any).type === 'aggregate');
        }
        return false;
    }

    private async * processGrouping(input: AsyncIterable<RawBinding>, query: SparqlQuery, varMap: Map<string, number>): AsyncIterable<RawBinding> {
        const groups = new Map<string, RawBinding[]>();
        const implicitGroup = (!query.group || query.group.length === 0);

        const allBindings: RawBinding[] = [];
        for await (const b of input) allBindings.push(b);

        if (implicitGroup) {
            if (allBindings.length > 0 || this.hasAggregates(query)) {
                // Apply HAVING filter if exists
                if (query.having && query.having.length > 0) {
                    let match = true;
                    for (const h of query.having) {
                        if (!(await this.evaluateGroupExpression(h, allBindings, varMap))) {
                            match = false; break;
                        }
                    }
                    if (!match) return;
                }
                yield this.aggregateGroup(allBindings, query, varMap);
            }
            return;
        }

        for (const binding of allBindings) {
            let key = "";
            if (query.group) {
                for (const g of query.group) {
                    if ('termType' in g.expression && g.expression.termType === 'Variable') {
                        const idx = varMap.get(g.expression.value);
                        if (idx !== undefined) {
                            key += binding[idx].toString() + "|";
                        }
                    } else if (g.expression && (g.expression as any).value) {
                        key += (g.expression as any).value + "|";
                    }
                }
            }
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(binding);
        }

        for (const groupBindings of groups.values()) {
            if (query.having && query.having.length > 0) {
                let match = true;
                for (const h of query.having) {
                    if (!(await this.evaluateGroupExpression(h, groupBindings, varMap))) {
                        match = false; break;
                    }
                }
                if (!match) continue;
            }
            yield this.aggregateGroup(groupBindings, query, varMap);
        }
    }

    private aggregateGroup(bindings: RawBinding[], query: SparqlQuery, varMap: Map<string, number>): RawBinding {
        let result: RawBinding;

        if (bindings.length > 0) {
            result = [...bindings[0]];
        } else {
            result = new Array(varMap.size).fill(0n);
        }

        if (query.variables && !this.isWildcard(query.variables)) {
            const selectVars = query.variables as (Variable | VariableExpression)[];
            for (const v of selectVars) {
                if ('expression' in v && (v.expression as any).type === 'aggregate') {
                    const agg = v.expression as AggregateExpression;
                    const aliasIdx = varMap.get(v.variable.value)!;
                    const valueId = this.aggregator.computeAggregate(agg, bindings, varMap);
                    result[aliasIdx] = valueId;
                }
            }
        }
        return result;
    }



    private async evaluateGroupExpression(expr: Expression | Term, bindings: RawBinding[], varMap: Map<string, number>): Promise<any> {
        // 1. Handle Aggregates
        if ('type' in expr && expr.type === 'aggregate') {
            const valId = this.aggregator.computeAggregate(expr as AggregateExpression, bindings, varMap);
            if (valId === 0n) return null; // Unbound
            const term = this.factory.decode(valId) as unknown as Term;
            return this.evaluator.evaluateExpressionValueSync(term, bindings.length > 0 ? bindings[0] : [], varMap);
        }

        // 2. Handle Term (Variable/Literal)
        if ('termType' in expr) {
            const t = expr as Term;
            if (t.termType === 'Variable') {
                if (bindings.length > 0) {
                    return this.evaluator.evaluateExpressionValueSync(t, bindings[0], varMap);
                }
                return null;
            }
            return this.evaluator.evaluateExpressionValueSync(t, [], varMap);
        }

        // 3. Handle Operations (Recursion)
        if (expr.type === 'operation') {
            const op = expr.operator;
            const args = expr.args;

            const evalArg = async (idx: number) => await this.evaluateGroupExpression(args[idx] as Expression, bindings, varMap);

            if (op === '!' || op === 'not') return !(await evalArg(0));
            if (op === '&&' || op === 'and') return (await evalArg(0)) && (await evalArg(1));
            if (op === '||' || op === 'or') return (await evalArg(0)) || (await evalArg(1));

            const v1 = args.length > 0 ? await evalArg(0) : null;
            const v2 = args.length > 1 ? await evalArg(1) : null;

            if (['>', '<', '=', '!=', '>=', '<='].includes(op)) {
                if (v1 == null || v2 == null) return false;
                switch (op) {
                    case '>': return v1 > v2;
                    case '<': return v1 < v2;
                    case '=': return v1 == v2;
                    case '!=': return v1 != v2;
                    case '>=': return v1 >= v2;
                    case '<=': return v1 <= v2;
                }
            }
            return false;
        }
        return null;
    }

    private hasAggregates(query: SparqlQuery): boolean {
        if (!query.variables || this.isWildcard(query.variables)) return false;
        const selectVars = query.variables as (Variable | VariableExpression)[];
        return selectVars.some(v => 'expression' in v && (v.expression as any).type === 'aggregate');
    }

    private async * initialStream(size: number): AsyncIterable<RawBinding> {
        yield new Array(size).fill(0n);
    }

    // UPDATED: Added targetGraphVar to processPattern signature
    private processPattern(input: AsyncIterable<RawBinding>, pattern: Pattern, varMap: Map<string, number>, graphContext: NodeID | number | null = null, targetGraphVar?: number): AsyncIterable<RawBinding> {
        switch (pattern.type) {
            case 'bgp':
                return this.processBgp(input, pattern, varMap, graphContext, targetGraphVar); // Passed param
            case 'graph':
                return this.processGraph(input, pattern, varMap);
            case 'union':
                return this.processUnion(input, pattern, varMap, graphContext);
            case 'minus':
                return this.processMinus(input, pattern as MinusPattern, varMap, graphContext);
            case 'optional':
                return this.processOptional(input, pattern as OptionalPattern, varMap, graphContext);
            case 'values':
                return this.processValues(input, pattern as ValuesPattern, varMap);
            case 'service':
                return this.processService(input, pattern as ServicePattern, varMap);
            case 'filter':
                return this.processFilter(input, pattern as FilterPattern, varMap, graphContext);
            case 'group':
                return this.processGroup(input, pattern as GroupPattern, varMap, graphContext);
            case 'query':
                return this.processSubQuery(input, pattern as SparqlQuery, varMap);
            case 'bind':
                return this.processBind(input, pattern as BindPattern, varMap, graphContext);
            default:
                return input;
        }
    }

    // Process BIND
    private async * processBind(input: AsyncIterable<RawBinding>, pattern: BindPattern, varMap: Map<string, number>, _graphContext: NodeID | number | null): AsyncIterable<RawBinding> {
        const targetIdx = varMap.get(pattern.variable.value);
        if (targetIdx === undefined) {
            yield* input; return;
        }

        for await (const binding of input) {
            const resultTerm = this.evaluator.evaluateBinder(pattern.expression, binding, varMap);
            if (resultTerm) {
                const newBinding = [...binding];
                newBinding[targetIdx] = this.termToId(resultTerm);
                yield newBinding;
            } else {
                yield binding; // Leave unbound
            }
        }
    }

    // Process SubQuery: Join current input with results of subquery
    private async * processSubQuery(input: AsyncIterable<RawBinding>, subQuery: SparqlQuery, outerMap: Map<string, number>): AsyncIterable<RawBinding> {
        // Execute subquery independently
        const { stream: innerStream, varMap: innerMap } = await this.executeInternal(subQuery);

        // Materialize inner results (needed for join loop)
        const innerResults: RawBinding[] = [];
        for await (const b of innerStream) innerResults.push(b);

        // Identify shared variables (join keys)
        const joinVars: {
            innerIdx: number, outerIdx: number
        }[] = [];
        // Only projected variables from subquery are visible
        const visibleVars = subQuery.variables;

        // If SELECT *, all inner vars are candidates
        if (this.isWildcard(visibleVars)) {
            for (const [name, idx] of innerMap.entries()) {
                if (outerMap.has(name)) {
                    joinVars.push({ innerIdx: idx, outerIdx: outerMap.get(name)! });
                }
            }
        } else {
            const vars = visibleVars as (Variable | VariableExpression)[];
            for (const v of vars) {
                const name = 'variable' in v ? v.variable.value : v.value;
                if (innerMap.has(name) && outerMap.has(name)) {
                    joinVars.push({ innerIdx: innerMap.get(name)!, outerIdx: outerMap.get(name)! });
                }
            }
        }

        // Nested Loop Join
        for await (const outerBinding of input) {
            for (const innerBinding of innerResults) {
                // Check compatibility
                let compatible = true;
                for (const j of joinVars) {
                    const outerVal = outerBinding[j.outerIdx];
                    const innerVal = innerBinding[j.innerIdx];
                    if (outerVal !== 0n && innerVal !== 0n && outerVal !== innerVal) {
                        compatible = false;
                        break;
                    }
                }

                if (compatible) {
                    // Merge
                    const newBinding = [...outerBinding];
                    if (this.isWildcard(visibleVars)) {
                        for (const [name, idx] of innerMap.entries()) {
                            const outerIdx = outerMap.get(name);
                            if (outerIdx !== undefined && innerBinding[idx] !== 0n) {
                                newBinding[outerIdx] = innerBinding[idx];
                            }
                        }
                    } else {
                        const vars = visibleVars as (Variable | VariableExpression)[];
                        for (const v of vars) {
                            const name = 'variable' in v ? v.variable.value : v.value;
                            const idx = innerMap.get(name);
                            if (idx !== undefined && innerBinding[idx] !== 0n) {
                                const outerIdx = outerMap.get(name);
                                if (outerIdx !== undefined) {
                                    newBinding[outerIdx] = innerBinding[idx];
                                }
                            }
                        }
                    }
                    yield newBinding;
                }
            }
        }
    }

    private async * processMinus(input: AsyncIterable<RawBinding>, pattern: MinusPattern, varMap: Map<string, number>, graphContext: NodeID | number | null): AsyncIterable<RawBinding> {
        // Strict MINUS: Requires shared variables to filter.
        // 1. Calculate variables in the MINUS pattern
        const minusVars = new Set<string>();
        // Helper to collect vars from pattern (reuse traverse logic effectively)
        const collectVars = (p: Pattern) => {
            if (p.type === 'bgp') {
                for (const t of p.triples) {
                    if (t.subject.termType === 'Variable') minusVars.add(t.subject.value);

                    // Predicate can be a property path or term
                    if ('termType' in t.predicate) {
                        if (t.predicate.termType === 'Variable') minusVars.add(t.predicate.value);
                    }

                    if (t.object.termType === 'Variable') minusVars.add(t.object.value);
                }
            } else if (p.type === 'graph') {
                if (p.name.termType === 'Variable') minusVars.add(p.name.value);
                p.patterns.forEach(collectVars);
            } else if ('patterns' in p) {
                // Union, Optional, Group, Service, Minus
                // Note: Service patterns should be traversed too
                (p as any).patterns.forEach(collectVars);
            }
            // BIND variable
            if (p.type === 'bind') {
                minusVars.add(p.variable.value);
            }
            // VALUES variables
            if (p.type === 'values') {
                for (const row of p.values) {
                    for (const k of Object.keys(row)) {
                        const vName = k.startsWith('?') ? k.substring(1) : k;
                        minusVars.add(vName);
                    }
                }
            }
            // SUBQUERY variables
            if (p.type === 'query') {
                // For subquery, only projected vars are visible?
                // No, in MINUS, we evaluate the pattern. 
                // If it's a subquery, it returns bindings for its projected vars.
                // So yes, projected vars.
                if (this.isWildcard(p.variables)) {
                    // If *, we need to traverse internals? Or too complex?
                    // Standard says: effective boolean distinct.
                    // If we can't easily know, we should probably assume intersection to be safe?
                    // Or traverse WHERE.
                    p.where.forEach(collectVars);
                } else if (p.variables) {
                    (p.variables as any[]).forEach(v => {
                        if (v && typeof v !== 'string' && 'value' in v) minusVars.add(v.value);
                    });
                }
            }
        };
        pattern.patterns.forEach(collectVars);

        for await (const binding of input) {
            // 2. Check Intersection: Does binding bind any variable in minusVars?
            let shared = false;
            for (const vName of minusVars) {
                const idx = varMap.get(vName);
                if (idx !== undefined && binding[idx] !== 0n) {
                    shared = true;
                    break;
                }
            }

            // If no shared variables, MINUS does nothing -> Keep binding.
            if (!shared) {
                yield binding;
                continue;
            }

            // 3. If shared, check for compatibility match
            let hasMatch = false;
            let innerStream = this.initialStreamFromBinding(binding);
            for (const subP of pattern.patterns) {
                innerStream = this.processPattern(innerStream, subP, varMap, graphContext);
            }
            for await (const _ of innerStream) {
                hasMatch = true;
                break;
            }
            if (!hasMatch) {
                yield binding;
            }
        }
    }

    private async * processOptional(input: AsyncIterable<RawBinding>, pattern: OptionalPattern, varMap: Map<string, number>, graphContext: NodeID | number | null): AsyncIterable<RawBinding> {
        for await (const binding of input) {
            let hasMatch = false;
            let innerStream = this.initialStreamFromBinding(binding);
            for (const subP of pattern.patterns) {
                innerStream = this.processPattern(innerStream, subP, varMap, graphContext);
            }

            for await (const newBinding of innerStream) {
                hasMatch = true;
                yield newBinding;
            }

            if (!hasMatch) {
                yield binding;
            }
        }
    }

    private async * processValues(input: AsyncIterable<RawBinding>, pattern: ValuesPattern, varMap: Map<string, number>): AsyncIterable<RawBinding> {
        const rows = pattern.values;
        if (rows.length === 0) return;

        // Pre-calculate IDs for VALUES
        const valueRows: Map<number, bigint>[] = [];
        for (const row of rows) {
            const valueRow = new Map<number, bigint>();
            for (const [varName, term] of Object.entries(row)) {
                let vName = varName;
                if (vName.startsWith('?')) vName = vName.substring(1);

                // Ensure variable is in map. Logic assumes all vars are pre-mapped by getVariableNames.
                if (varMap.has(vName)) {
                    const idx = varMap.get(vName)!;
                    if (term) {
                        const id = this.termToId(term);
                        valueRow.set(idx, id);
                    }
                }
            }
            valueRows.push(valueRow);
        }

        for await (const binding of input) {
            for (const valueRow of valueRows) {
                let compatible = true;
                for (const [idx, val] of valueRow) {
                    const existing = binding[idx];
                    if (existing !== undefined && existing !== 0n) {
                        if (existing !== val) {
                            compatible = false;
                            break;
                        }
                    }
                }

                if (compatible) {
                    const newBinding = [...binding];
                    for (const [idx, val] of valueRow) {
                        if (idx >= newBinding.length) {
                            while (newBinding.length <= idx) newBinding.push(0n);
                        }
                        newBinding[idx] = val;
                    }
                    yield newBinding;
                }
            }
        }
    }

    private async * processService(input: AsyncIterable<RawBinding>, pattern: ServicePattern, _varMap: Map<string, number>): AsyncIterable<RawBinding> {
        // Basic Implementation: Warn and Skip if not silent, or Skip silent.
        // For full support, we need fetch and parsing.
        // For now, let's treat as empty result unless mocked?
        // Or implement simple join if variables match? 
        // Real implementation requires network.

        const serviceUri = pattern.name.value;
        console.warn(`SERVICE clause execution not fully implemented.Target: ${serviceUri} `);

        if (pattern.silent) {
            yield* input; // Or yield nothing? If service fails silently, it evals to nothing?
            // "If the execution of the SERVICE failed... and SILENT is present... the solution mapping... is a single solution with no bindings."
            // Which implies it doesn't fail the query.
            // But if it succeeds, it joins.
            // For now, let's yield nothing to simulate no results from service.
        } else {
            // Error?
            throw new Error(`SERVICE execution failed: ${serviceUri} (Not Implemented)`);
        }
    }

    private async * processFilter(input: AsyncIterable<RawBinding>, pattern: FilterPattern, varMap: Map<string, number>, graphContext: NodeID | number | null): AsyncIterable<RawBinding> {
        for await (const binding of input) {
            const pass = await this.evaluator.evaluateAsBoolean(
                pattern.expression,
                binding,
                varMap,
                async (pat, currentBinding) => {
                    // Existence Check Callback
                    let innerStream = this.initialStreamFromBinding(currentBinding);
                    innerStream = this.processPattern(innerStream, pat, varMap, graphContext);
                    for await (const _ of innerStream) return true;
                    return false;
                }
            );
            if (pass) {
                yield binding;
            }
        }
    }



    private processBgp(input: AsyncIterable<RawBinding>, bgp: BgpPattern, varMap: Map<string, number>, _graphContext: NodeID | number | null, targetGraphVar?: number): AsyncIterable<RawBinding> {
        let stream = input;
        // Support for both AST (triples) and Algebra (patterns)
        const tripleList = (bgp as any).triples || (bgp as any).patterns || [];
        const triples = this.optimizer.optimize({ ...bgp, triples: tripleList });

        for (const t of triples) {
            if (isPropertyPath(t.predicate)) {
                stream = this.joinWithPath(stream, t, varMap, _graphContext);
            } else {
                stream = this.join(stream, t as Triple & { predicate: Term }, varMap, _graphContext, targetGraphVar);
            }
        }
        return stream;
    }

    private async * processGraph(input: AsyncIterable<RawBinding>, pattern: GraphPattern, varMap: Map<string, number>): AsyncIterable<RawBinding> {
        const isVar = pattern.name.termType === 'Variable';
        const gIdx = isVar ? varMap.get(pattern.name.value)! : -1;
        const gStatic = !isVar ? this.termToId(pattern.name) : null;

        for await (const binding of input) {
            const boundG = (gIdx !== -1 && binding[gIdx] !== 0n) ? binding[gIdx] : null;
            const gReq = boundG !== null ? boundG : gStatic;

            // If variable is unbound, we need to instruct inner pattern to bind matches to gIdx:
            const targetGraphVar = (isVar && boundG === null) ? gIdx : undefined;

            let innerStream = this.initialStreamFromBinding(binding);
            for (const subPattern of pattern.patterns) {
                innerStream = this.processPattern(innerStream, subPattern, varMap, gReq, targetGraphVar);
            }
            yield* innerStream;
        }
    }

    private async * processGroup(input: AsyncIterable<RawBinding>, pattern: GroupPattern, varMap: Map<string, number>, graphContext: NodeID | number | null): AsyncIterable<RawBinding> {
        let stream = input;
        for (const subP of pattern.patterns) {
            stream = this.processPattern(stream, subP, varMap, graphContext);
        }
        yield* stream;
    }

    private async * processUnion(input: AsyncIterable<RawBinding>, pattern: UnionPattern, varMap: Map<string, number>, graphContext: NodeID | number | null): AsyncIterable<RawBinding> {
        for await (const binding of input) {
            for (const subPattern of pattern.patterns) { // Fixed iteration
                let innerStream = this.initialStreamFromBinding(binding);
                innerStream = this.processPattern(innerStream, subPattern, varMap, graphContext);
                yield* innerStream;
            }
        }
    }

    private async * initialStreamFromBinding(binding: RawBinding): AsyncIterable<RawBinding> {
        yield binding;
    }

    // UPDATED: join with targetGraphVar
    private async * join(input: AsyncIterable<RawBinding>, pattern: Triple & { predicate: Term }, varMap: Map<string, number>, graphContext: NodeID | number | null, targetGraphVar?: number): AsyncIterable<RawBinding> {
        const sTerm = pattern.subject;
        const pTerm = pattern.predicate;
        const oTerm = pattern.object;

        const getIdx = (t: Term) => {
            if (t.termType === 'Variable') return varMap.get(t.value)!;
            if (t.termType === 'BlankNode') return varMap.get('_:' + t.value)!;
            return -1;
        };

        const sIdx = getIdx(sTerm);
        const pIdx = getIdx(pTerm);
        const oIdx = getIdx(oTerm);

        // For TripleTerms, we can only pre-calculate a static ID if they DON'T contain variables.
        const hasVars = (t: Term): boolean => {
            if (t.termType === 'Variable') return true;
            if (isTriple(t)) return hasVars(t.subject) || hasVars(t.predicate as Term) || hasVars(t.object);
            return false;
        };

        const getStaticId = (t: Term): NodeID | null => {
            if (t.termType === 'Variable' || t.termType === 'BlankNode') return null;
            if (isTriple(t) && hasVars(t)) return null; 
            return this.termToId(t);
        };

        const sIdStatic = getStaticId(sTerm);
        const pIdStatic = getStaticId(pTerm);
        const oIdStatic = getStaticId(oTerm);

        for await (const binding of input) {
            const sReq = (sIdx !== -1 && binding[sIdx] !== 0n) ? binding[sIdx] : sIdStatic;
            const pReq = (pIdx !== -1 && binding[pIdx] !== 0n) ? binding[pIdx] : pIdStatic;
            const oReq = (oIdx !== -1 && binding[oIdx] !== 0n) ? binding[oIdx] : oIdStatic;

            // Simple match first. If any of sReq/pReq/oReq is null (meaning it's a pattern WITH variables),
            // we pass null to store.match to iterate over all possible candidates. 
            // In a more optimized version, we'd use constant parts of the nested pattern to narrow the search.
            for (const [mS, mP, mO, mG] of this.store.match(sReq, pReq, oReq, graphContext as any)) {
                // Filter Ignored Graphs
                if (graphContext === null && this.ignoredGraphs.has(mG)) continue;

                const newBinding = [...binding];
                let compatible = true;

                // Recursive Match for Subject
                if (isTriple(sTerm) && hasVars(sTerm)) {
                    if (!this.matchesTriplePattern(mS, sTerm, newBinding, varMap)) compatible = false;
                } else if (sIdx !== -1) {
                    newBinding[sIdx] = mS;
                }

                // Recursive Match for Predicate (SPARQL 1.2 technically allows this too)
                if (compatible && isTriple(pTerm) && hasVars(pTerm)) {
                    if (!this.matchesTriplePattern(mP, pTerm, newBinding, varMap)) compatible = false;
                } else if (compatible && pIdx !== -1) {
                    newBinding[pIdx] = mP;
                }

                // Recursive Match for Object
                if (compatible && isTriple(oTerm) && hasVars(oTerm)) {
                    if (!this.matchesTriplePattern(mO, oTerm, newBinding, varMap)) compatible = false;
                } else if (compatible && oIdx !== -1) {
                    newBinding[oIdx] = mO;
                }

                if (compatible) {
                    if (targetGraphVar !== undefined && targetGraphVar !== -1) {
                        newBinding[targetGraphVar] = mG;
                    }
                    yield newBinding;
                }
            }
        }
    }

    /** 
     * Recursively checks if a NodeID matches a TripleTerm pattern and updates the binding.
     */
    private matchesTriplePattern(id: NodeID, pattern: TripleTerm, binding: bigint[], varMap: Map<string, number>): boolean {
        const token = this.factory.decode(id) as any;
        if (token?.termType !== 'Triple') return false;

        const matchPart = (partId: NodeID, partPattern: Term): boolean => {
            if (partPattern.termType === 'Variable') {
                const idx = varMap.get(partPattern.value)!;
                if (binding[idx] !== 0n && binding[idx] !== partId) return false;
                binding[idx] = partId;
                return true;
            }
            if (isTriple(partPattern)) {
                return this.matchesTriplePattern(partId, partPattern, binding, varMap);
            }
            // Static term check
            return this.termToId(partPattern) === partId;
        };

        return matchPart(token.subject, pattern.subject) &&
               matchPart(token.predicate, pattern.predicate as Term) &&
               matchPart(token.object, pattern.object);
    }

    private async * joinWithPath(input: AsyncIterable<RawBinding>, pattern: Triple, varMap: Map<string, number>, graphContext: NodeID | number | null): AsyncIterable<RawBinding> {
        const sTerm = pattern.subject;
        const oTerm = pattern.object;
        const path = pattern.predicate as PropertyPath;

        const sIdx = sTerm.termType === 'Variable' ? varMap.get(sTerm.value)! : -1;
        const oIdx = oTerm.termType === 'Variable' ? varMap.get(oTerm.value)! : -1;
        const sIdStatic = sTerm.termType !== 'Variable' ? this.termToId(sTerm) : null;
        const oIdStatic = oTerm.termType !== 'Variable' ? this.termToId(oTerm) : null;

        // Path evaluation doesn't easily support graph binding per hop efficiently in this recursive model 
        // unless we track it. For now, we assume property paths don't bind graph variables dynamically (standard limitation or simplified).
        // But if we are inside GRAPH ?g, we must filter. 
        // evaluatePath uses graphContext correctly.
        // It does NOT return graph IDs.

        for await (const binding of input) {
            const startNode = (sIdx !== -1 && binding[sIdx] !== 0n) ? binding[sIdx] : sIdStatic;
            const endNodeConstraint = (oIdx !== -1 && binding[oIdx] !== 0n) ? binding[oIdx] : oIdStatic;

            if (startNode === null) {
                // Subject is unbound variable - need to iterate all subjects
                const allSubjects = new Set<bigint>();
                for (const [s, _p, _o, _g] of this.store.match(null, null, null, graphContext as any)) {
                    allSubjects.add(s);
                }
                for (const subj of allSubjects) {
                    const reachable = this.evaluatePath(subj, path, graphContext);
                    for (const reached of reachable) {
                        if (endNodeConstraint === null || reached === endNodeConstraint) {
                            const newBinding = [...binding];
                            if (sIdx !== -1) newBinding[sIdx] = subj;
                            if (oIdx !== -1) newBinding[oIdx] = reached;
                            yield newBinding;
                        }
                    }
                }
            } else {
                // Subject is bound
                const reachable = this.evaluatePath(startNode, path, graphContext);
                for (const reached of reachable) {
                    if (endNodeConstraint === null || reached === endNodeConstraint) {
                        const newBinding = [...binding];
                        if (sIdx !== -1) newBinding[sIdx] = startNode;
                        if (oIdx !== -1) newBinding[oIdx] = reached;
                        yield newBinding;
                    }
                }
            }
        }
    }

    private evaluatePath(start: NodeID, path: PropertyPath, graphContext: NodeID | number | null): Set<bigint> {
        if ((path as any).termType === 'NamedNode') {
            const propId = this.factory.namedNode((path as unknown as NamedNode).value);
            const results = new Set<bigint>();
            for (const [_s, _p, o, _g] of this.store.match(start, propId, null, graphContext as any)) {
                results.add(o);
            }
            return results;
        }

        const pathObj = path as any;
        const pathType = pathObj.pathType;

        if (pathType === 'OneOrMorePath' || pathType === '+') {
            return this.transitiveClosurePlus(start, pathObj.items[0], graphContext);
        }

        if (pathType === 'ZeroOrMorePath' || pathType === '*') {
            const result = this.transitiveClosurePlus(start, pathObj.items[0], graphContext);
            result.add(start);
            return result;
        }

        if (pathType === 'ZeroOrOnePath' || pathType === '?') {
            const oneStep = this.evaluatePath(start, pathObj.items[0], graphContext);
            oneStep.add(start);
            return oneStep;
        }

        if (pathType === 'SequencePath' || pathType === '/') {
            let current = new Set<bigint>([start]);
            for (const subPath of pathObj.items) {
                const next = new Set<bigint>();
                for (const node of current) {
                    const reached = this.evaluatePath(node, subPath, graphContext);
                    for (const r of reached) next.add(r);
                }
                current = next;
            }
            return current;
        }

        if (pathType === 'AlternativePath' || pathType === '|') {
            const result = new Set<bigint>();
            for (const subPath of pathObj.items) {
                const reached = this.evaluatePath(start, subPath, graphContext);
                for (const r of reached) result.add(r);
            }
            return result;
        }

        if (pathType === 'InversePath' || pathType === '^') {
            const innerPath = pathObj.items[0];
            const results = new Set<bigint>();
            if ((innerPath as any).termType === 'NamedNode') {
                const propId = this.factory.namedNode((innerPath as NamedNode).value);
                for (const [s, _p, _o, _g] of this.store.match(null, propId, start, graphContext as any)) {
                    results.add(s);
                }
            }
            return results;
        }

        throw new Error(`Unsupported property path type: ${pathType} `);
    }

    private transitiveClosurePlus(start: NodeID, innerPath: PropertyPath, graphContext: NodeID | number | null): Set<bigint> {
        const visited = new Set<bigint>();
        const queue: bigint[] = [start];
        const result = new Set<bigint>();

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current)) continue;
            visited.add(current);

            const reachable = this.evaluatePath(current, innerPath, graphContext);
            for (const node of reachable) {
                result.add(node);
                if (!visited.has(node)) {
                    queue.push(node);
                }
            }
        }

        return result;
    }

    private termToId(t: Term): NodeID {
        if (t === undefined || t === null) return 0n;
        
        // If it's already a BigInt (NodeID), just return it.
        // This solves cases where bindings already hold the ID.
        if (typeof t === 'bigint') return t;

        const term = t as any;
        if (term.termType === 'NamedNode') return this.factory.namedNode(term.value);
        if (term.termType === 'Literal') return this.factory.literal(term.value, term.datatype?.value, term.language);
        if (term.termType === 'BlankNode') return this.factory.blankNode(term.value);
        
        // Robust Triple/Quad Check (Object shape or termType)
        if (isTriple(t) || (term.subject && term.predicate && term.object)) {
            const tr = t as TripleTerm;
            if (typeof (this.factory as any).triple !== 'function') {
                console.error("CRITICAL: factory.triple is missing!");
                throw new Error("IDFactory implementation mismatch: .triple() method is missing.");
            }
            const id = (this.factory as any).triple(
                this.termToId(tr.subject),
                this.termToId(tr.predicate as Term),
                this.termToId(tr.object)
            );
            return id;
        }
        
        // Final fallback: Use value if it exists, otherwise error
        if (term.value !== undefined) return this.factory.namedNode(term.value);
        
        throw new Error("Unknown term type for static bind: " + (term.termType || (typeof t)));
    }
}
