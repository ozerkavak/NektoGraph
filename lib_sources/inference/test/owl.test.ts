import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { QuadStore, IDFactory, DEFAULT_GRAPH } from '@triplestore/core';
import { InferenceEngine } from '../src/engine';
import {
    TransitivePropertyModule,
    SymmetricPropertyModule,
    FunctionalPropertyModule,
    InverseFunctionalPropertyModule,
    ReflexivePropertyModule
} from '../src/modules/owl';

describe('OWL 2 RL Inference Modules', () => {
    const factory = new IDFactory();
    const rdfType = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    const owlSameAs = factory.namedNode('http://www.w3.org/2002/07/owl#sameAs');

    const setup = () => {
        const store = new QuadStore();
        const engine = new InferenceEngine(store);
        return { store, engine };
    };

    it('TransitivePropertyModule: should infer transitive closure', () => {
        const { store, engine } = setup();
        engine.register(new TransitivePropertyModule(store, factory));
        engine.enable('owl-transitive');

        const partOf = factory.namedNode('http://ex/partOf');
        const A = factory.namedNode('http://ex/A');
        const B = factory.namedNode('http://ex/B');
        const C = factory.namedNode('http://ex/C');

        // Define schema
        store.add(partOf, rdfType, factory.namedNode('http://www.w3.org/2002/07/owl#TransitiveProperty'), DEFAULT_GRAPH);

        // Add data: A -> B -> C
        store.add(A, partOf, B, DEFAULT_GRAPH);
        store.add(B, partOf, C, DEFAULT_GRAPH);

        // Expect: A -> C
        const graphID = factory.namedNode('http://antigravity.org/graphs/inference/owl-transitive');
        assert.ok(store.has(A, partOf, C, graphID), 'Should infer A partOf C');
    });

    it('SymmetricPropertyModule: should infer inverse relationship', () => {
        const { store, engine } = setup();
        engine.register(new SymmetricPropertyModule(store, factory));
        engine.enable('owl-symmetric');

        const friend = factory.namedNode('http://ex/friend');
        const bob = factory.namedNode('http://ex/Bob');
        const alice = factory.namedNode('http://ex/Alice');

        store.add(friend, rdfType, factory.namedNode('http://www.w3.org/2002/07/owl#SymmetricProperty'), DEFAULT_GRAPH);
        store.add(bob, friend, alice, DEFAULT_GRAPH);

        const graphID = factory.namedNode('http://antigravity.org/graphs/inference/owl-symmetric');
        assert.ok(store.has(alice, friend, bob, graphID), 'Should infer Alice friend Bob');
    });

    it('FunctionalPropertyModule: should infer equality (sameAs)', () => {
        const { store, engine } = setup();
        engine.register(new FunctionalPropertyModule(store, factory));
        engine.enable('owl-functional');

        const hasMom = factory.namedNode('http://ex/hasMom');
        const child = factory.namedNode('http://ex/Child');
        const mom1 = factory.namedNode('http://ex/Mom1');
        const mom2 = factory.namedNode('http://ex/Mom2');

        store.add(hasMom, rdfType, factory.namedNode('http://www.w3.org/2002/07/owl#FunctionalProperty'), DEFAULT_GRAPH);
        store.add(child, hasMom, mom1, DEFAULT_GRAPH);
        store.add(child, hasMom, mom2, DEFAULT_GRAPH);

        const graphID = factory.namedNode('http://antigravity.org/graphs/inference/owl-sameas');
        assert.ok(store.has(mom1, owlSameAs, mom2, graphID) || store.has(mom2, owlSameAs, mom1, graphID), 'Should infer Mom1 sameAs Mom2');
    });

    it('ReflexivePropertyModule: should infer self-loops', () => {
        const { store, engine } = setup();
        engine.register(new ReflexivePropertyModule(store, factory));
        engine.enable('owl-reflexive');

        const knows = factory.namedNode('http://ex/knows');
        const me = factory.namedNode('http://ex/Me');

        store.add(knows, rdfType, factory.namedNode('http://www.w3.org/2002/07/owl#ReflexiveProperty'), DEFAULT_GRAPH);
        store.add(me, knows, factory.namedNode('http://ex/Someone'), DEFAULT_GRAPH);

        const graphID = factory.namedNode('http://antigravity.org/graphs/inference/owl-reflexive');
        assert.ok(store.has(me, knows, me, graphID), 'Should infer Me knows Me');
    });
});
