
import { Term, Expression, ExpressionArg, Literal, isTriple } from './ast';
// RDF-Star note: TripleTerm is handled in evaluateExpressionValueSync.
import { IDataFactory } from '@triplestore/core';
import { evaluateFunction } from './functions';
import { RawBinding } from './engine';

export class ExpressionEvaluator {
    constructor(private factory: IDataFactory) { }

    // RDF-Star note: TripleTerm is handled in evaluateExpressionValueSync.

    /**
     * Synchronous evaluation of an expression to a value (number, string, boolean).
     * Used for ORDER BY and simple comparisons.
     */
    public evaluateExpressionValueSync(expr: Expression | Term, binding: RawBinding, varMap: Map<string, number>): any {
        const term = this.evaluateBinder(expr, binding, varMap);
        if (!term) return null;
        if (term.termType === 'Literal') {
            const dt = term.datatype?.value;
            if (dt === 'http://www.w3.org/2001/XMLSchema#integer' ||
                dt === 'http://www.w3.org/2001/XMLSchema#double' ||
                dt === 'http://www.w3.org/2001/XMLSchema#decimal') {
                const n = parseFloat(term.value);
                return isNaN(n) ? term.value : n;
            }
            if (dt === 'http://www.w3.org/2001/XMLSchema#boolean') {
                return term.value === 'true' || term.value === '1';
            }
            return term.value;
        }
        if (isTriple(term)) {
            // RDF-Star triples don't have a simple .value, they are complex terms.
            // For expression value purposes, we could return a synthetic string or null.
            // Standard SPARQL 1.2 might define specific behaviors.
            return `<<triple>>`; 
        }
        return term.value;
    }

    /**
     * Evaluates an expression or term to a bound Term object.
     * Handles variable binding lookup and function calls.
     */
    public evaluateBinder(expr: Expression | Term, binding: RawBinding, varMap: Map<string, number>): Term | null {
        if ('termType' in expr) {
            return this.resolveTerm(expr, binding, varMap);
        }

        // Operation Expression
        if (expr.type === 'operation') {
            const op = expr.operator;
            const args = expr.args;

            // Resolve arguments to Terms
            const resolvedArgs: Term[] = [];
            for (const arg of args) {
                // Recursive evaluation for arguments
                const res = this.evaluateBinder(arg as Expression, binding, varMap);
                if (res) resolvedArgs.push(res);
                else return null;
            }

            const result = evaluateFunction(op, resolvedArgs, this.factory);
            if (result && typeof result === 'object' && 'termType' in result) return result;
            return null;
        }
        return null;
    }

    /**
     * Asynchronous evaluation of boolean expressions (Filters).
     * Supports EXISTS/NOT EXISTS which require calling back into the engine.
     */
    public async evaluateAsBoolean(
        expr: Expression | Term,
        binding: RawBinding,
        varMap: Map<string, number>,
        // Callback for existence checks
        existenceCheck?: (pattern: any, currentBinding: RawBinding) => Promise<boolean>
    ): Promise<boolean> {

        // Base Case: Term (Literal/Boolean)
        if ('termType' in expr) {
            const val = this.getTermValue(expr, binding, varMap);
            if (val && typeof val === 'object' && (val as any).termType === 'Literal' && (val as any).datatype?.value === 'http://www.w3.org/2001/XMLSchema#boolean') {
                return (val as any).value === 'true' || (val as any).value === '1';
            }
            return !!val;
        }

        if (expr.type === 'operation') {
            const op = expr.operator;
            const args = expr.args;

            // Handle Logical Operators
            if (op === '!' || op === 'not') {
                return !(await this.evaluateAsBoolean(args[0] as Expression, binding, varMap, existenceCheck));
            }
            if (op === '&&' || op === 'and') {
                return (await this.evaluateAsBoolean(args[0] as Expression, binding, varMap, existenceCheck)) &&
                    (await this.evaluateAsBoolean(args[1] as Expression, binding, varMap, existenceCheck));
            }
            if (op === '||' || op === 'or') {
                return (await this.evaluateAsBoolean(args[0] as Expression, binding, varMap, existenceCheck)) ||
                    (await this.evaluateAsBoolean(args[1] as Expression, binding, varMap, existenceCheck));
            }

            // Handle Existence (Requires callback)
            if (op === 'exists' || op === 'not exists' || op === 'notexists') {
                if (!existenceCheck) throw new Error("Existence check required for EXISTS filter but no engine callback provided.");
                const pattern = args[0];
                const exists = await existenceCheck(pattern, binding);
                return op === 'exists' ? exists : !exists;
            }

            // Handle Comparisons
            const evalArgValue = async (arg: ExpressionArg | any): Promise<any> => {  // Use any or Union if Pattern is imported. Pattern is not imported in this file header?
                // Check imports.

                if ('termType' in arg) return this.getTermValue(arg as Term, binding, varMap);

                // If it's a Pattern, it has no value for comparison
                if ('type' in arg) {
                    const t = arg.type;
                    if (t === 'bgp' || t === 'query' || t === 'graph' || t === 'union' ||
                        t === 'optional' || t === 'minus' || t === 'values' ||
                        t === 'service' || t === 'filter' || t === 'bind' || t === 'group') {
                        return null;
                    }
                }

                if ('type' in arg && arg.type === 'operation') {
                    // Check if it's a boolean operation or a value-returning operation
                    // Using evaluateBinder for value operations (math, string)
                    // But if it's boolean (recursive AND/OR), we need evaluateAsBoolean
                    // Simplification: Try evaluateBinder first.
                    // Note: We cast to Expression | Term because we filtered out Patterns above
                    const term = this.evaluateBinder(arg as Expression, binding, varMap);
                    if (term) return this.getTermValue(term, binding, varMap); // It was a function returning a term
                    // Fallback to boolean eval?
                    return await this.evaluateAsBoolean(arg as Expression, binding, varMap, existenceCheck);
                }
                return null;
            };

            if (op === '=' || op === '!=') {
                const v1 = await evalArgValue(args[0]);
                const v2 = await evalArgValue(args[1]);
                const areEqual = this.areValuesEqual(v1, v2);
                return op === '=' ? areEqual : !areEqual;
            }

            if (['>', '<', '>=', '<='].includes(op)) {
                const v1 = await evalArgValue(args[0]);
                const v2 = await evalArgValue(args[1]);
                if (v1 == null || v2 == null) return false;
                switch (op) {
                    case '>': return v1 > v2;
                    case '<': return v1 < v2;
                    case '>=': return v1 >= v2;
                    case '<=': return v1 <= v2;
                }
            }

            // Function Fallback (e.g. REGEX returning boolean)
            // expr is Expression | Term, so strict check is enough.
            const term = this.evaluateBinder(expr as Expression | Term, binding, varMap);
            if (term && term.termType === 'Literal') {
                if (term.datatype?.value === 'http://www.w3.org/2001/XMLSchema#boolean') {
                    return term.value === 'true' || term.value === '1';
                }
                return !!term.value;
            }
            return false;
        }

        return false;
    }

    private areValuesEqual(v1: any, v2: any): boolean {
        if (v1 === v2) return true;
        if (v1 == null || v2 == null) return false;

        // RDF-star Triple Equality
        if (isTriple(v1) && isTriple(v2)) {
            return this.areValuesEqual(v1.subject, v2.subject) &&
                   this.areValuesEqual(v1.predicate, v2.predicate) &&
                   this.areValuesEqual(v1.object, v2.object);
        }

        // Standard Term Equality
        if (typeof v1 === 'object' && typeof v2 === 'object') {
            if (v1.termType && v1.termType === v2.termType) {
                return v1.value === v2.value &&
                       v1.datatype?.value === v2.datatype?.value &&
                       v1.language === v2.language;
            }
        }

        return false;
    }

    /**
     * Resolves a Term (Variable or Constant) to its bound value in the current binding.
     * Returns null if variable is unbound.
     */
    private resolveTerm(term: Term, binding: RawBinding, varMap: Map<string, number>): Term | null {
        if (term.termType === 'Variable') {
            const idx = varMap.get(term.value);
            if (idx === undefined) return null;
            const id = binding[idx];
            if (id === 0n) return null;
            return this.factory.decode(id) as unknown as Term;
        }
        if (isTriple(term)) {
            const s = this.resolveTerm(term.subject, binding, varMap);
            const p = this.resolveTerm(term.predicate as Term, binding, varMap);
            const o = this.resolveTerm(term.object, binding, varMap);
            if (!s || !p || !o) return null;
            return {
                termType: 'Triple',
                type: 'triple', // Added for isTriple compatibility
                subject: s,
                predicate: p,
                object: o
            } as any;
        }
        return term;
    }

    /**
     * Gets the primitive value (number, string, boolean) from a Term.
     * Used for comparisons.
     */
    private getTermValue(term: Term, binding: RawBinding, varMap: Map<string, number>): any {
        const t = this.resolveTerm(term, binding, varMap);
        if (!t) return null;

        if (t.termType === 'Literal') {
            const lit = t as Literal;
            const dt = lit.datatype?.value;
            if (dt === 'http://www.w3.org/2001/XMLSchema#integer' ||
                dt === 'http://www.w3.org/2001/XMLSchema#decimal' ||
                dt === 'http://www.w3.org/2001/XMLSchema#double') {
                const n = parseFloat(lit.value);
                return isNaN(n) ? lit.value : n;
            }
            if (dt === 'http://www.w3.org/2001/XMLSchema#boolean') {
                return lit.value === 'true' || lit.value === '1';
            }
            return lit.value;
        }
        if (t.termType === 'NamedNode') return t.value;
        if (isTriple(t)) return t; // Return the TripleTerm object for comparison
        return null;
    }
}
