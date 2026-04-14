import { IQuadStore, NodeID, Quad } from '@triplestore/core';

export type MaintenanceStrategy = 'full' | 'outgoing';

export class EntityManager {
    constructor(
        private store: IQuadStore
    ) { }

    public findConnections(subjectID: NodeID): { incoming: Quad[], outgoing: Quad[] } {
        const incoming: Quad[] = [];
        const outgoing: Quad[] = [];

        for (const [s, p, o, g] of this.store.match(subjectID, null, null, null)) {
            outgoing.push({ subject: s, predicate: p, object: o, graph: g });
        }

        for (const [s, p, o, g] of this.store.match(null, null, subjectID, null)) {
            incoming.push({ subject: s, predicate: p, object: o, graph: g });
        }

        return { incoming, outgoing };
    }

    public eraseEntity(subjectID: NodeID, cascade: boolean = true): number {
        const { incoming, outgoing } = this.findConnections(subjectID);
        let count = 0;

        for (const q of outgoing) {
            if (this.store.delete(q.subject, q.predicate, q.object, q.graph, 'system')) {
                count++;
            }
        }

        if (cascade) {
            for (const q of incoming) {
                if (this.store.delete(q.subject, q.predicate, q.object, q.graph, 'system')) {
                    count++;
                }
            }
        }

        return count;
    }

    public moveEntity(subjectID: NodeID, targetGraph: NodeID, strategy: MaintenanceStrategy = 'full'): number {
        const { incoming, outgoing } = this.findConnections(subjectID);
        let count = 0;

        const quadsToMove: Quad[] = [...outgoing];
        if (strategy === 'full') {
            quadsToMove.push(...incoming);
        }

        for (const q of quadsToMove) {
            // Remove from old graph
            this.store.delete(q.subject, q.predicate, q.object, q.graph, 'system');
            // Add to new graph
            this.store.add(q.subject, q.predicate, q.object, targetGraph, 'system');
            count++;
        }

        return count;
    }
}
