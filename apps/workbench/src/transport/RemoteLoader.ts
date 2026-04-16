import { URI } from '@triplestore/uri';
import { SparqlParser } from '@triplestore/sparql-parser';


/**
 * RemoteLoader - Pure logic for interacting with remote RDF data and SPARQL endpoints.
 * Handles fetch operations, authentication, and SPARQL protocol implementation.
 * 
 * @category Transport Layer
 */
export class RemoteLoader {

    /**
     * Fetches a static RDF file from a URL.
     * 
     * @param url - Source URL of the RDF file.
     * @param auth - Optional Basic Auth credentials.
     * @param signal - AbortSignal for fetch cancellation.
     * @returns Raw RDF string from the server.
     */
    static async fetchFile(url: string, auth?: { user: string, pass: string }, signal?: AbortSignal): Promise<string> {
        const normalizedUrl = URI.normalize(url);
        const headers: any = { 'Accept': 'text/turtle, application/trig, application/n-quads' };
        if (auth) headers['Authorization'] = `Basic ${btoa(`${auth.user}:${auth.pass}`)}`;
        
        const res = await fetch(normalizedUrl, { headers, signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch static file.`);
        return await res.text();
    }

    /**
     * Queries a SPARQL endpoint to list available named graphs and their quad counts.
     * Executes a GROUP BY query on the target endpoint.
     * 
     * @param endpoint - SPARQL Query Endpoint URL.
     * @param auth - Optional Basic Auth credentials.
     * @param signal - AbortSignal for query cancellation.
     * @returns List of graph URIs and their respective quad counts.
     */
    static async listGraphs(endpoint: string, auth?: { user: string, pass: string }, signal?: AbortSignal): Promise<{ uri: string, count: number }[]> {
        const query = `SELECT ?g (COUNT(*) AS ?count) WHERE { GRAPH ?g { ?s ?p ?o } } GROUP BY ?g ORDER BY DESC(?count) LIMIT 100`;
        const raw = await this.doSparqlQuery(endpoint, query, auth, 'application/sparql-results+json, application/sparql-results+xml', signal);
        
        const bindings = SparqlParser.parse(raw);
        
        return bindings.map((b: any) => ({
            uri: b.g.value,
            count: parseInt(b.count.value)
        }));
    }

    /**
     * Fetches quads from multiple selected graphs.
     * Performs direct graph insertion for N-Triples responses to construct valid N-Quads.
     * 
     * @param endpoint - SPARQL Query Endpoint URL.
     * @param graphs - List of named graph URIs to fetch. Use "DEFAULT" for the default graph.
     * @param limit - Max number of quads to fetch per graph. Use -1 for no limit.
     * @param auth - Optional Basic Auth credentials.
     * @param signal - AbortSignal for query cancellation.
     * @returns Merged N-Quads string.
     */
    static async fetchSelectedGraphs(endpoint: string, graphs: string[], limit: number, auth?: { user: string, pass: string }, signal?: AbortSignal): Promise<string> {
        let allQuads = "";
        const limitClause = limit > 0 ? ` LIMIT ${limit}` : "";
        
        for (const gUri of graphs) {
            const query = gUri === "DEFAULT"
                ? `CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }${limitClause}`
                : `CONSTRUCT { ?s ?p ?o } WHERE { GRAPH <${gUri}> { ?s ?p ?o } }${limitClause}`;

            const ntData = await this.doSparqlQuery(endpoint, query, auth, 'application/n-triples, text/plain', signal);

            if (ntData.trim()) {
                const lines = ntData.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('#')) continue;

                    if (gUri === "DEFAULT") {
                        allQuads += trimmed + "\n";
                    } else {
                        // Manual N-Triples to N-Quads conversion for specific graph targeting
                        if (trimmed.endsWith(' .')) {
                            allQuads += trimmed.slice(0, -2) + ` <${gUri}> .\n`;
                        } else {
                            allQuads += trimmed + ` <${gUri}> .\n`;
                        }
                    }
                }
            }
        }
        return allQuads;
    }

    /**
     * Executes a broad CONSTRUCT query to fetch data from all available graphs.
     * 
     * @param endpoint - SPARQL Query Endpoint URL.
     * @param limit - Max number of quads. Use -1 for no limit.
     * @param auth - Optional Basic Auth credentials.
     * @param signal - AbortSignal for query cancellation.
     * @returns Combined Turtle representation of the discovered data.
     */
    static async fetchSparql(endpoint: string, limit: number, auth?: { user: string, pass: string }, signal?: AbortSignal): Promise<string> {
        const limitClause = limit > 0 ? ` LIMIT ${limit}` : "";
        // Simplified query for better compatibility with strict endpoints (e.g. Wikidata)
        // If users need specific graphs, they should use the Graph Discovery / QuadStore mode.
        const query = `CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }${limitClause}`;
        return this.doSparqlQuery(endpoint, query, auth, 'text/turtle, application/x-turtle', signal);
    }

    /**
     * Executes a SPARQL Update operation.
     * Note: Requires a compatible Update Endpoint (not just Query Endpoint).
     * 
     * @param endpoint - SPARQL Update Endpoint URL.
     * @param update - SPARQL Update string (INSERT, DELETE, etc.)
     * @param auth - Optional Basic Auth credentials.
     * @param signal - AbortSignal for update cancellation.
     */
    static async doSparqlUpdate(endpoint: string, update: string, auth?: { user: string, pass: string }, signal?: AbortSignal): Promise<void> {
        const headers: any = {
            'Accept': 'application/sparql-results+json, */*',
            'Content-Type': 'application/sparql-update',
            'User-Agent': 'NektoGraph/Beta-v1.0.1'
        };
        if (auth) headers['Authorization'] = `Basic ${btoa(`${auth.user}:${auth.pass}`)}`;
        
        const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: update,
            signal
        });
        if (!res.ok) {
            const errorBody = await res.text().catch(() => '');
            throw new Error(`SPARQL Update HTTP ${res.status}: ${errorBody || 'Update failed.'}`);
        }
    }

    private static async doSparqlQuery(endpoint: string, query: string, auth?: { user: string, pass: string }, accept: string = 'text/turtle', signal?: AbortSignal): Promise<string> {
        const headers: any = {
            'Accept': accept,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'NektoGraph/Beta-v1.0.1 (SPARQL/1.1)'
        };
        if (auth) headers['Authorization'] = `Basic ${btoa(`${auth.user}:${auth.pass}`)}`;
        
        const res = await fetch(endpoint, {
            method: 'POST',
            container: (endpoint.includes('wikidata') ? 'shadow' : undefined), // Hint for proxy if any
            headers,
            body: new URLSearchParams({ query }).toString(),
            signal
        } as any);

        if (!res.ok) {
            const errorBody = await res.text().catch(() => '');
            throw new Error(`SPARQL HTTP ${res.status}: ${errorBody || 'Query execution failed.'}`);
        }
        return await res.text();
    }
}
