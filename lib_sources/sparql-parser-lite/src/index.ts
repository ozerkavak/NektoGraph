/**
 * SparqlParserLite - Native, high-performance SPARQL result parser.
 * Handles application/sparql-results+json and application/sparql-results+xml formats.
 */

export interface Binding {
    [variable: string]: {
        termType: 'NamedNode' | 'BlankNode' | 'Literal';
        value: string;
        datatype?: string;
        language?: string;
    };
}

export class SparqlParser {
    /**
     * Automatically detects format and parses content.
     */
    static parse(content: string): Binding[] {
        const trimmed = content.trim();
        if (trimmed.startsWith('{')) {
            return this.parseJson(trimmed).results.bindings;
        }
        return this.parseXml(trimmed).results.bindings;
    }

    /**
     * Parses a SPARQL JSON result string into a list of bindings.
     */
    static parseJson(json: string): { head: { vars: string[] }, results: { bindings: Binding[] } } {
        const parsed = JSON.parse(json);
        if (!parsed.results || !parsed.head) {
            throw new Error('SparqlParserLite: Invalid SPARQL JSON format.');
        }

        // Fix potential RDF-star structure if it uses the 'value' wrapper pattern
        const normalize = (term: any): any => {
            if (term && term.type === 'triple' && term.value && term.value.subject) {
                return {
                    termType: 'Triple',
                    subject: normalize(term.value.subject),
                    predicate: normalize(term.value.predicate),
                    object: normalize(term.value.object),
                    value: ''
                };
            }
            if (term && term.termType === 'Triple' && term.value && term.value.subject) {
                 return {
                    termType: 'Triple',
                    subject: normalize(term.value.subject),
                    predicate: normalize(term.value.predicate),
                    object: normalize(term.value.object),
                    value: ''
                };
            }
            // Ensure standard RDFJS termType mapping
            if (term && term.type) {
                const map: any = { 'uri': 'NamedNode', 'literal': 'Literal', 'bnode': 'BlankNode', 'triple': 'Triple' };
                term.termType = map[term.type] || term.type;
            }
            return term;
        };

        parsed.results.bindings.forEach((b: any) => {
            Object.keys(b).forEach(k => b[k] = normalize(b[k]));
        });

        return parsed;
    }

    /**
     * Parses a SPARQL XML result (Recursive for RDF-star).
     */
    static parseXml(xml: string): { head: { vars: string[] }, results: { bindings: Binding[] } } {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, "application/xml");
        
        const vars = Array.from(doc.querySelectorAll('variable')).map(v => v.getAttribute('name') || '');
        const bindings: Binding[] = [];

        const extractTerm = (el: Element): any => {
            const uri = el.querySelector(':scope > uri');
            const literal = el.querySelector(':scope > literal');
            const bnode = el.querySelector(':scope > bnode');
            const triple = el.querySelector(':scope > triple');

            if (uri) return { termType: 'NamedNode', value: uri.textContent || '' };
            if (bnode) return { termType: 'BlankNode', value: bnode.textContent || '' };
            if (literal) return { 
                termType: 'Literal', 
                value: literal.textContent || '',
                datatype: literal.getAttribute('datatype') || undefined,
                language: literal.getAttribute('xml:lang') || undefined
            };
            if (triple) {
                const s = triple.querySelector(':scope > subject');
                const p = triple.querySelector(':scope > predicate');
                const o = triple.querySelector(':scope > object');
                if (s && p && o) {
                    return {
                        termType: 'Triple',
                        subject: extractTerm(s),
                        predicate: extractTerm(p),
                        object: extractTerm(o),
                        value: '' // Required by Term interface
                    };
                }
            }
            return null;
        };

        const resultNodes = doc.querySelectorAll('result');
        resultNodes.forEach(res => {
            const binding: Binding = {};
            vars.forEach(vName => {
                const bEl = res.querySelector(`binding[name="${vName}"]`);
                if (bEl) {
                    const term = extractTerm(bEl);
                    if (term) binding[vName] = term;
                }
            });
            bindings.push(binding);
        });

        return { head: { vars }, results: { bindings } };
    }
}
