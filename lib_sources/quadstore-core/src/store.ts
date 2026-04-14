import { IQuadStore, NodeID, DEFAULT_GRAPH, Quad, DataEvent, EventSource } from './types';
import { Index } from './indices';

export class QuadStore implements IQuadStore {
    private capacity: number;
    private _size: number;


    private s: BigUint64Array;
    private p: BigUint64Array;
    private o: BigUint64Array;
    private g: BigUint64Array;


    private idxS: Index;
    private idxP: Index;
    private idxO: Index;
    private idxG: Index;

    // 5th Column (Status): 0 = Active, 1 = Deleted
    private status: Uint8Array;

    private listeners: ((event: DataEvent) => void)[] = [];

    constructor(initialCapacity: number = 1024) {
        this.capacity = initialCapacity;
        this._size = 0;


        this.s = new BigUint64Array(initialCapacity);
        this.p = new BigUint64Array(initialCapacity);
        this.o = new BigUint64Array(initialCapacity);
        this.g = new BigUint64Array(initialCapacity);


        this.idxS = new Index();
        this.idxP = new Index();
        this.idxO = new Index();
        this.idxG = new Index();

        this.status = new Uint8Array(initialCapacity);
    }

    get size(): number {
        return this._size;
    }

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

    /**
     * Adds a quad to the store.
     * Uses Indices for existence check (Intersection of S, P, O, G location lists).
     */
    add(subject: NodeID, predicate: NodeID, object: NodeID, graph: NodeID = DEFAULT_GRAPH, source: EventSource = 'user'): boolean {


        if (this.fastExists(subject, predicate, object, graph)) {
            return false;
        }

        this.ensureCapacity();


        const idx = this._size;
        this.s[idx] = subject;
        this.p[idx] = predicate;
        this.o[idx] = object;
        this.g[idx] = graph;


        this.idxS.add(subject, idx);
        this.idxP.add(predicate, idx);
        this.idxO.add(object, idx);
        this.idxG.add(graph, idx);

        this._size++;

        this.emit({
            type: 'add',
            quads: [{ subject, predicate, object, graph }],
            source
        });

        return true;
    }

    addQuads(quads: Quad[], source: EventSource = 'user'): number {
        const added: Quad[] = [];

        for (const q of quads) {
            if (this.fastExists(q.subject, q.predicate, q.object, q.graph)) continue;

            this.ensureCapacity();

            const idx = this._size;
            this.s[idx] = q.subject;
            this.p[idx] = q.predicate;
            this.o[idx] = q.object;
            this.g[idx] = q.graph;

            this.idxS.add(q.subject, idx);
            this.idxP.add(q.predicate, idx);
            this.idxO.add(q.object, idx);
            this.idxG.add(q.graph, idx);

            this._size++;
            added.push(q);
        }

        if (added.length > 0) {
            this.emit({
                type: 'add',
                quads: added,
                source
            });
        }
        return added.length;
    }

    delete(subject: NodeID, predicate: NodeID, object: NodeID, graph: NodeID = DEFAULT_GRAPH, source: EventSource = 'user'): boolean {
        const candidates = this.getIndicesForPattern(subject, predicate, object, graph) ?? [];

        if (candidates.length === 0) return false;

        // Find the first index that is NOT already marked as deleted
        let idxToDelete = -1;
        for (const idx of candidates) {
            if (this.status[idx] === 0) {
                idxToDelete = idx;
                break;
            }
        }

        if (idxToDelete === -1) return false;

        // O(1) Deletion: Mark as Tombstone
        this.status[idxToDelete] = 1;

        // We could also remove it from indices here, or wait for Vacuum.
        // For strict correctness in current model, we remove it from indices now.
        this.idxS.remove(subject, idxToDelete);
        this.idxP.remove(predicate, idxToDelete);
        this.idxO.remove(object, idxToDelete);
        this.idxG.remove(graph, idxToDelete);

        this.emit({
            type: 'delete',
            quads: [{ subject, predicate, object, graph }],
            source
        });

        return true;
    }

    *match(subject: NodeID | null, predicate: NodeID | null, object: NodeID | null, graph: NodeID | null = null): Iterable<[NodeID, NodeID, NodeID, NodeID]> {
        const candidates = this.getIndicesForPattern(subject, predicate, object, graph);

        if (candidates === undefined) {
            for (let i = 0; i < this._size; i++) {
                if (this.status[i] === 0) { // Skip Tombstones
                    yield [this.s[i], this.p[i], this.o[i], this.g[i]];
                }
            }
        } else {
            for (const i of candidates) {
                // If we remove from indices during delete(), we don't strictly need this check,
                // but it's safer for concurrent vacuum.
                if (this.status[i] === 0) {
                    yield [this.s[i], this.p[i], this.o[i], this.g[i]];
                }
            }
        }
    }

    has(subject: NodeID, predicate: NodeID, object: NodeID, graph: NodeID = DEFAULT_GRAPH): boolean {
        return this.fastExists(subject, predicate, object, graph);
    }

    hasAny(subject: NodeID, predicate: NodeID, object: NodeID): boolean {
        return this.fastExists(subject, predicate, object, null as any);
    }

    clearGraph(graphID: NodeID, source: EventSource = 'user'): number {

        const indices = this.idxG.get(graphID);
        if (!indices || indices.length === 0) return 0;

        const toDeleteIndices = [...indices];
        // Determine quads to emit for event
        const deletedQuads: Quad[] = [];







        let count = 0;



        for (const idx of toDeleteIndices) {
            const s = this.s[idx];
            const p = this.p[idx];
            const o = this.o[idx];
            const g = this.g[idx];


            if (this.delete(s, p, o, g, source)) {
                count++;
                deletedQuads.push({ subject: s, predicate: p, object: o, graph: g });
            }
        }


        return count;
    }

    /**
     * Moves all quads from sourceGraphId to targetGraphId.
     * This is an O(N_source) operation that modifies the graph ID array directly and updates the graph index.
     * Important: This bypasses Event emission for individual quads to avoid memory overhead.
     */
    moveQuads(sourceGraphId: NodeID, targetGraphId: NodeID): number {
        const sourceIndices = this.idxG.get(sourceGraphId);
        if (!sourceIndices || sourceIndices.length === 0) return 0;

        const indicesToMove = [...sourceIndices]; // Clone the list since we will be mutating the index
        const count = indicesToMove.length;

        for (const idx of indicesToMove) {
            // Update the graph column
            this.g[idx] = targetGraphId;


            this.idxG.remove(sourceGraphId, idx);
            this.idxG.add(targetGraphId, idx);
        }



        return count;
    }

    // --- Helpers ---

    private fastExists(s: NodeID, p: NodeID, o: NodeID, g: NodeID): boolean {
        const matches = this.getIndicesForPattern(s, p, o, g) ?? [];
        return matches.length > 0;
    }

    /**
     * Returns the intersection of indices for the non-null terms.
     */
    private getIndicesForPattern(s: NodeID | null, p: NodeID | null, o: NodeID | null, g: NodeID | null): number[] | undefined {


        let candidates: number[] | undefined;

        // Helper to intersect current candidates with new list
        const refine = (list: readonly number[] | undefined) => {
            if (!list) {
                candidates = []; // Term not found -> 0 results
                return;
            }
            if (candidates === undefined) {
                candidates = [...list]; // Initialize
            } else {
                candidates = Index.intersect(candidates, list);
            }
        };

        if (s !== null) refine(this.idxS.get(s));

        if (candidates !== undefined && candidates.length === 0) return [];

        if (p !== null) refine(this.idxP.get(p));
        if (candidates !== undefined && candidates.length === 0) return [];

        if (o !== null) refine(this.idxO.get(o));
        if (candidates !== undefined && candidates.length === 0) return [];

        if (g !== null) refine(this.idxG.get(g));



        return candidates; // undefined (Universe) or number[] (Specific)
    }

    private ensureCapacity() {
        if (this._size >= this.capacity) {
            const newCap = this.capacity * 2;
            const newS = new BigUint64Array(newCap);
            const newP = new BigUint64Array(newCap);
            const newO = new BigUint64Array(newCap);
            const newG = new BigUint64Array(newCap);
            const newStatus = new Uint8Array(newCap);

            // Mini-Vacuum during resize: 
            // We could Just copy everything, but compaction here is better.
            let activeIdx = 0;
            
            // Clear indices and rebuild them for fresh start (compaction changes pointers!)
            this.idxS.clear();
            this.idxP.clear();
            this.idxO.clear();
            this.idxG.clear();

            for (let i = 0; i < this._size; i++) {
                if (this.status[i] === 0) {
                    newS[activeIdx] = this.s[i];
                    newP[activeIdx] = this.p[i];
                    newO[activeIdx] = this.o[i];
                    newG[activeIdx] = this.g[i];
                    newStatus[activeIdx] = 0;

                    this.idxS.add(newS[activeIdx], activeIdx);
                    this.idxP.add(newP[activeIdx], activeIdx);
                    this.idxO.add(newO[activeIdx], activeIdx);
                    this.idxG.add(newG[activeIdx], activeIdx);

                    activeIdx++;
                }
            }

            this.s = newS;
            this.p = newP;
            this.o = newO;
            this.g = newG;
            this.status = newStatus;
            this._size = activeIdx;
            this.capacity = newCap;
        }
    }
}
