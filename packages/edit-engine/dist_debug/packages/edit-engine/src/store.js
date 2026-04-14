import { DEFAULT_GRAPH } from '@triplestore/core';
import { CompositeStore } from '@triplestore/session';
export class OverlayStore {
    mainStore;
    session = null;
    listeners = [];
    constructor(mainStore) {
        this.mainStore = mainStore;
    }
    get size() {
        // Approximate size is difficult with deletes.
        // Return main size + session size (additions) as rough estimate
        if (!this.session)
            return this.mainStore.size;
        return this.mainStore.size + this.session.size; // Ignores deletions/overlaps
    }
    attachSession(session) {
        this.session = session;
    }
    detachSession() {
        this.session = null;
    }
    add(subject, predicate, object, graph = DEFAULT_GRAPH, source = 'user') {
        if (!this.session) {
            console.warn("[OverlayStore] No active session. Write ignored.");
            return false;
        }
        this.session.add(subject, predicate, object, graph, source);
        this.emit({ type: 'add', quads: [{ subject, predicate, object, graph }], source });
        return true;
    }
    addQuads(quads, source = 'user') {
        if (!this.session)
            return 0;
        let count = 0;
        for (const q of quads) {
            if (this.session.add(q.subject, q.predicate, q.object, q.graph, source))
                count++;
        }
        this.emit({ type: 'add', quads, source });
        return count;
    }
    delete(subject, predicate, object, graph = DEFAULT_GRAPH, source = 'user') {
        if (!this.session)
            return false;
        this.session.delete(subject, predicate, object, graph, source);
        this.emit({ type: 'delete', quads: [{ subject, predicate, object, graph }], source });
        return true;
    }
    clearGraph(_graph, _source = 'user') {
        console.warn("[OverlayStore] clearGraph not fully supported in Overlay yet.");
        return 0;
    }
    moveQuads(_sourceGraphId, _targetGraphId) {
        console.warn("[OverlayStore] moveQuads not fully supported in Overlay yet.");
        return 0;
    }
    *match(subject, predicate, object, graph = null) {
        const composite = new CompositeStore(this.mainStore, this.session);
        yield* composite.match(subject, predicate, object, graph);
    }
    has(subject, predicate, object, graph = DEFAULT_GRAPH) {
        const composite = new CompositeStore(this.mainStore, this.session);
        return composite.has(subject, predicate, object, graph);
    }
    hasAny(subject, predicate, object) {
        const composite = new CompositeStore(this.mainStore, this.session);
        return composite.hasAny(subject, predicate, object);
    }
    // --- Events ---
    on(_event, listener) {
        this.listeners.push(listener);
    }
    off(_event, listener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }
    emit(event) {
        for (const listener of this.listeners) {
            listener(event);
        }
    }
}
//# sourceMappingURL=store.js.map
