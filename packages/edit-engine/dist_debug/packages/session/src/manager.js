import { DraftStore, CompositeStore } from './store';
export class SessionManager {
    commitStrategy;
    sessions = new Map();
    activeSession;
    constructor(commitStrategy) {
        this.commitStrategy = commitStrategy;
    }
    createSession(contributorID = 'anon') {
        const id = `session_${Date.now()}_${contributorID}`;
        const session = new DraftStore(id);
        this.sessions.set(id, session);
        this.activeSession = session;
        return session;
    }
    getSession(id) {
        const s = this.sessions.get(id);
        if (s)
            this.activeSession = s;
        return s;
    }
    listSessions() {
        return Array.from(this.sessions.keys());
    }
    async commitSession(id) {
        const session = this.sessions.get(id);
        if (session) {
            await this.commitStrategy.execute(session);
            session.additions = (new DraftStore(id)).additions;
            session.deletions.clear();
        }
    }
    closeSession(id) {
        if (typeof id !== 'string')
            return;
        this.sessions.delete(id);
        if (this.activeSession?.id === id) {
            this.activeSession = undefined;
        }
    }
    getCompositeView(sessionID, mainStore) {
        const session = this.sessions.get(sessionID);
        return new CompositeStore(mainStore, session);
    }
}
//# sourceMappingURL=manager.js.map
