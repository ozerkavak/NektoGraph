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
    labels: string[]; // Best available label
    description?: string; // Snippet
    score: number;
    source: 'store' | 'session';
    isClassMatch?: boolean;
    debugReason?: string;
    matchedText?: string;
}

interface ISchemaIndex {
    getSubClassesRecursive(cls: NodeID): NodeID[];
}

export class UnifiedSearch {
    private index: Map<string, NodeID[]> = new Map();
    private reverseIndex: Map<NodeID, Set<string>> = new Map();
    private indexBuilt = false;
    
    private mainStore: IQuadStore;
    private factory: IDataFactory;
    private schemaIndex?: ISchemaIndex;

    // Pre-calculated NodeIDs for fast comparison
    private rdfsLabelID: NodeID;
    private rdfsCommentID: NodeID;
    private rdfTypeID: NodeID;
    private propertyTypeIDs: NodeID[] = [];

    // [FIX] Professional Unified Normalization (Turkish Aware v5.0)
    private normalize(s: string): string {
        if (!s) return "";
        // 1. Initial decomposition for accents
        let norm = s.normalize('NFD').replace(/[\u0300-\u036f]/g, "");

        // 2. Turkish-aware lowercasing
        norm = norm.toLocaleLowerCase('tr-TR');

        // 3. Robust Turkish mapping (Dotted/Dotless I and others)
        const mapping: Record<string, string> = {
            'ı': 'i',
            'ğ': 'g',
            'ü': 'u',
            'ş': 's',
            'ö': 'o',
            'ç': 'c',
            'İ': 'i',
            'I': 'i'
        };

        return norm
            .split('')
            .map(char => mapping[char] || char)
            .join('')
            .replace(/[^a-z0-9]/g, " ") // All non-alphanumeric to spaces
            .replace(/\s+/g, " ")       // Collapse multiple spaces
            .trim();
    }

    constructor(config: {
        store: IQuadStore,
        factory: IDataFactory,
        schemaIndex?: ISchemaIndex
    }) {
        this.mainStore = config.store;
        this.factory = config.factory;
        this.schemaIndex = config.schemaIndex;
        // Pre-calculate IDs
        this.rdfsLabelID = this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#label');
        this.rdfsCommentID = this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#comment');
        this.rdfTypeID = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');

        const propertyTypes = [
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#Property',
            'http://www.w3.org/2002/07/owl#ObjectProperty',
            'http://www.w3.org/2002/07/owl#DatatypeProperty',
            'http://www.w3.org/2002/07/owl#AnnotationProperty'
        ];
        this.propertyTypeIDs = propertyTypes.map(uri => this.factory.namedNode(uri));
    }

    /**
     * Builds a simple Prefix Index for O(1) lookups.
     * This is an expensive operation and should be called lazily or on data load.
     */
    public buildIndex() {
        if (this.indexBuilt) return;

        this.index.clear();
        this.reverseIndex.clear();

        // Scan Store for Content (Index ALL Literals + URI Fragments)
        for (const [s, _p, o] of this.mainStore.match(null, null, null, null)) {
            const oTerm = this.factory.decode(o);

            // Index ALL Literals (pointing to Subject)
            if (oTerm.termType === 'Literal') {
                const words = oTerm.value.split(/[\s\-_]+/);
                words.forEach((w: string) => this.addToIndexInternal(w, s));
            }

            // Also index OBJECT URI fragments (pointing to Object)
            if (oTerm.termType === 'NamedNode') {
                const frag = oTerm.value.split('#').pop() || oTerm.value.split('/').pop();
                if (frag) this.addToIndexInternal(frag, o);
            }

            // Also index SUBJECT fragments (pointing to Subject)
            const sTerm = this.factory.decode(s);
            if (sTerm.termType === 'NamedNode') {
                const frag = sTerm.value.split('#').pop() || sTerm.value.split('/').pop();
                if (frag) {
                    this.addToIndexInternal(frag, s);
                }
            }
        }

        this.indexBuilt = true;
    }

    public invalidateIndex() {
        this.indexBuilt = false;
        this.index.clear();
        this.reverseIndex.clear();
    }

    /**
     * Internal: Adds a token to both forward and reverse indices.
     */
    private addToIndexInternal(token: string, id: NodeID) {
        if (!token) return;
        const key = this.normalize(token);
        if (key.length < 2) return;

        // 1. Forward Index (Token -> IDs)
        if (!this.index.has(key)) this.index.set(key, []);
        const list = this.index.get(key)!;
        if (!list.includes(id)) {
            list.push(id);
        }

        // 2. Reverse Index (ID -> Tokens) for efficient cleanup
        if (!this.reverseIndex.has(id)) {
            this.reverseIndex.set(id, new Set());
        }
        this.reverseIndex.get(id)!.add(key);
    }

    /**
     * Removes an entity from the search index.
     */
    public removeEntityIndex(id: NodeID) {
        const tokens = this.reverseIndex.get(id);
        if (!tokens) return;

        for (const token of tokens) {
            const list = this.index.get(token);
            if (list) {
                const idx = list.indexOf(id);
                if (idx !== -1) {
                    list.splice(idx, 1);
                    if (list.length === 0) {
                        this.index.delete(token);
                    }
                }
            }
        }
        this.reverseIndex.delete(id);
    }

    /**
     * Incrementally updates the search index for a specific entity.
     * Can optionally include data from a session (DraftStore).
     */
    public updateEntityIndex(id: NodeID, sessionStore?: any) {
        // 1. Clean up existing index for this entity
        this.removeEntityIndex(id);

        // 2. Index URI fragment of the entity itself (Subject)
        try {
            const sTerm = this.factory.decode(id);
            if (sTerm.termType === 'NamedNode') {
                const frag = sTerm.value.split('#').pop() || sTerm.value.split('/').pop();
                if (frag) this.addToIndexInternal(frag, id);
            }
        } catch (e) {}

        // 3. Helper to scan store and index literals/resources
        const scanAndIndex = (store: any) => {
            if (!store) return;
            // 3a. Index Subject-related content
            for (const [s, _p, o] of store.match(id, null, null, null)) {
                try {
                    const oTerm = this.factory.decode(o);
                    if (oTerm.termType === 'Literal') {
                        const words = oTerm.value.split(/[\s\-_]+/);
                        words.forEach((w: string) => this.addToIndexInternal(w, s));
                    } else if (oTerm.termType === 'NamedNode') {
                        const frag = oTerm.value.split('#').pop() || oTerm.value.split('/').pop();
                        if (frag) this.addToIndexInternal(frag, o);
                    }
                } catch (e) {}
            }
            // 3b. Index Object-related fragments if entity is used as an object
            for (const [_s, _p, o] of store.match(null, null, id, null)) {
                try {
                    const oTerm = this.factory.decode(o);
                    if (oTerm.termType === 'NamedNode') {
                        const frag = oTerm.value.split('#').pop() || oTerm.value.split('/').pop();
                        if (frag) this.addToIndexInternal(frag, o);
                    }
                } catch (e) {}
            }
        };

        // 4. Scan Main Store
        scanAndIndex(this.mainStore);

        // 5. Scan Session Store (if provided)
        if (sessionStore) {
            scanAndIndex(sessionStore);
        }
    }

    /**
     * Executes a search with strict priority:
     * 1. Match in Label (Selected Language)
     * 2. Match in Label (Any Language)
     * 3. Match in Description/Comment
     * 4. Match in URI / Other Literals
     */
    async search(
        mainStore: IQuadStore,
        query: string,
        options: {
            language?: 'en' | 'tr',
            preferredClass?: NodeID,
            session?: IQuadStore | null,
            strictTypes?: boolean,
            suppressDescription?: boolean
        } = {}

    ): Promise<SearchResult[]> {
        const results: Map<bigint, SearchResult> = new Map();
        const queryNorm = this.normalize(query);
        const queryTerms = queryNorm.split(/\s+/).filter(t => t.length >= 1);
        const { language = 'en', preferredClass, session, strictTypes, suppressDescription } = options;

        if (queryNorm.length < 2) return [];

        let storeToScan = mainStore;
        // Session is passed explicitly now

        // Match Polymorphic
        let allowedClasses: Set<NodeID> | null = null;
        if (preferredClass && this.schemaIndex) {
            allowedClasses = new Set<NodeID>();
            allowedClasses.add(preferredClass);
            const subclasses = this.schemaIndex.getSubClassesRecursive(preferredClass);
            if (subclasses) subclasses.forEach(c => allowedClasses!.add(c));
        }

        const labelCache = new Map<NodeID, string | null>();

        const isValidEntity = (id: NodeID): boolean => {
            try {
                const term = this.factory.decode(id);
                return term.termType === 'NamedNode' || term.termType === 'BlankNode';
            } catch { return false; }
        };

        const getBestLabel = (s: NodeID, session: IQuadStore | null | undefined, store: IQuadStore): string | null => {
            if (labelCache.has(s)) return labelCache.get(s)!;

            let foundLabel: string | null = null;

            // 1. Session Lookup (Direct Match)
            if (session) {
                for (const q of session.match(s, this.rdfsLabelID, null, null)) {
                    const obj = this.factory.decode(q[2]);
                    if (obj.termType === 'Literal') {
                        if (obj.language === language) { foundLabel = obj.value; break; }
                        if (!foundLabel) foundLabel = obj.value; // Fallback to any lang in session
                    }
                }
            }

            if (!foundLabel) {
                // 2. Store Lookup (English/Target Lang)
                for (const q of store.match(s, this.rdfsLabelID, null, null)) {
                    const obj = this.factory.decode(q[2]);
                    if (obj.termType === 'Literal' && obj.language === language) { foundLabel = obj.value; break; }
                }
            }

            if (!foundLabel) {
                // 3. Store Lookup (Any Lang)
                for (const q of store.match(s, this.rdfsLabelID, null, null)) {
                    const obj = this.factory.decode(q[2]);
                    if (obj.termType === 'Literal') { foundLabel = obj.value; break; } // First found
                }
            }

            labelCache.set(s, foundLabel);
            return foundLabel;
        };

        const updateResult = (id: NodeID, score: number, matchedText: string, realLabel: string | null, reason: string, src: 'store' | 'session') => {
            if (!isValidEntity(id)) return;
            if (allowedClasses) {
                // OPTIMIZATION: Inverted Check
                // Instead of checking if entity is T1, T2, T3... (O(N_Classes * Log(Store)))
                // We fetch entity's types (O(1 * Log(Store))) and check if any is in allowedClasses (O(M_Types * 1))
                // Since M_Types is usually small (1-10) and N_Classes can be huge (1000s), this is much faster.

                let typeMatch = false;
                // Get all types of the entity
                for (const q of storeToScan.match(id, this.rdfTypeID, null, null)) {
                    if (allowedClasses.has(q[2])) {
                        typeMatch = true;
                        break;
                    }
                }

                if (!typeMatch) {
                    if (strictTypes) return; // STRICT FILTERING: Discard non-matching types
                    score -= 100; // Penalize but don't hide
                } else {
                    score += 500;
                    // Tag for UI Grouping
                }
            }

            let isProperty = false;
            // Pre-calculated propertyTypeIDs
            for (const tNode of this.propertyTypeIDs) {
                for (const _ of storeToScan.match(id, this.rdfTypeID, tNode, null)) {
                    isProperty = true;
                    break;
                }
                if (isProperty) break;
            }

            let label = realLabel;
            if (!label) {
                // Try cache first
                if (labelCache.has(id)) label = labelCache.get(id)!;
                else {
                    // Lazy fetch
                    label = getBestLabel(id, session, storeToScan);
                }
            }
            const finalLabel = label || this.factory.decode(id).value.split('#').pop() || 'Entity';

            const existing = results.get(id);

            // Snippet Logic for Descriptions
            let displayDesc: string | undefined = undefined;
            if (!isProperty && !suppressDescription) {
                if (reason.startsWith('Label')) {
                    displayDesc = undefined;
                } else if (reason === 'Description' && matchedText) {
                    // Create Snippet
                    const normMatched = this.normalize(matchedText);
                    // Match any term for snippet context? Or use the whole queryNorm?
                    // For snippet, we'll try to find the first significant term
                    const searchFor = queryTerms[0] || queryNorm.trim();
                    const idx = normMatched.indexOf(searchFor);
                    if (idx >= 0) {
                        const start = Math.max(0, idx - 30);
                        const end = Math.min(matchedText.length, idx + searchFor.length + 30);
                        displayDesc = (start > 0 ? '...' : '') + matchedText.substring(start, end) + (end < matchedText.length ? '...' : '');
                    } else {
                        displayDesc = matchedText.substring(0, 60) + (matchedText.length > 60 ? '...' : '');
                    }
                } else {
                    displayDesc = matchedText;
                }
            } else if (suppressDescription) {
                // If suppressed, we never show description even if matched
                displayDesc = undefined;
            }

            if (existing) {
                if (score > existing.score) {
                    existing.score = score;
                    existing.debugReason = reason;
                    existing.matchedText = matchedText;
                    if (reason.startsWith('Label')) {
                        existing.labels = [matchedText];
                        existing.description = undefined;
                    } else {
                        existing.description = displayDesc;
                    }
                }
            } else {
                results.set(id, { id, labels: [finalLabel], description: displayDesc, score, source: src, debugReason: reason, matchedText });
            }
        };

        const scanQuad = (s: NodeID, p: NodeID, o: NodeID, src: 'store' | 'session') => {
            try {
                // OPTIMIZATION: Decode PROPERY only if needed (not matching ID)
                // But we need to know if it is label/comment for ranking.
                // We use ID comparison for that.

                // We MUST decode Object to check valid match
                const oTerm = this.factory.decode(o);

                if (oTerm.termType === 'Literal') {
                    const normVal = this.normalize(oTerm.value);
                    // [FIX] AND logic: Check if ALL terms match
                    const allTermsMatch = queryTerms.every(term => normVal.includes(term));
                    if (allTermsMatch && queryTerms.length > 0) {
                        // [V5.1 RANKING] Exact Sequence Boost
                        let sequenceBoost = 0;
                        if (normVal.startsWith(queryNorm)) sequenceBoost = 1000;
                        else if (normVal.includes(queryNorm)) sequenceBoost = 500;

                        const isStart = normVal.startsWith(queryTerms[0]);
                        const startBoost = isStart ? 50 : 0;
                        const scorePadding = sequenceBoost + startBoost;

                        // ID Comparisons
                        if (p === this.rdfsLabelID) {
                            if (oTerm.language === language) updateResult(s, 100 + scorePadding, oTerm.value, oTerm.value, `Label (${language})`, src);
                            else updateResult(s, 80 + scorePadding, oTerm.value, oTerm.value, `Label (${oTerm.language})`, src);
                        } else if (p === this.rdfsCommentID) {
                            const realLabel = getBestLabel(s, session, storeToScan);
                            updateResult(s, 50 + scorePadding / 2, oTerm.value, realLabel, 'Description', src);
                        } else {
                            const realLabel = getBestLabel(s, session, storeToScan);
                            updateResult(s, 20 + scorePadding / 3, oTerm.value, realLabel, 'Other Property', src);
                        }
                    }
                } else if (oTerm.termType === 'NamedNode') {
                    // For URIs, we match queryTerms against the full URI or fragment
                    const uri = this.normalize(oTerm.value);
                    if (queryTerms.every(t => uri.includes(t)) && queryTerms.length > 0) {
                        const fragment = this.normalize(oTerm.value.split('#').pop() || oTerm.value.split('/').pop() || '');
                        const isStart = queryTerms.some(t => fragment.startsWith(t));
                        const realLabel = getBestLabel(o, session, storeToScan);
                        updateResult(o, 40 + (isStart ? 30 : 0), oTerm.value, realLabel, 'URI Match', src);
                    }
                }
            } catch (e) { }
        };

        const useIndex = this.indexBuilt; // Always use index for Main Store part if check implies it

        if (useIndex) {
            // A. Index Search (Hybrid Strategy)
            const candidates = new Set<NodeID>();

            // [FIX] Professional Multi-word Strategy
            // 1. Extract terms for index lookup.
            const queryTerms = queryNorm.trim().split(/\s+/).filter(t => t.length >= 1);
            const sortedTerms = [...queryTerms].sort((a, b) => b.length - a.length);
            const lookupTerm = sortedTerms.length > 0 ? sortedTerms[0] : queryNorm;

            for (const [token, ids] of this.index) {
                if (token.includes(lookupTerm)) {
                    ids.forEach(id => candidates.add(id));
                    if (candidates.size > 5000) break;
                }
            }

            // Verify Candidates (Re-scan their properties to score strictly)
            // BITWISE CONSTANTS (Matched to QuadStore Core)
            const MASK_TYPE = 0xF000000000000000n;
            const SHIFT_TYPE = 60n;
            const TYPE_URI = 0x1n;
            const TYPE_LITERAL = 0x3n;

            candidates.forEach(id => {
                // SINGLE-PASS SCAN OPTIMIZATION (Round 4)
                // 1. Iterate properties ONCE.
                // 2. Use Bitwise checks to avoid decoding non-Literals/URIs.
                // 3. Accumulate state (Labels, Match) to avoid redundant lookups.

                let bestLabel: string | null = null;
                let bestMatch: { score: number, text: string, reason: string } | null = null;

                // 1. Scan ALL properties of this candidate
                for (const [_, p, o] of this.mainStore.match(id, null, null, null)) {
                    const type = (o & MASK_TYPE) >> SHIFT_TYPE;

                    if (type === TYPE_LITERAL) {
                        try {
                            const oTerm = this.factory.decode(o);
                            if (p === this.rdfsLabelID) {
                                if (!bestLabel || oTerm.language === language) bestLabel = oTerm.value;
                            }

                            const normVal = this.normalize(oTerm.value);
                            if (queryTerms.every(term => normVal.includes(term))) {
                                // [V5.1 RANKING] Exact Sequence Boost
                                let sequenceBoost = 0;
                                if (normVal.startsWith(queryNorm)) sequenceBoost = 1000;
                                else if (normVal.includes(queryNorm)) sequenceBoost = 500;

                                const isStart = normVal.startsWith(queryTerms[0] || "");
                                const startBoost = isStart ? 50 : 0;
                                const scorePadding = sequenceBoost + startBoost;

                                let score = 0;
                                let reason = '';

                                if (p === this.rdfsLabelID) {
                                    score = (oTerm.language === language) ? 100 + scorePadding : 80 + scorePadding;
                                    reason = `Label (${oTerm.language})`;
                                } else if (p === this.rdfsCommentID) {
                                    score = 50 + scorePadding / 2;
                                    reason = 'Description';
                                } else {
                                    score = 20 + scorePadding / 3;
                                    reason = 'Other Property';
                                }
                                if (!bestMatch || score > bestMatch.score) {
                                    bestMatch = { score, text: oTerm.value, reason };
                                }
                            }
                        } catch { }
                    } else if (type === TYPE_URI) {
                        try {
                            const oTerm = this.factory.decode(o);
                            const uri = this.normalize(oTerm.value);
                            if (queryTerms.every(t => uri.includes(t))) {
                                const fragment = this.normalize(oTerm.value.split('#').pop() || oTerm.value.split('/').pop() || '');
                                const isStart = queryTerms.some(t => fragment.startsWith(t));
                                const score = 40 + (isStart ? 30 : 0);
                                if (!bestMatch || score > bestMatch.score) {
                                    bestMatch = { score, text: oTerm.value, reason: 'URI Match' };
                                }
                            }
                        } catch { }
                    }
                }

                // Subject URI check
                try {
                    const sTerm = this.factory.decode(id);
                    if (sTerm.termType === 'NamedNode') {
                        const val = this.normalize(sTerm.value);
                        if (queryTerms.every(t => val.includes(t))) {
                            const score = 40;
                            if (!bestMatch || score > bestMatch.score) {
                                bestMatch = { score, text: sTerm.value, reason: 'URI Match' };
                            }
                        }
                    }
                } catch { }

                // FINAL SUBMISSION
                if (bestMatch) {
                    // We pass 'bestLabel' to avoid updateResult having to fetching it again
                    updateResult(id, bestMatch.score, bestMatch.text, bestLabel, bestMatch.reason, 'store');
                }
            });

        } else {
            // B. Linear Scan (Fallback)
            let limit = 20000;
            for (const [s, p, o] of storeToScan.match(null, null, null, null)) {
                if (limit-- <= 0) break;
                scanQuad(s, p, o, 'store');

                try {
                    const sTerm = this.factory.decode(s);
                    if (sTerm.termType === 'NamedNode' && this.normalize(sTerm.value).includes(queryNorm)) {
                        const realLabel = getBestLabel(s, session, storeToScan);
                        updateResult(s, 40, sTerm.value, realLabel, 'URI Match', 'store');
                    }
                } catch { }
            }
        }

        if (session) {
            for (const raw of session.match(null, null, null, null)) {
                scanQuad(raw[0], raw[1], raw[2], 'session');
                // Also Check Subject URI (in session)
                try {
                    const sTerm = this.factory.decode(raw[0]);
                    if (sTerm.termType === 'NamedNode' && this.normalize(sTerm.value).includes(queryNorm)) {
                        const realLabel = getBestLabel(raw[0], session, storeToScan);
                        updateResult(raw[0], 40, sTerm.value, realLabel, 'URI Match', 'session');
                    }
                } catch { }
            }
        }

        const resultsArray = Array.from(results.values())
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 50); // Limit to top 50

        return resultsArray;
    }
}

// Expose to Window for Standalone & CVP
if (typeof window !== 'undefined') {
    (window as any).SearchLib = { UnifiedSearch };
}
