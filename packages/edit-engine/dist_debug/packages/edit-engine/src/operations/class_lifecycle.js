import { CompositeStore } from '../session';
export class ClassLifecycle {
    store;
    factory;
    constructor(store, factory) {
        this.store = store;
        this.factory = factory;
    }
    removeClass(session, entityID, classID) {
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
    addClass(session, entityID, classID) {
        const typePred = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
        const defaultGraph = this.factory.namedNode('http://example.org/graphs/default');
        const composite = new CompositeStore(this.store, session);
        const quads = composite.match(entityID, typePred, classID, null);
        let exists = false;
        for (const _ of quads) {
            exists = true;
            break;
        }
        if (!exists) {
            session.add(entityID, typePred, classID, defaultGraph);
        }
    }
}
//# sourceMappingURL=class_lifecycle.js.map
