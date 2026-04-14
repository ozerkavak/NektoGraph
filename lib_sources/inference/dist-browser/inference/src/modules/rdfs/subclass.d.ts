import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '../../../../quadstore-core/src/index.ts';
import { InferenceModule } from '../../types';

export declare class SubClassOfModule implements InferenceModule {
    private store;
    private factory;
    readonly name = "rdfs-subclass";
    readonly targetGraphID: NodeID;
    private rdfsSubClassOf;
    private rdfType;
    private hierarchy;
    constructor(store: IQuadStore, factory: IDataFactory);
    process(event: DataEvent): {
        add: Quad[];
        remove: Quad[];
    };
    private stillImpliesType;
    clear(): void;
    recompute(): Quad[];
    private handleSchemaAdd;
    private inferTypes;
}
