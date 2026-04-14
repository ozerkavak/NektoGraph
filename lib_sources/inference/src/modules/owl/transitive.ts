import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '@triplestore/core';
import { InferenceModule } from '../../types';

export class TransitivePropertyModule implements InferenceModule {
    public readonly name = 'owl-transitive';
    public readonly targetGraphID: NodeID;

    private owlTransitiveProperty: NodeID;
    private rdfType: NodeID;

    private transitiveProperties = new Set<NodeID>();
    // Cache: Map<PropertyID, Map<SubjectID, Set<ObjectID>>>
    private closureCache = new Map<NodeID, Map<NodeID, Set<NodeID>>>();

    constructor(
        private store: IQuadStore,
        private factory: IDataFactory
    ) {
        this.targetGraphID = this.factory.namedNode('http://example.org/graphs/inference/owl-transitive');
        this.owlTransitiveProperty = this.factory.namedNode('http://www.w3.org/2002/07/owl#TransitiveProperty');
        this.rdfType = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    }

    process(event: DataEvent): { add: Quad[], remove: Quad[] } {
        const result = { add: [] as Quad[], remove: [] as Quad[] };

        if (event.type === 'add') {
            for (const q of event.quads) {
                // 1. Schema: New Transitive Property definition
                if (q.predicate === this.rdfType && q.object === this.owlTransitiveProperty) {
                    this.transitiveProperties.add(q.subject);
                    // Recompute for this property implies checking all instances
                    result.add.push(...this.recomputeForProperty(q.subject));
                }

                // 2. Data: Instance of a property
                if (this.transitiveProperties.has(q.predicate)) {
                    // Forward & Backward chaining for incremental updates
                    this.expandTransitive(q.subject, q.predicate, q.object, result.add);
                }
            }
        }
        else if (event.type === 'delete') {
            // TODO: Implement Truth Maintenance for Transitive Properties
            // Requires re-checking graph connectivity.
        }
        return result;
    }

    clear(): void {
        this.transitiveProperties.clear();
        this.closureCache.clear();
    }

    recompute(): Quad[] {
        this.clear();

        // 1. Identify all Transitive Properties
        const props = this.store.match(null, this.rdfType, this.owlTransitiveProperty);
        for (const [s] of props) {
            this.transitiveProperties.add(s);
        }

        // 2. For each property, build closure
        const allQuads: Quad[] = [];
        for (const prop of this.transitiveProperties) {
            allQuads.push(...this.recomputeForProperty(prop));
        }
        return allQuads;
    }

    private recomputeForProperty(prop: NodeID): Quad[] {
        // Optimization: Build an in-memory adjacency graph first to avoid O(N^2) store lookups.
        // Step 1: Scan store ONCE for this property O(N)
        const matches = this.store.match(null, prop, null);
        const adj = new Map<NodeID, Set<NodeID>>();
        const allNodes = new Set<NodeID>();

        // Build Adjacency Graph
        for (const [s, _p, o] of matches) {
            if (!adj.has(s)) adj.set(s, new Set());
            adj.get(s)!.add(o);
            allNodes.add(s);
            allNodes.add(o);
        }

        const inferredQuads: Quad[] = [];
        const existingLinks = new Set<string>();

        // Populate existing cache to avoid duplicates in this batch
        for (const [s, _p, o] of matches) {
            existingLinks.add(`${s}|${o}`);
        }

        // Step 2: Compute Transitive Closure
        // Using BFS for each node to find all reachable nodes.
        // Complexity: O(V * (V+E)) per property, but much faster than store scans due to Map/Set locality.

        for (const startNode of allNodes) {
            const visited = new Set<NodeID>();
            const queue: NodeID[] = [startNode];
            visited.add(startNode);

            while (queue.length > 0) {
                const current = queue.shift()!;

                // If we are at a node other than start, we have a path (start -> current)
                if (current !== startNode) {
                    const key = `${startNode}|${current}`;
                    if (!existingLinks.has(key)) {
                        inferredQuads.push({
                            subject: startNode,
                            predicate: prop,
                            object: current,
                            graph: this.targetGraphID
                        });
                        existingLinks.add(key);
                    }
                }

                // Expand neighbors
                const neighbors = adj.get(current);
                if (neighbors) {
                    for (const next of neighbors) {
                        if (!visited.has(next)) {
                            visited.add(next);
                            queue.push(next);
                        }
                    }
                }
            }
        }

        return inferredQuads;
    }

    // Helper: Incremental expansion (for single 'add' events)
    private expandTransitive(s: NodeID, p: NodeID, o: NodeID, collection: Quad[], visited = new Set<string>()) {
        const key = `${s}|${p}|${o}`;
        if (visited.has(key)) return;
        visited.add(key);

        // Conservative recursion limit to prevent stack overflow on huge chains during incremental updates
        if (visited.size > 200) return;

        // Backward: Find X where X -> S
        const incoming = this.store.match(null, p, s);
        for (const [x] of incoming) {
            if (!this.store.has(x, p, o, this.targetGraphID) && !this.store.has(x, p, o)) {
                collection.push({ subject: x, predicate: p, object: o, graph: this.targetGraphID });
                this.expandTransitive(x, p, o, collection, visited);
            }
        }

        // Forward: Find Y where O -> Y
        const outgoing = this.store.match(o, p, null);
        for (const [_s, _p, y] of outgoing) {
            if (!this.store.has(s, p, y, this.targetGraphID) && !this.store.has(s, p, y)) {
                collection.push({ subject: s, predicate: p, object: y, graph: this.targetGraphID });
                this.expandTransitive(s, p, y, collection, visited);
            }
        }
    }
}
