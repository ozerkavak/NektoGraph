import { describe, it } from 'node:test'; // Using node:test if available or console checks
import assert from 'node:assert';
import { QuadStore, IDFactory, DEFAULT_GRAPH, Quad } from '@triplestore/core';
import { InferenceEngine, SubClassOfModule } from '../src';

// Simple polyfill for running with ts-node if needed, or just standard Node
async function runTests() {
    const factory = new IDFactory();
    const store = new QuadStore();
    const engine = new InferenceEngine(store);
    const subClassModule = new SubClassOfModule(store, factory);

    engine.register(subClassModule);
    engine.enable('rdfs-subclass');

    const rdfType = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    const rdfsSubClassOf = factory.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf');

    const animal = factory.namedNode('http://ex/Animal');
    const dog = factory.namedNode('http://ex/Dog');
    const poodle = factory.namedNode('http://ex/Poodle');
    const fido = factory.namedNode('http://ex/Fido');
    const rex = factory.namedNode('http://ex/Rex');

    console.log('--- Test 1: Forward Chaining (Schema then Data) ---');
    // 1. Schema: Dog subClassOf Animal
    store.add(dog, rdfsSubClassOf, animal);

    // 2. Data: Fido a Dog
    store.add(fido, rdfType, dog);

    // Expect: Fido a Animal (in inference graph)
    let found = false;
    for (const _ of store.match(fido, rdfType, animal)) found = true;
    console.log('Fido is Animal:', found);
    assert.strictEqual(found, true, 'Fido should be an Animal');

    console.log('--- Test 2: Transitivity (Poodle sub Dog sub Animal) ---');
    // Schema: Poodle subClassOf Dog
    store.add(poodle, rdfsSubClassOf, dog);

    // Data: Rex a Poodle
    store.add(rex, rdfType, poodle);

    // Expect: Rex a Dog
    found = false;
    for (const _ of store.match(rex, rdfType, dog)) found = true;
    console.log('Rex is Dog:', found);
    assert.strictEqual(found, true, 'Rex should be a Dog');

    // Expect: Rex a Animal
    found = false;
    for (const _ of store.match(rex, rdfType, animal)) found = true;
    console.log('Rex is Animal:', found);
    assert.strictEqual(found, true, 'Rex should be an Animal');


    console.log('--- Test 3: Late Schema Arrival (Data then Schema) ---');
    const cat = factory.namedNode('http://ex/Cat');
    const felix = factory.namedNode('http://ex/Felix');

    // Data: Felix a Cat (Unknown schema)
    store.add(felix, rdfType, cat);

    // Check before inference
    found = false;
    for (const _ of store.match(felix, rdfType, animal)) found = true;
    assert.strictEqual(found, false, 'Felix is not yet Animal');

    // Schema: Cat subClassOf Animal
    store.add(cat, rdfsSubClassOf, animal);

    // Expect: Felix a Animal (Retro-active inference)
    found = false;
    for (const _ of store.match(felix, rdfType, animal)) found = true;
    console.log('Felix is Animal (Late Schema):', found);
    assert.strictEqual(found, true, 'Felix should become an Animal after schema update');

    console.log('ALL TESTS PASSED');
}

runTests().catch(e => console.error(e));
