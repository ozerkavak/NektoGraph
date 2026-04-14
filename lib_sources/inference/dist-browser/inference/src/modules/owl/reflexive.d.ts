import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '../../../../quadstore-core/src/index.ts';
import { InferenceModule } from '../../types';

export declare class ReflexivePropertyModule implements InferenceModule {
    private store;
    private factory;
    readonly name = "owl-reflexive";
    readonly targetGraphID: NodeID;
    private owlReflexiveProperty;
    private rdfType;
    private reflexiveProperties;
    constructor(store: IQuadStore, factory: IDataFactory);
    process(event: DataEvent): {
        add: Quad[];
        remove: Quad[];
    };
    clear(): void;
    recompute(): Quad[];
    private recomputeForProperty;
}
