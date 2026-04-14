import { IDataFactory } from '../../quadstore-core/src/index.ts';
import { IQuadStore } from '../../quadstore-core/src/index.ts';

export declare interface GeneratorConfig {
    /**
     * Local QuadStore for synchronous existence checks.
     * Requires `factory` to be set.
     */
    store?: IQuadStore;
    /**
     * IDFactory to translate generated strings to NodeIDs for local store checks.
     * Required if `store` is provided.
     */
    factory?: IDataFactory;
    /**
     * Remote SPARQL Endpoint for asynchronous existence checks.
     * Useful for checking against a master database.
     */
    endpoint?: GeneratorEndpoint;
    /**
     * Optional prefix to prepend to the generated ID.
     * Example: 'http://example.org/resource/'
     */
    prefix?: string;
    /**
     * Maximum number of retries if a collision is detected.
     * Default: 10
     */
    maxRetries?: number;
}

export declare interface GeneratorEndpoint {
    url: string;
    auth?: {
        user: string;
        password: string;
    };
}

/**
 * IDGenerator
 *
 * Orchestrates the generation of unique resource identifiers (URIs) with
 * pluggable validation strategies across local stores and remote SPARQL endpoints.
 */
export declare class IDGenerator {
    private config;
    constructor(config?: GeneratorConfig);
    /**
     * Executes the unique ID generation lifecycle:
     * 1. Candidate generation based on prefix/random entropy.
     * 2. Mult-tier uniqueness validation (Local -> Remote).
     * 3. Collision retry logic.
     */
    createUniqueId(): Promise<string>;
    /**
     * Generates a base-36 randomized candidate string.
     */
    protected generateCandidate(): string;
    /**
     * Orchestrates uniqueness checks across configured validation backends.
     * Returns true if the ID is confirmed unique (not present in any store).
     */
    protected checkUniqueness(id: string): Promise<boolean>;
    private checkLocal;
    private checkRemote;
}

export { }
