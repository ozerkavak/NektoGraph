/**
 * @license NektoGraph UnifiedSearch Beta v1.0 (Standardized)
 * Features: Beta v1.0 Sequence Boost, Turkish Beta v1.0 Normalization.
 * Source: /lib_sources/search/src/search.ts
 */
type NodeID = any;
interface IQuadStore {
    match(s: any, p: any, o: any, g: any): Iterable<any>;
}
interface IDataFactory {
    namedNode(val: string): any;
    literal(val: string, datatype?: any, language?: string): any;
    decode(term: any): any;
}
interface SearchResult {
    id: NodeID;
    labels: string[];
    description?: string;
    score: number;
    source: 'store' | 'session';
    isClassMatch?: boolean;
    debugReason?: string;
    matchedText?: string;
}
interface ISchemaIndex {
    getSubClassesRecursive(cls: NodeID): NodeID[];
}
export declare class UnifiedSearch {
    private index;
    private reverseIndex;
    private indexBuilt;
    private mainStore;
    private factory;
    private schemaIndex?;
    private rdfsLabelID;
    private rdfsCommentID;
    private rdfTypeID;
    private propertyTypeIDs;
    private normalize;
    constructor(config: {
        store: IQuadStore;
        factory: IDataFactory;
        schemaIndex?: ISchemaIndex;
    });
    /**
     * Builds a simple Prefix Index for O(1) lookups.
     * This is an expensive operation and should be called lazily or on data load.
     */
    buildIndex(): void;
    invalidateIndex(): void;
    /**
     * Internal: Adds a token to both forward and reverse indices.
     */
    private addToIndexInternal;
    /**
     * Removes an entity from the search index.
     */
    removeEntityIndex(id: NodeID): void;
    /**
     * Incrementally updates the search index for a specific entity.
     * Can optionally include data from a session (DraftStore).
     */
    updateEntityIndex(id: NodeID, sessionStore?: any): void;
    /**
     * Executes a search with strict priority:
     * 1. Match in Label (Selected Language)
     * 2. Match in Label (Any Language)
     * 3. Match in Description/Comment
     * 4. Match in URI / Other Literals
     */
    search(mainStore: IQuadStore, query: string, options?: {
        language?: 'en' | 'tr';
        preferredClass?: NodeID;
        session?: IQuadStore | null;
        strictTypes?: boolean;
        suppressDescription?: boolean;
    }): Promise<SearchResult[]>;
}
export {};
