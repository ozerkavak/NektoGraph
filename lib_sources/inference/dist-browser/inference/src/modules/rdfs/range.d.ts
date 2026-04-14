import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '../../../../quadstore-core/src/index.ts';
import { InferenceModule } from '../../types';

export declare class RangeModule implements InferenceModule {
    private store;
    private factory;
    readonly name = "rdfs-range";
    readonly targetGraphID: NodeID;
    private rdfsRange;
    private rdfType;
    private ranges;
    constructor(store: IQuadStore, factory: IDataFactory);
    process(event: DataEvent): {
        add: Quad[];
        remove: Quad[];
    };
    private stillImpliesType;
    clear(): void;
    recompute(): Quad[];
    private handleSchemaAdd;
}
