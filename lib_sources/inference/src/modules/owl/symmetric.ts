import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '@triplestore/core';
import { InferenceModule } from '../../types';

export class SymmetricPropertyModule implements InferenceModule {
    public readonly name = 'owl-symmetric';
    public readonly targetGraphID: NodeID;

    private owlSymmetricProperty: NodeID;
    private rdfType: NodeID;

    private symmetricProperties = new Set<NodeID>();

    constructor(
        private store: IQuadStore,
        private factory: IDataFactory
    ) {
        this.targetGraphID = this.factory.namedNode('http://example.org/graphs/inference/owl-symmetric');
        this.owlSymmetricProperty = this.factory.namedNode('http://www.w3.org/2002/07/owl#SymmetricProperty');
        this.rdfType = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    }

    process(event: DataEvent): { add: Quad[], remove: Quad[] } {
        const result = { add: [] as Quad[], remove: [] as Quad[] };

        if (event.type === 'add') {
            for (const q of event.quads) {
                // 1. Schema
                if (q.predicate === this.rdfType && q.object === this.owlSymmetricProperty) {
                    this.symmetricProperties.add(q.subject);
                    result.add.push(...this.recomputeForProperty(q.subject));
                }

                // 2. Data
                if (this.symmetricProperties.has(q.predicate)) {
                    // x P y -> y P x
                    if (!this.store.has(q.object, q.predicate, q.subject)) {
                        result.add.push({
                            subject: q.object,
                            predicate: q.predicate,
                            object: q.subject,
                            graph: this.targetGraphID
                        });
                    }
                }
            }
        } else if (event.type === 'delete') {
            for (const q of event.quads) {
                if (this.symmetricProperties.has(q.predicate)) {
                    // If x P y deleted, remove y P x (if inferred)
                    // Check if it exists in inference graph
                    result.remove.push({
                        subject: q.object,
                        predicate: q.predicate,
                        object: q.subject,
                        graph: this.targetGraphID
                    });
                }
            }
        }
        return result;
    }

    clear(): void {
        this.symmetricProperties.clear();
    }

    recompute(): Quad[] {
        this.clear();
        // Identify properties
        const props = this.store.match(null, this.rdfType, this.owlSymmetricProperty);
        for (const [s] of props) {
            this.symmetricProperties.add(s);
        }

        // Scan data
        const allQuads: Quad[] = [];
        for (const prop of this.symmetricProperties) {
            allQuads.push(...this.recomputeForProperty(prop));
        }
        return allQuads;
    }

    private recomputeForProperty(prop: NodeID): Quad[] {
        const matches = this.store.match(null, prop, null);
        const inferredQuads: Quad[] = [];

        for (const [s, _p, o] of matches) {
            // Check inverse existence
            if (!this.store.has(o, prop, s)) {
                inferredQuads.push({
                    subject: o,
                    predicate: prop,
                    object: s,
                    graph: this.targetGraphID
                });
            }
        }
        return inferredQuads;
    }
}
