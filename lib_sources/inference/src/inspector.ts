import { IQuadStore, IDataFactory, NodeID } from '@triplestore/core';
import { Vocabulary } from './vocabulary';

export interface OntologyMetrics {
    classCount: number;
    objectPropertyCount: number;
    datatypePropertyCount: number;
    propertyCount: number; // Total object + datatype + generic properties
    axiomCount: number;
    restrictionCount: number;
    individualCount: number;
}

export class SchemaInspector {
    private vocab: Vocabulary;

    constructor(factory: IDataFactory) {
        this.vocab = new Vocabulary(factory);
    }

    /**
     * Extracts deep metrics from a specific graph or the entire store.
     */
    public getMetrics(store: IQuadStore, graphID: NodeID | null = null): OntologyMetrics {
        const v = this.vocab;

        const metrics: OntologyMetrics = {
            classCount: 0,
            objectPropertyCount: 0,
            datatypePropertyCount: 0,
            propertyCount: 0,
            axiomCount: 0,
            restrictionCount: 0,
            individualCount: 0
        };

        // 1. Classes
        metrics.classCount = this.countMatches(store, null, v.rdfType, v.owlClass, graphID);
        // Fallback for RDFS
        if (metrics.classCount === 0) {
            // const rdfsClass = (v as any).rdfsClass || 'http://www.w3.org/2000/01/rdf-schema#Class'; 
            // Note: In a real system, we'd handle URIs carefully. 
            // For now, assume owl:Class is the primary target for OWL ontologies.
        }

        // 2. Properties
        metrics.objectPropertyCount = this.countMatches(store, null, v.rdfType, v.owlObjectProperty, graphID);
        metrics.datatypePropertyCount = this.countMatches(store, null, v.rdfType, v.owlDatatypeProperty, graphID);

        // General Properties (including rdfs:Property)
        const allProperties = new Set<bigint>();
        for (const [s] of store.match(null, v.rdfType, v.owlObjectProperty, graphID)) allProperties.add(s);
        for (const [s] of store.match(null, v.rdfType, v.owlDatatypeProperty, graphID)) allProperties.add(s);
        metrics.propertyCount = allProperties.size;

        // 3. Restrictions
        metrics.restrictionCount = this.countMatches(store, null, v.rdfType, v.owlRestriction, graphID);

        // 4. Axioms (SubClassOf, SubPropertyOf, Domain, Range, etc.)
        metrics.axiomCount += this.countMatches(store, null, v.rdfsSubClassOf, null, graphID);
        metrics.axiomCount += this.countMatches(store, null, v.rdfsSubPropertyOf, null, graphID);
        metrics.axiomCount += this.countMatches(store, null, v.rdfsDomain, null, graphID);
        metrics.axiomCount += this.countMatches(store, null, v.rdfsRange, null, graphID);
        metrics.axiomCount += this.countMatches(store, null, v.owlInverseOf, null, graphID);
        metrics.axiomCount += this.countMatches(store, null, v.owlEquivalentClass, null, graphID);
        metrics.axiomCount += this.countMatches(store, null, v.owlEquivalentProperty, null, graphID);

        // 5. Individuals (Anything that has a type that is NOT a class/property/restriction)
        // This is a rough heuristic.
        const knownTypes = new Set([v.owlClass, v.owlObjectProperty, v.owlDatatypeProperty, v.owlRestriction]);
        const individuals = new Set<bigint>();
        for (const [s, _p, o] of store.match(null, v.rdfType, null, graphID)) {
            if (!knownTypes.has(o)) {
                individuals.add(s);
            }
        }
        metrics.individualCount = individuals.size;

        return metrics;
    }

    private countMatches(store: IQuadStore, s: NodeID | null, p: NodeID | null, o: NodeID | null, g: NodeID | null): number {
        let count = 0;
        for (const _ of store.match(s, p, o, g)) {
            count++;
        }
        return count;
    }
}
