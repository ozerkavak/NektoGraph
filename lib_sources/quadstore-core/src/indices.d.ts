import { NodeID } from './types';
/**
 * Manages an inverted index for a single column (S, P, O, or G).
 * Maps a NodeID (Value) to a list of pointers (Indices in the SoA).
 */
export declare class Index {
    private map;
    /**
     * Records that 'value' appears at 'quadIndex'.
     */
    add(value: NodeID, quadIndex: number): void;
    /**
     * Removes the record that 'value' is at 'quadIndex'.
     */
    remove(value: NodeID, quadIndex: number): void;
    /**
     * Updates a pointer because the Quad moved in the Store (due to Swap-Remove).
     * @param value The value of the column (S, P, O, or G) for the moved quad.
     * @param oldQuadIndex Where it used to be.
     * @param newQuadIndex Where it is now.
     */
    updatePointer(value: NodeID, oldQuadIndex: number, newQuadIndex: number): void;
    /**
     * Returns all quad/row indices having this value.
     */
    get(value: NodeID): readonly number[] | undefined;
    /**
     * Intersection of two lists of indices.
     * Used for compound queries (e.g. Match S=? AND P=?)

     */
    static intersect(listA: readonly number[], listB: readonly number[]): number[];
    clear(): void;
}
