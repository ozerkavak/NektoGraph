declare interface IDataFactory {
    namedNode(val: string): any;
    literal(val: string, datatype?: any, language?: string): any;
    decode(term: any): any;
}

declare interface IQuadStore {
    match(s: any, p: any, o: any, g: any): Iterable<any>;
}

declare interface ISchemaIndex {
    getSubClassesRecursive(cls: NodeID): NodeID[];
}

/**
 * @license NektoGraph UnifiedSearch Beta v1.0 (Standardized)
 * Features: Beta v1.0 Sequence Boost, Turkish Beta v1.0 Normalization.
 * Source: /lib_sources/search/src/search.ts
 */
declare type NodeID = any;

declare interface SearchResult {
    id: NodeID;
    labels: string[];
    description?: string;
    score: number;
    source: 'store' | 'session';
    isClassMatch?: boolean;
    debugReason?: string;
    matchedText?: string;
}

export declare class UnifiedSearch {
    private index;
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

export { }
