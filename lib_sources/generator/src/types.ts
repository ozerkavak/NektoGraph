import { IQuadStore, IDataFactory } from '@triplestore/core';

export interface GeneratorEndpoint {
    url: string;
    auth?: {
        user: string;
        password: string;
    };
}

export interface GeneratorConfig {
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
