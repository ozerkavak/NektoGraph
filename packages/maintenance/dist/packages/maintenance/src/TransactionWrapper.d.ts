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
export declare class TransactionWrapper {
    private store;
    private undoStack;
    private redoStack;
    constructor(store: IQuadStore);
    record(description: string, actions: MaintenanceAction[]): void;
    undo(): string | null;
    redo(): string | null;
    getHistory(): string[];
}
