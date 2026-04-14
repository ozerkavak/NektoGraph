import { QuadStore } from '@triplestore/core';
export class DraftStore {
    additions;
    deletions; // Hashed keys: "s_p_o_g"
    inferredAdditions; // Hashed keys of quads added via inference
    id;
    listeners = [];
    constructor(id) {
        this.id = id;
        this.additions = new QuadStore();
        this.deletions = new Set();
        this.inferredAdditions = new Set();
        this.additions.on('data', (event) => {
            this.emit(event);
        });
    }
    get size() {
        return this.additions.size;
    }
    emit(event) {
        for (const listener of this.listeners) {
            try {
                listener(event);
            }
            catch (e) {
                console.error('[DraftStore] Listener Error:', e);
            }
        }
    }
    hash(s, p, o, g = 0n) {
        return `${s}_${p}_${o}_${g}`;
    }
    add(subject, predicate, object, graph, source) {
        const key = this.hash(subject, predicate, object, graph);
        if (this.deletions.has(key)) {
            this.deletions.delete(key);
        }
        if (source === 'inference') {
            this.inferredAdditions.add(key);
        }
        else {
            this.inferredAdditions.delete(key);
        }
        return this.additions.add(subject, predicate, object, graph, source);
    }
    delete(subject, predicate, object, graph, source) {
        const key = this.hash(subject, predicate, object, graph);
        this.inferredAdditions.delete(key);
        // Remove from additions if present
        this.additions.delete(subject, predicate, object, graph, source);
        if (!this.deletions.has(key)) {
            this.deletions.add(key);
            this.emit({
                type: 'delete',
                quads: [{ subject, predicate, object, graph: graph || 0n }],
                source: source || 'user'
            });
            return true;
        }
        return false;
    }
    undelete(subject, predicate, object, graph) {
        const key = this.hash(subject, predicate, object, graph);
        if (this.deletions.has(key)) {
            this.deletions.delete(key);
            this.emit({
                type: 'add',
                quads: [{ subject, predicate, object, graph: graph || 0n }],
                source: 'user'
            });
            return true;
        }
        // Loose match check (Graph tolerance)
        const prefix = `${subject}_${predicate}_${object}_`;
        let found = false;
        // Optimization: This loop is slow for large deletions, acceptable for session size.
        for (const k of this.deletions) {
            if (k.startsWith(prefix)) {
                this.deletions.delete(k);
                // Extract graph from k to emit correct event?
                // const parts = k.split('_');
                // const gStr = parts[3]; // Crude parse
                // Since we have the BigInts passed in, we can try to trust them or parse k
                // Parsing k (string) back to Bigint is risky without factory.
                // We'll emit with the graph passed in arguments or default.
                this.emit({
                    type: 'add',
                    quads: [{ subject, predicate, object, graph: graph || 0n }],
                    source: 'user'
                });
                found = true;
            }
        }
        return found;
    }
    match(subject, predicate, object, graph) {
        return this.additions.match(subject, predicate, object, graph);
    }
    // Delegation / Stubs
    has(s, p, o, g) { return this.additions.has(s, p, o, g); }
    hasAny(s, p, o) { return this.additions.hasAny(s, p, o); }
    addQuads(quads, source) {
        let c = 0;
        for (const q of quads)
            if (this.add(q.subject, q.predicate, q.object, q.graph, source))
                c++;
        return c;
    }
    clearGraph(graph, source) { return this.additions.clearGraph(graph, source); }
    moveQuads(sourceGraphId, targetGraphId) {
        return this.additions.moveQuads(sourceGraphId, targetGraphId);
    }
    // EventEmitter Implementation
    on(_event, listener) {
        this.listeners.push(listener);
    }
    off(_event, listener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }
}
export class CompositeStore {
    main;
    draft;
    constructor(main, draft) {
        this.main = main;
        this.draft = draft;
    }
    *match(subject, predicate, object, graph) {
        const yielded = new Set();
        // 1. Iterate Main
        for (const q of this.main.match(subject, predicate, object, graph)) {
            const key = `${BigInt(q[0])}_${BigInt(q[1])}_${BigInt(q[2])}_${BigInt(q[3])}`;
            if (this.draft) {
                if (this.draft.deletions.has(key))
                    continue; // Filter deleted
            }
            yielded.add(key);
            yield q;
        }
        // 2. Iterate Draft
        if (this.draft) {
            for (const q of this.draft.match(subject, predicate, object, graph)) {
                // Force string conversion for robust key matching across types
                const key = `${BigInt(q[0])}_${BigInt(q[1])}_${BigInt(q[2])}_${BigInt(q[3])}`;
                if (!yielded.has(key)) {
                    yielded.add(key);
                    yield q;
                }
            }
        }
    }
    // Read-Only Stubs
    add() { throw new Error('CompositeStore is read-only'); }
    delete() { throw new Error('CompositeStore is read-only'); }
    addQuads() { throw new Error('CompositeStore is read-only'); }
    clearGraph() { throw new Error('CompositeStore is read-only'); }
    moveQuads() { throw new Error('CompositeStore is read-only'); }
    // Logic for 'has' could be optimized, but default match check is safest
    has(s, p, o, g) {
        if (this.draft) {
            const key = `${s}_${p}_${o}_${g || 0n}`;
            if (this.draft.deletions.has(key))
                return false;
            if (this.draft.has(s, p, o, g))
                return true;
        }
        return this.main.has(s, p, o, g);
    }
    hasAny(s, p, o) {
        // Approximate
        return this.has(s, p, o);
    }
    // EventEmitter Stubs
    get size() { return 0; }
    on(_event, _listener) { }
    off(_event, _listener) { }
}
