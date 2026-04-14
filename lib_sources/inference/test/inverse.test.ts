import { describe, it, expect, beforeEach } from 'vitest';
import { QuadStore, IDFactory, DataEvent } from '@triplestore/core';
import { InverseOfModule } from '../src/modules/owl/inverse';

describe('InverseOfModule (Sentinel)', () => {
    let store: QuadStore;
    let factory: IDFactory;
    let module: InverseOfModule;

    const ns = 'http://example.org/';
    const p1 = ns + 'hasChild';
    const p2 = ns + 'hasParent';
    const s1 = ns + 'Parent';
    const s2 = ns + 'Child';
    const owlInverse = 'http://www.w3.org/2002/07/owl#inverseOf';

    beforeEach(() => {
        store = new QuadStore();
        factory = new IDFactory();
        module = new InverseOfModule(store, factory);
    });

    it('should infer inverse triple when schema is present', () => {
        // 1. Define Schema: hasChild inverseOf hasParent
        store.add(
            factory.namedNode(p1),
            factory.namedNode(owlInverse),
            factory.namedNode(p2)
        );

        // Force Recompute (simulate init)
        module.recompute();

        // 2. Add Data: Parent hasChild Child
        const event: DataEvent = {
            type: 'add',
            source: 'user',
            quads: [{
                subject: factory.namedNode(s1),
                predicate: factory.namedNode(p1),
                object: factory.namedNode(s2),
                graph: factory.namedNode('http://example.org/graphs/default')
            }]
        };

        const result = module.process(event);

        expect(result.add.length).toBe(1);
        const inferred = result.add[0];
        expect(factory.decode(inferred.subject).value).toBe(s2);
        expect(factory.decode(inferred.predicate).value).toBe(p2);
        expect(factory.decode(inferred.object).value).toBe(s1);
        expect(factory.decode(inferred.graph).value).toContain('inference');
    });

    it('should NOT infer if inverse explicitly exists (Deduplication)', () => {
        // 1. Define Schema
        store.add(factory.namedNode(p1), factory.namedNode(owlInverse), factory.namedNode(p2));
        module.recompute();

        // 2. Add Explicit Inverse: Child hasParent Parent
        store.add(factory.namedNode(s2), factory.namedNode(p2), factory.namedNode(s1));

        // 3. Add Data: Parent hasChild Child
        const event: DataEvent = {
            type: 'add',
            source: 'user',
            quads: [{
                subject: factory.namedNode(s1),
                predicate: factory.namedNode(p1),
                object: factory.namedNode(s2),
                graph: factory.namedNode('http://example.org/graphs/default')
            }]
        };

        const result = module.process(event);
        expect(result.add.length).toBe(0); // Should be deduped
    });

    it('should handle schema addition reactively', () => {
        // 1. Add Data First
        store.add(factory.namedNode(s1), factory.namedNode(p1), factory.namedNode(s2));

        // 2. Add Schema Late: hasChild inverseOf hasParent
        const event: DataEvent = {
            type: 'add',
            source: 'user',
            quads: [{
                subject: factory.namedNode(p1),
                predicate: factory.namedNode(owlInverse),
                object: factory.namedNode(p2),
                graph: factory.namedNode('http://example.org/graphs/default')
            }]
        };

        const result = module.process(event);

        // Should trigger recompute for this pair and find the existing data
        expect(result.add.length).toBeGreaterThan(0);
        const inferred = result.add.find(q => factory.decode(q.predicate).value === p2);
        expect(inferred).toBeDefined();
        expect(factory.decode(inferred!.subject).value).toBe(s2);
        expect(factory.decode(inferred!.object).value).toBe(s1);
    });

    it('should infer cleanup on delete', () => {
        // Setup
        store.add(factory.namedNode(p1), factory.namedNode(owlInverse), factory.namedNode(p2));
        module.recompute();

        // Delete: Parent hasChild Child
        const event: DataEvent = {
            type: 'delete',
            source: 'user',
            quads: [{
                subject: factory.namedNode(s1),
                predicate: factory.namedNode(p1),
                object: factory.namedNode(s2),
                graph: factory.namedNode('http://example.org/graphs/default')
            }]
        };

        const result = module.process(event);
        expect(result.remove.length).toBe(1);
        expect(factory.decode(result.remove[0].predicate).value).toBe(p2);
    });
});
