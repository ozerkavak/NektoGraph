import { IQuadStore, Quad, NodeID, QuadStore, EventSource, DataEvent } from '@triplestore/core';
export declare class DraftStore implements IQuadStore {
    additions: QuadStore;
    deletions: Set<string>;
    inferredAdditions: Set<string>;
    id: string;
    private listeners;
    constructor(id: string);
    get size(): number;
    private emit;
    private hash;
    add(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID, source?: EventSource): boolean;
    delete(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID, source?: EventSource): boolean;
    undelete(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID): boolean;
    match(subject: NodeID | null, predicate: NodeID | null, object: NodeID | null, graph?: NodeID | null): Iterable<[NodeID, NodeID, NodeID, NodeID]>;
    has(s: NodeID, p: NodeID, o: NodeID, g?: NodeID): boolean;
    hasAny(s: NodeID, p: NodeID, o: NodeID): boolean;
    addQuads(quads: Quad[], source?: EventSource): number;
    clearGraph(graph: NodeID, source?: EventSource): number;
    moveQuads(sourceGraphId: NodeID, targetGraphId: NodeID): number;
    on(_event: 'data', listener: (event: DataEvent) => void): void;
    off(_event: 'data', listener: (event: DataEvent) => void): void;
}
export declare class CompositeStore implements IQuadStore {
    private main;
    private draft;
    constructor(main: IQuadStore, draft: DraftStore | undefined | null);
    match(subject: NodeID | null, predicate: NodeID | null, object: NodeID | null, graph?: NodeID | null): Iterable<[NodeID, NodeID, NodeID, NodeID]>;
    add(): boolean;
    delete(): boolean;
    addQuads(): number;
    clearGraph(): number;
    moveQuads(): number;
    has(s: NodeID, p: NodeID, o: NodeID, g?: NodeID): boolean;
    hasAny(s: NodeID, p: NodeID, o: NodeID): boolean;
    get size(): number;
    on(_event: 'data', _listener: (event: DataEvent) => void): void;
    off(_event: 'data', _listener: (event: DataEvent) => void): void;
}
