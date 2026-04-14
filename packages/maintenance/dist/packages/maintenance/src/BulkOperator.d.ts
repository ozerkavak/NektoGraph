import { NodeID } from '@triplestore/core';
import { EntityManager, MaintenanceStrategy } from './EntityManager';
export declare class BulkOperator {
    private manager;
    constructor(manager: EntityManager);
    bulkErase(ids: NodeID[], cascade?: boolean): number;
    bulkMove(ids: NodeID[], targetGraph: NodeID, strategy?: MaintenanceStrategy): number;
}
