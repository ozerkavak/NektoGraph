
import { describe, it, expect, beforeEach } from 'vitest';
import { QuadStore, IDFactory, DEFAULT_GRAPH } from '@triplestore/core';
import { InferenceEngine } from '../src/engine';
import { InferenceModule } from '../src/types';
import { Quad, DataEvent } from '@triplestore/core';

// Mock Module that infers (A implies B)
class MockModule implements InferenceModule {
    name = 'mock-module';
    targetGraphID: bigint;

    constructor(private store: QuadStore, private factory: IDFactory) {
        this.targetGraphID = factory.namedNode('http://inference/mock');
    }

    process(event: DataEvent): Quad[] {
        // Naive logic: If (s, p, o) added, infer (s, p, o) (Identity for testing conflict)
        // Or better: infer (s, implies, o)
        return [];
    }

    recompute(): Quad[] {
        // Return a fixed inference: (Sub, Pred, Obj)
        // We will test if this gets added or blocked.
        const s = this.factory.namedNode('http://s');
        const p = this.factory.namedNode('http://p');
        const o = this.factory.namedNode('http://o');

        return [{ subject: s, predicate: p, object: o, graph: this.targetGraphID }];
    }

    clear() { }
}

describe('Inference Conflict Resolution', () => {
    let store: QuadStore;
    let factory: IDFactory;
    let engine: InferenceEngine;
    let module: MockModule;

    const s = BigInt(1); // Mocks
    const p = BigInt(2);
    const o = BigInt(3);

    beforeEach(() => {
        store = new QuadStore();
        factory = new IDFactory();
        engine = new InferenceEngine(store);
        module = new MockModule(store, factory);
        engine.register(module);

        // Patch factory for test convenience if needed, but we use real one mostly
        // Overwriting constants for test clarity
    });

    it('Rule 1: Should NOT infer triple if it already exists in User Data', () => {
        const s = factory.namedNode('http://s');
        const p = factory.namedNode('http://p');
        const o = factory.namedNode('http://o');

        // 1. User adds data
        store.add(s, p, o, DEFAULT_GRAPH);
        expect(store.size).toBe(1);

        // 2. Enable Module (triggers recompute which tries to add same triple)
        engine.enable('mock-module');

        // 3. Inference Graph should be empty because it was blocked
        const inferenceGraph = module.targetGraphID;
        const inferred = [...store.match(null, null, null, inferenceGraph)];

        expect(inferred.length).toBe(0);
    });

    it('Rule 2: Should REMOVE inferred triple if User adds the same triple', () => {
        const s = factory.namedNode('http://s');
        const p = factory.namedNode('http://p');
        const o = factory.namedNode('http://o');

        // 1. Enable Module (Infer first)
        engine.enable('mock-module');

        // Verify it was added
        const inferenceGraph = module.targetGraphID;
        const inferred = [...store.match(null, null, null, inferenceGraph)];
        expect(inferred.length).toBe(1);
        expect(store.size).toBe(1);

        // 2. User ADDS the same triple
        store.add(s, p, o, DEFAULT_GRAPH);

        // 3. Expectation: 
        // User graph has it.
        // Inference graph MUST NOT have it anymore.
        const userMatches = [...store.match(s, p, o, DEFAULT_GRAPH)];
        const infMatches = [...store.match(s, p, o, inferenceGraph)];

        expect(userMatches.length).toBe(1);
        expect(infMatches.length).toBe(0); // Should be deleted!
    });
});
