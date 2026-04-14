import * as N3 from 'n3';
import { RdfXmlParser } from 'rdfxml-streaming-parser';
import { JsonLdParser } from 'jsonld-streaming-parser';
import { URI } from '@triplestore/uri';
import { factory as rdfFactory } from '@triplestore/rdf-factory';


export type ParseFormat = 'Turtle' | 'N-Triples' | 'N-Quads' | 'TriG' | 'RDF/XML' | 'JSON-LD';

export interface ParseOptions {
    baseIRI?: string;
    onPrefix?: (prefix: string, iri: string) => void;
    onBase?: (iri: string) => void;
}

/**
 * UniversalParser - Multi-format RDF parser.
 * Abstracts N3.js, rdfxml-streaming-parser, and jsonld-streaming-parser into a single interface.
 * 
 * @category Transport Layer
 */
export class UniversalParser {
    /**
     * Parses RDF content in various formats and invokes the callback for each quad.
     * Use this in Workers to keep the UI thread responsive during large imports.
     * 
     * @param content - Raw string content to parse.
     * @param format - Format identifier.
     * @param onQuad - Callback invoked for every successfully parsed Quad.
     * @param options - Parser configuration (baseIRI, prefixes).
     * @returns List of named graphs discovered during the parsing process.
     */
    public async parse(
        content: string,
        format: ParseFormat,
        onQuad: (quad: any) => void,
        options: ParseOptions = {}
    ): Promise<{ graphs: string[] }> {

        if (!onQuad || typeof onQuad !== 'function') {
            throw new Error('UniversalParser: "onQuad" callback is required and must be a function.');
        }

        const observedGraphs = new Set<string>();
        const wrapper = (quad: any) => {
            if (quad.graph && quad.graph.value) {
                observedGraphs.add(quad.graph.value);
            }
            onQuad(quad);
        };

        if (format === 'RDF/XML') {
            const cleaned = content.replace(/rdf:datatype=["']http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#langString["']/g, '');
            await this.parseStream(new RdfXmlParser({ baseIRI: options.baseIRI, dataFactory: rdfFactory as any }), cleaned, wrapper, options);
        } else if (format === 'JSON-LD') {
            await this.parseStream(new JsonLdParser({ baseIRI: options.baseIRI, dataFactory: rdfFactory as any }), content, wrapper, options);
        } else {
            // N3 handles Turtle, TriG, N-Triples, N-Quads
            
            // OPTIMIZATION: Always use TriG mode for any N-based format containing stars, 
            // as TriG is the most permissive N3.js parser mode for RDF-star.
            const needsPermissiveMode = content.includes('<<');
            const parseFormat = (format === 'N-Quads' || format === 'N-Triples' || (format === 'Turtle' && needsPermissiveMode)) ? 'TriG' : format;
            
            let finalContent = content;
            if (needsPermissiveMode) {
                // BUGFIX: Strip weird parentheses "<<( ... )>>" produced by some serializers (Experimental RDF 1.2 / N3.js Writer quirks)
                // into standard RDF-star "<< ... >>" which N3.Parser prefers.
                finalContent = finalContent.replace(/<<\s*\(\s*/g, '<< ').replace(/\s*\)\s*>>/g, ' >>');
                
                // If it's N-Quads, we must shim it to TriG blocks so N3's TriG parser can handle the 4th term (Graph)
                if (format === 'N-Quads') {
                    finalContent = this.nqToTrig(finalContent);
                }
            }

            await this.parseWithN3(finalContent, parseFormat, wrapper, options);
        }

        return { graphs: Array.from(observedGraphs) };
    }

    /**
     * Shim: Converts N-Quads strings that might contain RDF-Star into TriG syntax.
     * TriG is a superset of N-Quads that N3.js parses natively with star support.
     * We convert '<s1> <p1> <o1> <g1> .' to '<g1> { <s1> <p1> <o1> . }'
     */
    private nqToTrig(content: string): string {
        const lines = content.split('\n');
        return lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return line;
            
            // Robust tokenizer that respects << >>, < >, and " "
            const tokens: string[] = [];
            let current = '';
            let depth = 0;
            let inIri = false;
            let inLiteral = false;
            
            for (let i = 0; i < trimmed.length; i++) {
                const char = trimmed[i];
                const next = trimmed[i + 1];

                // Handle RDF-star nested brackets
                if (char === '<' && next === '<' && !inIri && !inLiteral) {
                    depth++;
                    current += '<<';
                    i++;
                    continue;
                }
                if (char === '>' && next === '>' && !inIri && !inLiteral) {
                    depth--;
                    current += '>>';
                    i++;
                    continue;
                }
                if (depth > 0) {
                    current += char;
                    continue;
                }

                // Handle IRI brackets
                if (char === '<' && !inLiteral) {
                    inIri = true;
                    current += char;
                    continue;
                }
                if (char === '>' && inIri) {
                    inIri = false;
                    current += char;
                    continue;
                }
                if (inIri) {
                    current += char;
                    continue;
                }

                // Handle Literals
                if (char === '"' && trimmed[i - 1] !== '\\') {
                    inLiteral = !inLiteral;
                    current += char;
                    continue;
                }
                if (inLiteral) {
                    current += char;
                    continue;
                }

                // Split by whitespace at the top level
                if (/\s/.test(char)) {
                    if (current) {
                        tokens.push(current);
                        current = '';
                    }
                } else {
                    current += char;
                }
            }
            if (current) tokens.push(current);
            
            // N-Quads quad: [S, P, O, G, "."] -> 5 tokens
            // N-Quads triple: [S, P, O, "."] -> 4 tokens
            if (tokens.length === 5 && tokens[4] === '.') {
                const gNorm = URI.normalize(tokens[3]);
                return `${gNorm} { ${tokens[0]} ${tokens[1]} ${tokens[2]} . }`;
            }
            return line;
        }).join('\n');
    }

    private async parseWithN3(content: string, format: string, onQuad: (quad: any) => void, options: ParseOptions): Promise<void> {
        // N3.js v2 support: Explicitly enable rdfStar. 
        // For N-Triples and N-Quads, N3.js might be too strict by default.
        // We use the format provided, but ensure rdfStar flag is top-priority.
        const parser = new N3.Parser({ 
            format, 
            baseIRI: options.baseIRI, 
            rdfStar: true,
            factory: rdfFactory as any
        } as any);
        return new Promise((resolve, reject) => {
            parser.parse(content, (error: any, quad: any, prefixes: any) => {
                if (error) reject(error);
                else if (quad) onQuad(quad);
                else {
                    if (prefixes && options.onPrefix) {
                        for (const [prefix, iri] of Object.entries(prefixes)) {
                            const iriStr = (typeof iri === 'string') ? iri : (iri as any).value;
                            options.onPrefix(prefix, iriStr);
                        }
                    }
                    resolve();
                }
            });
        });
    }

    private async parseStream(parser: any, content: string, onQuad: (quad: any) => void, options: ParseOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            parser.on('data', onQuad);
            parser.on('error', reject);
            parser.on('end', resolve);

            if (options.onPrefix) {
                parser.on('prefix', (prefix: string, iri: any) => options.onPrefix!(prefix, typeof iri === 'object' ? iri.value : iri));
            }

            parser.write(content);
            parser.end();
        });
    }
}
