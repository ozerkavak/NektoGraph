/**
 * URIUtils - Lightweight IRI normalization and resolution.
 * Designed for RDF applications requiring deterministic URI handling
 * without the overhead of heavy 3rd party libraries.
 */
export interface URIComponents {
    scheme?: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
}
export declare class URI {
    /**
     * Resolves a relative IRI against a base IRI.
     * Uses native URL API for robust standard-compliant resolution.
     */
    static resolve(base: string, relative: string): string;
    /**
     * Normalizes an IRI (lowercase scheme/host, removes redundant dots).
     */
    static normalize(iri: string): string;
    /**
     * Checks if a string is an absolute IRI.
     */
    static isAbsolute(iri: string): boolean;
    /**
     * Extracts components from an IRI.
     */
    static parse(iri: string): URIComponents;
    /**
     * Converts a file system path to a file:// URI.
     */
    static fromFile(path: string): string;
}
