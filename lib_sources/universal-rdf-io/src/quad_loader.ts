import { UniversalParser, ParseFormat } from './universal_parser';

/**
 * QuadLoader - High-level RDF ingestion orchestrator.
 * Handles parsing, graph rewriting, and search index synchronization.
 */
export class QuadLoader {
    private parser: UniversalParser;

    constructor(
        private store: any,
        private factory: any
    ) {
        this.parser = new UniversalParser();
    }

    /**
     * Loads RDF content into the store with advanced orchestration.
     */
    public async load(content: string, options: {
        filename: string,
        format?: string | 'universal',
        graphRewriter?: (graphURI: string | null) => string,
        onPrefix?: (prefix: string, iri: string) => void,
        onBase?: (iri: string) => void
    }): Promise<{ triples: number, graphs: string[] }> {

        let tripleCount = 0;
        const format = options.format === 'universal' ? this.detectFormat(options.filename) : (options.format as ParseFormat || 'Turtle');

        const reificationMap = new Map<any, any>();
        const partsMap = new Map<any, { s?: any, p?: any, o?: any }>();
        const pendingLinks: { s: any, p: any, o: any, g: any }[] = [];

        const RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
        const RDF_SUBJECT = this.factory.namedNode(RDF_NS + 'subject');
        const RDF_PREDICATE = this.factory.namedNode(RDF_NS + 'predicate');
        const RDF_OBJECT = this.factory.namedNode(RDF_NS + 'object');
        const RDF_TYPE = this.factory.namedNode(RDF_NS + 'type');
        const RDF_STATEMENT = this.factory.namedNode(RDF_NS + 'Statement');

        const bnodeCache = new Map<string, any>();

        const getOrCreateBNode = (label: string): any => {
            if (bnodeCache.has(label)) return bnodeCache.get(label)!;
            const bnode = this.factory.blankNode(label);
            bnodeCache.set(label, bnode);
            return bnode;
        };

        const toInternal = (term: any): any => {
            if (!term) return 0n;
            if (term.termType === 'Triple' || term.termType === 'Quad') {
                const s = toInternal(term.subject);
                const p = toInternal(term.predicate);
                const o = toInternal(term.object);
                return this.factory.triple(s, p, o);
            }
            if (term.termType === 'Literal') {
                return this.factory.literal(term.value, term.datatype?.value, term.language);
            }
            if (term.termType === 'BlankNode') {
                if (term.subject && term.predicate && term.object) {
                    return this.factory.triple(
                        toInternal(term.subject),
                        toInternal(term.predicate),
                        toInternal(term.object)
                    );
                }
                return getOrCreateBNode(term.value || term.id);
            }
            return this.factory.namedNode(term.value || term.id);
        };

        /** Count quads from store.match() which returns an iterator, not an array. */
        const countMatches = (...args: any[]): number => {
            let c = 0;
            for (const _ of this.store.match(...args)) c++;
            return c;
        };

        const RESULT_REIFIES = this.factory.namedNode(RDF_NS + 'reifies');
        const RESULT_OCCURRENCE_OF = this.factory.namedNode('http://www.w3.org/ns/rdf-star#occurrenceOf');

        const result = await this.parser.parse(content, format, (quad) => {
            const s = toInternal(quad.subject);
            const p = toInternal(quad.predicate);
            const o = toInternal(quad.object);

            if (p === RESULT_REIFIES || p === RESULT_OCCURRENCE_OF) {
                // Handled after graph resolution below — fall through
            }
            else if (p === RDF_SUBJECT || p === RDF_PREDICATE || p === RDF_OBJECT) {
                const parts = partsMap.get(s) || {};
                if (p === RDF_SUBJECT) parts.s = o;
                if (p === RDF_PREDICATE) parts.p = o;
                if (p === RDF_OBJECT) parts.o = o;
                partsMap.set(s, parts);

                if (parts.s && parts.p && parts.o) {
                    const triple = this.factory.triple(parts.s, parts.p, parts.o);
                    reificationMap.set(s, triple);
                }
                return;
            }

            if (p === RDF_TYPE && o === RDF_STATEMENT) return;

            const originalGraph = quad.graph ? (typeof quad.graph === 'string' ? quad.graph : quad.graph.value) : null;
            const targetGraphURI = options.graphRewriter ? options.graphRewriter(originalGraph) : originalGraph;
            const g = targetGraphURI ? this.factory.namedNode(targetGraphURI) : (this.factory.defaultGraph?.() || 0n);

            if (p === RESULT_REIFIES || p === RESULT_OCCURRENCE_OF) {
                try {
                    const decoded = this.factory.decode(o);
                    if (decoded.termType === 'Triple') {
                        reificationMap.set(s, o);
                    }
                } catch { /* BNode proxy — resolved in Pass 2 */ }
                pendingLinks.push({ s, p, o, g });
                return;
            }

            this.store.add(s, p, o, g);
            tripleCount++;

        }, {
            onPrefix: options.onPrefix,
            onBase: options.onBase
        });

        // PASS 2a: BNode Proxy Object Fixup.
        // N3.js may decompose <<(S P O)>> into: _:proxy rdf:reifies <<triple>> + subject pred _:proxy
        // Non-reification quads (e.g. Istanbul hasSubUnit _:proxy) store a BNode object
        // instead of TripleID. This pass replaces those proxy references with the real TripleID.
        for (const [proxyID, tripleID] of reificationMap) {
            const quadsWithProxy: any[] = Array.from(this.store.match(null, null, proxyID, null));
            for (const q of quadsWithProxy) {
                this.store.delete(q[0], q[1], q[2], q[3]);
                this.store.add(q[0], q[1], tripleID, q[3]);
            }
        }

        // PASS 2b: Unify reification links, collapse proxies, and prune ghost BNodes.
        // Branch A collapses double indirection: realBNode → ghostProxy → TripleID.
        // Branch B prunes ghost BNodes that have no metadata in the store.
        for (const link of pendingLinks) {
            let finalO = link.o;

            if (reificationMap.has(link.o)) {
                // A. Double Indirection Collapse: O is a proxy BNode → resolve to real Triple
                finalO = reificationMap.get(link.o);

                if (reificationMap.has(link.s)) {
                    const metaCount = countMatches(link.s, null, null, null)
                                    + countMatches(null, null, link.s, null);
                    if (metaCount === 0) continue;
                }
            }
            else if (reificationMap.has(link.s)) {
                // B. Ghost BNode Pruning: S is in reificationMap (so it's a proxy for a Triple),
                //    O is already a TripleID, and S has NO metadata → skip this ghost.
                try {
                    const decoded = this.factory.decode(finalO);
                    if (decoded.termType === 'Triple') {
                        const metaCount = countMatches(link.s, null, null, null)
                                        + countMatches(null, null, link.s, null);
                        if (metaCount === 0) continue;
                    }
                } catch { /* not a triple term, write normally */ }
            }

            this.store.add(link.s, link.p, finalO, link.g);
            tripleCount++;
        }

        return {
            triples: tripleCount,
            graphs: result.graphs
        };
    }

    private detectFormat(filename: string): ParseFormat {
        const ext = filename.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'ttl': return 'Turtle';
            // N-Triples-star is a subset of Turtle but N3.js N-Triples parser is too strict.
            case 'nt': return 'Turtle';
            case 'nq': return 'N-Quads';
            case 'trig': return 'TriG';
            case 'rdf':
            case 'owl':
            case 'xml': return 'RDF/XML';
            case 'jsonld':
            case 'json': return 'JSON-LD';
            default: return 'Turtle';
        }
    }
}
