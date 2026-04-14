import { IQuadStore, IDataFactory, NodeID } from '../../quadstore-core/src/index.ts';

export interface OntologyMetrics {
    classCount: number;
    objectPropertyCount: number;
    datatypePropertyCount: number;
    propertyCount: number;
    axiomCount: number;
    restrictionCount: number;
    individualCount: number;
}
export declare class SchemaInspector {
    private vocab;
    constructor(factory: IDataFactory);
    /**
     * Extracts deep metrics from a specific graph or the entire store.
     */
    getMetrics(store: IQuadStore, graphID?: NodeID | null): OntologyMetrics;
    private countMatches;
}
