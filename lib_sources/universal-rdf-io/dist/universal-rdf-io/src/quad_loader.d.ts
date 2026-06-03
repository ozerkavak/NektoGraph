/**
 * QuadLoader - High-level RDF ingestion orchestrator.
 * Handles parsing, graph rewriting, and search index synchronization.
 */
export declare class QuadLoader {
    private store;
    private factory;
    private parser;
    constructor(store: any, factory: any);
    /**
     * Loads RDF content into the store with advanced orchestration.
     */
    load(content: string, options: {
        filename: string;
        format?: string | 'universal';
        graphRewriter?: (graphURI: string | null) => string;
        onPrefix?: (prefix: string, iri: string) => void;
        onBase?: (iri: string) => void;
    }): Promise<{
        triples: number;
        graphs: string[];
    }>;
    private detectFormat;
}
