import { NodeID, IDataFactory } from '@triplestore/core';

export class Vocabulary {
    public rdfType: NodeID;
    public rdfsLabel: NodeID;
    public rdfsComment: NodeID;
    public rdfsSubClassOf: NodeID;
    public rdfsDomain: NodeID;
    public rdfsRange: NodeID;
    public owlClass: NodeID;
    public owlObjectProperty: NodeID;
    public owlDatatypeProperty: NodeID;
    public owlAnnotationProperty: NodeID;
    public owlDisjointWith: NodeID;
    public owlInverseOf: NodeID;
    public owlFunctionalProperty: NodeID;
    public owlSymmetricProperty: NodeID;
    public owlTransitiveProperty: NodeID;
    public owlUnionOf: NodeID;
    public rdfFirst: NodeID;
    public rdfRest: NodeID;
    public rdfNil: NodeID;

    public owlInverseFunctionalProperty: NodeID;
    public owlReflexiveProperty: NodeID;
    public owlIrreflexiveProperty: NodeID;
    public owlAsymmetricProperty: NodeID;
    public owlThing: NodeID;
    public rdfsResource: NodeID;

    // RDF-star & Core System
    public rdfReifies: NodeID;
    public rdfOccurrenceOf: NodeID;
    public rdfOccurrenceOfStandard: NodeID;
    public rdfsIsDefinedBy: NodeID;
    public rdfsSeeAlso: NodeID;
    public rdfsSubPropertyOf: NodeID;

    constructor(factory: IDataFactory) {
        this.rdfType = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
        this.rdfsLabel = factory.namedNode('http://www.w3.org/2000/01/rdf-schema#label');
        this.rdfsComment = factory.namedNode('http://www.w3.org/2000/01/rdf-schema#comment');
        this.rdfsSubClassOf = factory.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf');
        this.rdfsDomain = factory.namedNode('http://www.w3.org/2000/01/rdf-schema#domain');
        this.rdfsRange = factory.namedNode('http://www.w3.org/2000/01/rdf-schema#range');
        this.owlClass = factory.namedNode('http://www.w3.org/2002/07/owl#Class');
        this.owlObjectProperty = factory.namedNode('http://www.w3.org/2002/07/owl#ObjectProperty');
        this.owlDatatypeProperty = factory.namedNode('http://www.w3.org/2002/07/owl#DatatypeProperty'); // Fix hint: owl namespace usually
        this.owlAnnotationProperty = factory.namedNode('http://www.w3.org/2002/07/owl#AnnotationProperty');
        this.owlDisjointWith = factory.namedNode('http://www.w3.org/2002/07/owl#disjointWith');
        this.owlInverseOf = factory.namedNode('http://www.w3.org/2002/07/owl#inverseOf');
        this.owlFunctionalProperty = factory.namedNode('http://www.w3.org/2002/07/owl#FunctionalProperty');
        this.owlSymmetricProperty = factory.namedNode('http://www.w3.org/2002/07/owl#SymmetricProperty');
        this.owlTransitiveProperty = factory.namedNode('http://www.w3.org/2002/07/owl#TransitiveProperty');
        this.owlUnionOf = factory.namedNode('http://www.w3.org/2002/07/owl#unionOf');
        this.rdfFirst = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#first');
        this.rdfRest = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest');
        this.rdfNil = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil');

        // Extended OWL
        this.owlInverseFunctionalProperty = factory.namedNode('http://www.w3.org/2002/07/owl#InverseFunctionalProperty');
        this.owlReflexiveProperty = factory.namedNode('http://www.w3.org/2002/07/owl#ReflexiveProperty');
        this.owlIrreflexiveProperty = factory.namedNode('http://www.w3.org/2002/07/owl#IrreflexiveProperty');
        this.owlAsymmetricProperty = factory.namedNode('http://www.w3.org/2002/07/owl#AsymmetricProperty');
        this.owlThing = factory.namedNode('http://www.w3.org/2002/07/owl#Thing');
        this.rdfsResource = factory.namedNode('http://www.w3.org/2000/01/rdf-schema#Resource');

        // RDF-star & Core System Initialization
        this.rdfReifies = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#reifies');
        this.rdfOccurrenceOf = factory.namedNode('http://www.w3.org/ns/rdf-star#occurrenceOf');
        this.rdfOccurrenceOfStandard = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#occurrenceOf');
        this.rdfsIsDefinedBy = factory.namedNode('http://www.w3.org/2000/01/rdf-schema#isDefinedBy');
        this.rdfsSeeAlso = factory.namedNode('http://www.w3.org/2000/01/rdf-schema#seeAlso');
        this.rdfsSubPropertyOf = factory.namedNode('http://www.w3.org/2000/01/rdf-schema#subPropertyOf');
    }
}
