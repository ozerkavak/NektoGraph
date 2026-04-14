import { IQuadStore } from '@triplestore/core';
import { DraftStore } from '@triplestore/session';

export interface IOverlayStore extends IQuadStore {
    // The OverlayStore behaves like a QuadStore but reads from Union(Main + Session)
    // and writes to Session.

    attachSession(session: DraftStore): void;
    detachSession(): void;
}
