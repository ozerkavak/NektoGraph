import { IQuadStore, NodeID, IDataFactory, Quad } from '../../quadstore-core/src/index.ts';
import { InferenceEngine } from './engine';

export declare class ReasoningStoreWrapper implements IQuadStore {
    private internalStore;
    private engine;
    private factory;
    constructor(store: IQuadStore, engine: InferenceEngine, factory: IDataFactory);
    get size(): number;
    add(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID): boolean;
    delete(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID): boolean;
    match(subject: NodeID | null, predicate: NodeID | null, object: NodeID | null, graph?: NodeID | null): Iterable<[NodeID, NodeID, NodeID, NodeID]>;
    addQuads(quads: Quad[], source?: any): number;
    clearGraph(graph: NodeID, source?: any): number;
    moveQuads(sourceGraphId: NodeID, targetGraphId: NodeID): number;
    on(event: 'data', listener: (event: any) => void): this;
    off(event: 'data', listener: (event: any) => void): this;
    has(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID): boolean;
    hasAny(subject: NodeID | null, predicate: NodeID | null, object: NodeID | null): boolean;
}
