
import { NodeID } from './types';

/**
 * Manages an inverted index for a single column (S, P, O, or G).
 * Maps a NodeID (Value) to a list of pointers (Indices in the SoA).
 */
export class Index {

    private map = new Map<bigint, number[]>();

    /**
     * Records that 'value' appears at 'quadIndex'.
     */
    add(value: NodeID, quadIndex: number) {
        let list = this.map.get(value);
        if (!list) {
            list = [];
            this.map.set(value, list);
        }
        list.push(quadIndex);
    }

    /**
     * Removes the record that 'value' is at 'quadIndex'.
     */
    remove(value: NodeID, quadIndex: number) {
        const list = this.map.get(value);
        if (!list) return;



        const idx = list.indexOf(quadIndex);
        if (idx !== -1) {
            const last = list.pop()!;
            if (idx < list.length) {
                list[idx] = last;
            }
        }

        if (list.length === 0) {
            this.map.delete(value);
        }
    }

    /**
     * Updates a pointer because the Quad moved in the Store (due to Swap-Remove).
     * @param value The value of the column (S, P, O, or G) for the moved quad.
     * @param oldQuadIndex Where it used to be.
     * @param newQuadIndex Where it is now.
     */
    updatePointer(value: NodeID, oldQuadIndex: number, newQuadIndex: number) {
        const list = this.map.get(value);
        if (!list) return;

        const idx = list.indexOf(oldQuadIndex);
        if (idx !== -1) {
            list[idx] = newQuadIndex;
        }
    }

    /**
     * Returns all quad/row indices having this value.
     */
    get(value: NodeID): readonly number[] | undefined {
        return this.map.get(value);
    }

    /**
     * Intersection of two lists of indices. 
     * Used for compound queries (e.g. Match S=? AND P=?)

     */
    static intersect(listA: readonly number[], listB: readonly number[]): number[] {

        const result: number[] = [];


        const useSet = listB.length > 20;
        if (useSet) {
            const setB = new Set(listB);
            for (const val of listA) {
                if (setB.has(val)) result.push(val);
            }
        } else {
            for (const val of listA) {
                if (listB.includes(val)) result.push(val);
            }
        }
        return result;
    }

    clear() {
        this.map.clear();
    }
}
