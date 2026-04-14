import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { QuadStore, IDFactory, DEFAULT_GRAPH } from '@triplestore/core';
import { InferenceEngine } from '../src/engine';
import { TransitivePropertyModule } from '../src/modules/owl';

describe('Inference Deduplication & Cleanup', () => {
    const factory = new IDFactory();
    const rdfType = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');

    // Test Data
    const partOf = factory.namedNode('http://ex/partOf');
    const A = factory.namedNode('http://ex/A');
    const B = factory.namedNode('http://ex/B');
    const C = factory.namedNode('http://ex/C');
    const transProp = factory.namedNode('http://www.w3.org/2002/07/owl#TransitiveProperty');
    const infGraph = factory.namedNode('http://antigravity.org/graphs/inference/owl-transitive');

    const setup = () => {
        const store = new QuadStore();
        const engine = new InferenceEngine(store);
        engine.register(new TransitivePropertyModule(store, factory));
        engine.enable('owl-transitive');

        // Define schema
        store.add(partOf, rdfType, transProp, DEFAULT_GRAPH);

        return { store, engine };
    };

    it('should NOT add inferred triple if it already exists in Source Graph', () => {
        const { store } = setup();

        // 1. Pre-exist the triple in Default Graph
        store.add(A, partOf, C, DEFAULT_GRAPH);

        // 2. Add data that triggers inference (A->B, B->C => A->C)
        store.add(A, partOf, B, DEFAULT_GRAPH);
        store.add(B, partOf, C, DEFAULT_GRAPH);

        // 3. Verify: A->C should exist in Default Graph
        assert.ok(store.has(A, partOf, C, DEFAULT_GRAPH), 'A->C should exist in Default Graph');

        // 4. Verify: A->C should NOT exist in Inference Graph (Deduplication)
        assert.ok(!store.has(A, partOf, C, infGraph), 'A->C should NOT be added to Inference Graph because it exists elsewhere');
    });

    it('should REMOVE inferred triple if user subsequently adds it to Source Graph', () => {
        const { store } = setup();

        // 1. Add data that triggers inference
        store.add(A, partOf, B, DEFAULT_GRAPH);
        store.add(B, partOf, C, DEFAULT_GRAPH);

        // 2. Verify: A->C exists in Inference Graph
        assert.ok(store.has(A, partOf, C, infGraph), 'A->C should be inferred initially');

        // 3. User explicit add: A->C in Default Graph
        store.add(A, partOf, C, DEFAULT_GRAPH);

        // 4. Verify: A->C exists in Default Graph
        assert.ok(store.has(A, partOf, C, DEFAULT_GRAPH), 'A->C should be in Default Graph');

        // 5. Verify: A->C REMOVED from Inference Graph (Cleanup)
        assert.ok(!store.has(A, partOf, C, infGraph), 'Inferred A->C should be removed after explicit user addition');
    });
});
