import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '@triplestore/core';
import { InferenceModule } from '../../types';

export class FunctionalPropertyModule implements InferenceModule {
    public readonly name = 'owl-functional';
    public readonly targetGraphID: NodeID;

    private owlFunctionalProperty: NodeID;
    private owlSameAs: NodeID;
    private rdfType: NodeID;

    private functionalProperties = new Set<NodeID>();

    constructor(
        private store: IQuadStore,
        private factory: IDataFactory
    ) {
        this.targetGraphID = this.factory.namedNode('http://example.org/graphs/inference/owl-functional');
        this.owlFunctionalProperty = this.factory.namedNode('http://www.w3.org/2002/07/owl#FunctionalProperty');
        this.owlSameAs = this.factory.namedNode('http://www.w3.org/2002/07/owl#sameAs');
        this.rdfType = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    }

    process(event: DataEvent): { add: Quad[], remove: Quad[] } {
        const result = { add: [] as Quad[], remove: [] as Quad[] };

        if (event.type === 'add') {
            for (const q of event.quads) {
                // 1. Schema
                if (q.predicate === this.rdfType && q.object === this.owlFunctionalProperty) {
                    this.functionalProperties.add(q.subject);
                    result.add.push(...this.recomputeForProperty(q.subject));
                }

                // 2. Data
                if (this.functionalProperties.has(q.predicate)) {
                    // q: s P o
                    // Find other triples: s P ?o2
                    const matches = this.store.match(q.subject, q.predicate, null);
                    for (const [_s, _p, o2] of matches) {
                        if (o2 !== q.object) {
                            // Infer: o sameAs o2
                            if (!this.store.has(q.object, this.owlSameAs, o2)) {
                                result.add.push({
                                    subject: q.object,
                                    predicate: this.owlSameAs,
                                    object: o2,
                                    graph: this.targetGraphID
                                });
                            }
                        }
                    }
                }
            }
        } else if (event.type === 'delete') {
            // Functional Property Deletion?
            // If (s P o) deleted, should we remove (o sameAs o2)?
            // Maybe. But sameAs is powerful. Removing it might be aggressive without proof.
            // Leaving TODO.
        }
        return result;
    }

    clear(): void {
        this.functionalProperties.clear();
    }

    recompute(): Quad[] {
        this.clear();
        const props = this.store.match(null, this.rdfType, this.owlFunctionalProperty);
        for (const [s] of props) {
            this.functionalProperties.add(s);
        }

        const allQuads: Quad[] = [];
        for (const prop of this.functionalProperties) {
            allQuads.push(...this.recomputeForProperty(prop));
        }
        return allQuads;
    }

    private recomputeForProperty(prop: NodeID): Quad[] {
        // Iterate over all triples, detect duplicates per subject
        // For efficiency, loop all (s, p, o).
        // Maintaining mapped state might be better, but O(N*M) is acceptable for now.
        const matches = this.store.match(null, prop, null);
        const inferredQuads: Quad[] = [];

        // Group by Subject: Map<Subject, Object[]>
        const buckets = new Map<NodeID, NodeID[]>();

        for (const [s, _p, o] of matches) {
            if (!buckets.has(s)) buckets.set(s, []);
            buckets.get(s)!.push(o);
        }

        for (const objects of buckets.values()) {
            if (objects.length > 1) {
                // Pairwise sameAs for all objects of the same subject
                for (let i = 0; i < objects.length; i++) {
                    for (let j = i + 1; j < objects.length; j++) {
                        // a sameAs b
                        if (!this.store.has(objects[i], this.owlSameAs, objects[j])) {
                            inferredQuads.push({
                                subject: objects[i],
                                predicate: this.owlSameAs,
                                object: objects[j],
                                graph: this.targetGraphID
                            });
                        }
                    }
                }
            }
        }
        return inferredQuads;
    }
}
