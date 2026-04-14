import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '../../../../quadstore-core/src/index.ts';
import { InferenceModule } from '../../types';

export declare class DomainModule implements InferenceModule {
    private store;
    private factory;
    readonly name = "rdfs-domain";
    readonly targetGraphID: NodeID;
    private rdfsDomain;
    private rdfType;
    private domains;
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
