
import { describe, it, expect, beforeEach } from 'vitest';
import { QuadStore, IDFactory, DEFAULT_GRAPH } from '@triplestore/core';
import { InferenceEngine } from '../src/engine';
import { DomainModule } from '../src/modules/rdfs/domain';

describe('Truth Maintenance (TMS)', () => {
    let store: QuadStore;
    let factory: IDFactory;
    let engine: InferenceEngine;
    let domainMod: DomainModule;

    // URIs
    let s: bigint, p1: bigint, p2: bigint, o: bigint;
    let type: bigint, Person: bigint;
    let rdfsDomain: bigint;

    beforeEach(() => {
        store = new QuadStore();
        factory = new IDFactory();
        engine = new InferenceEngine(store);
        domainMod = new DomainModule(store, factory);
        engine.register(domainMod);
        engine.enable('rdfs-domain');

        // Setup URIs
        s = factory.namedNode('http://ex/Alice');
        p1 = factory.namedNode('http://ex/birthDate'); // implies Person
        p2 = factory.namedNode('http://ex/knows');     // implies Person
        o = factory.literal('1973');
        type = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
        Person = factory.namedNode('http://ex/Person');
        rdfsDomain = factory.namedNode('http://www.w3.org/2000/01/rdf-schema#domain');

        // Setup Schema: birthDate domain Person
        store.add(p1, rdfsDomain, Person, DEFAULT_GRAPH);
        store.add(p2, rdfsDomain, Person, DEFAULT_GRAPH);
    });

    it('Scenario 1: Simple Deletion', () => {
        // 1. Add Data (Alice birthDate 1973)
        store.add(s, p1, o, DEFAULT_GRAPH);

        // 2. Expect Inference (Alice type Person)
        const infGraph = domainMod.targetGraphID;
        let matches = [...store.match(s, type, Person, infGraph)];
        expect(matches.length).toBe(1);

        // 3. Delete Data
        store.delete(s, p1, o, DEFAULT_GRAPH);

        // 4. Expect Inference GONE
        matches = [...store.match(s, type, Person, infGraph)];
        expect(matches.length).toBe(0);
    });

    it('Scenario 2: Redundant Support Preservation', () => {
        // 1. Add Two Supports (Alice birthDate 1973 AND Alice knows Bob)
        const bob = factory.namedNode('http://ex/Bob');
        store.add(s, p1, o, DEFAULT_GRAPH);
        store.add(s, p2, bob, DEFAULT_GRAPH);

        // 2. Expect Inference
        const infGraph = domainMod.targetGraphID;
        let matches = [...store.match(s, type, Person, infGraph)];
        expect(matches.length).toBe(1); // Should exist (deduplicated by engine)

        // 3. Delete ONE Support (birthDate)
        store.delete(s, p1, o, DEFAULT_GRAPH);

        // 4. Expect Inference TO REMAIN (because 'knows' still implies it)
        matches = [...store.match(s, type, Person, infGraph)];
        expect(matches.length).toBe(1);

        // 5. Delete SECOND Support ('knows')
        store.delete(s, p2, bob, DEFAULT_GRAPH);

        // 6. Expect Inference GONE
        matches = [...store.match(s, type, Person, infGraph)];
        expect(matches.length).toBe(0);
    });
});
