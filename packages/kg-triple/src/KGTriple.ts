import { NodeID, IQuadStore, IDataFactory } from '@triplestore/core';
import { DraftStore, CompositeStore } from '@triplestore/session';
import { IdentityMap } from './IdentityMap';

export interface TripleAnnotation {
    id: NodeID; // ID of the annotation statement itself
    subject: NodeID; // The actual subject of the annotation (TripleID, BNodeID, etc.)
    predicate: NodeID;
    object: NodeID;
    sourceGraph: NodeID;
}

export class KGTriple {
    public readonly id: NodeID;
    public readonly subject: NodeID;
    public readonly predicate: NodeID;
    public readonly object: NodeID;
    public proxyId?: NodeID;

    public graphs: Set<bigint> = new Set();
    public isDraft: boolean = false;
    public isInferred: boolean = false;

    // Metadata: Predicate -> Array of Annotations
    public annotations: Map<bigint, TripleAnnotation[]> = new Map();
    public isFullyHydrated: boolean = false;

    private constructor(id: NodeID, s: NodeID, p: NodeID, o: NodeID) {
        this.id = id;
        this.subject = s;
        this.predicate = p;
        this.object = o;
    }

    static getOrCreate(id: NodeID, s: NodeID, p: NodeID, o: NodeID): KGTriple {
        const existing = IdentityMap.get(id);
        if (existing) return existing;

        const instance = new KGTriple(id, s, p, o);
        IdentityMap.set(id, instance);
        return instance;
    }

    invalidate() {
        this.graphs.clear();
        this.annotations.clear();
        this.isFullyHydrated = false;
        this.isDraft = false;
        this.isInferred = false;
        this.proxyId = undefined;
    }

    load(store: IQuadStore, factory: IDataFactory, session?: DraftStore, depth: number = 0, proxyId?: NodeID): void {
        if (proxyId) this.proxyId = proxyId;
        if (this.isFullyHydrated) return;
        if (depth > 5) return;

        const composite = new CompositeStore(store, session || null);

        // -- HELPER: Recursive Unwrap (Agnostic Match) --
        const unwrap = (node: NodeID): NodeID => {
            let current = node;
            const visited = new Set<NodeID>();
            while (visited.size < 5) {
                if (visited.has(current)) break;
                visited.add(current);
                try { if (factory.decode(current).termType === 'Triple') return current; } catch { }
                let discovered = false;
                for (const rq of composite.match(current, null, null, null)) {
                    try {
                        const pURI = factory.decode(rq[1]).value;
                        if (pURI.endsWith('#reifies') || pURI.endsWith('#occurrenceOf')) {
                            current = rq[2];
                            discovered = true;
                            break;
                        }
                    } catch { }
                }
                if (!discovered) break;
            }
            return current;
        };

        // We promote the components of THIS triple instance if they are proxies
        (this as any).subject = unwrap(this.subject);
        (this as any).object = unwrap(this.object);

        // 1. Resolve Provenance
        const provenanceQuads = composite.match(this.subject, this.predicate, this.object, null);
        this.graphs.clear();
        for (const raw of provenanceQuads) {
            this.graphs.add(raw[3]);
            if (session && session.additions.has(raw[0], raw[1], raw[2], raw[3])) this.isDraft = true;
            try {
                const gVal = factory.decode(raw[3]).value;
                if (gVal.includes('/inference/')) this.isInferred = true;
            } catch { }
        }

        // 1.1 Resolve Proxy Provenance (Bundle Integrity)
        if (this.proxyId) {
            const proxyQuads = composite.match(this.proxyId, null, null, null);
            for (const pq of proxyQuads) {
                this.graphs.add(pq[3]);
            }
        }

        // 2. Resolve Annotations (Hydration)
        const proxySubjects = new Set<NodeID>([this.id]);
        
        if (this.proxyId) {
            // Context Isolation: Only pull annotations from the proxy BNode if the current triple 
            // is NOT already a direct annotation of that proxy.
            // If it IS an annotation of the proxy, we isolate to avoid "Sibling Leak".
            const term = factory.decode(this.id) as any;
            const isAnnotationOfProxy = term.termType === 'Triple' && term.subject === this.proxyId;
            
            if (!isAnnotationOfProxy) {
                proxySubjects.add(this.proxyId);
            }
        }
        
        const queue: NodeID[] = Array.from(proxySubjects);
        const visitedHydration = new Set<NodeID>();
        
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (visitedHydration.has(current)) continue;
            visitedHydration.add(current);
            
            for (const q of composite.match(null, null, current, null)) {
                try {
                    const pVal = factory.decode(q[1]).value;
                    if (pVal.endsWith('#occurrenceOf') || pVal.endsWith('#reifies')) {
                        const subject = q[0];
                        proxySubjects.add(subject);
                        queue.push(subject);
                    }
                } catch { }
            }
        }

        const yieldedAnnotations = new Set<string>();
        for (const proxySub of proxySubjects) {
            const annotationQuads = composite.match(proxySub, null, null, null);
            for (const raw of annotationQuads) {
                const p = raw[1];
                const o = raw[2];
                const g = raw[3];
                const pURI = factory.decode(p).value;
                if (pURI.endsWith('#occurrenceOf') || pURI.endsWith('#reifies') || pURI.endsWith('#type')) continue;

                // Even if not a direct assertion, the triple is "present" in any graph that annotates it
                this.graphs.add(g);

                const annKey = `${proxySub}_${p}_${o}_${g}`;
                if (yieldedAnnotations.has(annKey)) continue;
                yieldedAnnotations.add(annKey);

                let annId: NodeID;
                try {
                    annId = (factory as any).triple(proxySub, p, o);
                } catch { continue; }

                if (!this.annotations.has(p)) this.annotations.set(p, []);
                this.annotations.get(p)!.push({
                    id: annId,
                    subject: proxySub,
                    predicate: p,
                    object: o,
                    sourceGraph: g
                });

                const oTerm = factory.decode(o);
                if (oTerm.termType === 'Triple') {
                    KGTriple.getOrCreate(annId, proxySub, p, o);
                }
            }
        }
        this.isFullyHydrated = true;
    }
}
