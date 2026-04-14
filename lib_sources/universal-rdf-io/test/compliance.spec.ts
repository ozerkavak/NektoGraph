import { describe, it, expect } from 'vitest';
import { UniversalParser, UniversalSerializer } from '../src/index';
// Mock N3 raw objects for testing serializer
import * as N3 from 'n3';

describe('Library Compliance: universal-rdf-io', () => {

    // PARSER TESTS
    it('Parser: Basic Parsing (Turtle)', async () => {
        const parser = new UniversalParser();
        const ttl = `@prefix : <http://ex.org/> . :s :p :o .`;
        let count = 0;
        await parser.parse(ttl, 'Turtle', (q) => {
            count++;
            expect(q.subject.value).toBe('http://ex.org/s');
        });
        expect(count).toBe(1);
    });

    // SERIALIZER TESTS
    it('Serializer: Basic Serialization (N-Triples)', async () => {
        const serializer = new UniversalSerializer();
        const quads = [
            N3.DataFactory.quad(
                N3.DataFactory.namedNode('http://ex.org/s'),
                N3.DataFactory.namedNode('http://ex.org/p'),
                N3.DataFactory.literal('Hello')
            )
        ];

        const output = await serializer.serialize(quads, { format: 'N-Triples' });
        expect(output.trim()).toBe('<http://ex.org/s> <http://ex.org/p> "Hello" .');
    });

    it('Round Trip: Parse -> Serialize', async () => {
        const parser = new UniversalParser();
        const serializer = new UniversalSerializer();
        const input = '<http://s> <http://p> <http://o> .';

        const buffer: any[] = [];
        await parser.parse(input, 'N-Triples', (q) => buffer.push(q));

        const output = await serializer.serialize(buffer, { format: 'N-Triples' });
        expect(output.trim()).toBe(input);
    });

});
