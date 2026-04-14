
import { IQuadStore, IDataFactory, NodeID, DEFAULT_GRAPH } from '@triplestore/core';
import { SparqlUpdate, UpdateOperation, InsertDeleteOperation, Term, Triple, isTriple } from './ast';
import { SPARQLEngine, RawBinding } from './engine';

export class UpdateEngine {
    constructor(
        private store: IQuadStore,
        private factory: IDataFactory,
        private engine: SPARQLEngine
    ) { }

    public async execute(update: SparqlUpdate): Promise<void> {
        for (const op of update.updates) {
            await this.executeOperation(op);
        }
    }

    private async executeOperation(op: UpdateOperation): Promise<void> {
        // Handle INSERT DATA / DELETE DATA / DELETE/INSERT WHERE

        if (op.updateType === 'insert' || op.updateType === 'delete' || op.updateType === 'insertdelete') {
            await this.handleInsertDelete(op);
        } else {
            throw new Error(`Unsupported update operation: ${(op as any).updateType}`);
        }
    }

    private async handleInsertDelete(op: InsertDeleteOperation): Promise<void> {
        // 1. DELETE/INSERT WHERE (Pattern Based)
        if (op.where && op.where.length > 0) {
            // Construct SELECT * query to find bindings
            const selectQuery: any = {
                type: 'query',
                queryType: 'SELECT',
                variables: ['*'],
                where: op.where,
                prefixes: {} // Should pass from update prefixes if available? For now empty.
            };

            const varNames = this.engine.getVariableNames(selectQuery);
            const results = await this.engine.execute(selectQuery);

            if (!results || typeof results === 'boolean' || typeof (results as any)[Symbol.asyncIterator] !== 'function') return;

            const bindings: NodeID[][] = [];
            for await (const b of results as AsyncIterable<RawBinding>) {
                if (Array.isArray(b)) bindings.push(b as any as NodeID[]);
            }

            // Iterate and Apply
            for (const binding of bindings) {
                // Map binding to variable map for easy lookup
                const bindingMap = new Map<string, NodeID>();
                varNames.forEach((name, idx) => {
                    if (binding[idx] !== undefined) bindingMap.set(name, binding[idx]);
                });

                // Apply DELETE
                if (op.delete) {
                    for (const bgp of op.delete) {
                        const triples = this.instantiate(bgp.triples, bindingMap);
                        this.deleteTriples(triples);
                    }
                }

                // Apply INSERT
                if (op.insert) {
                    for (const bgp of op.insert) {
                        const triples = this.instantiate(bgp.triples, bindingMap);
                        this.insertTriples(triples);
                    }
                }
            }
        }
        // 2. DELETE DATA (Ground Triples) - Only if NO WHERE clause (otherwise handled above)
        else if (op.delete) {
            for (const bgp of op.delete) {
                this.deleteTriples(bgp.triples);
            }
        }

        // 3. INSERT DATA (Ground Triples) - Only if NO WHERE clause
        else if (op.insert) {
            for (const bgp of op.insert) {
                this.insertTriples(bgp.triples);
            }
        }
    }

    private instantiate(template: Triple[], bindings: Map<string, NodeID>): Triple[] {
        const result: Triple[] = [];
        for (const t of template) {
            const s = this.resolveTerm(t.subject, bindings);
            const p = this.resolveTerm(t.predicate as Term, bindings);
            const o = this.resolveTerm(t.object, bindings);

            if (s && p && o) {
                result.push({
                    subject: this.idToTerm(s),
                    predicate: this.idToTerm(p),
                    object: this.idToTerm(o)
                });
            }
        }
        return result;
    }

    private resolveTerm(term: Term, bindings: Map<string, NodeID>): NodeID | null {
        if (term.termType === 'Variable') {
            const val = bindings.get(term.value);
            // If unbound, strict SPARQL says substitute? Or invalid?
            // DELETE/INSERT templates usually skip if unbound?
            // Actually, if unbound in WHERE, it shouldn't be here?
            // If implicit BNode?
            return val || null;
        }
        return this.termToNode(term);
    }

    private idToTerm(id: NodeID): Term {
        return this.factory.decode(id) as unknown as Term;
    }

    private insertTriples(triples: Triple[]) {
        for (const t of triples) {
            const s = this.termToNode(t.subject);
            const p = this.termToNode(t.predicate);
            const o = this.termToNode(t.object);
            this.store.add(s, p, o, DEFAULT_GRAPH);
        }
    }

    private deleteTriples(triples: Triple[]) {
        for (const t of triples) {
            const s = this.termToNode(t.subject);
            const p = this.termToNode(t.predicate);
            const o = this.termToNode(t.object);
            this.store.delete(s, p, o, DEFAULT_GRAPH);
        }
    }

    private termToNode(term: any): NodeID {
        if (term.termType === 'NamedNode') return this.factory.namedNode(term.value);
        if (term.termType === 'BlankNode') return this.factory.blankNode(term.value);
        if (term.termType === 'Literal') return this.factory.literal(term.value, term.datatype?.value, term.language);
        if (isTriple(term)) {
            return (this.factory as any).triple(
                this.termToNode(term.subject),
                this.termToNode(term.predicate),
                this.termToNode(term.object)
            );
        }
        return DEFAULT_GRAPH;
    }
}
