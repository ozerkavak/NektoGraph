import { IQuadStore, NodeID, Quad, DataEvent, EventSource } from '@triplestore/core';
import { IOverlayStore } from './types';
import { DraftStore } from '@triplestore/session';
export declare class OverlayStore implements IOverlayStore {
    private mainStore;
    private session;
    private listeners;
    constructor(mainStore: IQuadStore);
    get size(): number;
    attachSession(session: DraftStore): void;
    detachSession(): void;
    add(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID, source?: EventSource): boolean;
    addQuads(quads: Quad[], source?: EventSource): number;
    delete(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID, source?: EventSource): boolean;
    clearGraph(_graph: NodeID, _source?: EventSource): number;
    moveQuads(_sourceGraphId: NodeID, _targetGraphId: NodeID): number;
    match(subject: NodeID | null, predicate: NodeID | null, object: NodeID | null, graph?: NodeID | null): Iterable<[NodeID, NodeID, NodeID, NodeID]>;
    has(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID): boolean;
    hasAny(subject: NodeID, predicate: NodeID, object: NodeID): boolean;
    on(_event: 'data', listener: (event: DataEvent) => void): void;
    off(_event: 'data', listener: (event: DataEvent) => void): void;
    private emit;
}
