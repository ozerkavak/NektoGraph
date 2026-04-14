import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '@triplestore/core';
import { InferenceModule } from '../../types';

export class InverseOfModule implements InferenceModule {
    public readonly name = 'owl-inverse';
    public readonly targetGraphID: NodeID;

    private owlInverseOf: NodeID;

    // Map: Property -> List of Inverse Properties
    private inverseMap = new Map<NodeID, NodeID[]>();

    constructor(
        private store: IQuadStore,
        private factory: IDataFactory
    ) {
        this.targetGraphID = this.factory.namedNode('http://example.org/graphs/inference/owl-inverse');
        this.owlInverseOf = this.factory.namedNode('http://www.w3.org/2002/07/owl#inverseOf');
    }

    process(event: DataEvent): { add: Quad[], remove: Quad[] } {
        const result = { add: [] as Quad[], remove: [] as Quad[] };

        const handleQuad = (q: Quad, isAdd: boolean) => {
            // 1. Schema Change: P1 owl:inverseOf P2
            if (q.predicate === this.owlInverseOf) {
                const p1 = q.subject;
                const p2 = q.object;

                if (isAdd) {
                    this.addInverseMapping(p1, p2);
                    this.addInverseMapping(p2, p1);
                    if (isAdd) {
                        result.add.push(...this.recomputeForPropertyPair(p1, p2));
                    }
                } else {
                    this.removeInverseMapping(p1, p2);
                    this.removeInverseMapping(p2, p1);
                }
            }

            // 2. Data Change: S P1 O
            if (this.inverseMap.has(q.predicate)) {
                const inverses = this.inverseMap.get(q.predicate)!;
                for (const invP of inverses) {
                    if (isAdd) {
                        if (!this.store.hasAny(q.object, invP, q.subject)) {
                            result.add.push({
                                subject: q.object,
                                predicate: invP,
                                object: q.subject,
                                graph: this.targetGraphID
                            });
                        }
                    } else {
                        result.remove.push({
                            subject: q.object,
                            predicate: invP,
                            object: q.subject,
                            graph: this.targetGraphID
                        });
                    }
                }
            }
        };

        if (event.type === 'add') {
            for (const q of event.quads) handleQuad(q, true);
        } else if (event.type === 'delete') {
            for (const q of event.quads) handleQuad(q, false);
        }

        return result;
    }

    private addInverseMapping(p1: NodeID, p2: NodeID) {
        if (!this.inverseMap.has(p1)) this.inverseMap.set(p1, []);
        const list = this.inverseMap.get(p1)!;
        if (!list.includes(p2)) list.push(p2);
    }

    private removeInverseMapping(p1: NodeID, p2: NodeID) {
        if (this.inverseMap.has(p1)) {
            const list = this.inverseMap.get(p1)!;
            const idx = list.indexOf(p2);
            if (idx > -1) list.splice(idx, 1);
        }
    }

    clear(): void {
        this.inverseMap.clear();
    }

    recompute(): Quad[] {
        this.clear();
        let count = 0;
        for (const [s, _, o] of this.store.match(null, this.owlInverseOf, null)) {
            this.addInverseMapping(s, o);
            this.addInverseMapping(o, s);
            count++;
        }

        const inferredQuads: Quad[] = [];
        for (const [p, inverses] of this.inverseMap) {
            for (const [s, _, o] of this.store.match(null, p, null)) {
                for (const invP of inverses) {
                    if (!this.store.hasAny(o, invP, s)) {
                        inferredQuads.push({
                            subject: o,
                            predicate: invP,
                            object: s,
                            graph: this.targetGraphID
                        });
                    }
                }
            }
        }
        return inferredQuads;
    }

    private recomputeForPropertyPair(p1: NodeID, p2: NodeID): Quad[] {
        const result: Quad[] = [];
        for (const [s, _, o] of this.store.match(null, p1, null)) {
            if (!this.store.hasAny(o, p2, s)) {
                result.push({ subject: o, predicate: p2, object: s, graph: this.targetGraphID });
            }
        }
        for (const [s, _, o] of this.store.match(null, p2, null)) {
            if (!this.store.hasAny(o, p1, s)) {
                result.push({ subject: o, predicate: p1, object: s, graph: this.targetGraphID });
            }
        }
        return result;
    }
}
