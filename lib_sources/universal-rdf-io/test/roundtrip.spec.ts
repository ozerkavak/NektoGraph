import { describe, it, expect } from 'vitest';
import { UniversalParser } from '../src/universal_parser';
import { UniversalSerializer } from '../src/universal_serializer';

describe('Phase 0 Safety Net: Format Round-Trips', () => {

    const testCases = [
        {
            format: 'Turtle',
            input: `@prefix ex: <http://example.org/> .\n\nex:subject ex:predicate ex:object .`
        },
        {
            format: 'TriG',
            input: `@prefix ex: <http://example.org/> .\n\n<http://example.org/graph> {\n  ex:subject ex:predicate ex:object .\n}`
        },
        {
            format: 'N-Quads',
            input: `<http://example.org/s> <http://example.org/p> <http://example.org/o> <http://example.org/g> .\n`
        },
        {
            format: 'JSON-LD',
            input: `[\n  {\n    "@id": "http://ex.org/s",\n    "http://ex.org/p": [\n      {\n        "@id": "http://ex.org/o"\n      }\n    ]\n  }\n]`
        }
    ];

    testCases.forEach(({ format, input }) => {
        it(`Round Trip: ${format}`, async () => {
            const parser = new UniversalParser();
            const serializer = new UniversalSerializer();
            
            const buffer: any[] = [];
            await parser.parse(input, format as any, (quad) => {
                buffer.push(quad);
            }, { baseIRI: 'http://example.org/' });

            const output = await serializer.serialize(buffer, { format: format as any });
            
            // We use snapshot matching to lock the baseline behavior before substituting the parser engine. 
            // Even if the serializer adds whitespaces or extra directives, the snapshot will catch it.
            expect(output).toMatchSnapshot();
        });
    });

    // RDF/XML is parsed but the serializer in universal_serializer returns an Error currently.
    // The instructions say round-trip is needed, but universal_serializer says "RDF/XML Serializer is not currently available".
    // We will just test parsing for RDF/XML to lock its AST.
    it('Parse Baseline: RDF/XML', async () => {
        const parser = new UniversalParser();
        const input = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:ex="http://example.org/">
  <rdf:Description rdf:about="http://example.org/s">
    <ex:p rdf:resource="http://example.org/o"/>
  </rdf:Description>
</rdf:RDF>`;
        
        const buffer: any[] = [];
        await parser.parse(input, 'RDF/XML', (quad) => {
            buffer.push({
                s: quad.subject.value,
                p: quad.predicate.value,
                o: quad.object.value
            });
        });

        expect(buffer).toMatchSnapshot();
    });
});
