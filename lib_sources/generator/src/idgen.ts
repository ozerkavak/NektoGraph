import { GeneratorConfig } from './types';

/**
 * IDGenerator
 * 
 * Orchestrates the generation of unique resource identifiers (URIs) with 
 * pluggable validation strategies across local stores and remote SPARQL endpoints.
 */
export class IDGenerator {
    private config: GeneratorConfig;

    constructor(config: GeneratorConfig = {}) {
        this.config = config;
    }

    /**
     * Executes the unique ID generation lifecycle:
     * 1. Candidate generation based on prefix/random entropy.
     * 2. Mult-tier uniqueness validation (Local -> Remote).
     * 3. Collision retry logic.
     */
    public async createUniqueId(): Promise<string> {
        const retries = this.config.maxRetries ?? 10;

        for (let i = 0; i < retries; i++) {
            const candidate = this.generateCandidate();

            // Check uniqueness
            const isUnique = await this.checkUniqueness(candidate);

            if (isUnique) {
                return candidate;
            }
        }

        throw new Error(`Failed to generate unique ID after ${retries} attempts.`);
    }

    /**
     * Generates a base-36 randomized candidate string.
     */
    protected generateCandidate(): string {
        const randomPart = Math.random().toString(36).substring(2, 10);
        const id = `id_${randomPart}`;
        return this.config.prefix ? `${this.config.prefix}${id}` : id;
    }

    /**
     * Orchestrates uniqueness checks across configured validation backends.
     * Returns true if the ID is confirmed unique (not present in any store).
     */
    public async checkUniqueness(id: string): Promise<boolean> {
        let localUnique = true;

        // Validation Tier 1: Local In-Memory Store
        if (this.config.store && this.config.factory) {
            localUnique = this.checkLocal(id);
        }

        if (!localUnique) return false;

        // Validation Tier 2: Remote SPARQL Endpoint
        if (this.config.endpoint) {
            const remoteUnique = await this.checkRemote(id);
            if (!remoteUnique) return false;
        }

        return true;
    }

    private checkLocal(id: string): boolean {
        if (!this.config.factory || !this.config.store) return true;

        const node = this.config.factory.namedNode(id);

        // Scan subject and object positions for existing references.
        const subjectIter = this.config.store.match(node, null, null)[Symbol.iterator]();
        if (!subjectIter.next().done) return false;

        const objectIter = this.config.store.match(null, null, node)[Symbol.iterator]();
        if (!objectIter.next().done) return false;

        return true;
    }

    private async checkRemote(id: string): Promise<boolean> {
        if (!this.config.endpoint) return true;

        // Build ASK query to verify global resource uniqueness.
        const uri = id.startsWith('http') ? `<${id}>` : `<${id}>`;
        const query = `ASK WHERE { { ${uri} ?p ?o } UNION { ?s ?p ${uri} } }`;
        const url = `${this.config.endpoint.url}?query=${encodeURIComponent(query)}`;

        try {
            const headers: HeadersInit = { 'Accept': 'application/sparql-results+json' };
            if (this.config.endpoint.auth) {
                const creds = btoa(`${this.config.endpoint.auth.user}:${this.config.endpoint.auth.password}`);
                headers['Authorization'] = `Basic ${creds}`;
            }

            const res = await fetch(url, { headers });
            if (!res.ok) throw new Error(`SPARQL Error: ${res.statusText}`);

            const json = await res.json();
            return !json.boolean;
        } catch (e) {
            console.warn('[IDGenerator] Remote validation failed, assuming collision for safety:', e);
            return false;
        }
    }
}
