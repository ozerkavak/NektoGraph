import { IQuadStore, NodeID, Quad, DataEvent, EventSource, DEFAULT_GRAPH } from '@triplestore/core';
import { IOverlayStore } from './types';
import { DraftStore, CompositeStore } from '@triplestore/session';

export class OverlayStore implements IOverlayStore {
    private session: DraftStore | null = null;
    private listeners: ((event: DataEvent) => void)[] = [];

    constructor(private mainStore: IQuadStore) { }

    get size(): number {
        // Approximate size is difficult with deletes.
        // Return main size + session size (additions) as rough estimate
        if (!this.session) return this.mainStore.size;
        return this.mainStore.size + this.session.size; // Ignores deletions/overlaps
    }

    attachSession(session: DraftStore): void {
        this.session = session;
    }

    detachSession(): void {
        this.session = null;
    }

    add(subject: NodeID, predicate: NodeID, object: NodeID, graph: NodeID = DEFAULT_GRAPH, source: EventSource = 'user'): boolean {
        if (!this.session) {
            console.warn("[OverlayStore] No active session. Write ignored.");
            return false;
        }
        this.session.add(subject, predicate, object, graph, source);
        this.emit({ type: 'add', quads: [{ subject, predicate, object, graph }], source });
        return true;
    }

    addQuads(quads: Quad[], source: EventSource = 'user'): number {
        if (!this.session) return 0;
        let count = 0;
        for (const q of quads) {
            if (this.session.add(q.subject, q.predicate, q.object, q.graph, source)) count++;
        }
        this.emit({ type: 'add', quads, source });
        return count;
    }

    delete(subject: NodeID, predicate: NodeID, object: NodeID, graph: NodeID = DEFAULT_GRAPH, source: EventSource = 'user'): boolean {
        if (!this.session) return false;
        this.session.delete(subject, predicate, object, graph, source);
        this.emit({ type: 'delete', quads: [{ subject, predicate, object, graph }], source });
        return true;
    }

    clearGraph(_graph: NodeID, _source: EventSource = 'user'): number {
        console.warn("[OverlayStore] clearGraph not fully supported in Overlay yet.");
        return 0;
    }

    moveQuads(_sourceGraphId: NodeID, _targetGraphId: NodeID): number {
        console.warn("[OverlayStore] moveQuads not fully supported in Overlay yet.");
        return 0;
    }

    *match(subject: NodeID | null, predicate: NodeID | null, object: NodeID | null, graph: NodeID | null = null): Iterable<[NodeID, NodeID, NodeID, NodeID]> {
        const composite = new CompositeStore(this.mainStore, this.session);
        yield* composite.match(subject, predicate, object, graph);
    }

    has(subject: NodeID, predicate: NodeID, object: NodeID, graph: NodeID = DEFAULT_GRAPH): boolean {
        const composite = new CompositeStore(this.mainStore, this.session);
        return composite.has(subject, predicate, object, graph);
    }

    hasAny(subject: NodeID, predicate: NodeID, object: NodeID): boolean {
        const composite = new CompositeStore(this.mainStore, this.session);
        return composite.hasAny(subject, predicate, object);
    }

    // --- Events ---

    on(_event: 'data', listener: (event: DataEvent) => void): void {
        this.listeners.push(listener);
    }

    off(_event: 'data', listener: (event: DataEvent) => void): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    private emit(event: DataEvent) {
        for (const listener of this.listeners) {
            listener(event);
        }
    }
}
