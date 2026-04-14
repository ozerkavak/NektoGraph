import { IQuadStore, Quad, NodeID, QuadStore, EventSource, DataEvent } from '@triplestore/core';

export class DraftStore implements IQuadStore {
    public additions: QuadStore;
    public deletions: Set<string>; // Hashed keys: "s_p_o_g"
    public inferredAdditions: Set<string>; // Hashed keys of quads added via inference
    public id: string;
    private listeners: ((event: DataEvent) => void)[] = [];

    constructor(id: string) {
        this.id = id;
        this.additions = new QuadStore();
        this.deletions = new Set();
        this.inferredAdditions = new Set();

        this.additions.on('data', (event: DataEvent) => {
            this.emit(event);
        });
    }

    get size(): number {
        return this.additions.size;
    }

    private emit(event: DataEvent) {
        for (const listener of this.listeners) {
            try {
                listener(event);
            } catch (e) {
                console.error('[DraftStore] Listener Error:', e);
            }
        }
    }

    private hash(s: NodeID, p: NodeID, o: NodeID, g: NodeID = 0n): string {
        return `${s}_${p}_${o}_${g}`;
    }

    add(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID, source?: EventSource): boolean {
        const key = this.hash(subject, predicate, object, graph);
        if (this.deletions.has(key)) {
            this.deletions.delete(key);
        }

        if (source === 'inference') {
            this.inferredAdditions.add(key);
        } else {
            this.inferredAdditions.delete(key);
        }

        return this.additions.add(subject, predicate, object, graph, source);
    }

    delete(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID, source?: EventSource): boolean {
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

    undelete(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID): boolean {
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

    match(subject: NodeID | null, predicate: NodeID | null, object: NodeID | null, graph?: NodeID | null): Iterable<[NodeID, NodeID, NodeID, NodeID]> {
        return this.additions.match(subject, predicate, object, graph);
    }

    // Delegation / Stubs
    has(s: NodeID, p: NodeID, o: NodeID, g?: NodeID): boolean { return this.additions.has(s, p, o, g); }
    hasAny(s: NodeID, p: NodeID, o: NodeID): boolean { return this.additions.hasAny(s, p, o); }
    addQuads(quads: Quad[], source?: EventSource): number {
        let c = 0;
        for (const q of quads) if (this.add(q.subject, q.predicate, q.object, q.graph, source)) c++;
        return c;
    }
    clearGraph(graph: NodeID, source?: EventSource): number { return this.additions.clearGraph(graph, source); }

    moveQuads(sourceGraphId: NodeID, targetGraphId: NodeID): number {
        return this.additions.moveQuads(sourceGraphId, targetGraphId);
    }

    // EventEmitter Implementation
    on(_event: 'data', listener: (event: DataEvent) => void): void {
        this.listeners.push(listener);
    }
    off(_event: 'data', listener: (event: DataEvent) => void): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }
}

export class CompositeStore implements IQuadStore {
    constructor(private main: IQuadStore, private draft: DraftStore | undefined | null) { }

    *match(subject: NodeID | null, predicate: NodeID | null, object: NodeID | null, graph?: NodeID | null): Iterable<[NodeID, NodeID, NodeID, NodeID]> {
        const yielded = new Set<string>();

        // 1. Iterate Main
        for (const q of this.main.match(subject, predicate, object, graph)) {
            const key = `${BigInt(q[0])}_${BigInt(q[1])}_${BigInt(q[2])}_${BigInt(q[3])}`;
            if (this.draft) {
                if (this.draft.deletions.has(key)) continue; // Filter deleted
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
    add(): boolean { throw new Error('CompositeStore is read-only'); }
    delete(): boolean { throw new Error('CompositeStore is read-only'); }
    addQuads(): number { throw new Error('CompositeStore is read-only'); }
    clearGraph(): number { throw new Error('CompositeStore is read-only'); }
    moveQuads(): number { throw new Error('CompositeStore is read-only'); }

    // Logic for 'has' could be optimized, but default match check is safest
    has(s: NodeID, p: NodeID, o: NodeID, g?: NodeID): boolean {
        if (this.draft) {
            const key = `${s}_${p}_${o}_${g || 0n}`;
            if (this.draft.deletions.has(key)) return false;
            if (this.draft.has(s, p, o, g)) return true;
        }
        return this.main.has(s, p, o, g);
    }

    hasAny(s: NodeID, p: NodeID, o: NodeID): boolean {
        // Approximate
        return this.has(s, p, o);
    }

    // EventEmitter Stubs
    get size(): number { return 0; }
    on(_event: 'data', _listener: (event: DataEvent) => void): void { }
    off(_event: 'data', _listener: (event: DataEvent) => void): void { }
}
