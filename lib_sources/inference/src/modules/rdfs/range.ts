import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '@triplestore/core';
import { InferenceModule } from '../../types';

export class RangeModule implements InferenceModule {
    public readonly name = 'rdfs-range';
    public readonly targetGraphID: NodeID;

    private rdfsRange: NodeID;
    private rdfType: NodeID;

    // Map<PropertyID, Set<ClassID>>
    private ranges = new Map<NodeID, Set<NodeID>>();

    constructor(
        private store: IQuadStore,
        private factory: IDataFactory
    ) {
        this.targetGraphID = this.factory.namedNode('http://example.org/graphs/inference/rdfs-range');
        this.rdfsRange = this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#range');
        this.rdfType = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    }

    process(event: DataEvent): { add: Quad[], remove: Quad[] } {
        const result = { add: [] as Quad[], remove: [] as Quad[] };

        if (event.type === 'add') {
            for (const q of event.quads) {
                if (q.predicate === this.rdfsRange) {
                    result.add.push(...this.handleSchemaAdd(q.subject, q.object));
                } else {
                    const rangeClasses = this.ranges.get(q.predicate);
                    if (rangeClasses) {
                        for (const cls of rangeClasses) {
                            result.add.push({
                                subject: q.object,
                                predicate: this.rdfType,
                                object: cls,
                                graph: this.targetGraphID
                            });
                        }
                    }
                }
            }
        } else if (event.type === 'delete') {
            for (const q of event.quads) {
                // If s P o deleted, check retraction for 'o'
                const rangeClasses = this.ranges.get(q.predicate);
                if (rangeClasses) {
                    for (const cls of rangeClasses) {
                        if (!this.stillImpliesType(q.object, cls)) {
                            result.remove.push({
                                subject: q.object,
                                predicate: this.rdfType,
                                object: cls,
                                graph: this.targetGraphID
                            });
                        }
                    }
                }
            }
        }

        return result;
    }

    private stillImpliesType(object: NodeID, cls: NodeID): boolean {
        for (const [prop, classes] of this.ranges) {
            if (classes.has(cls)) {
                // If ANY subject has this property pointing to 'object'
                // match(null, prop, object)
                const matches = this.store.match(null, prop, object, null);
                for (const _ of matches) return true;
            }
        }
        return false;
    }

    clear(): void {
        this.ranges.clear();
    }

    recompute(): Quad[] {
        this.clear();

        // 1. Build hierarchy
        const schema = this.store.match(null, this.rdfsRange, null);
        for (const [s, _p, o] of schema) {
            this.handleSchemaAdd(s, o, false);
        }

        // 2. Scan data for properties
        const inferredQuads: Quad[] = [];
        for (const [prop, classes] of this.ranges) {
            // Find all triples using this property: ?s prop ?o
            const matches = this.store.match(null, prop, null);
            for (const [_s, _p, o, _g] of matches) {
                for (const cls of classes) {
                    inferredQuads.push({
                        subject: o, // Range -> o a Class
                        predicate: this.rdfType,
                        object: cls,
                        graph: this.targetGraphID
                    });
                }
            }
        }

        return inferredQuads;
    }

    private handleSchemaAdd(property: NodeID, rangeClass: NodeID, augmentData = true): Quad[] {
        let classes = this.ranges.get(property);
        if (!classes) {
            classes = new Set();
            this.ranges.set(property, classes);
        }

        if (classes.has(rangeClass)) return [];
        classes.add(rangeClass);

        const newQuads: Quad[] = [];
        if (augmentData) {
            // Late Schema Arrival
            const matches = this.store.match(null, property, null);
            for (const [_s, _p, o, _g] of matches) {
                newQuads.push({
                    subject: o,
                    predicate: this.rdfType,
                    object: rangeClass,
                    graph: this.targetGraphID
                });
            }
        }
        return newQuads;
    }
}
