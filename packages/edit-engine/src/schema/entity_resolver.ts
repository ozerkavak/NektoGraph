import { NodeID, Quad, IDataFactory, IQuadStore } from '@triplestore/core';
import { DraftStore, CompositeStore } from '../session';
import { SchemaIndex, PropertySchema } from './schema_index';

export type PropertySource = 'ontology' | 'data' | 'inference' | 'new' | 'deleted' | 'diff';

export interface StructuredProperty {
    property: NodeID;
    values: {
        value: NodeID;
        quad: Quad; 
        source: PropertySource;
        dupeCount?: number;
        allQuads?: { quad: Quad; source: PropertySource }[]; 
    }[];
    schema?: PropertySchema;
    isInverse?: boolean;
    label?: string;
    hasMentions?: boolean; 
}

export interface StructuredClassGroup {
    classID: NodeID;
    isMissing: boolean;
    dataProperties: StructuredProperty[];
    objectProperties: StructuredProperty[];
    unclassifiedProperties: StructuredProperty[];
    label?: string;
    labels?: Record<string, string>;
}

export interface StructuredTripleMention {
    tripleID: NodeID;
    subject: NodeID;
    predicate: NodeID;
    object: NodeID;
    annotations: StructuredProperty[];
}

export interface RichEntityStructured {
    id: NodeID;
    uri: string;
    label?: string;
    labels: Record<string, string>;
    comment?: string;
    comments: Record<string, string>;
    allLabels: { value: string, lang: string, quad: Quad, source: PropertySource, dupeCount?: number, allQuads?: { quad: Quad; source: PropertySource }[] }[];
    allComments: { value: string, lang: string, quad: Quad, source: PropertySource, dupeCount?: number, allQuads?: { quad: Quad; source: PropertySource }[] }[];
    allTypes: { value: NodeID, quad: Quad, source: PropertySource, dupeCount?: number, allQuads?: { quad: Quad; source: PropertySource }[] }[];
    types: NodeID[];
    classGroups: StructuredClassGroup[];
    orphanProperties: StructuredProperty[];
    incomings: StructuredProperty[];
    mentions: StructuredTripleMention[]; 
    sources: PropertySource[];
}

export interface RichEntity {
    id: NodeID;
    label?: string;
    labels: Record<string, string>;
    types: NodeID[];
    properties: Map<bigint, Quad[]>;
    comment?: string;
    comments: Record<string, string>;
}

export class EntityResolver {
    constructor(private _store: IQuadStore, private factory: IDataFactory, private schemaIndex?: SchemaIndex) { }

    public getLabel(id: NodeID, lang: 'en' | 'tr' = 'en', session?: DraftStore): string | undefined {
        if (this.schemaIndex) {
            const schema = this.schemaIndex.getSchemaForClass(id);
            if (schema && schema.labels) {
                if (schema.labels[lang]) return schema.labels[lang];
                const prefixMatch = Object.keys(schema.labels).find(k => k.startsWith(lang));
                if (prefixMatch) return schema.labels[prefixMatch];
                if (schema.labels['en']) return schema.labels['en'];
                return Object.values(schema.labels)[0];
            }
        }
        const labelPred = this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#label');
        const composite = new CompositeStore(this._store, session || null);
        const labels: Quad[] = [];
        for (const raw of composite.match(id, labelPred, null, null)) {
            labels.push({ subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] });
        }
        
        let label = this.resolveLanguageValue(labels, lang as any);
        
        // Lazy Fallback: Check SKOS if rdfs:label is missing
        if (!label) {
            const prefLabelPred = this.factory.namedNode('http://www.w3.org/2004/02/skos/core#prefLabel');
            const skosLabels: Quad[] = [];
            for (const raw of composite.match(id, prefLabelPred, null, null)) {
                skosLabels.push({ subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] });
            }
            label = this.resolveLanguageValue(skosLabels, lang as any);

            if (!label) {
                const altLabelPred = this.factory.namedNode('http://www.w3.org/2004/02/skos/core#altLabel');
                const altLabels: Quad[] = [];
                for (const raw of composite.match(id, altLabelPred, null, null)) {
                    altLabels.push({ subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] });
                }
                label = this.resolveLanguageValue(altLabels, lang as any);
            }
        }

        return label;
    }

    public getComment(id: NodeID, lang: 'en' | 'tr' = 'en', session?: DraftStore): string | undefined {
        const commentPred = this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#comment');
        const composite = new CompositeStore(this._store, session || null);
        const comments: Quad[] = [];
        for (const raw of composite.match(id, commentPred, null, null)) {
            comments.push({ subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] });
        }
        return this.resolveLanguageValue(comments, lang as any);
    }

    private resolveLanguageValue(quads: Quad[], targetLang: 'en' | 'tr'): string | undefined {
        if (quads.length === 0) return undefined;
        for (const q of quads) {
            const val = this.factory.decode(q.object);
            if (val.termType === 'Literal' && val.language === targetLang) return val.value;
        }
        for (const q of quads) {
            const val = this.factory.decode(q.object);
            if (val.termType === 'Literal' && (val.language === 'en' || val.language === 'tr')) return val.value;
        }
        const first = this.factory.decode(quads[0].object);
        return first.value;
    }

    private getBestLabel(labels: Record<string, string>, lang: string): string | undefined {
        if (labels[lang]) return labels[lang];
        const pm = Object.keys(labels).find(k => k.startsWith(lang));
        if (pm) return labels[pm];
        if (labels['en']) return labels['en'];
        return Object.values(labels)[0];
    }

    private deduplicateValues(
        inputs: { value: NodeID; quad: Quad; source: PropertySource; dupeCount?: number; allQuads?: any[] }[]
    ): { value: NodeID; quad: Quad; source: PropertySource; dupeCount?: number; allQuads?: any[] }[] {
        const uniqueMap = new Map<string, { value: NodeID; quad: Quad; source: PropertySource; dupeCount?: number; allQuads?: any[] }[]>();
        for (const input of inputs) {
            const term = this.factory.decode(input.value);
            let key = term.value;
            if (term.termType === 'Literal') {
                if (term.language) key += `@${term.language}`;
                else {
                    const dt = (term as any).datatype;
                    const dtVal = (dt && typeof dt === 'object') ? dt.value : dt;
                    if (dtVal && dtVal !== 'http://www.w3.org/2001/XMLSchema#string') {
                        key += `^^${dtVal}`;
                    }
                }
            } else {
                key = `${term.termType}:${term.value}`;
            }
            if (!uniqueMap.has(key)) uniqueMap.set(key, []);
            uniqueMap.get(key)!.push(input);
        }
        const result: { value: NodeID; quad: Quad; source: PropertySource; dupeCount?: number; allQuads?: any[] }[] = [];
        const priority: Record<string, number> = { 'new': 0, 'data': 1, 'ontology': 2, 'inference': 3 };
        const getPrio = (s: PropertySource) => priority[s] ?? 99;
        for (const [_, items] of uniqueMap) {
            const hasExplicit = items.some(i => i.source !== 'inference');
            let candidates = hasExplicit ? items.filter(i => i.source !== 'inference') : items;
            candidates.sort((a, b) => getPrio(a.source) - getPrio(b.source));
            if (candidates.length > 0) {
                const rep = candidates[0];
                rep.dupeCount = items.length - 1;
                rep.allQuads = items.map(i => ({ quad: i.quad, source: i.source }));
                result.push(rep);
            }
        }
        return result;
    }

    public resolveMetadata(id: NodeID, session?: DraftStore): { labels: Record<string, string>, comments: Record<string, string>, types: NodeID[], sources: PropertySource[] } {
        const typePred = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
        const labelPred = this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#label');
        const commentPred = this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#comment');

        const labels: Record<string, string> = {};
        const comments: Record<string, string> = {};
        const types: NodeID[] = [];
        const sources = new Set<PropertySource>();

        const composite = new CompositeStore(this._store, session || null);

        for (const raw of composite.match(id, labelPred, null, null)) {
            const term = this.factory.decode(raw[2]);
            if (term.termType === 'Literal') {
                const l = term.language || '';
                if (!labels[l]) labels[l] = term.value;
            }
            sources.add(this.determineSource({ subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] }, session));
        }

        // Lazy Fallback: Only fetch SKOS if no labels found
        if (Object.keys(labels).length === 0) {
            const prefLabelPred = this.factory.namedNode('http://www.w3.org/2004/02/skos/core#prefLabel');
            for (const raw of composite.match(id, prefLabelPred, null, null)) {
                const term = this.factory.decode(raw[2]);
                if (term.termType === 'Literal') {
                    const l = term.language || '';
                    if (!labels[l]) labels[l] = term.value;
                }
                sources.add(this.determineSource({ subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] }, session));
            }
            if (Object.keys(labels).length === 0) {
                const altLabelPred = this.factory.namedNode('http://www.w3.org/2004/02/skos/core#altLabel');
                for (const raw of composite.match(id, altLabelPred, null, null)) {
                    const term = this.factory.decode(raw[2]);
                    if (term.termType === 'Literal') {
                        const l = term.language || '';
                        if (!labels[l]) labels[l] = term.value;
                    }
                    sources.add(this.determineSource({ subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] }, session));
                }
            }
        }

        for (const raw of composite.match(id, commentPred, null, null)) {
            const term = this.factory.decode(raw[2]);
            if (term.termType === 'Literal') {
                const l = term.language || '';
                if (!comments[l]) comments[l] = term.value;
            }
            sources.add(this.determineSource({ subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] }, session));
        }

        for (const raw of composite.match(id, typePred, null, null)) {
            types.push(raw[2]);
            sources.add(this.determineSource({ subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] }, session));
        }

        // SchemaIndex Fallback for System Predicates (Labels & Comments)
        if (this.schemaIndex) {
            const propSchema = this.schemaIndex.getPropertySchema(id);
            if (propSchema) {
                Object.entries(propSchema.labels || {}).forEach(([lang, val]) => {
                    if (!labels[lang]) labels[lang] = val as string;
                });
                const commentsMap = (propSchema as any).comments || {};
                Object.entries(commentsMap).forEach(([lang, val]) => {
                    if (!comments[lang]) comments[lang] = val as string;
                });
            }
        }

        return { labels, comments, types, sources: Array.from(sources) };
    }

    /**
     * Recursively follow reification/occurrenceOf chains to find the ground TripleID if the node is a proxy.
     * @param node The NodeID to unwrap
     * @param session Optional session store to include draft reifications
     * @returns The ground TripleID if found, or the original node if it doesn't reify anything.
     */
    public unwrap(node: NodeID, session?: DraftStore): NodeID {
        let current = node;
        const visited = new Set<NodeID>();
        const composite = new CompositeStore(this._store, session || null);
        
        while (visited.size < 10) { 
            if (visited.has(current)) break;
            visited.add(current);
            try { 
                if (this.factory.decode(current).termType === 'Triple') return current; 
            } catch { /* Not a triple, keep looking */ }
            
            let discovered = false;
            for (const rq of composite.match(current, null, null, null)) {
                try {
                    const pURI = this.factory.decode(rq[1]).value;
                    // AGNOSTIC MATCH: Support reifies/occurrenceOf regardless of prefix
                    if (pURI.endsWith('#reifies') || pURI.endsWith('#occurrenceOf') || pURI.endsWith('/rdf-star#occurrenceOf')) {
                        current = rq[2];
                        discovered = true;
                        break;
                    }
                } catch { }
            }
            if (!discovered) break;
        }
        return current;
    }

    resolveStructured(id: NodeID, lang: 'en' | 'tr' = 'en', session?: DraftStore): RichEntityStructured {
        const typePred = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
        const labelPred = this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#label');
        const commentPred = this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#comment');
        const reificationPreds = [
            'http://www.w3.org/ns/rdf-star#occurrenceOf',
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#reifies',
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#occurrenceOf'
        ];
        
        const types: NodeID[] = [];
        const typeQuads: Quad[] = [];
        const labelQuads: Quad[] = [];
        const commentQuads: Quad[] = [];
        const outgoingProps = new Map<bigint, Quad[]>();
        const incomingProps = new Map<bigint, Quad[]>();

        const getSource = (q: Quad): PropertySource => this.determineSource(q, session);
        const composite = new CompositeStore(this._store, session || null);

        // 1. Gather Outgoing (SPF)
        for (const raw of composite.match(id, null, null, null)) {
            const q: Quad = { subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] };
            const p = q.predicate;
            if (!outgoingProps.has(p)) outgoingProps.set(p, []);
            outgoingProps.get(p)!.push(q);
            if (p === typePred) { types.push(q.object); typeQuads.push(q); }
            if (p === labelPred) labelQuads.push(q);
            if (p === commentPred) commentQuads.push(q);
        }

        // 2. TRANSPARENT REIFICATION: Outgoings & Mentions
        const mentions: StructuredTripleMention[] = [];

        // Discovery: Search for quads that reference the entity as S, P, O (Directly or via Unwrap)
        for (const q of composite.match(null, null, null, null)) {
            const s = q[0];
            const o = q[2];
            const g = q[3];

            const unwrappedS = this.unwrap(s, session);
            const unwrappedO = this.unwrap(o, session);
            
            let isSTriple = false; try { isSTriple = this.factory.decode(unwrappedS).termType === 'Triple'; } catch {}
            let isOTriple = false; try { isOTriple = this.factory.decode(unwrappedO).termType === 'Triple'; } catch {}

            const tripleID = isSTriple ? unwrappedS : (isOTriple ? unwrappedO : null);
            if (!tripleID) continue;

            const tripleToken = this.factory.decode(tripleID) as any;
            if (tripleToken.subject === id || tripleToken.object === id || tripleToken.predicate === id) {
                // A. Promotion
                if (isSTriple && tripleToken.subject === id) {
                    const tp = tripleToken.predicate;
                    const to = tripleToken.object;
                    const alreadyAsserted = outgoingProps.get(tp)?.some(aq => aq.object === to);
                    if (!alreadyAsserted) {
                        if (!outgoingProps.has(tp)) outgoingProps.set(tp, []);
                        outgoingProps.get(tp)!.push({ subject: id, predicate: tp, object: to, graph: g, isReifiedPromotion: true } as any);
                    }
                }

                // B. Annotations/Mentions
                if (!mentions.some(m => m.tripleID === tripleID)) {
                    const annGroups = new Map<bigint, Quad[]>();
                    const queue = [tripleID];
                    const visited = new Set<NodeID>();
                    
                    while (queue.length > 0) {
                        const cur = queue.shift()!;
                        if (visited.has(cur)) continue;
                        visited.add(cur);

                        for (const mq of composite.match(cur, null, null, null)) {
                            const mp = mq[1];
                            const mpURI = this.factory.decode(mp).value;
                            if (reificationPreds.includes(mpURI) || mpURI.endsWith('#type')) {
                                if (reificationPreds.includes(mpURI)) queue.push(mq[2]);
                                continue;
                            }
                            if (!annGroups.has(mp)) annGroups.set(mp, []);
                            annGroups.get(mp)!.push({ subject: mq[0], predicate: mq[1], object: mq[2], graph: mq[3] });
                        }
                        for (const rq of composite.match(null, null, cur, null)) {
                            const rpURI = this.factory.decode(rq[1]).value;
                            if (reificationPreds.includes(rpURI)) queue.push(rq[0]);
                        }
                    }

                    if (annGroups.size > 0) {
                        const annotations: StructuredProperty[] = [];
                        for (const [ap, aqs] of annGroups) {
                            annotations.push({
                                property: ap,
                                values: this.deduplicateValues(aqs.map(aq => ({ value: aq.object, quad: aq, source: this.determineSource(aq, session) })))
                            });
                        }
                        // RECURSIVE COMPONENT UNWRAP: Ensure internal BNode proxies (like n3-5) are also promoted!
                        mentions.push({ 
                            tripleID, 
                            subject: this.unwrap(tripleToken.subject, session), 
                            predicate: this.unwrap(tripleToken.predicate, session), 
                            object: this.unwrap(tripleToken.object, session), 
                            annotations 
                        });
                    }
                }
            }
        }

        // 3. Resolve Incoming (SPO) with Unwrap
        for (const raw of composite.match(null, null, id, null)) {
            const finalS = this.unwrap(raw[0], session);
            const p = raw[1];
            if (!incomingProps.has(p)) incomingProps.set(p, []);
            incomingProps.get(p)!.push({ subject: finalS, predicate: p, object: id, graph: raw[3] });
        }

        // 4. Metadata Resolution
        const allTypesRaw = this.deduplicateValues(typeQuads.map(q => ({ value: q.object, quad: q, source: getSource(q) })));
        const allTypes: RichEntityStructured['allTypes'] = allTypesRaw.map(v => ({ value: v.value, quad: v.quad, source: v.source, dupeCount: v.dupeCount, allQuads: v.allQuads }));
        const allLabelsRaw = this.deduplicateValues(labelQuads.map(q => ({ value: q.object, quad: q, source: getSource(q) })));
        const allLabels: RichEntityStructured['allLabels'] = allLabelsRaw.map(v => {
            const term = this.factory.decode(v.value);
            return { value: term.value, lang: (term.termType === 'Literal' ? term.language : '') || '', quad: v.quad, source: v.source, dupeCount: v.dupeCount, allQuads: v.allQuads };
        });
        const allCommentsRaw = this.deduplicateValues(commentQuads.map(q => ({ value: q.object, quad: q, source: getSource(q) })));
        const allComments: RichEntityStructured['allComments'] = allCommentsRaw.map(v => {
            const term = this.factory.decode(v.value);
            return { value: term.value, lang: (term.termType === 'Literal' ? term.language : '') || '', quad: v.quad, source: v.source, dupeCount: v.dupeCount, allQuads: v.allQuads };
        });
        const labelMap: Record<string, string> = {};
        const commentMap: Record<string, string> = {};
        const populateMap = (src: { value: string, lang: string }[], tgt: Record<string, string>) => {
            src.forEach(i => { if (!tgt[i.lang || '']) tgt[i.lang || ''] = i.value; });
            if (!tgt['en'] && !tgt[''] && src[0]) tgt[src[0].lang || ''] = src[0].value;
        };
        populateMap(allLabels, labelMap);
        populateMap(allComments, commentMap);
        const label = this.resolveLanguageValue(labelQuads, lang);
        const comment = this.resolveLanguageValue(commentQuads, lang);

        // 5. Structural Organization
        const classUsage = new Map<bigint, StructuredClassGroup>();
        const getOrCreateGroup = (classID: NodeID) => {
            if (!classUsage.has(classID)) {
                const cidVal = this.factory.decode(classID).value;
                const isExplicit = types.some(t => this.factory.decode(t).value === cidVal);
                const classSchema = this.schemaIndex?.getSchemaForClass(classID);
                classUsage.set(classID, { classID, isMissing: !isExplicit, dataProperties: [], objectProperties: [], unclassifiedProperties: [],
                    label: classSchema ? this.getBestLabel(classSchema.labels, lang) : undefined, labels: classSchema?.labels
                });
            }
            return classUsage.get(classID)!;
        };
        types.forEach(tid => getOrCreateGroup(tid));
        const processedOutgoing = new Set<bigint>();
        for (const [p, quads] of outgoingProps) {
            if (p === typePred || p === labelPred || p === commentPred) { processedOutgoing.add(p); continue; }
            const propSchema = this.schemaIndex?.getPropertySchema(p);
            if (propSchema && this.schemaIndex) {
                const validDomains = this.schemaIndex.getDomainsForProperty(p);
                if (validDomains.length > 0) {
                    processedOutgoing.add(p);
                    validDomains.forEach(domainID => {
                        const group = getOrCreateGroup(domainID);
                        const structuredProp: StructuredProperty = { 
                            property: p, 
                            values: this.deduplicateValues(quads.map(q => ({ value: q.object, quad: q, source: getSource(q) }))), 
                            schema: propSchema, 
                            label: propSchema ? this.getBestLabel(propSchema.labels, lang) : undefined 
                        };
                        
                        // DEEP MENTION DETECTION
                        structuredProp.hasMentions = structuredProp.values.some(v => {
                            if ((v as any).isReifiedPromotion) return true;
                            try {
                                const tVal = (this.factory as any).triple(id, p, v.value);
                                const q2 = [tVal]; const v2 = new Set<NodeID>();
                                while (q2.length > 0) {
                                    const cur = q2.shift()!; if (v2.has(cur)) continue; v2.add(cur);
                                    for (const mq of composite.match(null, null, cur, null)) {
                                        const mURI = this.factory.decode(mq[1]).value;
                                        if (reificationPreds.includes(mURI)) {
                                            const parent = mq[0];
                                            for (const raw of composite.match(parent, null, null, null)) {
                                                const prURI = this.factory.decode(raw[1]).value;
                                                if (!reificationPreds.includes(prURI) && !prURI.endsWith('#type')) return true;
                                            }
                                            q2.push(parent);
                                        }
                                    }
                                }
                            } catch { }
                            return false;
                        });
                        if (propSchema.type === 'Object' || propSchema.ranges.length > 0) group.objectProperties.push(structuredProp);
                        else group.dataProperties.push(structuredProp);
                    });
                }
            }
        }

        const incomings: StructuredProperty[] = [];
        for (const [p, quads] of incomingProps) {
            const ps = this.schemaIndex?.getPropertySchema(p);
            incomings.push({ property: p, values: this.deduplicateValues(quads.map(q => ({ value: q.subject, quad: q, source: getSource(q) }))), schema: ps, isInverse: true, label: ps ? this.getBestLabel(ps.labels, lang) : undefined });
        }

        const orphanProperties: StructuredProperty[] = [];
        for (const [p, quads] of outgoingProps) {
            if (!processedOutgoing.has(p)) {
                const ps = this.schemaIndex?.getPropertySchema(p);
                orphanProperties.push({ property: p, values: this.deduplicateValues(quads.map(q => ({ value: q.object, quad: q, source: getSource(q) }))), schema: ps, label: ps ? this.getBestLabel(ps.labels, lang) : undefined });
            }
        }

        if (this.schemaIndex) {
            classUsage.forEach((group, classID) => {
                this.schemaIndex!.getSchemaForClass(classID)?.properties.forEach(ps => {
                    const isObj = ps.type === 'Object' || ps.ranges.length > 0;
                    const list = isObj ? group.objectProperties : group.dataProperties;
                    const other = isObj ? group.dataProperties : group.objectProperties;
                    if (!list.some(e => e.property === ps.property) && !other.some(e => e.property === ps.property)) {
                        list.push({ property: ps.property, values: [], schema: ps, label: this.getBestLabel(ps.labels, lang) });
                    }
                });
            });
        }

        const sortedGroups = Array.from(classUsage.values());
        if (this.schemaIndex) sortedGroups.sort((a, b) => this.schemaIndex!.getDepth(a.classID) - this.schemaIndex!.getDepth(b.classID));
        const sourcesSet = new Set<PropertySource>();
        const addSrc = (s: PropertySource) => sourcesSet.add(s);
        allLabels.forEach(x => addSrc(x.source)); allComments.forEach(x => addSrc(x.source));
        sortedGroups.forEach(g => { g.dataProperties.forEach(p => p.values.forEach(v => addSrc(v.source))); g.objectProperties.forEach(p => p.values.forEach(v => addSrc(v.source))); });
        orphanProperties.forEach(p => p.values.forEach(v => addSrc(v.source)));

        return { id, uri: this.factory.decode(id).value, label, labels: labelMap, comment, comments: commentMap, allLabels, allComments, allTypes, types, classGroups: sortedGroups, orphanProperties, incomings, mentions, sources: Array.from(sourcesSet) };
    }

    private determineSource(q: Quad, session?: DraftStore): PropertySource {
        if (session && session.additions.has(q.subject, q.predicate, q.object, q.graph)) return 'new';
        try {
            const g = this.factory.decode(q.graph).value;
            if (g === 'http://example.org/graphs/ontology') return 'ontology';
            if (g === 'http://example.org/graphs/system/diff') return 'diff';
            if (g.includes('/inference/')) return 'inference';
            if (g.includes('/source/')) return 'data';
        } catch { }
        return 'data';
    }

    resolve(id: NodeID): RichEntity {
        const s = this.resolveStructured(id);
        return { id: s.id, label: s.label, labels: s.labels, types: s.types, properties: new Map(), comment: s.comment, comments: s.comments };
    }
}
