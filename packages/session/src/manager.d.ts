import { DraftStore } from './store';
import { ICommitStrategy, ISessionManager } from './types';
import { IQuadStore } from '@triplestore/core';
export declare class SessionManager implements ISessionManager {
    private commitStrategy;
    private sessions;
    activeSession: DraftStore | undefined;
    constructor(commitStrategy: ICommitStrategy);
    createSession(contributorID?: string): DraftStore;
    getSession(id: string): DraftStore | undefined;
    listSessions(): string[];
    commitSession(id: string): Promise<void>;
    closeSession(id: string): void;
    getCompositeView(sessionID: string, mainStore: IQuadStore): IQuadStore;
}
