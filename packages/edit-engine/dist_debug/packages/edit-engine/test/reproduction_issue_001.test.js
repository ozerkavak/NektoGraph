import { describe, it, expect, beforeEach } from 'vitest';
import { QuadStore, IDFactory } from '@triplestore/core';
import { SchemaIndex } from '../src';
describe('Defect Reproduction: Duplicate Ranges', () => {
    let store;
    let factory;
    let index;
    const RDFS_RANGE = 'http://www.w3.org/2000/01/rdf-schema#range';
    const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
    const OWL_OBJECT_PROP = 'http://www.w3.org/2002/07/owl#ObjectProperty';
    beforeEach(() => {
        store = new QuadStore();
        factory = new IDFactory();
        index = new SchemaIndex(store, factory);
    });
    it('should NOT produce duplicate ranges when range is defined in multiple graphs', async () => {
        const prop = factory.namedNode('http://example.org/activePersons');
        const rangeClass = factory.namedNode('http://example.org/Person');
        const RDFS_DOMAIN = 'http://www.w3.org/2000/01/rdf-schema#domain';
        // 1. Setup Data: Property is an ObjectProperty with a Domain
        store.add(prop, factory.namedNode(RDF_TYPE), factory.namedNode(OWL_OBJECT_PROP), factory.namedNode('http://g1'));
        store.add(prop, factory.namedNode(RDFS_DOMAIN), factory.namedNode('http://example.org/Thing'), factory.namedNode('http://g1'));
        // 2. Add Range in Graph A (Ontology)
        store.add(prop, factory.namedNode(RDFS_RANGE), rangeClass, factory.namedNode('http://g1'));
        // 3. Add SAME Range in Graph B (Inference or Duplicate Import)
        store.add(prop, factory.namedNode(RDFS_RANGE), rangeClass, factory.namedNode('http://g2'));
        // 4. Build Index
        await index.buildIndex();
        // 5. Check Property Schema
        const schema = index.getPropertySchema(prop);
        expect(schema).toBeDefined();
        const ranges = schema.ranges.map(r => factory.decode(r).value);
        console.log('Resolved Ranges:', ranges);
        // EXPECTATION: Should be unique
        // ACTUAL BUG: Likely ['http://example.org/Person', 'http://example.org/Person']
        expect(ranges).toHaveLength(1);
        expect(ranges[0]).toBe('http://example.org/Person');
    });
    it('should verify behavior of join used in UI', async () => {
        const prop = factory.namedNode('http://example.org/activePersons');
        const rangeClass = factory.namedNode('http://example.org/Person');
        const RDFS_DOMAIN = 'http://www.w3.org/2000/01/rdf-schema#domain';
        store.add(prop, factory.namedNode(RDF_TYPE), factory.namedNode(OWL_OBJECT_PROP), factory.namedNode('http://g1'));
        store.add(prop, factory.namedNode(RDFS_DOMAIN), factory.namedNode('http://example.org/Thing'), factory.namedNode('http://g1'));
        store.add(prop, factory.namedNode(RDFS_RANGE), rangeClass, factory.namedNode('http://g1'));
        store.add(prop, factory.namedNode(RDFS_RANGE), rangeClass, factory.namedNode('http://g2'));
        await index.buildIndex();
        const schema = index.getPropertySchema(prop);
        // Simulate UI Logic
        const rangeStr = schema.ranges.map(r => factory.decode(r).value).join(',');
        console.log('UI Range values string:', rangeStr);
        // If bug exists, this will be "http://...Person,http://...Person"
        if (schema.ranges.length > 1) {
            expect(rangeStr).toContain(',');
        }
    });
});
//# sourceMappingURL=reproduction_issue_001.test.js.map
