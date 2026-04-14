
import { AggregateExpression, Term, Literal } from './ast';
import { IDataFactory, NodeID } from '@triplestore/core';
import { RawBinding } from './engine';

export class Aggregator {
    constructor(private factory: IDataFactory) { }

    public computeAggregate(agg: AggregateExpression, bindings: RawBinding[], varMap: Map<string, number>): NodeID {
        const op = agg.aggregation.toUpperCase();

        if (op === 'COUNT') {
            if (agg.expression) {
                if ('termType' in agg.expression && agg.expression.termType === 'Variable') {
                    const idx = varMap.get(agg.expression.value);
                    if (idx !== undefined) {
                        let count = 0;
                        for (const b of bindings) {
                            if (b[idx] !== 0n) count++;
                        }
                        return this.factory.literal(count.toString(), "http://www.w3.org/2001/XMLSchema#integer");
                    }
                }
            }
            return this.factory.literal(bindings.length.toString(), "http://www.w3.org/2001/XMLSchema#integer");
        }

        if (op === 'SAMPLE') {
            if ('termType' in agg.expression && agg.expression.termType === 'Variable') {
                const idx = varMap.get(agg.expression.value);
                if (idx !== undefined) {
                    for (const b of bindings) {
                        if (b[idx] !== 0n) {
                            return b[idx];
                        }
                    }
                }
            }
            return 0n;
        }

        const values: number[] = [];
        const stringValues: string[] = [];

        if ('termType' in agg.expression && agg.expression.termType === 'Variable') {
            const idx = varMap.get(agg.expression.value);
            if (idx !== undefined) {
                for (const b of bindings) {
                    const id = b[idx];
                    if (id === 0n) continue;
                    const term = this.factory.decode(id) as unknown as Term;
                    if (term.termType === 'Literal') {
                        if (op === 'GROUP_CONCAT') {
                            stringValues.push(term.value);
                        } else {
                            const n = parseFloat((term as Literal).value);
                            if (!isNaN(n)) values.push(n);
                        }
                    }
                }
            }
        }

        let resultNum = 0;
        if (op === 'SUM') {
            resultNum = values.reduce((a, b) => a + b, 0);
        } else if (op === 'AVG') {
            resultNum = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        } else if (op === 'MIN') {
            resultNum = values.length > 0 ? Math.min(...values) : 0;
        } else if (op === 'MAX') {
            resultNum = values.length > 0 ? Math.max(...values) : 0;
        } else if (op === 'GROUP_CONCAT') {
            const sep = agg.separator || " ";
            const val = stringValues.join(sep);
            return this.factory.literal(val, "http://www.w3.org/2001/XMLSchema#string");
        }

        return this.factory.literal(resultNum.toString(), "http://www.w3.org/2001/XMLSchema#decimal");
    }
}
