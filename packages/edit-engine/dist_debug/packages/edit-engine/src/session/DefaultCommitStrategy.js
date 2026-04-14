import { DEFAULT_GRAPH } from '@triplestore/core';
import { TYPE_DELETION, PROP_SUBJECT, PROP_PREDICATE, PROP_OBJECT, PROP_TIMESTAMP, DEFAULT_WRITE_GRAPH } from './constants';
export class DefaultCommitStrategy {
    store;
    factory;
    diffStore;
    constructor(store, factory, diffStore) {
        this.store = store;
        this.factory = factory;
        this.diffStore = diffStore;
    }
    async execute(draft) {
        const timestamp = new Date().toISOString();
        const diffQuads = [];
        // Determine where to write logs
        const logTarget = this.diffStore || this.store;
        // 1. Process Deletions
        for (const key of draft.deletions) {
            const parts = key.split('_');
            if (parts.length < 4)
                continue;
            const s = BigInt(parts[0]);
            const p = BigInt(parts[1]);
            const o = BigInt(parts[2]);
            const g = BigInt(parts[3]);
            this.store.delete(s, p, o, g, 'user');
            const bnode = this.factory.blankNode();
            diffQuads.push({ subject: bnode, predicate: this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), object: this.factory.namedNode(TYPE_DELETION), graph: g }, { subject: bnode, predicate: this.factory.namedNode(PROP_SUBJECT), object: s, graph: g }, { subject: bnode, predicate: this.factory.namedNode(PROP_PREDICATE), object: p, graph: g }, { subject: bnode, predicate: this.factory.namedNode(PROP_OBJECT), object: o, graph: g }, { subject: bnode, predicate: this.factory.namedNode(PROP_TIMESTAMP), object: this.factory.literal(timestamp), graph: g });
        }
        // 2. Process Additions
        for (const raw of draft.additions.match(null, null, null, null)) {
            const q = { subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] };
            // FILTER: Never materialize quads produced by inference during session
            const key = `${q.subject}_${q.predicate}_${q.object}_${q.graph}`;
            if (draft.inferredAdditions.has(key)) {
                continue;
            }
            let targetGraph = q.graph;
            if (!this.isDefaultGraph(targetGraph)) {
                const graphUri = this.factory.decode(targetGraph).value;
                if (graphUri && graphUri.startsWith('http://example.org/graphs/inference/')) {
                    continue;
                }
            }
            if (this.isDefaultGraph(targetGraph)) {
                targetGraph = this.findAffinityGraph(q.subject);
            }
            const finalQuad = { ...q, graph: targetGraph };
            this.store.add(finalQuad.subject, finalQuad.predicate, finalQuad.object, finalQuad.graph, 'user');
            diffQuads.push(finalQuad);
        }
        // 3. Persist Diff Log
        if (diffQuads.length > 0) {
            logTarget.addQuads(diffQuads, 'system');
        }
    }
    isDefaultGraph(g) {
        return !g || g === DEFAULT_GRAPH;
    }
    findAffinityGraph(subject) {
        const quads = this.store.match(subject, null, null, null);
        for (const q of quads) {
            const g = q[3];
            if (!this.isDefaultGraph(g)) {
                return g;
            }
        }
        return this.factory.namedNode(DEFAULT_WRITE_GRAPH);
    }
}
//# sourceMappingURL=DefaultCommitStrategy.js.map
