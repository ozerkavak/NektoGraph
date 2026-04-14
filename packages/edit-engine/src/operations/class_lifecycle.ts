
import { NodeID, IQuadStore, IDataFactory } from '@triplestore/core';
import { DraftStore, CompositeStore } from '../session';

export class ClassLifecycle {
    constructor(
        private store: IQuadStore,
        private factory: IDataFactory
    ) { }

    public removeClass(session: DraftStore, entityID: NodeID, classID: NodeID): void {
        const typePred = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');

        const composite = new CompositeStore(this.store, session);
        const quads = composite.match(entityID, typePred, classID, null);

        let found = false;
        for (const raw of quads) {
            const graph = raw[3];

            session.delete(entityID, typePred, classID, graph);
            found = true;
        }

        if (!found) {
            console.warn('[ClassLifecycle] Attempted to remove class that does not exist:', classID);
        }
    }

    public addClass(session: DraftStore, entityID: NodeID, classID: NodeID): void {
        const typePred = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
        const defaultGraph = this.factory.namedNode('http://example.org/graphs/default');
        const composite = new CompositeStore(this.store, session);
        const quads = composite.match(entityID, typePred, classID, null);

        let exists = false;
        for (const _ of quads) { exists = true; break; }

        if (!exists) {
            session.add(entityID, typePred, classID, defaultGraph);
        }
    }
}
