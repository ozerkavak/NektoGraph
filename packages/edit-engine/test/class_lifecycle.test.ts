
import { describe, it, expect, beforeEach } from 'vitest';
import { QuadStore, IDFactory, DEFAULT_GRAPH, NodeID } from '@triplestore/core';
import { SessionManager, DefaultCommitStrategy, SchemaIndex, EntityResolver } from '../src';

describe('Class Lifecycle & Missing Class Detection', () => {
    let store: QuadStore;
    let factory: IDFactory;
    let sessionManager: SessionManager;
    let schemaIndex: SchemaIndex;
    let resolver: EntityResolver;

    beforeEach(async () => {
        store = new QuadStore();
        factory = new IDFactory();
        const strategy = new DefaultCommitStrategy(store, factory);
        sessionManager = new SessionManager(strategy);
        schemaIndex = new SchemaIndex(store, factory);
        resolver = new EntityResolver(store, factory, schemaIndex);

        // 1. Setup minimal Ontology
        // Class: Person
        // Property: name (domain: Person)
        const ontGraph = factory.namedNode('http://antigravity.org/graphs/ontology');
        const rdfType = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
        const owlClass = factory.namedNode('http://www.w3.org/2002/07/owl#Class');
        const rdfsDomain = factory.namedNode('http://www.w3.org/2000/01/rdf-schema#domain');
        const rdfProp = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#Property');

        const Person = factory.namedNode('http://example.org/Person');
        const hasName = factory.namedNode('http://example.org/hasName');

        store.add(Person, rdfType, owlClass, ontGraph);
        store.add(hasName, rdfType, rdfProp, ontGraph);
        store.add(hasName, rdfsDomain, Person, ontGraph);

        await schemaIndex.buildIndex();
    });

    it('should flag properties as "Missing Class" when type is removed', async () => {
        const session = sessionManager.createSession();
        const Alice = factory.namedNode('http://example.org/Alice');
        const Person = factory.namedNode('http://example.org/Person');
        const hasName = factory.namedNode('http://example.org/hasName');
        const typePred = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');

        // 1. Add Data (Alice is a Person, hasName "Alice")
        session.add(Alice, typePred, Person, DEFAULT_GRAPH);
        session.add(Alice, hasName, factory.literal('Alice'), DEFAULT_GRAPH);

        // Verify Initial State
        let rich = resolver.resolveStructured(Alice, 'en', session);
        let group = rich.classGroups.find(g => factory.decode(g.classID).value === 'http://example.org/Person');

        expect(group).toBeDefined();
        expect(rich.types.map(t => factory.decode(t).value)).toContain('http://example.org/Person');
        expect(group?.isMissing).toBe(false); // Explicitly present

        // 2. Remove Class (Simulate window.removeEntityClass)
        // We delete the rdf:type triple
        session.delete(Alice, typePred, Person, DEFAULT_GRAPH);

        // 3. Verify New State
        rich = resolver.resolveStructured(Alice, 'en', session);
        group = rich.classGroups.find(g => factory.decode(g.classID).value === 'http://example.org/Person');

        // Type should be gone
        expect(rich.types.map(t => factory.decode(t).value)).not.toContain('http://example.org/Person');

        // Group should still exist (Implicit Grouping by Domain)
        expect(group).toBeDefined();
        // Flag should be TRUE (Missing)
        expect(group?.isMissing).toBe(true);
        // Properties should still be there
        expect(group?.dataProperties.length).toBe(1);
        expect(factory.decode(group!.dataProperties[0].property).value).toBe('http://example.org/hasName');
    });

    it('should restore "Missing Class" flag when type is added back', async () => {
        const session = sessionManager.createSession();
        const Alice = factory.namedNode('http://example.org/Alice');
        const Person = factory.namedNode('http://example.org/Person');
        const hasName = factory.namedNode('http://example.org/hasName');
        const typePred = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');

        // 1. Add Property but NO Type
        session.add(Alice, hasName, factory.literal('Alice'), DEFAULT_GRAPH);

        // Verify Missing State
        let rich = resolver.resolveStructured(Alice, 'en', session);
        let group = rich.classGroups.find(g => factory.decode(g.classID).value === 'http://example.org/Person');
        expect(group?.isMissing).toBe(true);

        // 2. Add Type (Simulate window.addEntityClass aka Quick Fix)
        session.add(Alice, typePred, Person, DEFAULT_GRAPH);

        // 3. Verify Restored State
        rich = resolver.resolveStructured(Alice, 'en', session);
        group = rich.classGroups.find(g => factory.decode(g.classID).value === 'http://example.org/Person');
        expect(group?.isMissing).toBe(false);
    });
});
