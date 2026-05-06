import { NodeID, IDataFactory, IQuadStore } from '@triplestore/core';
import { Vocabulary } from './vocabulary';
import { STANDARD_PROPERTIES } from './standard_schemas';

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
    comments?: Record<string, string>;
}

export interface ClassSchema {
    classID: NodeID;
    properties: PropertySchema[];
    explicitProperties: Set<bigint>; // Track properties defined explicitly for this class
    subClasses: NodeID[];
    disjointWith: NodeID[];
    labels: Record<string, string>;
}

export class SchemaIndex {
    private vocab: Vocabulary;
    private classMap = new Map<bigint, ClassSchema>();
    private propertyMap = new Map<bigint, PropertySchema>();

    public static isObjectProperty(ps: PropertySchema, factory: IDataFactory): boolean {
        if (ps.type === 'Object') return true;
        if (ps.type === 'Data' || ps.type === 'Annotation') return false;
        
        if (ps.ranges.length > 0) {
            const isProbablyData = ps.ranges.some(r => {
                const uri = factory.decode(r).value;
                return uri.includes('XMLSchema') || uri.includes('rdf-schema#Literal') || uri.includes('rdf-syntax-ns#langString');
            });
            return !isProbablyData;
        }
        return false; // Default to Data
    }
    private subClassMap = new Map<bigint, bigint[]>();
    private parentMap = new Map<bigint, bigint[]>();
    private uriToID = new Map<string, bigint>(); // URI String -> Official BigID

    constructor(private store: IQuadStore, private factory: IDataFactory) {
        console.log(">>> SCHEMA_INDEX_V2 AKTIF <<<");
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
        this.uriToID.clear();

        this.injectStandardProperties();

        const v = this.vocab;

        const allClasses = new Set<bigint>();
        allClasses.add(v.owlThing);
        allClasses.add(v.rdfsResource);

        for (const [s] of this.store.match(null, v.rdfType, v.owlClass)) allClasses.add(s);
        for (const [s] of this.store.match(null, v.rdfType, this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#Class'))) allClasses.add(s);

        // 2. Init Class Schemas
        for (const rawClassID of allClasses) {
            let classID = rawClassID;
            try {
                const term = this.factory.decode(rawClassID);
                if (term.termType !== 'NamedNode') continue;
                const uri = term.value;
                
                // Normalizasyon: Bu URI için daha önce bir ID belirledik mi?
                if (this.uriToID.has(uri)) {
                    classID = this.uriToID.get(uri)!;
                } else {
                    this.uriToID.set(uri, rawClassID);
                }
            } catch { continue; }

            // Eğer bu sınıf için zaten bir şema oluşturduysak (farklı graph'lardan gelen aynı URI) atla
            if (this.classMap.has(classID)) continue;

            const labels: Record<string, string> = {};
            // Root etiketleri
            if (classID === v.owlThing) { labels['en'] = 'Entity'; labels['tr'] = 'Varlık'; }
            if (classID === v.rdfsResource) { labels['en'] = 'Resource'; labels['tr'] = 'Kaynak'; }

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
                disjointWith.push(this.resolveOfficialID(o));
            }

            this.classMap.set(classID, { classID, properties: [], explicitProperties: new Set(), subClasses: [], disjointWith, labels });
        }

        // 3. Find SubClass Hierarchy (URI-Aware)
        for (const [s, , o] of this.store.match(null, v.rdfsSubClassOf, null)) {
            const officialChild = this.resolveOfficialID(s);
            const officialParent = this.resolveOfficialID(o);

            if (this.classMap.has(officialParent)) {
                const parentSchema = this.classMap.get(officialParent)!;
                if (!parentSchema.subClasses.includes(officialChild)) {
                    parentSchema.subClasses.push(officialChild);
                }

                if (!this.subClassMap.has(officialParent)) this.subClassMap.set(officialParent, []);
                if (!this.subClassMap.get(officialParent)!.includes(officialChild)) {
                    this.subClassMap.get(officialParent)!.push(officialChild);
                }

                if (!this.parentMap.has(officialChild)) this.parentMap.set(officialChild, []);
                if (!this.parentMap.get(officialChild)!.includes(officialParent)) {
                    this.parentMap.get(officialChild)!.push(officialParent);
                }
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

        // 2. Pre-calculate URI-based types for EVERYTHING in the store (Global URI-Type Map)
        const uriToTypes = new Map<string, Set<string>>();
        // Scan ALL rdf:type triples in the store to build a URI-to-URI type map
        for (const [s, , o] of this.store.match(null, v.rdfType, null)) {
            try {
                const sTerm = this.factory.decode(s);
                const oTerm = this.factory.decode(o);
                if (sTerm.termType === 'NamedNode' && oTerm.termType === 'NamedNode') {
                    const sURI = sTerm.value;
                    const oURI = oTerm.value;
                    if (!uriToTypes.has(sURI)) uriToTypes.set(sURI, new Set());
                    uriToTypes.get(sURI)!.add(oURI);
                    
                    // Also track s as a property if it has a property-like type
                    if (oURI.includes('Property')) {
                        allPropertyIDs.add(s);
                    }
                }
            } catch { }
        }

        // Helper for URI-Aware Type Check
        const hasType = (prop: bigint, type: bigint) => {
            try {
                const pURI = this.factory.decode(prop).value;
                const tURI = this.factory.decode(type).value;
                return uriToTypes.get(pURI)?.has(tURI) ?? false;
            } catch { return false; }
        };

        // Properties from domains also added to discovery
        for (const [p] of propDomains) {
            allPropertyIDs.add(p);
        }

        // Process properties
        for (const rawPropID of allPropertyIDs) {
            let propID = rawPropID;
            try {
                const term = this.factory.decode(rawPropID);
                if (term.termType !== 'NamedNode') continue;
                const uri = term.value;
                if (this.uriToID.has(uri)) {
                    propID = this.uriToID.get(uri)!;
                } else {
                    this.uriToID.set(uri, rawPropID);
                }
            } catch { continue; }

            if (this.propertyMap.has(propID)) continue;

            const domains = (propDomains.get(rawPropID) || []).map(d => this.resolveOfficialID(d));
            const uniqueRanges = new Set<bigint>();
            for (const [, , r] of this.store.match(propID, v.rdfsRange, null)) {
                // If the range is a blank node, it might be a union
                const term = this.factory.decode(r);
                if (term.termType === 'BlankNode') {
                    const unionMembers = this.resolveUnion(r);
                    if (unionMembers.length > 0) {
                        unionMembers.forEach(m => uniqueRanges.add(this.resolveOfficialID(m)));
                    } else {
                        uniqueRanges.add(this.resolveOfficialID(r));
                    }
                } else {
                    uniqueRanges.add(this.resolveOfficialID(r));
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
            
            // HEURISTIC: Infer from ranges if type is unknown
            if (type === 'Unknown' && ranges.length > 0) {
                const isProbablyData = ranges.some(r => {
                    const uri = this.factory.decode(r).value;
                    return uri.includes('XMLSchema') || uri.includes('rdf-schema#Literal') || uri.includes('rdf-syntax-ns#langString');
                });
                type = isProbablyData ? 'Data' : 'Object';
            }

            const inverseId = inverseMap.has(propID) ? this.resolveOfficialID(inverseMap.get(propID)!) : undefined;

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
            
            // Link to classes (explicit domains)
            for (const domain of domains) {
                if (this.classMap.has(domain)) {
                    const classSchema = this.classMap.get(domain)!;
                    classSchema.properties.push(propSchema);
                    classSchema.explicitProperties.add(propID);
                }
            }
        }

        // 4. Inheritance Pass: Propagate properties down to subclasses
        // Logic: For each class, find all properties defined for its parents (recursively)
        for (const [classID, schema] of this.classMap.entries()) {
            const parents = this.getSuperClassesRecursive(classID);
            for (const parentID of parents) {
                const parentSchema = this.classMap.get(parentID);
                if (parentSchema) {
                    for (const parentProp of parentSchema.properties) {
                        // Avoid duplicates if a property is already explicitly defined for the subclass
                        if (!schema.properties.some(p => p.property === parentProp.property)) {
                            schema.properties.push(parentProp);
                        }
                    }
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

    getSchemaForClass(classID: NodeID): ClassSchema | undefined { return this.classMap.get(this.resolveOfficialID(classID)); }
    getPropertySchema(propertyID: NodeID): PropertySchema | undefined { return this.propertyMap.get(this.resolveOfficialID(propertyID)); }
    getDomainsForProperty(propertyID: NodeID): NodeID[] {
        const officialP = this.resolveOfficialID(propertyID);
        const domains: NodeID[] = [];
        for (const schema of this.classMap.values()) {
            if (schema.explicitProperties.has(officialP)) {
                domains.push(schema.classID);
            }
        }
        return domains;
    }

    // Calculates depth from root (0 = Root). Handles multiple inheritance by taking max depth? Or min?
    // "Thing" should be 0.
    getDepth(classID: NodeID, visited = new Set<bigint>()): number {
        const official = this.resolveOfficialID(classID);
        if (visited.has(official)) return 0; // Cycle protection
        visited.add(official);

        const parents = this.parentMap.get(official);
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

    /**
     * Identifies the most specific classes (leaves) in a provided set of class IDs.
     * A class is a leaf if none of its subclasses are present in the set.
     */
    getLeafTypes(types: NodeID[]): NodeID[] {
        if (types.length <= 1) return types;
        
        const typeSet = new Set(types);
        const leaves: NodeID[] = [];

        for (const typeID of types) {
            // Check if any OTHER type in the set is a subclass of this typeID
            const allSubs = this.getSubClassesRecursive(typeID);
            const hasMoreSpecific = allSubs.some(sub => typeSet.has(sub));
            
            if (!hasMoreSpecific) {
                leaves.push(typeID);
            }
        }

        return leaves;
    }

    // Get direct subclasses
    getSubClasses(classID: NodeID): NodeID[] {
        return this.subClassMap.get(this.resolveOfficialID(classID)) || [];
    }

    // Get Parents
    getSuperClasses(classID: NodeID): NodeID[] {
        return this.parentMap.get(this.resolveOfficialID(classID)) || [];
    }

    isSubClassOf(childID: NodeID, parentID: NodeID): boolean {
        const officialChild = this.resolveOfficialID(childID);
        const officialParent = this.resolveOfficialID(parentID);
        if (officialChild === officialParent) return true;
        const parents = this.getSuperClassesRecursive(officialChild);
        return parents.includes(officialParent);
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

    // Get all parents recursively
    getSuperClassesRecursive(classID: NodeID, seen = new Set<bigint>()): NodeID[] {
        if (seen.has(classID)) return [];
        seen.add(classID);
        const direct = this.getSuperClasses(classID);
        const result = [...direct];
        for (const parent of direct) {
            result.push(...this.getSuperClassesRecursive(parent, seen));
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

    private resolveOfficialID(id: NodeID): NodeID {
        try {
            const term = this.factory.decode(id);
            if (term.termType === 'NamedNode') {
                const official = this.uriToID.get(term.value);
                if (official !== undefined) return official;
            }
        } catch { }
        return id;
    }

    private injectStandardProperties() {
        for (const [uri, schema] of Object.entries(STANDARD_PROPERTIES)) {
            const propID = this.factory.namedNode(uri);
            this.propertyMap.set(propID, {
                property: propID,
                ranges: [],
                minCount: 0,
                maxCount: Infinity,
                isFunctional: false,
                isInverseFunctional: false,
                isSymmetric: false,
                isTransitive: false,
                isReflexive: false,
                isIrreflexive: false,
                isAsymmetric: false,
                type: (schema.type as PropertySchema['type']) || 'Unknown',
                labels: schema.labels || {},
                comments: schema.comments || {},
                ...schema
            });
        }
    }
}
