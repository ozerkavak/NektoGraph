
import { strict as assert } from 'node:assert';
import { IDFactory, QuadStore } from '../src'; // Importing from local src as if it's the package
// In a real scenario, this might import from 'dist' or the package name mapping.

console.log('Running Quadstore Core Verification...');

// 1. Initialization
const factory = new IDFactory();
const store = new QuadStore();

console.log('✅ Initialization successful');

// 2. Creating Terms
const s = factory.namedNode('http://example.com/alice');
const p = factory.namedNode('http://xmlns.com/foaf/0.1/knows');
const o = factory.namedNode('http://example.com/bob');
const g = factory.namedNode('http://example.com/mainGraph');

const ageVal = '30';
const ageType = 'http://www.w3.org/2001/XMLSchema#integer';
const age = factory.literal(ageVal, ageType);

assert.ok(s, 'Subject NodeID created');
assert.ok(p, 'Predicate NodeID created');
assert.ok(age, 'Literal NodeID created');

// Check decoding
const decodedS = factory.decode(s);
assert.equal(decodedS.value, 'http://example.com/alice');
assert.equal(decodedS.termType, 'NamedNode');

const decodedAge = factory.decode(age);
assert.equal(decodedAge.value, '30');
assert.equal(decodedAge.termType, 'Literal');

console.log('✅ Term creation and decoding verified');

// 3. Adding Data
store.add(s, p, o, g);
store.add(s, p, age, g);

assert.equal(store.size, 2, 'Store should have 2 quads');
assert.ok(store.has(s, p, o, g), 'Store should have the alice-knows-bob quad');

console.log('✅ Adding data verified');

// 4. Querying Data (Match)
let matchCount = 0;
for (const [subj, pred, obj, graph] of store.match(s, null, null, null)) {
    matchCount++;
    assert.equal(subj, s, 'Subject should match query');
}
assert.equal(matchCount, 2, 'Should find 2 matches for Alice');

// Specific match
let specificMatchCount = 0;
for (const q of store.match(s, p, age, null)) {
    specificMatchCount++;
}
assert.equal(specificMatchCount, 1, 'Should find 1 match for Alice age');

console.log('✅ Querying/matching verified');

// 4.1 Batch Operations
const q1 = { subject: s, predicate: p, object: o, graph: g };
const q2 = { subject: s, predicate: p, object: age, graph: g };
const addedCount = store.addQuads([q1, q2]); // Should ignore duplicates if they exist, or add new ones
// Since we deleted one in step 5? Wait, let's reset or use new data.
const s2 = factory.blankNode('mem1');
const s3 = factory.blankNode(); // Auto-gen label
const q3 = { subject: s2, predicate: p, object: o, graph: g };
const q4 = { subject: s3, predicate: p, object: age, graph: g };

const batchCount = store.addQuads([q3, q4]);
assert.equal(batchCount, 2, 'Should add 2 new quads');
assert.ok(store.hasAny(s2, p, o), 'hasAny should find the quad ignoring graph (though here graph matches)');

console.log('✅ Batch operations and BlankNodes verified');

// 5. Deleting Data
// We currently have 4 quads (2 original + 2 from batch)
const deleted = store.delete(s, p, o, g);
assert.ok(deleted, 'Delete operation should return true');
assert.equal(store.size, 3, 'Store size should decrease to 3');
assert.ok(!store.has(s, p, o, g), 'Store should not have the deleted quad');

console.log('✅ Deletion verified');

console.log('✅ Deletion verified');

// 6. Graph Operations
const cleared = store.clearGraph(g);
// We had some quads in g.
assert.ok(cleared > 0, 'Should have cleared some quads');
assert.equal(store.size, 0, 'Store should be empty after clearing the only graph');

console.log('✅ Graph operations verified');

console.log('🎉 ALL VERIFICATION TESTS PASSED');
