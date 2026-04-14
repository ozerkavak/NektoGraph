import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '../../../../quadstore-core/src/index.ts';
import { InferenceModule } from '../../types';

export declare class SubPropertyOfModule implements InferenceModule {
    private store;
    private factory;
    readonly name = "rdfs-subproperty";
    readonly targetGraphID: NodeID;
    private rdfsSubPropertyOf;
    private hierarchy;
    constructor(store: IQuadStore, factory: IDataFactory);
    process(event: DataEvent): {
        add: Quad[];
        remove: Quad[];
    };
    private stillImpliesProperty;
    clear(): void;
    recompute(): Quad[];
    private handleSchemaAdd;
}
