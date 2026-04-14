import { DraftStore } from './store';

export interface ICommitStrategy {
    execute(draft: DraftStore): Promise<void>;
}

export interface ISessionManager {
    createSession(contributorID?: string): DraftStore;
    getSession(id: string): DraftStore | undefined;
    listSessions(): string[];
    commitSession(id: string): Promise<void>;
    closeSession(id: string): void;
    activeSession: DraftStore | undefined;
}
