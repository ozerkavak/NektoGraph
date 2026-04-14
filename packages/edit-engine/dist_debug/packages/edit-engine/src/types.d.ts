import { IQuadStore } from '@triplestore/core';
import { DraftStore } from '@triplestore/session';
export interface IOverlayStore extends IQuadStore {
    attachSession(session: DraftStore): void;
    detachSession(): void;
}
