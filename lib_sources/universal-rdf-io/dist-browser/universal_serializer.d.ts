export interface SerializerOptions {
    format?: 'Turtle' | 'N-Triples' | 'N-Quads' | 'TriG' | 'JSON-LD' | 'RDF/XML';
    prefixes?: {
        [prefix: string]: string;
    };
    baseIRI?: string;
}
/**
 * UniversalSerializer - Central service for RDF data export.
 * Supports various formats including Turtle, N-Quads, and JSON-LD.
 *
 * @category Transport Layer
 */
export declare class UniversalSerializer {
    /**
     * Serializes an array or iterator of Quads into a string.
     * The input quads must be standard RDF/JS objects (subject, predicate, object, graph).
     *
     * @param quads - Iterable of RDF/JS Quads.
     * @param options - Serialization settings including format, baseIRI and prefixes.
     * @returns Promise resolving to the serialized string.
     */
    serialize(quads: Iterable<any>, options?: SerializerOptions): Promise<string>;
    private serializeJsonLd;
    private serializeRdfXml;
}
