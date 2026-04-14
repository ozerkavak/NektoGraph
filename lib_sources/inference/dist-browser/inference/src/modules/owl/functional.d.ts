import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '../../../../quadstore-core/src/index.ts';
import { InferenceModule } from '../../types';

export declare class FunctionalPropertyModule implements InferenceModule {
    private store;
    private factory;
    readonly name = "owl-functional";
    readonly targetGraphID: NodeID;
    private owlFunctionalProperty;
    private owlSameAs;
    private rdfType;
    private functionalProperties;
    constructor(store: IQuadStore, factory: IDataFactory);
    process(event: DataEvent): {
        add: Quad[];
        remove: Quad[];
    };
    clear(): void;
    recompute(): Quad[];
    private recomputeForProperty;
}
