import { IQuadStore, IDataFactory } from '../../../lib_sources/quadstore-core/src/index.ts';
import { SparqlUpdate } from './ast';
import { SPARQLEngine } from './engine';

export declare class UpdateEngine {
    private store;
    private factory;
    private engine;
    constructor(store: IQuadStore, factory: IDataFactory, engine: SPARQLEngine);
    execute(update: SparqlUpdate): Promise<void>;
    private executeOperation;
    private handleInsertDelete;
    private instantiate;
    private resolveTerm;
    private idToTerm;
    private insertTriples;
    private deleteTriples;
    private termToNode;
}
