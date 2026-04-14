import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '@triplestore/core';
import { InferenceModule } from '../../types';

export class SubPropertyOfModule implements InferenceModule {
    public readonly name = 'rdfs-subproperty';
    public readonly targetGraphID: NodeID;

    private rdfsSubPropertyOf: NodeID;

    // Map<SubProp, Set<SuperProp>>
    private hierarchy = new Map<NodeID, Set<NodeID>>();

    constructor(
        private store: IQuadStore,
        private factory: IDataFactory
    ) {
        this.targetGraphID = this.factory.namedNode('http://example.org/graphs/inference/rdfs-subproperty');
        this.rdfsSubPropertyOf = this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#subPropertyOf');
    }

    process(event: DataEvent): { add: Quad[], remove: Quad[] } {
        const result = { add: [] as Quad[], remove: [] as Quad[] };

        if (event.type === 'add') {
            for (const q of event.quads) {
                if (q.predicate === this.rdfsSubPropertyOf) {
                    result.add.push(...this.handleSchemaAdd(q.subject, q.object));
                }
                else {
                    const supers = this.hierarchy.get(q.predicate);
                    if (supers) {
                        for (const superProp of supers) {
                            result.add.push({
                                subject: q.subject,
                                predicate: superProp,
                                object: q.object,
                                graph: this.targetGraphID
                            });
                        }
                    }
                }
            }
        } else if (event.type === 'delete') {
            for (const q of event.quads) {
                // If s P o deleted, check if we need to retract s Q o (where P sub Q)
                const supers = this.hierarchy.get(q.predicate);
                if (supers) {
                    for (const superProp of supers) {
                        if (!this.stillImpliesProperty(q.subject, superProp, q.object)) {
                            result.remove.push({
                                subject: q.subject,
                                predicate: superProp,
                                object: q.object,
                                graph: this.targetGraphID
                            });
                        }
                    }
                }
            }
        }
        return result;
    }

    private stillImpliesProperty(s: NodeID, superProp: NodeID, o: NodeID): boolean {
        // Does s have any other property P' such that P' sub superProp and s P' o exists?
        // We need to find all properties between s and o? 
        // match(s, null, o) -> expensive if high fan-out? No, usually low.
        const matches = this.store.match(s, null, o, null);
        for (const [_, p2] of matches) {
            if (p2 === superProp) return true; // Explicitly exists
            const supers = this.hierarchy.get(p2);
            if (supers && supers.has(superProp)) return true;
        }
        return false;
    }

    clear(): void {
        this.hierarchy.clear();
    }

    recompute(): Quad[] {
        this.clear();

        // 1. Build hierarchy
        const schema = this.store.match(null, this.rdfsSubPropertyOf, null);
        for (const [s, _p, o] of schema) {
            this.handleSchemaAdd(s, o, false);
        }

        // 2. Scan all data
        // Iterate Key of Hierarchy (P) and do store.match(null, P, null).
        const inferredQuads: Quad[] = [];
        for (const [subProp, superProps] of this.hierarchy) {
            const matches = this.store.match(null, subProp, null);
            for (const [s, _p, o] of matches) {
                for (const superProp of superProps) {
                    inferredQuads.push({
                        subject: s,
                        predicate: superProp,
                        object: o,
                        graph: this.targetGraphID
                    });
                }
            }
        }

        return inferredQuads;
    }

    private handleSchemaAdd(subProp: NodeID, superProp: NodeID, augmentData = true): Quad[] {
        let parents = this.hierarchy.get(subProp);
        if (!parents) {
            parents = new Set();
            this.hierarchy.set(subProp, parents);
        }

        if (parents.has(superProp)) return [];

        parents.add(superProp);

        // Transitivity handling (simplified for now, mimicking subclass logic)
        const grandParents = this.hierarchy.get(superProp);
        if (grandParents) {
            for (const gp of grandParents) {
                parents.add(gp);
            }
        }

        // Downstream propagation
        for (const [_child, pSet] of this.hierarchy) {
            if (pSet.has(subProp)) {
                pSet.add(superProp);
                if (grandParents) {
                    for (const gp of grandParents) {
                        pSet.add(gp);
                    }
                }
            }
        }

        const newQuads: Quad[] = [];
        // Late Schema Arrival
        if (augmentData) {
            const matches = this.store.match(null, subProp, null);
            for (const [s, _p, o] of matches) {
                newQuads.push({ subject: s, predicate: superProp, object: o, graph: this.targetGraphID });
                if (grandParents) {
                    for (const gp of grandParents) {
                        newQuads.push({ subject: s, predicate: gp, object: o, graph: this.targetGraphID });
                    }
                }
            }
        }
        return newQuads;
    }
}
