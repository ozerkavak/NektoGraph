import { IQuadStore, NodeID, Quad, DataEvent, EventSource } from './types';
export declare class QuadStore implements IQuadStore {
    private capacity;
    private _size;
    private s;
    private p;
    private o;
    private g;
    private idxS;
    private idxP;
    private idxO;
    private idxG;
    private listeners;
    constructor(initialCapacity?: number);
    get size(): number;
    on(_event: 'data', listener: (event: DataEvent) => void): void;
    off(_event: 'data', listener: (event: DataEvent) => void): void;
    private emit;
    /**
     * Adds a quad to the store.
     * Uses Indices for existence check (Intersection of S, P, O, G location lists).
     */
    add(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID, source?: EventSource): boolean;
    addQuads(quads: Quad[], source?: EventSource): number;
    delete(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID, source?: EventSource): boolean;
    match(subject: NodeID | null, predicate: NodeID | null, object: NodeID | null, graph?: NodeID | null): Iterable<[NodeID, NodeID, NodeID, NodeID]>;
    has(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID): boolean;
    hasAny(subject: NodeID, predicate: NodeID, object: NodeID): boolean;
    clearGraph(graphID: NodeID, source?: EventSource): number;
    /**
     * Moves all quads from sourceGraphId to targetGraphId.
     * This is an O(N_source) operation that modifies the graph ID array directly and updates the graph index.
     * Important: This bypasses Event emission for individual quads to avoid memory overhead.
     */
    moveQuads(sourceGraphId: NodeID, targetGraphId: NodeID): number;
    private fastExists;
    /**
     * Returns the intersection of indices for the non-null terms.
     */
    private getIndicesForPattern;
    private ensureCapacity;
    /**
     * Removes element at 'idx' by swapping with the last element.
     * CRITICAL: Must update indices!
     */
    private swapRemove;
}
