import { BgpPattern, Triple } from './ast';

export declare class Optimizer {
    /**
     * Reorders triples in a BGP to ensure efficient Joining.
     * Simple Heuristic:
     * 1. Start with the most specific triple (fewest variables).
     * 2. Next triple must share a variable with the already selected triples (Connectedness).
     */
    optimize(bgp: BgpPattern): Triple[];
    private addToOrdered;
    private countVars;
    private getVars;
}
