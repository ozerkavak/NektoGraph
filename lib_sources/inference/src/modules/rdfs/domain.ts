import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '@triplestore/core';
import { InferenceModule } from '../../types';

export class DomainModule implements InferenceModule {
    public readonly name = 'rdfs-domain';
    public readonly targetGraphID: NodeID;

    private rdfsDomain: NodeID;
    private rdfType: NodeID;

    // Map<PropertyID, Set<ClassID>>
    private domains = new Map<NodeID, Set<NodeID>>();

    constructor(
        private store: IQuadStore,
        private factory: IDataFactory
    ) {
        this.targetGraphID = this.factory.namedNode('http://example.org/graphs/inference/rdfs-domain');
        this.rdfsDomain = this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#domain');
        this.rdfType = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    }

    process(event: DataEvent): { add: Quad[], remove: Quad[] } {
        const result = { add: [] as Quad[], remove: [] as Quad[] };

        if (event.type === 'add') {
            for (const q of event.quads) {
                // Schema: P rdfs:domain C
                if (q.predicate === this.rdfsDomain) {
                    result.add.push(...this.handleSchemaAdd(q.subject, q.object));
                }
                // Data: s P o
                else {
                    const domainClasses = this.domains.get(q.predicate);
                    if (domainClasses) {
                        for (const cls of domainClasses) {
                            result.add.push({
                                subject: q.subject,
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
                // If s P o deleted, check if we need to retract (s type C)
                const domainClasses = this.domains.get(q.predicate);
                if (domainClasses) {
                    for (const cls of domainClasses) {
                        // Check if 's' implies 'C' via any OTHER property
                        if (!this.stillImpliesType(q.subject, cls)) {
                            result.remove.push({
                                subject: q.subject,
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

    private stillImpliesType(subject: NodeID, cls: NodeID): boolean {
        // Find all properties that imply this class
        // Naive iteration over all domains (O(P)). Better: Inverted Index.
        // Given current scale, iteration is acceptable but optimized is better.
        // Let's iterate map: if (classes.has(cls)) check store.

        for (const [prop, classes] of this.domains) {
            if (classes.has(cls)) {
                // If subject has this property (with any object), then it implies C
                // We verify if store has (s, prop, *)
                if (this.store.hasAny(subject, prop, null as any)) { // hasAny checks wildcards for missing args? 
                    // Wait, hasAny(s,p,o) requires all 3. 
                    // store.match(s, prop, null) is better here.
                    // But hasAny signature in types.ts is (s, p, o): boolean.
                    // We need 'has(s, p, null)'.
                    // Use match (iterator) loop.
                    const matches = this.store.match(subject, prop, null, null);
                    for (const _ of matches) return true;
                }
            }
        }
        return false;
    }

    clear(): void {
        this.domains.clear();
    }

    recompute(): Quad[] {
        this.clear();

        // 1. Build hierarchy
        const schema = this.store.match(null, this.rdfsDomain, null);
        for (const [s, _p, o] of schema) {
            this.handleSchemaAdd(s, o, false);
        }

        // 2. Scan data
        const inferredQuads: Quad[] = [];
        for (const [prop, classes] of this.domains) {
            const matches = this.store.match(null, prop, null);
            for (const [s, _p, _o] of matches) {
                for (const cls of classes) {
                    inferredQuads.push({
                        subject: s, // Domain -> s a Class
                        predicate: this.rdfType,
                        object: cls,
                        graph: this.targetGraphID
                    });
                }
            }
        }

        return inferredQuads;
    }

    private handleSchemaAdd(property: NodeID, domainClass: NodeID, augmentData = true): Quad[] {
        let classes = this.domains.get(property);
        if (!classes) {
            classes = new Set();
            this.domains.set(property, classes);
        }

        if (classes.has(domainClass)) return [];
        classes.add(domainClass);

        const newQuads: Quad[] = [];
        if (augmentData) {
            const matches = this.store.match(null, property, null);
            for (const [s] of matches) {
                newQuads.push({
                    subject: s,
                    predicate: this.rdfType,
                    object: domainClass,
                    graph: this.targetGraphID
                });
            }
        }
        return newQuads;
    }
}
