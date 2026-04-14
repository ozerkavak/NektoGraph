import { NodeID, IQuadStore, IDataFactory } from '@triplestore/core';
import { DraftStore } from '../session';
export declare class ClassLifecycle {
    private store;
    private factory;
    constructor(store: IQuadStore, factory: IDataFactory);
    removeClass(session: DraftStore, entityID: NodeID, classID: NodeID): void;
    addClass(session: DraftStore, entityID: NodeID, classID: NodeID): void;
}
