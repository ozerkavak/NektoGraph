import { DraftStore, CompositeStore } from './store';
import { ICommitStrategy, ISessionManager } from './types';
import { IQuadStore } from '@triplestore/core';

export class SessionManager implements ISessionManager {
    private sessions = new Map<string, DraftStore>();
    public activeSession: DraftStore | undefined;

    constructor(private commitStrategy: ICommitStrategy) { }

    createSession(contributorID: string = 'anon'): DraftStore {
        const id = `session_${Date.now()}_${contributorID}`;
        const session = new DraftStore(id);
        this.sessions.set(id, session);
        this.activeSession = session;
        return session;
    }

    getSession(id: string): DraftStore | undefined {
        const s = this.sessions.get(id);
        if (s) this.activeSession = s;
        return s;
    }

    listSessions(): string[] {
        return Array.from(this.sessions.keys());
    }

    async commitSession(id: string): Promise<void> {
        const session = this.sessions.get(id);
        if (session) {
            await this.commitStrategy.execute(session);
            session.additions = (new DraftStore(id)).additions;
            session.deletions.clear();
        }
    }

    closeSession(id: string): void {
        if (typeof id !== 'string') return;

        this.sessions.delete(id);
        if (this.activeSession?.id === id) {
            this.activeSession = undefined;
        }
    }

    getCompositeView(sessionID: string, mainStore: IQuadStore): IQuadStore {
        const session = this.sessions.get(sessionID);
        return new CompositeStore(mainStore, session);
    }
}
