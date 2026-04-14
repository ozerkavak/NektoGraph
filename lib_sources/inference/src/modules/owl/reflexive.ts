import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '@triplestore/core';
import { InferenceModule } from '../../types';

export class ReflexivePropertyModule implements InferenceModule {
    public readonly name = 'owl-reflexive';
    public readonly targetGraphID: NodeID;

    private owlReflexiveProperty: NodeID;
    private rdfType: NodeID;

    private reflexiveProperties = new Set<NodeID>();

    constructor(
        private store: IQuadStore,
        private factory: IDataFactory
    ) {
        this.targetGraphID = this.factory.namedNode('http://example.org/graphs/inference/owl-reflexive');
        this.owlReflexiveProperty = this.factory.namedNode('http://www.w3.org/2002/07/owl#ReflexiveProperty');
        this.rdfType = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    }

    process(event: DataEvent): { add: Quad[], remove: Quad[] } {
        const result = { add: [] as Quad[], remove: [] as Quad[] };

        if (event.type === 'add') {
            for (const q of event.quads) {
                // 1. Schema
                if (q.predicate === this.rdfType && q.object === this.owlReflexiveProperty) {
                    this.reflexiveProperties.add(q.subject);
                    result.add.push(...this.recomputeForProperty(q.subject));
                }

                // 2. Data
                if (this.reflexiveProperties.has(q.predicate)) {
                    // x P y -> x P x AND y P y
                    // Local Reflexivity: Only for terms involved in the relation

                    // x P x
                    if (!this.store.has(q.subject, q.predicate, q.subject)) {
                        result.add.push({
                            subject: q.subject,
                            predicate: q.predicate,
                            object: q.subject,
                            graph: this.targetGraphID
                        });
                    }

                    // y P y
                    if (!this.store.has(q.object, q.predicate, q.object)) {
                        result.add.push({
                            subject: q.object,
                            predicate: q.predicate,
                            object: q.object,
                            graph: this.targetGraphID
                        });
                    }
                }
            }
        } else if (event.type === 'delete') {
            // Reflexive Deletion:
            // If x P y deleted, should we delete x P x?
            // ONLY if x is not involved in any OTHER P-relation.
            // Complex TMS required.
        }
        return result;
    }

    clear(): void {
        this.reflexiveProperties.clear();
    }

    recompute(): Quad[] {
        this.clear();
        const props = this.store.match(null, this.rdfType, this.owlReflexiveProperty);
        for (const [s] of props) {
            this.reflexiveProperties.add(s);
        }

        const allQuads: Quad[] = [];
        for (const prop of this.reflexiveProperties) {
            allQuads.push(...this.recomputeForProperty(prop));
        }
        return allQuads;
    }

    private recomputeForProperty(prop: NodeID): Quad[] {
        const matches = this.store.match(null, prop, null);
        const inferredQuads: Quad[] = [];
        const terms = new Set<NodeID>();

        // Collect all terms used with this property
        for (const [s, _p, o] of matches) {
            terms.add(s);
            terms.add(o);
        }

        for (const term of terms) {
            if (!this.store.has(term, prop, term)) {
                inferredQuads.push({
                    subject: term,
                    predicate: prop,
                    object: term,
                    graph: this.targetGraphID
                });
            }
        }
        return inferredQuads;
    }
}
