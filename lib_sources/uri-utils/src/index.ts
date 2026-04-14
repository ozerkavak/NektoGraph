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

export class URI {
    /**
     * Resolves a relative IRI against a base IRI.
     * Uses native URL API for robust standard-compliant resolution.
     */
    static resolve(base: string, relative: string): string {
        if (!relative) return base;
        try {
            return new URL(relative, base).href;
        } catch {
            return relative; // Fallback for invalid formats
        }
    }

    /**
     * Normalizes an IRI (lowercase scheme/host, removes redundant dots).
     */
    static normalize(iri: string): string {
        try {
            const url = new URL(iri);
            return url.href;
        } catch {
            return iri.trim();
        }
    }

    /**
     * Checks if a string is an absolute IRI.
     */
    static isAbsolute(iri: string): boolean {
        return /^[a-z][a-z0-9+.-]*:/i.test(iri);
    }

    /**
     * Extracts components from an IRI.
     */
    static parse(iri: string): URIComponents {
        try {
            const url = new URL(iri);
            return {
                scheme: url.protocol.replace(':', ''),
                authority: url.host,
                path: url.pathname,
                query: url.search.replace('?', ''),
                fragment: url.hash.replace('#', '')
            };
        } catch {
            // Rough match for non-standard or malformed URIs
            const match = iri.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/);
            if (!match) return {};
            return {
                scheme: match[2],
                authority: match[4],
                path: match[5],
                query: match[7],
                fragment: match[9]
            };
        }
    }

    /**
     * Converts a file system path to a file:// URI.
     */
    static fromFile(path: string): string {
        let normalized = path.replace(/\\/g, '/');
        if (!normalized.startsWith('/')) normalized = '/' + normalized;
        return 'file://' + normalized;
    }
}
