export class EntityManager {
    store;
    constructor(store) {
        this.store = store;
    }
    findConnections(subjectID) {
        const incoming = [];
        const outgoing = [];
        for (const [s, p, o, g] of this.store.match(subjectID, null, null, null)) {
            outgoing.push({ subject: s, predicate: p, object: o, graph: g });
        }
        for (const [s, p, o, g] of this.store.match(null, null, subjectID, null)) {
            incoming.push({ subject: s, predicate: p, object: o, graph: g });
        }
        return { incoming, outgoing };
    }
    eraseEntity(subjectID, cascade = true) {
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
    moveEntity(subjectID, targetGraph, strategy = 'full') {
        const { incoming, outgoing } = this.findConnections(subjectID);
        let count = 0;
        const quadsToMove = [...outgoing];
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
