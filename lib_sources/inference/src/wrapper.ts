import { IQuadStore, NodeID, IDataFactory, DEFAULT_GRAPH, Quad } from '@triplestore/core';
import { InferenceEngine } from './engine';

export class ReasoningStoreWrapper implements IQuadStore {
    private internalStore: IQuadStore;
    private engine: InferenceEngine;
    private factory: IDataFactory;

    constructor(store: IQuadStore, engine: InferenceEngine, factory: IDataFactory) {
        this.internalStore = store;
        this.engine = engine;
        this.factory = factory;
    }

    get size(): number {
        return this.internalStore.size;
    }

    add(subject: NodeID, predicate: NodeID, object: NodeID, graph: NodeID = DEFAULT_GRAPH): boolean {
        // The InferenceEngine listens to the store's 'data' events directly now.
        // We just delegate to the internal store.
        return this.internalStore.add(subject, predicate, object, graph);
    }

    delete(subject: NodeID, predicate: NodeID, object: NodeID, graph: NodeID = DEFAULT_GRAPH): boolean {
        return this.internalStore.delete(subject, predicate, object, graph);
    }

    match(subject: NodeID | null, predicate: NodeID | null, object: NodeID | null, graph: NodeID | null = null): Iterable<[NodeID, NodeID, NodeID, NodeID]> {
        return this.internalStore.match(subject, predicate, object, graph);
    }

    addQuads(quads: Quad[], source?: any): number {
        return this.internalStore.addQuads(quads, source);
    }

    clearGraph(graph: NodeID, source?: any): number {
        return this.internalStore.clearGraph(graph, source);
    }

    moveQuads(sourceGraphId: NodeID, targetGraphId: NodeID): number {
        return this.internalStore.moveQuads(sourceGraphId, targetGraphId);
    }

    on(event: 'data', listener: (event: any) => void): this {
        this.internalStore.on(event, listener);
        return this;
    }

    off(event: 'data', listener: (event: any) => void): this {
        this.internalStore.off(event, listener);
        return this;
    }

    has(subject: NodeID, predicate: NodeID, object: NodeID, graph: NodeID = DEFAULT_GRAPH): boolean {
        return this.internalStore.has(subject, predicate, object, graph);
    }

    hasAny(subject: NodeID | null, predicate: NodeID | null, object: NodeID | null): boolean {
        // Force cast to any to avoid transient build errors if core types aren't refreshed
        return (this.internalStore as any).hasAny(subject, predicate, object);
    }
}
