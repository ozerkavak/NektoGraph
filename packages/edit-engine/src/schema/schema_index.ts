import { NodeID, IDataFactory, IQuadStore } from '@triplestore/core';
import { Vocabulary } from './vocabulary';

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

export class SchemaIndex {
    private vocab: Vocabulary;
    private classMap = new Map<bigint, ClassSchema>();
    private propertyMap = new Map<bigint, PropertySchema>();
    private subClassMap = new Map<bigint, bigint[]>();
    private parentMap = new Map<bigint, bigint[]>();

    constructor(private store: IQuadStore, private factory: IDataFactory) {
        this.vocab = new Vocabulary(factory);
    }

    /**
     * Scans the store to build the index.
     * Indexes rdfs:Class, owl:Class, rdfs:domain, rdfs:range, rdfs:subClassOf
     */
    async buildIndex() {
        this.classMap.clear();
        this.propertyMap.clear();
        this.subClassMap.clear();
        this.parentMap.clear();

        const v = this.vocab;

        const allClasses = new Set<bigint>();
        for (const [s] of this.store.match(null, v.rdfType, v.owlClass)) allClasses.add(s);
        for (const [s] of this.store.match(null, v.rdfType, this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#Class'))) allClasses.add(s);

        // 2. Init Class Schemas
        for (const classID of allClasses) {
            // Filter: Only NamedNodes should be in the class list (avoid blank nodes like n3-x)
            try {
                const term = this.factory.decode(classID);
                if (term.termType !== 'NamedNode') {
                    continue;
                }
            } catch { continue; }

            const labels: Record<string, string> = {};
            for (const [, , o] of this.store.match(classID, this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#label'), null)) {
                try {
                    const term = this.factory.decode(o);
                    if (term.termType === 'Literal') {
                        const lang = term.language || 'en';
                        labels[lang] = term.value;
                    }
                } catch { }
            }

            // Disjoint Classes
            const disjointWith: bigint[] = [];
            for (const [, , o] of this.store.match(classID, v.owlDisjointWith, null)) {
                disjointWith.push(o);
            }

            this.classMap.set(classID, { classID, properties: [], subClasses: [], disjointWith, labels });
        }

        // 3. Find SubClass Hierarchy
        for (const [s, , o] of this.store.match(null, v.rdfsSubClassOf, null)) {
            if (this.classMap.has(o)) {
                // s (Child) is subclasses of o (Parent)
                const parent = this.classMap.get(o)!;
                parent.subClasses.push(s);

                if (!this.subClassMap.has(o)) this.subClassMap.set(o, []);
                this.subClassMap.get(o)!.push(s);

                // Track Parent
                if (!this.parentMap.has(s)) this.parentMap.set(s, []);
                this.parentMap.get(s)!.push(o);
            }
        }

        // Collect ALL Property IDs (Union of Domain, Range, Type definitions)
        const allPropertyIDs = new Set<bigint>();

        // 1. From Domains
        const propDomains = new Map<bigint, bigint[]>();
        for (const [p, , d] of this.store.match(null, v.rdfsDomain, null)) {
            if (!propDomains.has(p)) propDomains.set(p, []);

            const term = this.factory.decode(d);
            if (term.termType === 'BlankNode') {
                const unionMembers = this.resolveUnion(d);
                if (unionMembers.length > 0) {
                    unionMembers.forEach(m => propDomains.get(p)!.push(m));
                } else {
                    propDomains.get(p)!.push(d);
                }
            } else {
                propDomains.get(p)!.push(d);
            }

            allPropertyIDs.add(p);
        }

        const inverseMap = new Map<bigint, bigint>();
        for (const [s, , o] of this.store.match(null, v.owlInverseOf, null)) {
            inverseMap.set(s, o);
            inverseMap.set(o, s); // Bidirectional
        }

        // Helper for Graph-Agnostic Check
        const hasType = (prop: bigint, type: bigint) => {
            // match(s, p, o, null) -> null graph wildcard
            for (const _ of this.store.match(prop, v.rdfType, type)) return true;
            return false;
        };

        // 2. From Types (Object, Datatype, Annotation, Functional, etc.)
        const propTypes = [
            v.owlObjectProperty, v.owlDatatypeProperty, v.owlAnnotationProperty,
            v.owlFunctionalProperty, v.owlInverseFunctionalProperty,
            v.owlSymmetricProperty, v.owlTransitiveProperty
        ];

        for (const type of propTypes) {
            for (const [s] of this.store.match(null, v.rdfType, type)) {
                allPropertyIDs.add(s);
            }
        }

        // Process properties
        for (const propID of allPropertyIDs) {
            const domains = propDomains.get(propID) || [];
            const uniqueRanges = new Set<bigint>();
            for (const [, , r] of this.store.match(propID, v.rdfsRange, null)) {
                // If the range is a blank node, it might be a union
                const term = this.factory.decode(r);
                if (term.termType === 'BlankNode') {
                    const unionMembers = this.resolveUnion(r);
                    if (unionMembers.length > 0) {
                        unionMembers.forEach(m => uniqueRanges.add(m));
                    } else {
                        uniqueRanges.add(r);
                    }
                } else {
                    uniqueRanges.add(r);
                }
            }
            const ranges = Array.from(uniqueRanges);

            // Use safe check
            const isFunctional = hasType(propID, v.owlFunctionalProperty);
            const isInverseFunctional = hasType(propID, v.owlInverseFunctionalProperty);
            const isSymmetric = hasType(propID, v.owlSymmetricProperty);
            const isTransitive = hasType(propID, v.owlTransitiveProperty);
            const isReflexive = hasType(propID, v.owlReflexiveProperty);
            const isIrreflexive = hasType(propID, v.owlIrreflexiveProperty);
            const isAsymmetric = hasType(propID, v.owlAsymmetricProperty);

            // determine property type
            let type: PropertySchema['type'] = 'Unknown';
            if (hasType(propID, v.owlObjectProperty)) type = 'Object';
            else if (hasType(propID, v.owlDatatypeProperty)) type = 'Data';
            else if (hasType(propID, v.owlAnnotationProperty)) type = 'Annotation';

            const inverseId = inverseMap.get(propID); // Get inverse ID if exists

            const labels: Record<string, string> = {};
            for (const [, , o] of this.store.match(propID, this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#label'), null)) {
                try {
                    const term = this.factory.decode(o);
                    if (term.termType === 'Literal') {
                        const lang = term.language || 'en';
                        labels[lang] = term.value;
                    }
                } catch { }
            }

            const propSchema: PropertySchema = {
                property: propID,
                ranges,
                minCount: 0,
                maxCount: isFunctional ? 1 : Infinity,
                isFunctional,
                isInverseFunctional,
                isSymmetric,
                isTransitive,
                isReflexive,
                isIrreflexive,
                isAsymmetric,
                inverseOf: inverseId,
                type,
                labels
            };

            this.propertyMap.set(propID, propSchema);

            for (const domain of domains) {
                if (this.classMap.has(domain)) {
                    this.classMap.get(domain)!.properties.push(propSchema);
                }
            }
        }
    }

    listClasses(lang: string = 'en'): ClassSchema[] {
        const getBestLabel = (labels: Record<string, string>) => {
            if (labels[lang]) return labels[lang];
            const pm = Object.keys(labels).find(k => k.startsWith(lang));
            if (pm) return labels[pm];
            if (labels['en']) return labels['en'];
            const epm = Object.keys(labels).find(k => k.startsWith('en'));
            if (epm) return labels[epm];
            return Object.values(labels)[0] || '';
        };

        return Array.from(this.classMap.values()).sort((a, b) => {
            return getBestLabel(a.labels).localeCompare(getBestLabel(b.labels));
        });
    }

    listProperties(lang: string = 'en'): PropertySchema[] {
        const getBestLabel = (labels: Record<string, string>) => {
            if (labels[lang]) return labels[lang];
            const pm = Object.keys(labels).find(k => k.startsWith(lang));
            if (pm) return labels[pm];
            if (labels['en']) return labels['en'];
            const epm = Object.keys(labels).find(k => k.startsWith('en'));
            if (epm) return labels[epm];
            return Object.values(labels)[0] || '';
        };

        return Array.from(this.propertyMap.values()).sort((a, b) => {
            return getBestLabel(a.labels).localeCompare(getBestLabel(b.labels));
        });
    }

    getSchemaForClass(classID: NodeID): ClassSchema | undefined { return this.classMap.get(classID); }
    getPropertySchema(propertyID: NodeID): PropertySchema | undefined { return this.propertyMap.get(propertyID); }
    getDomainsForProperty(propertyID: NodeID): NodeID[] {
        // Reverse lookup: iterate classes using this property
        // Optimization: Should assume built index is faster, but we didn't index this direction explicitly.
        // However, we populated local class maps with the prop schema.
        const domains: NodeID[] = [];
        for (const schema of this.classMap.values()) {
            if (schema.properties.some(p => p.property === propertyID)) {
                domains.push(schema.classID);
            }
        }
        return domains;
    }

    // Calculates depth from root (0 = Root). Handles multiple inheritance by taking max depth? Or min?
    // "Thing" should be 0.
    getDepth(classID: NodeID, visited = new Set<bigint>()): number {
        if (visited.has(classID)) return 0; // Cycle protection
        visited.add(classID);

        const parents = this.parentMap.get(classID);
        if (!parents || parents.length === 0) return 0;

        let maxParentDepth = 0;
        for (const p of parents) {
            maxParentDepth = Math.max(maxParentDepth, this.getDepth(p, visited));
        }
        return 1 + maxParentDepth;
    }

    getClassHierarchy(rootClass: NodeID): ClassSchema | undefined {
        // Recursive? For now just return flat schema
        return this.classMap.get(rootClass);
    }

    // Get Parents
    getSuperClasses(classID: NodeID): NodeID[] {
        return this.parentMap.get(classID) || [];
    }

    // Get all children recursively
    getSubClassesRecursive(classID: NodeID, seen = new Set<bigint>()): NodeID[] {
        if (seen.has(classID)) return [];
        seen.add(classID);
        const direct = this.subClassMap.get(classID) || [];
        const result = [...direct];
        for (const sub of direct) {
            result.push(...this.getSubClassesRecursive(sub, seen));
        }
        return result;
    }

    private resolveUnion(unionID: bigint): bigint[] {
        const v = this.vocab;
        const members: bigint[] = [];

        // Check for owl:unionOf
        for (const [, , listHead] of this.store.match(unionID, v.owlUnionOf, null)) {
            members.push(...this.resolveList(listHead));
        }

        return members;
    }

    private resolveList(head: bigint): bigint[] {
        const v = this.vocab;
        const result: bigint[] = [];
        let current = head;

        while (current !== v.rdfNil) {
            const firstQuads = this.store.match(current, v.rdfFirst, null);
            let found = false;
            for (const [, , item] of firstQuads) {
                result.push(item);
                found = true;
                break;
            }
            if (!found) break;

            const restQuads = this.store.match(current, v.rdfRest, null);
            found = false;
            for (const [, , next] of restQuads) {
                current = next;
                found = true;
                break;
            }
            if (!found) break;
        }

        return result;
    }
}
