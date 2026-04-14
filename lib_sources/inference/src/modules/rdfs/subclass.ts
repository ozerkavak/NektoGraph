import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '@triplestore/core';
import { InferenceModule } from '../../types';

export class SubClassOfModule implements InferenceModule {
    public readonly name = 'rdfs-subclass';
    public readonly targetGraphID: NodeID;

    private rdfsSubClassOf: NodeID;
    private rdfType: NodeID;

    // Map<ChildID, Set<ParentID>> - stores direct and indirect parents (transitive closure)
    private hierarchy = new Map<NodeID, Set<NodeID>>();

    constructor(
        private store: IQuadStore,
        private factory: IDataFactory
    ) {
        this.targetGraphID = this.factory.namedNode('http://example.org/graphs/inference/rdfs-subclass');
        this.rdfsSubClassOf = this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf');
        this.rdfType = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    }

    process(event: DataEvent): { add: Quad[], remove: Quad[] } {
        const result = { add: [] as Quad[], remove: [] as Quad[] };

        if (event.type === 'add') {
            for (const q of event.quads) {
                if (q.predicate === this.rdfsSubClassOf) {
                    result.add.push(...this.handleSchemaAdd(q.subject, q.object));
                }
                else if (q.predicate === this.rdfType) {
                    const newInferences = this.inferTypes(q.subject, q.object);
                    result.add.push(...newInferences);
                }
            }
        } else if (event.type === 'delete') {
            for (const q of event.quads) {
                // Case: s type C deleted.
                // We inferred s type P (Parent).
                // Should we remove s type P?
                if (q.predicate === this.rdfType) {
                    const typeC = q.object; // Class C
                    const parents = this.hierarchy.get(typeC);
                    if (parents) {
                        for (const p of parents) {
                            // Check if s is still a type of P via another path
                            if (!this.stillImpliesType(q.subject, p)) {
                                result.remove.push({
                                    subject: q.subject,
                                    predicate: this.rdfType,
                                    object: p,
                                    graph: this.targetGraphID
                                });
                            }
                        }
                    }
                }
            }
        }

        return result;
    }

    private stillImpliesType(subject: NodeID, parentCls: NodeID): boolean {
        // Does subject have ANY type 'X' such that 'X' is a subclass of 'parentCls'?
        // match(s, type, null) -> all types of s
        const types = this.store.match(subject, this.rdfType, null, null);
        for (const [_, __, typeX] of types) {
            // Is typeX a subclass of parentCls?
            // Check direct parents of typeX
            const parents = this.hierarchy.get(typeX);
            if (parents && parents.has(parentCls)) return true;
            // Also check identity? If s type P exists explicitly.
            if (typeX === parentCls) return true;
        }
        return false;
    }

    clear(): void {
        this.hierarchy.clear();
    }

    recompute(): Quad[] {
        this.clear();
        const allQuads: Quad[] = [];

        // 1. Build Hierarchy from existing store
        // match(null, rdfs:subClassOf, null)
        const schema = this.store.match(null, this.rdfsSubClassOf, null);
        for (const [s, _p, o] of schema) {
            // During recompute, we just build hierarchy first, then infer.
            // But handleSchemaAdd can return quads for "Late Schema Arrival".
            // Here we just want to build the graph.
            this.handleSchemaAdd(s, o, false);
        }

        // 2. Infer all types
        // match(null, rdf:type, null)
        const data = this.store.match(null, this.rdfType, null);
        for (const [s, _p, o] of data) {
            const newInferences = this.inferTypes(s, o);
            allQuads.push(...newInferences);
        }

        return allQuads;
    }

    private handleSchemaAdd(child: NodeID, parent: NodeID, augmentData = true): Quad[] {
        const generated: Quad[] = [];
        // Avoid cycles? Simple check: if parent is already child (transitive), skip.
        // For now, infinite loop prevention in engine handles event loops, but not logic loops.
        // RDFS loops (A sub B, B sub A) are valid (equivalent classes).

        let parents = this.hierarchy.get(child);
        if (!parents) {
            parents = new Set();
            this.hierarchy.set(child, parents);
        }

        // If already known, skip
        if (parents.has(parent)) return [];

        // Add parent
        parents.add(parent);

        // Add parent's parents (Transitive)
        const grandParents = this.hierarchy.get(parent);
        if (grandParents) {
            for (const gp of grandParents) {
                parents.add(gp);
            }
        }

        // Propagate to Key's children (Downstream Transitivity)
        // If X sub child, then X sub parent
        for (const [_, pSet] of this.hierarchy) {
            if (pSet.has(child)) {
                pSet.add(parent);
                if (grandParents) {
                    for (const gp of grandParents) {
                        pSet.add(gp);
                    }
                }
            }
        }

        // Late Schema Arrival: Infer for existing instances
        if (augmentData) {
            // Find all instances of 'child' and make them instances of 'parent' (and grandparents)
            const instances = this.store.match(null, this.rdfType, child);
            for (const [s] of instances) {
                generated.push({ subject: s, predicate: this.rdfType, object: parent, graph: this.targetGraphID });
                if (grandParents) {
                    for (const gp of grandParents) {
                        generated.push({ subject: s, predicate: this.rdfType, object: gp, graph: this.targetGraphID });
                    }
                }
            }
        }
        return generated;
    }

    private inferTypes(subject: NodeID, type: NodeID): Quad[] {
        const parents = this.hierarchy.get(type);
        if (!parents) return [];

        const quads: Quad[] = [];
        for (const p of parents) {
            quads.push({
                subject: subject,
                predicate: this.rdfType,
                object: p,
                graph: this.targetGraphID
            });
        }
        return quads;
    }
}
