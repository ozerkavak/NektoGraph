import { describe, it } from 'node:test'; // Using node:test as preferred
import { strict as assert } from 'node:assert';
import { IDGenerator } from '../src/idgen'; // tsx resolves this
import { QuadStore, IDFactory, DEFAULT_GRAPH } from '@triplestore/core';

// Mock Fetch for Remote Tests
// We can overwrite global.fetch or just test logic if we can mock it.
// Since we used `node:test`, we don't have automocking.
// We will test Local functionality primarily.

describe('IDGenerator', () => {

    it('should generate an ID with correct prefix and format', async () => {
        const gen = new IDGenerator({ prefix: 'http://ex.org/' });
        const id = await gen.createUniqueId();

        assert.ok(id.startsWith('http://ex.org/id_'));
        assert.equal(id.length, 'http://ex.org/'.length + 3 + 8); // prefix + id_ + 8chars
    });

    it('should respect maxRetries', async () => {
        // Mock a generator that always returns same ID to force collision
        class BadGenerator extends IDGenerator {
            // @ts-ignore - overriding private for test
            generateCandidate() { return 'collision'; }
            // @ts-ignore
            checkUniqueness() { return Promise.resolve(false); }
        }

        const gen = new BadGenerator({ maxRetries: 3 });

        await assert.rejects(
            async () => await gen.createUniqueId(),
            /Failed to generate unique ID after 3 attempts/
        );
    });

    it('should validate against local QuadStore (Subject)', async () => {
        const store = new QuadStore();
        const factory = new IDFactory();
        const gen = new IDGenerator({ store, factory, prefix: 'http://ex/' });

        // manually populate store with a known ID to simulate collision
        // We need to know what ID the random generator will produce? 
        // Impossible to predict random. 
        // We will fallback to monkey-patching generateCandidate for deterministic test.

        const knownID = 'http://ex/id_taken123';
        const knownNode = factory.namedNode(knownID);
        store.add(knownNode, factory.namedNode('p'), factory.namedNode('o'), DEFAULT_GRAPH);

        // Subclass to inject collision
        let attempt = 0;
        class DeterministicGenerator extends IDGenerator {
            // @ts-ignore
            generateCandidate() {
                attempt++;
                if (attempt === 1) return knownID; // First attempt collides
                return 'http://ex/id_free456'; // Second attempt succeeds
            }
        }

        const dGen = new DeterministicGenerator({ store, factory });
        const result = await dGen.createUniqueId();

        assert.equal(result, 'http://ex/id_free456');
        assert.equal(attempt, 2);
    });

    it('should validate against local QuadStore (Object)', async () => {
        const store = new QuadStore();
        const factory = new IDFactory();

        const knownID = 'http://ex/id_obj123';
        const knownNode = factory.namedNode(knownID);
        // Add as Object
        store.add(factory.namedNode('s'), factory.namedNode('p'), knownNode, DEFAULT_GRAPH);

        let attempt = 0;
        class DeterministicGenerator extends IDGenerator {
            // @ts-ignore
            generateCandidate() {
                attempt++;
                if (attempt === 1) return knownID;
                return 'http://ex/id_freeObj';
            }
        }

        const dGen = new DeterministicGenerator({ store, factory });
        const result = await dGen.createUniqueId();

        assert.equal(result, 'http://ex/id_freeObj');
        assert.equal(attempt, 2);
    });
});
