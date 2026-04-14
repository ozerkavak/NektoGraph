import { BgpPattern, Triple, Variable } from './ast';

export class Optimizer {
    /**
     * Reorders triples in a BGP to ensure efficient Joining.
     * Simple Heuristic: 
     * 1. Start with the most specific triple (fewest variables).
     * 2. Next triple must share a variable with the already selected triples (Connectedness).
     */
    optimize(bgp: BgpPattern): Triple[] {
        const triples = [...bgp.triples];
        if (triples.length <= 1) return triples;

        const ordered: Triple[] = [];
        const pool = new Set(triples);
        const availableVars = new Set<string>();

        // 1. Pick the best starting triple
        // Criterion: Fewest variables (most specific)
        let bestStart: Triple | null = null;
        let minVars = 4; // Max is 3

        for (const t of pool) {
            const vCount = this.countVars(t);
            if (vCount < minVars) {
                minVars = vCount;
                bestStart = t;
            }
        }

        if (bestStart) {
            this.addToOrdered(bestStart, ordered, pool, availableVars);
        }

        // 2. Pick next triples that are connected
        while (pool.size > 0) {
            let bestNext: Triple | null = null;
            let bestScore = -1; // Higher is better

            for (const t of pool) {
                // Score 1: Is connected to current vars? (Critical for Join)
                const vars = this.getVars(t);
                const isConnected = vars.some(v => availableVars.has(v.value));

                // Score 2: How many NEW variables does it introduce? (Lower is better)
                const newVars = vars.filter(v => !availableVars.has(v.value)).length;

                if (isConnected) {
                    // Priority: Connected & introduces few new vars
                    const score = 10 - newVars;
                    if (score > bestScore) {
                        bestScore = score;
                        bestNext = t;
                    }
                }
            }

            // If no connected triple found (Cartesian Product), just pick any
            if (!bestNext) {
                const next = pool.values().next();
                bestNext = next.value ? next.value : null;
            }

            this.addToOrdered(bestNext!, ordered, pool, availableVars);
        }

        return ordered;
    }

    private addToOrdered(t: Triple, ordered: Triple[], pool: Set<Triple>, vars: Set<string>) {
        ordered.push(t);
        pool.delete(t);
        this.getVars(t).forEach(v => vars.add(v.value));
    }

    private countVars(t: Triple): number {
        const predIsVar = !('type' in t.predicate) && t.predicate.termType === 'Variable';
        return (t.subject.termType === 'Variable' ? 1 : 0) +
            (predIsVar ? 1 : 0) +
            (t.object.termType === 'Variable' ? 1 : 0);
    }

    private getVars(t: Triple): Variable[] {
        const vars: Variable[] = [];
        if (t.subject.termType === 'Variable') vars.push(t.subject);
        if (!('type' in t.predicate) && t.predicate.termType === 'Variable') {
            vars.push(t.predicate as Variable);
        }
        if (t.object.termType === 'Variable') vars.push(t.object);
        return vars;
    }
}
