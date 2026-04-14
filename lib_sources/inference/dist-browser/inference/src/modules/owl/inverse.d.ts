import { IQuadStore, IDataFactory, NodeID, DataEvent, Quad } from '../../../../quadstore-core/src/index.ts';
import { InferenceModule } from '../../types';

export declare class InverseOfModule implements InferenceModule {
    private store;
    private factory;
    readonly name = "owl-inverse";
    readonly targetGraphID: NodeID;
    private owlInverseOf;
    private inverseMap;
    constructor(store: IQuadStore, factory: IDataFactory);
    process(event: DataEvent): {
        add: Quad[];
        remove: Quad[];
    };
    private addInverseMapping;
    private removeInverseMapping;
    clear(): void;
    recompute(): Quad[];
    private recomputeForPropertyPair;
}
