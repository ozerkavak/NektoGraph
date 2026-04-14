import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '../../../../quadstore-core/src/index.ts';
import { InferenceModule, InferenceProcessResult } from '../../types';

export declare class InverseFunctionalPropertyModule implements InferenceModule {
    private store;
    private factory;
    readonly name = "owl-inverse-functional";
    readonly targetGraphID: NodeID;
    private owlInverseFunctionalProperty;
    private owlSameAs;
    private rdfType;
    private invFunctionalProperties;
    constructor(store: IQuadStore, factory: IDataFactory);
    process(event: DataEvent): InferenceProcessResult;
    clear(): void;
    recompute(): Quad[];
    private recomputeForProperty;
}
