import { IQuadStore, Quad } from '@triplestore/core';

export interface MaintenanceAction {
    type: 'add' | 'delete';
    quads: Quad[];
}

export interface MaintenanceTransaction {
    id: string;
    description: string;
    actions: MaintenanceAction[];
}

export class TransactionWrapper {
    private undoStack: MaintenanceTransaction[] = [];
    private redoStack: MaintenanceTransaction[] = [];

    constructor(private store: IQuadStore) { }

    public record(description: string, actions: MaintenanceAction[]) {
        const tx: MaintenanceTransaction = {
            id: Math.random().toString(36).substr(2, 9),
            description,
            actions
        };
        this.undoStack.push(tx);
        this.redoStack = []; // Clear redo stack on new action
    }

    public undo(): string | null {
        const tx = this.undoStack.pop();
        if (!tx) return null;

        // Apply actions in reverse: add becomes delete, delete becomes add
        for (const action of [...tx.actions].reverse()) {
            if (action.type === 'add') {
                for (const q of action.quads) {
                    this.store.delete(q.subject, q.predicate, q.object, q.graph, 'system');
                }
            } else {
                for (const q of action.quads) {
                    this.store.add(q.subject, q.predicate, q.object, q.graph, 'system');
                }
            }
        }

        this.redoStack.push(tx);
        return tx.description;
    }

    public redo(): string | null {
        const tx = this.redoStack.pop();
        if (!tx) return null;

        // Re-apply actions
        for (const action of tx.actions) {
            if (action.type === 'add') {
                for (const q of action.quads) {
                    this.store.add(q.subject, q.predicate, q.object, q.graph, 'system');
                }
            } else {
                for (const q of action.quads) {
                    this.store.delete(q.subject, q.predicate, q.object, q.graph, 'system');
                }
            }
        }

        this.undoStack.push(tx);
        return tx.description;
    }

    public getHistory() {
        return this.undoStack.map(t => t.description);
    }
}
