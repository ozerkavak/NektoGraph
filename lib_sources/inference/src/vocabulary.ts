import { IDataFactory, NodeID } from '@triplestore/core';

export class Vocabulary {
    // RDFS
    public readonly rdfsSubClassOf: NodeID;
    public readonly rdfsSubPropertyOf: NodeID;
    public readonly rdfsDomain: NodeID;
    public readonly rdfsRange: NodeID;
    public readonly rdfType: NodeID;

    // OWL
    public readonly owlClass: NodeID;
    public readonly owlObjectProperty: NodeID;
    public readonly owlDatatypeProperty: NodeID;
    public readonly owlRestriction: NodeID;
    public readonly owlOnProperty: NodeID;
    public readonly owlSomeValuesFrom: NodeID;
    public readonly owlAllValuesFrom: NodeID;
    public readonly owlHasValue: NodeID;
    public readonly owlEquivalentClass: NodeID;
    public readonly owlEquivalentProperty: NodeID;
    public readonly owlSymmetricProperty: NodeID;
    public readonly owlTransitiveProperty: NodeID;
    public readonly owlInverseOf: NodeID;
    public readonly owlFunctionalProperty: NodeID;
    public readonly owlSameAs: NodeID;
    public readonly owlDisjointWith: NodeID;
    public readonly owlUnionOf: NodeID;
    public readonly rdfFirst: NodeID;
    public readonly rdfRest: NodeID;
    public readonly rdfNil: NodeID;

    constructor(factory: IDataFactory) {
        this.rdfType = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');

        const rdfsBase = 'http://www.w3.org/2000/01/rdf-schema#';
        this.rdfsSubClassOf = factory.namedNode(rdfsBase + 'subClassOf');
        this.rdfsSubPropertyOf = factory.namedNode(rdfsBase + 'subPropertyOf');
        this.rdfsDomain = factory.namedNode(rdfsBase + 'domain');
        this.rdfsRange = factory.namedNode(rdfsBase + 'range');

        const owlBase = 'http://www.w3.org/2002/07/owl#';
        this.owlClass = factory.namedNode(owlBase + 'Class');
        this.owlObjectProperty = factory.namedNode(owlBase + 'ObjectProperty');
        this.owlDatatypeProperty = factory.namedNode(owlBase + 'DatatypeProperty');
        this.owlRestriction = factory.namedNode(owlBase + 'Restriction');
        this.owlOnProperty = factory.namedNode(owlBase + 'onProperty');
        this.owlSomeValuesFrom = factory.namedNode(owlBase + 'someValuesFrom');
        this.owlAllValuesFrom = factory.namedNode(owlBase + 'allValuesFrom');
        this.owlHasValue = factory.namedNode(owlBase + 'hasValue');
        this.owlEquivalentClass = factory.namedNode(owlBase + 'equivalentClass');
        this.owlEquivalentProperty = factory.namedNode(owlBase + 'equivalentProperty');
        this.owlSymmetricProperty = factory.namedNode(owlBase + 'SymmetricProperty');
        this.owlTransitiveProperty = factory.namedNode(owlBase + 'TransitiveProperty');
        this.owlInverseOf = factory.namedNode(owlBase + 'inverseOf');
        this.owlFunctionalProperty = factory.namedNode(owlBase + 'FunctionalProperty');
        this.owlSameAs = factory.namedNode(owlBase + 'sameAs');
        this.owlDisjointWith = factory.namedNode(owlBase + 'disjointWith');
        this.owlUnionOf = factory.namedNode(owlBase + 'unionOf');

        // RDF List
        this.rdfFirst = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#first');
        this.rdfRest = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest');
        this.rdfNil = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil');
    }
}
