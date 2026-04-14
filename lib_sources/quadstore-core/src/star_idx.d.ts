import { NodeID } from './types';
/**
 * Specialized Star Index that maps a constituent NodeID to Triple NodeIDs.
 */
export declare class StarInvertedIndex {
    private map;
    add(constituent: NodeID, tripleId: NodeID): void;
    get(constituent: NodeID): readonly bigint[] | undefined;
    remove(constituent: NodeID, tripleId: NodeID): void;
}
