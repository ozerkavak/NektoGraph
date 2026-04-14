import { NodeID } from '@triplestore/core';
import { EntityManager, MaintenanceStrategy } from './EntityManager';

export class BulkOperator {
    constructor(private manager: EntityManager) { }

    public bulkErase(ids: NodeID[], cascade: boolean = true): number {
        let total = 0;
        for (const id of ids) {
            total += this.manager.eraseEntity(id, cascade);
        }
        return total;
    }

    public bulkMove(ids: NodeID[], targetGraph: NodeID, strategy: MaintenanceStrategy = 'full'): number {
        let total = 0;
        for (const id of ids) {
            total += this.manager.moveEntity(id, targetGraph, strategy);
        }
        return total;
    }
}
