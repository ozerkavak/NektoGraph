import { IDataFactory, NodeID } from '../../quadstore-core/src/index.ts';

export declare class Vocabulary {
    readonly rdfsSubClassOf: NodeID;
    readonly rdfsSubPropertyOf: NodeID;
    readonly rdfsDomain: NodeID;
    readonly rdfsRange: NodeID;
    readonly rdfType: NodeID;
    readonly owlClass: NodeID;
    readonly owlObjectProperty: NodeID;
    readonly owlDatatypeProperty: NodeID;
    readonly owlRestriction: NodeID;
    readonly owlOnProperty: NodeID;
    readonly owlSomeValuesFrom: NodeID;
    readonly owlAllValuesFrom: NodeID;
    readonly owlHasValue: NodeID;
    readonly owlEquivalentClass: NodeID;
    readonly owlEquivalentProperty: NodeID;
    readonly owlSymmetricProperty: NodeID;
    readonly owlTransitiveProperty: NodeID;
    readonly owlInverseOf: NodeID;
    readonly owlFunctionalProperty: NodeID;
    readonly owlSameAs: NodeID;
    readonly owlDisjointWith: NodeID;
    readonly owlUnionOf: NodeID;
    readonly rdfFirst: NodeID;
    readonly rdfRest: NodeID;
    readonly rdfNil: NodeID;
    constructor(factory: IDataFactory);
}
