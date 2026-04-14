import { IQuadStore, NodeID, Quad } from '@triplestore/core';
export type MaintenanceStrategy = 'full' | 'outgoing';
export declare class EntityManager {
    private store;
    constructor(store: IQuadStore);
    findConnections(subjectID: NodeID): {
        incoming: Quad[];
        outgoing: Quad[];
    };
    eraseEntity(subjectID: NodeID, cascade?: boolean): number;
    moveEntity(subjectID: NodeID, targetGraph: NodeID, strategy?: MaintenanceStrategy): number;
}
