import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '../../../../quadstore-core/src/index.ts';
import { InferenceModule } from '../../types';

export declare class TransitivePropertyModule implements InferenceModule {
    private store;
    private factory;
    readonly name = "owl-transitive";
    readonly targetGraphID: NodeID;
    private owlTransitiveProperty;
    private rdfType;
    private transitiveProperties;
    private closureCache;
    constructor(store: IQuadStore, factory: IDataFactory);
    process(event: DataEvent): {
        add: Quad[];
        remove: Quad[];
    };
    clear(): void;
    recompute(): Quad[];
    private recomputeForProperty;
    private expandTransitive;
}
