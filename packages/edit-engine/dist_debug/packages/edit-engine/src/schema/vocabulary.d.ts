import { NodeID, IDataFactory } from '@triplestore/core';
export declare class Vocabulary {
    rdfType: NodeID;
    rdfsLabel: NodeID;
    rdfsComment: NodeID;
    rdfsSubClassOf: NodeID;
    rdfsDomain: NodeID;
    rdfsRange: NodeID;
    owlClass: NodeID;
    owlObjectProperty: NodeID;
    owlDatatypeProperty: NodeID;
    owlAnnotationProperty: NodeID;
    owlDisjointWith: NodeID;
    owlInverseOf: NodeID;
    owlFunctionalProperty: NodeID;
    owlSymmetricProperty: NodeID;
    owlTransitiveProperty: NodeID;
    owlUnionOf: NodeID;
    rdfFirst: NodeID;
    rdfRest: NodeID;
    rdfNil: NodeID;
    owlInverseFunctionalProperty: NodeID;
    owlReflexiveProperty: NodeID;
    owlIrreflexiveProperty: NodeID;
    owlAsymmetricProperty: NodeID;
    constructor(factory: IDataFactory);
}
