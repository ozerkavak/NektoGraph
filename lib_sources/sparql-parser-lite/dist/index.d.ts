/**
 * SparqlParserLite - Native, high-performance SPARQL result parser.
 * Handles application/sparql-results+json and application/sparql-results+xml formats.
 */
export interface Binding {
    [variable: string]: {
        termType: 'NamedNode' | 'BlankNode' | 'Literal';
        value: string;
        datatype?: string;
        language?: string;
    };
}
export declare class SparqlParser {
    /**
     * Automatically detects format and parses content.
     */
    static parse(content: string): Binding[];
    /**
     * Parses a SPARQL JSON result string into a list of bindings.
     */
    static parseJson(json: string): {
        head: {
            vars: string[];
        };
        results: {
            bindings: Binding[];
        };
    };
    /**
     * Parses a SPARQL XML result (Recursive for RDF-star).
     */
    static parseXml(xml: string): {
        head: {
            vars: string[];
        };
        results: {
            bindings: Binding[];
        };
    };
}
