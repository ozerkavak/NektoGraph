import { IQuadStore, IDFactory } from '@triplestore/core';
import { ICommitStrategy, DraftStore } from '@triplestore/session';
export declare class DefaultCommitStrategy implements ICommitStrategy {
    private store;
    private factory;
    private diffStore?;
    constructor(store: IQuadStore, factory: IDFactory, diffStore?: IQuadStore | undefined);
    execute(draft: DraftStore): Promise<void>;
    private isDefaultGraph;
    private findAffinityGraph;
}
