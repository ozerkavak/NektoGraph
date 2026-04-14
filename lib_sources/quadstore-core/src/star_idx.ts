import { NodeID } from './types';

/**
 * Specialized Star Index that maps a constituent NodeID to Triple NodeIDs.
 */
export class StarInvertedIndex {
    private map = new Map<bigint, bigint[]>();

    add(constituent: NodeID, tripleId: NodeID) {
        let list = this.map.get(constituent);
        if (!list) {
            list = [];
            this.map.set(constituent, list);
        }
        list.push(tripleId);
    }

    get(constituent: NodeID): readonly bigint[] | undefined {
        return this.map.get(constituent);
    }

    remove(constituent: NodeID, tripleId: NodeID) {
        const list = this.map.get(constituent);
        if (!list) return;
        const idx = list.indexOf(tripleId);
        if (idx !== -1) {
            list.splice(idx, 1);
        }
        if (list.length === 0) {
            this.map.delete(constituent);
        }
    }
}
