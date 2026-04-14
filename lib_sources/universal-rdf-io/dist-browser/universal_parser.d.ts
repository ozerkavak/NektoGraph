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
export declare class UniversalParser {
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
    parse(content: string, format: ParseFormat, onQuad: (quad: any) => void, options?: ParseOptions): Promise<{
        graphs: string[];
    }>;
    private parseWithN3;
    private parseStream;
}
