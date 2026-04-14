import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '../../../../quadstore-core/src/index.ts';
import { InferenceModule } from '../../types';

export declare class SymmetricPropertyModule implements InferenceModule {
    private store;
    private factory;
    readonly name = "owl-symmetric";
    readonly targetGraphID: NodeID;
    private owlSymmetricProperty;
    private rdfType;
    private symmetricProperties;
    constructor(store: IQuadStore, factory: IDataFactory);
    process(event: DataEvent): {
        add: Quad[];
        remove: Quad[];
    };
    clear(): void;
    recompute(): Quad[];
    private recomputeForProperty;
}
