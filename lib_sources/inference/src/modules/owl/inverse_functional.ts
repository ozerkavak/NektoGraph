import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '@triplestore/core';
import { InferenceModule, InferenceProcessResult } from '../../types';

export class InverseFunctionalPropertyModule implements InferenceModule {
    public readonly name = 'owl-inverse-functional';
    public readonly targetGraphID: NodeID;

    private owlInverseFunctionalProperty: NodeID;
    private owlSameAs: NodeID;
    private rdfType: NodeID;

    private invFunctionalProperties = new Set<NodeID>();

    constructor(
        private store: IQuadStore,
        private factory: IDataFactory
    ) {
        this.targetGraphID = this.factory.namedNode('http://example.org/graphs/inference/owl-inverse-functional');
        this.owlInverseFunctionalProperty = this.factory.namedNode('http://www.w3.org/2002/07/owl#InverseFunctionalProperty');
        this.owlSameAs = this.factory.namedNode('http://www.w3.org/2002/07/owl#sameAs');
        this.rdfType = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    }

    process(event: DataEvent): InferenceProcessResult {
        const inferredQuads: Quad[] = [];

        if (event.type === 'add') {
            for (const q of event.quads) {
                // 1. Schema
                if (q.predicate === this.rdfType && q.object === this.owlInverseFunctionalProperty) {
                    this.invFunctionalProperties.add(q.subject);
                    inferredQuads.push(...this.recomputeForProperty(q.subject));
                }

                // 2. Data
                if (this.invFunctionalProperties.has(q.predicate)) {
                    // q: s P o
                    // Find other triples: ?s2 P o
                    const matches = this.store.match(null, q.predicate, q.object);
                    for (const [s2] of matches) {
                        if (s2 !== q.subject) {
                            // Infer: s sameAs s2
                            if (!this.store.has(q.subject, this.owlSameAs, s2)) {
                                inferredQuads.push({
                                    subject: q.subject,
                                    predicate: this.owlSameAs,
                                    object: s2,
                                    graph: this.targetGraphID
                                });
                            }
                        }
                    }
                }
            }
        }

        // TODO: Handle delete events for Truth Maintenance

        return { add: inferredQuads, remove: [] };
    }

    clear(): void {
        this.invFunctionalProperties.clear();
    }

    recompute(): Quad[] {
        this.clear();
        const props = this.store.match(null, this.rdfType, this.owlInverseFunctionalProperty);
        for (const [s] of props) {
            this.invFunctionalProperties.add(s);
        }

        const allQuads: Quad[] = [];
        for (const prop of this.invFunctionalProperties) {
            allQuads.push(...this.recomputeForProperty(prop));
        }
        return allQuads;
    }

    private recomputeForProperty(prop: NodeID): Quad[] {
        const matches = this.store.match(null, prop, null);
        const inferredQuads: Quad[] = [];

        // Group by Object: Map<Object, Subject[]>
        const buckets = new Map<NodeID, NodeID[]>();

        for (const [s, _p, o] of matches) {
            if (!buckets.has(o)) buckets.set(o, []);
            buckets.get(o)!.push(s);
        }

        for (const subjects of buckets.values()) {
            if (subjects.length > 1) {
                // Pairwise sameAs for all subjects of the same object
                for (let i = 0; i < subjects.length; i++) {
                    for (let j = i + 1; j < subjects.length; j++) {
                        // a sameAs b
                        if (!this.store.has(subjects[i], this.owlSameAs, subjects[j])) {
                            inferredQuads.push({
                                subject: subjects[i],
                                predicate: this.owlSameAs,
                                object: subjects[j],
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
