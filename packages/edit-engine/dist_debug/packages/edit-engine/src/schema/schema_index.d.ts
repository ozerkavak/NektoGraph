import { NodeID, IDataFactory, IQuadStore } from '@triplestore/core';
export interface PropertySchema {
    property: NodeID;
    ranges: NodeID[];
    minCount: number;
    maxCount: number;
    isFunctional: boolean;
    isInverseFunctional?: boolean;
    isSymmetric?: boolean;
    isTransitive?: boolean;
    isReflexive?: boolean;
    isIrreflexive?: boolean;
    isAsymmetric?: boolean;
    inverseOf?: NodeID;
    type: 'Object' | 'Data' | 'Annotation' | 'Unknown';
    labels: Record<string, string>;
}
export interface ClassSchema {
    classID: NodeID;
    properties: PropertySchema[];
    subClasses: NodeID[];
    disjointWith: NodeID[];
    labels: Record<string, string>;
}
export declare class SchemaIndex {
    private store;
    private factory;
    private vocab;
    private classMap;
    private propertyMap;
    private subClassMap;
    private parentMap;
    constructor(store: IQuadStore, factory: IDataFactory);
    /**
     * Scans the store to build the index.
     * Indexes rdfs:Class, owl:Class, rdfs:domain, rdfs:range, rdfs:subClassOf
     */
    buildIndex(): Promise<void>;
    listClasses(lang?: string): ClassSchema[];
    getSchemaForClass(classID: NodeID): ClassSchema | undefined;
    getPropertySchema(propertyID: NodeID): PropertySchema | undefined;
    getDomainsForProperty(propertyID: NodeID): NodeID[];
    getDepth(classID: NodeID, visited?: Set<bigint>): number;
    getClassHierarchy(rootClass: NodeID): ClassSchema | undefined;
    getSuperClasses(classID: NodeID): NodeID[];
    getSubClassesRecursive(classID: NodeID, seen?: Set<bigint>): NodeID[];
    private resolveUnion;
    private resolveList;
}
