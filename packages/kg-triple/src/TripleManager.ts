import { NodeID, IQuadStore, IDataFactory, DEFAULT_GRAPH } from '@triplestore/core';
import { DraftStore, CompositeStore } from '@triplestore/session';

export class TripleManager {
    constructor(
        private store: IQuadStore,
        private factory: IDataFactory
    ) {}

    addTriple(session: DraftStore, s: NodeID, p: NodeID, o: NodeID, targetGraphNode?: NodeID): void {
        const target = targetGraphNode || DEFAULT_GRAPH;
        let exists = false;
        
        for (const _ of this.store.match(s, p, o, null)) {
            exists = true;
            break;
        }

        if (exists) {
            session.undelete(s, p, o, target);
        } else {
            session.add(s, p, o, target);
        }
    }

    removeTriple(session: DraftStore, s: NodeID, p: NodeID, o: NodeID, targetGraphNode?: NodeID): boolean {
        const composite = new CompositeStore(this.store, session);
        const quads = composite.match(s, p, null, targetGraphNode || null);
        let removed = false;

        for (const raw of quads) {
            try {
                // Ignore Inference Graphs
                const gVal = this.factory.decode(raw[3]).value;
                if (gVal.includes('/inference/')) continue;
            } catch {}

            // Object check: Compare values if it's literal fallback, or direct ID match
            const oVal = this.factory.decode(raw[2]).value;
            const targetVal = this.factory.decode(o).value;

            if (oVal === targetVal) {
                session.delete(raw[0], raw[1], raw[2], raw[3]);
                removed = true;
            }
        }
        
        return removed;
    }

    /**
     * Identity Shift Migration:
     * When a triple's S, P, or O is edited, its BigInt ID changes.
     * This method creates the new triple, and migrates all RDF-star annotations
     * pointing to the OLD triple ID to the NEW triple ID.
     */
    migrateIdentity(session: DraftStore, oldS: NodeID, oldP: NodeID, oldO: NodeID, newS: NodeID, newP: NodeID, newO: NodeID, targetGraphNode?: NodeID): void {
        const oldId = (this.factory as any).triple(oldS, oldP, oldO) as NodeID;
        const newId = (this.factory as any).triple(newS, newP, newO) as NodeID;
        
        // 1. Remove Old Statement from target graph (or all if omitted, but let's stick to simple remove)
        this.removeTriple(session, oldS, oldP, oldO, targetGraphNode);

        // 2. Add New Statement
        this.addTriple(session, newS, newP, newO, targetGraphNode);

        // 3. Migrate all Annotations (Triples where oldId is Subject or Object)
        // Usually annotations use the triple as Subject.
        const composite = new CompositeStore(this.store, session);
        const asSubject = composite.match(oldId, null, null, null);
        
        for (const q of asSubject) {
            session.delete(q[0], q[1], q[2], q[3]);
            session.add(newId, q[1], q[2], q[3]);
        }
        
        // If the triple was ever used as an Object in another annotation:
        const asObject = composite.match(null, null, oldId, null);
        for (const q of asObject) {
            session.delete(q[0], q[1], q[2], q[3]);
            session.add(q[0], q[1], newId, q[3]);
        }
    }
}
