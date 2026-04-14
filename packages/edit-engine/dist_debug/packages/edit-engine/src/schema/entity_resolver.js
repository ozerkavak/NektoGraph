import { CompositeStore } from '../session';
export class EntityResolver {
    _store;
    factory;
    schemaIndex;
    constructor(_store, factory, schemaIndex) {
        this._store = _store;
        this.factory = factory;
        this.schemaIndex = schemaIndex;
    }
    getLabel(id, lang = 'en', session) {
        if (this.schemaIndex) {
            const schema = this.schemaIndex.getSchemaForClass(id);
            if (schema && schema.labels) {
                if (schema.labels[lang])
                    return schema.labels[lang];
                const prefixMatch = Object.keys(schema.labels).find(k => k.startsWith(lang));
                if (prefixMatch)
                    return schema.labels[prefixMatch];
                if (schema.labels['en'])
                    return schema.labels['en'];
                const enPrefix = Object.keys(schema.labels).find(k => k.startsWith('en'));
                if (enPrefix)
                    return schema.labels[enPrefix];
                return Object.values(schema.labels)[0];
            }
        }
        const labelPred = this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#label');
        const composite = new CompositeStore(this._store, session || null);
        const labels = [];
        for (const raw of composite.match(id, labelPred, null, null)) {
            labels.push({ subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] });
        }
        return this.resolveLanguageValue(labels, lang);
    }
    getComment(id, lang = 'en', session) {
        const commentPred = this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#comment');
        const composite = new CompositeStore(this._store, session || null);
        const comments = [];
        for (const raw of composite.match(id, commentPred, null, null)) {
            comments.push({ subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] });
        }
        return this.resolveLanguageValue(comments, lang);
    }
    resolveLanguageValue(quads, targetLang) {
        if (quads.length === 0)
            return undefined;
        for (const q of quads) {
            const val = this.factory.decode(q.object);
            if (val.termType === 'Literal' && val.language === targetLang)
                return val.value;
        }
        if (targetLang !== 'en') {
            for (const q of quads) {
                const val = this.factory.decode(q.object);
                if (val.termType === 'Literal' && val.language === 'en')
                    return val.value;
            }
        }
        if (targetLang !== 'tr') {
            for (const q of quads) {
                const val = this.factory.decode(q.object);
                if (val.termType === 'Literal' && val.language === 'tr')
                    return val.value;
            }
        }
        const first = this.factory.decode(quads[0].object);
        return first.value;
    }
    getBestLabel(labels, lang) {
        if (labels[lang])
            return labels[lang];
        const pm = Object.keys(labels).find(k => k.startsWith(lang));
        if (pm)
            return labels[pm];
        if (labels['en'])
            return labels['en'];
        const epm = Object.keys(labels).find(k => k.startsWith('en'));
        if (epm)
            return labels[epm];
        if (labels['tr'])
            return labels['tr'];
        const tpm = Object.keys(labels).find(k => k.startsWith('tr'));
        if (tpm)
            return labels[tpm];
        return Object.values(labels)[0];
    }
    deduplicateValues(inputs) {
        const uniqueMap = new Map();
        for (const input of inputs) {
            const valStr = this.factory.decode(input.value).value;
            if (!uniqueMap.has(valStr))
                uniqueMap.set(valStr, []);
            uniqueMap.get(valStr).push(input);
        }
        const result = [];
        const priority = { 'new': 0, 'data': 1, 'ontology': 2, 'inference': 3 };
        const getPrio = (s) => priority[s] ?? 99;
        for (const [_, items] of uniqueMap) {
            const hasExplicit = items.some(i => i.source !== 'inference');
            let candidates = items;
            if (hasExplicit) {
                candidates = items.filter(i => i.source !== 'inference');
            }
            candidates.sort((a, b) => getPrio(a.source) - getPrio(b.source));
            if (candidates.length > 0) {
                result.push(candidates[0]);
            }
        }
        return result;
    }
    resolveStructured(id, lang = 'en', session) {
        const typePred = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
        const labelPred = this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#label');
        const commentPred = this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#comment');
        const types = [];
        const outgoingProps = new Map();
        const incomingProps = new Map();
        const labels = [];
        const comments = [];
        const processQuad = (q) => {
            const p = q.predicate;
            if (!outgoingProps.has(p))
                outgoingProps.set(p, []);
            outgoingProps.get(p).push(q);
            if (p === typePred)
                types.push(q.object);
            if (p === labelPred)
                labels.push(q);
            if (p === commentPred)
                comments.push(q);
        };
        const composite = new CompositeStore(this._store, session || null);
        const outgoingQuads = composite.match(id, null, null, null);
        for (const raw of outgoingQuads) {
            const q = { subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] };
            processQuad(q);
        }
        const allLabels = labels.map(q => {
            const term = this.factory.decode(q.object);
            return {
                value: term.value,
                lang: (term.termType === 'Literal' ? term.language : '') || '',
                quad: q,
                source: this.determineSource(q, session)
            };
        });
        const allComments = comments.map(q => {
            const term = this.factory.decode(q.object);
            return {
                value: term.value,
                lang: (term.termType === 'Literal' ? term.language : '') || '',
                quad: q,
                source: this.determineSource(q, session)
            };
        });
        const labelMap = {};
        const commentMap = {};
        const populateMap = (source, target) => {
            source.forEach(item => {
                const l = item.lang || '';
                if (!target[l])
                    target[l] = item.value;
            });
            if (!target['en'] && !target['']) {
                const any = source[0];
                if (any)
                    target[any.lang || ''] = any.value;
            }
        };
        populateMap(allLabels, labelMap);
        populateMap(allComments, commentMap);
        const label = this.resolveLanguageValue(labels, lang);
        const comment = this.resolveLanguageValue(comments, lang);
        const incomingQuads = new CompositeStore(this._store, session || null).match(null, null, id, null);
        const processIncoming = (q) => {
            const p = q.predicate;
            if (!incomingProps.has(p))
                incomingProps.set(p, []);
            incomingProps.get(p).push(q);
        };
        for (const raw of incomingQuads) {
            const q = { subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] };
            processIncoming(q);
        }
        const getSource = (q) => {
            return this.determineSource(q, session);
        };
        const classUsage = new Map();
        const getOrCreateGroup = (classID) => {
            if (!classUsage.has(classID)) {
                const cidVal = this.factory.decode(classID).value;
                const isExplicit = types.some(t => this.factory.decode(t).value === cidVal);
                const classSchema = this.schemaIndex?.getSchemaForClass(classID);
                const classLabel = classSchema ? this.getBestLabel(classSchema.labels, lang) : undefined;
                classUsage.set(classID, {
                    classID,
                    isMissing: !isExplicit,
                    dataProperties: [],
                    objectProperties: [],
                    unclassifiedProperties: [],
                    label: classLabel,
                    labels: classSchema?.labels
                });
            }
            return classUsage.get(classID);
        };
        types.forEach(typeID => getOrCreateGroup(typeID));
        const processedOutgoing = new Set();
        for (const [p, quads] of outgoingProps) {
            if (p === typePred || p === labelPred || p === commentPred) {
                processedOutgoing.add(p);
                continue;
            }
            const propSchema = this.schemaIndex?.getPropertySchema(p);
            if (propSchema && this.schemaIndex) {
                const validDomains = this.schemaIndex.getDomainsForProperty(p);
                if (validDomains.length > 0) {
                    processedOutgoing.add(p);
                    validDomains.forEach(domainID => {
                        const group = getOrCreateGroup(domainID);
                        const structuredProp = {
                            property: p,
                            values: this.deduplicateValues(quads.map(q => ({ value: q.object, quad: q, source: getSource(q) }))),
                            schema: propSchema,
                            label: propSchema ? this.getBestLabel(propSchema.labels, lang) : undefined
                        };
                        let isObjectProp = false;
                        if (propSchema.type === 'Object') {
                            isObjectProp = true;
                        }
                        else if (propSchema.type === 'Data') {
                            isObjectProp = false;
                        }
                        else {
                            if (propSchema.ranges.length > 0) {
                                isObjectProp = true;
                                try {
                                    const firstRange = this.factory.decode(propSchema.ranges[0]).value;
                                    if (firstRange.startsWith('http://www.w3.org/2001/XMLSchema#')) {
                                        isObjectProp = false;
                                    }
                                }
                                catch { }
                            }
                            if (structuredProp.values.length > 0) {
                                try {
                                    const token = this.factory.decode(structuredProp.values[0].value);
                                    if (token.termType === 'Literal')
                                        isObjectProp = false;
                                }
                                catch { }
                            }
                        }
                        if (isObjectProp)
                            group.objectProperties.push(structuredProp);
                        else
                            group.dataProperties.push(structuredProp);
                    });
                }
            }
        }
        for (const [p, quads] of incomingProps) {
            const propSchema = this.schemaIndex?.getPropertySchema(p);
            if (propSchema) {
                let visibleQuads = quads;
                if (propSchema.inverseOf) {
                    const invP = propSchema.inverseOf;
                    if (outgoingProps.has(invP)) {
                        const outgoingQuads = outgoingProps.get(invP);
                        visibleQuads = quads.filter(inQ => {
                            return !outgoingQuads.some(outQ => outQ.object === inQ.subject);
                        });
                    }
                }
                if (visibleQuads.length === 0)
                    continue;
                const ranges = propSchema.ranges;
                if (ranges.length > 0) {
                    ranges.forEach(rangeID => {
                        const group = getOrCreateGroup(rangeID);
                        group.objectProperties.push({
                            property: p,
                            values: this.deduplicateValues(visibleQuads.map(q => ({
                                value: q.subject,
                                quad: q,
                                source: getSource(q)
                            }))),
                            schema: propSchema,
                            isInverse: true,
                            label: propSchema ? this.getBestLabel(propSchema.labels, lang) : undefined
                        });
                    });
                }
            }
        }
        if (this.schemaIndex) {
            classUsage.forEach((group, classID) => {
                const classSchema = this.schemaIndex.getSchemaForClass(classID);
                if (classSchema) {
                    classSchema.properties.forEach(pSchema => {
                        let isObjectProp = false;
                        if (pSchema.type === 'Object') {
                            isObjectProp = true;
                        }
                        else if (pSchema.type === 'Data') {
                            isObjectProp = false;
                        }
                        else {
                            // 2. Fallback: Structural Heuristics
                            if (pSchema.ranges.length > 0) {
                                isObjectProp = true;
                                try {
                                    const firstRange = this.factory.decode(pSchema.ranges[0]).value;
                                    if (firstRange.startsWith('http://www.w3.org/2001/XMLSchema#')) {
                                        isObjectProp = false;
                                    }
                                }
                                catch { }
                            }
                        }
                        const list = isObjectProp ? group.objectProperties : group.dataProperties;
                        const existing = list.find(ep => ep.property === pSchema.property);
                        // Also check the OTHER list just in case of mismatch to avoid visual duplication?
                        // If we are about to add to ObjectProps, check DataProps too.
                        const otherList = isObjectProp ? group.dataProperties : group.objectProperties;
                        const existingInOther = otherList.find(ep => ep.property === pSchema.property);
                        if (!existing && !existingInOther) {
                            list.push({
                                property: pSchema.property,
                                values: [],
                                schema: pSchema,
                                label: this.getBestLabel(pSchema.labels, lang)
                            });
                        }
                    });
                }
            });
        }
        // 3. Orphans
        const orphanProperties = [];
        for (const [p, quads] of outgoingProps) {
            if (!processedOutgoing.has(p)) {
                const propSchema = this.schemaIndex?.getPropertySchema(p);
                orphanProperties.push({
                    property: p,
                    values: this.deduplicateValues(quads.map(q => ({ value: q.object, quad: q, source: getSource(q) }))),
                    schema: propSchema,
                    label: propSchema ? this.getBestLabel(propSchema.labels, lang) : undefined
                });
            }
        }
        // 4. Sort and Flatten
        // Sort Groups by Hierarchy Depth (0 -> N)
        const sortedGroups = Array.from(classUsage.values());
        if (this.schemaIndex) {
            sortedGroups.sort((a, b) => {
                const depthA = this.schemaIndex.getDepth(a.classID);
                const depthB = this.schemaIndex.getDepth(b.classID);
                return depthA - depthB;
            });
        }
        // Collect Sources
        const sourcesSet = new Set();
        const addSrc = (s) => sourcesSet.add(s);
        allLabels.forEach(x => addSrc(x.source));
        allComments.forEach(x => addSrc(x.source));
        sortedGroups.forEach(g => {
            g.dataProperties.forEach(p => p.values.forEach(v => addSrc(v.source)));
            g.objectProperties.forEach(p => p.values.forEach(v => addSrc(v.source)));
            g.unclassifiedProperties.forEach(p => p.values.forEach(v => addSrc(v.source)));
        });
        orphanProperties.forEach(p => p.values.forEach(v => addSrc(v.source)));
        return {
            id,
            uri: this.factory.decode(id).value,
            label,
            labels: labelMap,
            comment,
            comments: commentMap,
            allLabels,
            allComments,
            types,
            classGroups: sortedGroups,
            orphanProperties,
            sources: Array.from(sourcesSet)
        };
    }
    determineSource(q, session) {
        try {
            const graphUri = this.factory.decode(q.graph).value;
            // Central graph URIs from constants/state
            if (graphUri === 'http://example.org/graphs/ontology')
                return 'ontology';
            if (graphUri === 'http://example.org/graphs/system/diff')
                return 'diff';
            if (graphUri === 'http://example.org/graphs/user')
                return 'new';
            if (graphUri.includes('/inference/'))
                return 'inference';
            if (graphUri.includes('/source/'))
                return 'data';
        }
        catch { }
        if (session && session.additions.has(q.subject, q.predicate, q.object, q.graph)) {
            return 'new';
        }
        return 'data';
    }
    resolve(id) {
        // Backwards compat
        const struct = this.resolveStructured(id);
        const props = new Map();
        // Flatten
        return {
            id: struct.id,
            label: struct.label,
            labels: struct.labels,
            types: struct.types,
            properties: props,
            comment: struct.comment,
            comments: struct.comments
        };
    }
}
//# sourceMappingURL=entity_resolver.js.map
