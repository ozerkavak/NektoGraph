export class BulkOperator {
    manager;
    constructor(manager) {
        this.manager = manager;
    }
    bulkErase(ids, cascade = true) {
        let total = 0;
        for (const id of ids) {
            total += this.manager.eraseEntity(id, cascade);
        }
        return total;
    }
    bulkMove(ids, targetGraph, strategy = 'full') {
        let total = 0;
        for (const id of ids) {
            total += this.manager.moveEntity(id, targetGraph, strategy);
        }
        return total;
    }
}
