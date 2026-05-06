import { DraftStore } from '@triplestore/session';
import { state } from '../../runtime/State';
import { KGEntity } from '../services/kg_entity';

interface DiffRow {
    type: 'add' | 'del';
    s: { uri: string, label: string };
    p: { uri: string, label: string };
    o: {
        type: 'uri' | 'literal';
        value: string;
        label?: string;
        datatype?: string;
        lang?: string;
    };
    g: string;
}

/**
 * SessionDiffView - Transaction Visualization
 * Visualizes changes within an active edit session, providing a detailed split-pane
 * view with human-readable labels and a Turtle code export preview.
 * 
 * > [!IMPORTANT]
 * > **BigInt Extraction:** This view decodes `BigInt` based Quad parts into human-readable strings.
 * 
 * @category UI Components
 */
export class SessionDiffView {

    static async render(draft: DraftStore | null): Promise<string> {
        if (!draft) return '<div class="empty-state">No Active Session</div>';

        const rows = this.resolveDiffData(draft);
        if (rows.length === 0) return '<div class="empty-state">No Changes in this Session</div>';
        
        // PREFETCH: Ensure all constituents of all changed quads are hydrated
        const allIds = new Set<bigint>();
        for (const raw of draft.additions.match(null, null, null, null)) {
            (state as any).collectDeepIds(raw[0]).forEach((id: bigint) => allIds.add(id));
            (state as any).collectDeepIds(raw[1]).forEach((id: bigint) => allIds.add(id));
            (state as any).collectDeepIds(raw[2]).forEach((id: bigint) => allIds.add(id));
        }
        draft.deletions.forEach(key => {
            const parts = key.split('_');
            if (parts.length >= 3) {
                (state as any).collectDeepIds(BigInt(parts[0])).forEach((id: bigint) => allIds.add(id));
                (state as any).collectDeepIds(BigInt(parts[1])).forEach((id: bigint) => allIds.add(id));
                (state as any).collectDeepIds(BigInt(parts[2])).forEach((id: bigint) => allIds.add(id));
            }
        });
        await KGEntity.ensureMany(Array.from(allIds), 'metadata');

        const ttlContent = this.generateTTL(rows);

        return `
            <style>
                .diff-split-container {
                    display: grid;
                    grid-template-columns: 4.5fr 5.5fr;
                    height: 100%;
                    overflow: hidden;
                    background: var(--bg-app);
                }
                .diff-left-panel {
                    border-right: 1px solid var(--border-subtle);
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                }
                .diff-right-panel {
                    background: #0d1117;
                    color: #c9d1d9;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .diff-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                }
                .diff-table th {
                    position: sticky;
                    top: 0;
                    background: var(--bg-panel);
                    color: var(--text-muted);
                    padding: 8px;
                    text-align: left;
                    font-weight: 600;
                    border-bottom: 1px solid var(--border-subtle);
                    z-index: 10;
                    white-space: nowrap;
                }
                .diff-table td {
                    padding: 6px 8px;
                    border-bottom: 1px solid var(--border-subtle);
                    vertical-align: top;
                    color: var(--text-main);
                }
                .diff-row-add { background: rgba(46, 160, 67, 0.05); }
                .diff-row-del { background: rgba(218, 54, 51, 0.05); }
                
                .uri-sub { font-size: 9px; color: var(--text-muted); display: block; margin-top: 2px; font-family: var(--font-mono); opacity: 0.8; }
                .val-literal { color: var(--accent-blue); }
                .val-uri { color: var(--accent-purple); }
                
                .status-icon { font-weight: bold; font-family: monospace; font-size: 14px; }
                .status-add { color: var(--accent-green); }
                .status-del { color: var(--accent-red); }

                .code-editor {
                    flex: 1;
                    padding: 12px;
                    overflow-y: auto;
                    overflow-x: hidden;
                    font-family: 'Fira Code', 'Consolas', monospace;
                    font-size: 11px;
                    line-height: 1.5;
                    white-space: pre-wrap;
                    word-break: break-all;
                    text-align: left;
                }
                .action-bar {
                    padding: 8px;
                    border-top: 1px solid #30363d;
                    display: flex;
                    justify-content: flex-end;
                    background: #161b22;
                }
                .btn-copy {
                    background: var(--accent-blue);
                    color: white;
                    border: none;
                    padding: 4px 12px;
                    border-radius: 4px;
                    font-size: 11px;
                    cursor: pointer;
                    font-weight: 500;
                }
                .btn-copy:hover { opacity: 0.9; }
                
                .ttl-prefix { color: #8b949e; }
                .ttl-keyword { color: #ff7b72; }
                .ttl-string { color: #a5d6ff; }
            </style>
            
            <div class="diff-split-container">
                <div class="diff-left-panel">
                    <div style="padding:8px 12px; border-bottom:1px solid var(--border-subtle); font-weight:600; font-size:12px; background:var(--bg-panel);">
                        Changes List (${rows.length})
                    </div>
                    <table class="diff-table">
                        <thead>
                            <tr>
                                <th style="width:40px; text-align:center;">Type</th>
                                <th>Subject</th>
                                <th>Predicate</th>
                                <th>Object</th>
                                <th style="width:80px;">Graph</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderTableBody(rows)}
                        </tbody>
                    </table>
                </div>

                <div class="diff-right-panel">
                    <div style="padding:8px 12px; border-bottom:1px solid #30363d; font-weight:600; font-size:12px; background:#161b22; color:#8b949e;">
                        Turtle Export Preview
                    </div>
                    <div class="code-editor" id="ttl-code-view">${this.highlightTTL(ttlContent)}</div>
                    <div class="action-bar">
                        <button class="btn-copy" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(ttlContent)}')); alert('Copied to clipboard!');">
                            Copy TTL
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    private static resolveDiffData(draft: DraftStore): DiffRow[] {
        const rows: DiffRow[] = [];

        for (const raw of draft.additions.match(null, null, null, null)) {
            const s = raw[0];
            const p = raw[1];
            const o = raw[2];
            const g = raw[3] || 0n;

            // 1. Skip if the quad is explicitly marked as inferred in the session
            if ((draft as any).isInferred(s, p, o, g)) {
                continue;
            }

            // 2. Skip if the graph is a technical inference graph
            const gTerm = state.factory.decode(g);
            if (gTerm && gTerm.value && gTerm.value.startsWith('http://example.org/graphs/inference/')) {
                continue;
            }

            rows.push(this.quadToRow(raw, 'add'));
        }

        draft.deletions.forEach(key => {
            const parts = key.split('_');
            if (parts.length >= 3) {
                const s = BigInt(parts[0]);
                const p = BigInt(parts[1]);
                const o = BigInt(parts[2]);
                const g = parts.length > 3 ? BigInt(parts[3]) : 0n;
                rows.push(this.quadToRow([s, p, o, g], 'del'));
            }
        });

        return rows;
    }

    private static quadToRow(raw: any[], type: 'add' | 'del'): DiffRow {
        const sTerm = state.factory.decode(raw[0]);
        const pTerm = state.factory.decode(raw[1]);
        const oTerm = state.factory.decode(raw[2]);
        const gTerm = raw[3] ? state.factory.decode(raw[3]) : null;

        const row: DiffRow = {
            type,
            s: { 
                uri: this.termToTTL(sTerm), 
                label: sTerm.termType === 'Triple' ? state.getTriplePremiumLabel(raw[0]) : (KGEntity.get(raw[0]).getDisplayName() || sTerm.value) 
            },
            p: { 
                uri: pTerm.value, 
                label: KGEntity.get(raw[1]).getDisplayName() || pTerm.value 
            },
            o: { 
                type: oTerm.termType === 'Literal' ? 'literal' : 'uri', 
                value: oTerm.termType === 'Triple' ? state.getTriplePremiumLabel(raw[2]) : oTerm.value 
            },
            g: ''
        };

        if (gTerm) {
            row.g = (raw[3] === 0n) ? '' : gTerm.value;
        }

        if (oTerm.termType === 'Literal') {
            row.o.value = oTerm.value;
            row.o.datatype = typeof oTerm.datatype === 'object' ? (oTerm.datatype as any).value : oTerm.datatype;
            row.o.lang = oTerm.language;
        } else if (oTerm.termType === 'Triple') {
            row.o.value = this.termToTTL(oTerm); 
            row.o.label = state.getTriplePremiumLabel(raw[2]);
        } else {
            row.o.label = KGEntity.get(raw[2]).getDisplayName() || oTerm.value;
        }

        return row;
    }

    private static termToTTL(term: any, prefixer?: (v: string) => string): string {
        if (typeof term === 'bigint') {
            term = state.factory.decode(term);
        }
        if (term.termType === 'NamedNode') return prefixer ? prefixer(term.value) : `<${term.value}>`;
        if (term.termType === 'Literal') return `"${term.value}"`;
        if (term.termType === 'Triple') {
            return `<< ${this.termToTTL(term.subject, prefixer)} ${this.termToTTL(term.predicate, prefixer)} ${this.termToTTL(term.object, prefixer)} >>`;
        }
        if (term.termType === 'BlankNode') return `_:${term.value}`;
        return term.value || '';
    }

    private static generateTTL(rows: DiffRow[]): string {
        const prefixes = new Map<string, string>();
        prefixes.set('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#');
        prefixes.set('rdfs', 'http://www.w3.org/2000/01/rdf-schema#');
        prefixes.set('owl', 'http://www.w3.org/2002/07/owl#');
        prefixes.set('xsd', 'http://www.w3.org/2001/XMLSchema#');
        prefixes.set('rdf-star', 'http://www.w3.org/ns/rdf-star#');

        const RDF_REIFIES = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#reifies';

        const formatTTLTerm = (val: string): string => {
            if (val.startsWith('<<')) return val; // Recursively pre-formatted
            if (val.startsWith('_:')) return val; // Blank node
            
            for (const [prefix, ns] of prefixes) {
                if (val.startsWith(ns)) return `${prefix}:${val.substring(ns.length)}`;
            }
            return `<${val}>`;
        };

        const ensureTTL = (uri: string): string => {
            if (!uri.includes('<<')) return formatTTLTerm(uri);
            return uri; 
        };

        let body = '';
        const dels = rows.filter(r => r.type === 'del');
        if (dels.length > 0) {
            body += '# --- Deletions ---\n';
            dels.forEach(r => {
                body += `# - ${ensureTTL(r.s.uri)} ${formatTTLTerm(r.p.uri)} ${r.o.type === 'uri' ? ensureTTL(r.o.value) : `"${this.escape(r.o.value)}"`} .\n`;
            });
            body += '\n';
        }

        const adds = rows.filter(r => r.type === 'add');
        if (adds.length > 0) {
            body += '# --- Additions ---\n';
            
            // 1. Identify Reifiers and group their properties
            const reifiers = new Map<string, { targetTriple: string, props: DiffRow[] }>();
            const primaryAdditions: DiffRow[] = [];

            // Pass 1: Find reifiers
            adds.forEach(r => {
                if (r.s.uri.startsWith('_:') && r.p.uri === RDF_REIFIES) {
                    reifiers.set(r.s.uri, { targetTriple: r.o.value, props: [] });
                } else {
                    primaryAdditions.push(r);
                }
            });

            // Pass 2: Attach properties to reifiers
            const finalAdds: DiffRow[] = [];
            primaryAdditions.forEach(r => {
                if (reifiers.has(r.s.uri)) {
                    reifiers.get(r.s.uri)!.props.push(r);
                } else {
                    finalAdds.push(r);
                }
            });

            // 2. Group by Subject
            const subjectMap = new Map<string, DiffRow[]>();
            finalAdds.forEach(r => {
                if (!subjectMap.has(r.s.uri)) subjectMap.set(r.s.uri, []);
                subjectMap.get(r.s.uri)!.push(r);
            });

            // 3. Render
            // We also want to make sure reified triples that are ONLY being annotated (not added) are shown
            reifiers.forEach((val) => {
                if (!subjectMap.has(val.targetTriple)) {
                    // Check if the target triple is already being added as a standalone triple.
                    // If not, we add it to subjectMap so it can be rendered with its annotations.
                    // (But we mark it empty if it has no direct properties added in this session)
                    subjectMap.set(val.targetTriple, []);
                }
            });

            subjectMap.forEach((sRows, sUri) => {
                // Find if this subject is a triple that has reifiers in this session
                const relevantReifiers = Array.from(reifiers.entries())
                    .filter(([_, v]) => v.targetTriple === sUri)
                    .map(([_, v]) => v);

                const hasAnnotations = relevantReifiers.length > 0 && relevantReifiers.some(r => r.props.length > 0);

                // If this is a reified triple AND we are rendering it as a subject
                // Check if it's a Quoted Triple string (<< ... >>)
                let sOutput = ensureTTL(sUri);
                if (sUri.startsWith('<<')) {
                    // RDF 1.2: Quoted triples in subject position of an assertion 
                    // should be rendered as Triple Terms (with parentheses) if they are reified.
                    // But here we use the {| |} shorthand on the triple itself.
                    // Wait, standard shorthand is on the TRIPLE, not the triple term.
                    // "S P O {| ... |}"
                    // Since sUri is already "S P O" (decoded from Triple ID), we just use it.
                }

                body += `${sOutput} `;

                const pMap = new Map<string, DiffRow[]>();
                sRows.forEach(r => {
                    if (!pMap.has(r.p.uri)) pMap.set(r.p.uri, []);
                    pMap.get(r.p.uri)!.push(r);
                });

                const pKeys = Array.from(pMap.keys());
                
                if (pKeys.length === 0 && hasAnnotations) {
                    // This triple is only being annotated, not added itself.
                    // We need to render the triple + annotations.
                    // We'll take the triple string and wrap it.
                    // But wait, the shorthand {| |} follows a triple.
                    // If the triple itself isn't being "added" (asserted), we should use the reifier explicitly.
                    relevantReifiers.forEach(reifier => {
                        body += `{| `;
                        reifier.props.forEach((prop, pIdx) => {
                            body += `${formatTTLTerm(prop.p.uri)} ${prop.o.type === 'literal' ? `"${this.escape(prop.o.value)}"` : ensureTTL(prop.o.value)}`;
                            body += (pIdx < reifier.props.length - 1) ? ' ; ' : '';
                        });
                        body += ` |} .\n\n`;
                    });
                } else {
                    pKeys.forEach((pUri, pIdx) => {
                        const objs = pMap.get(pUri)!;
                        if (pIdx > 0) body += '    ';
                        body += `${formatTTLTerm(pUri)} `;
                        
                        objs.forEach((o, oIdx) => {
                            if (o.o.type === 'literal') {
                                const dataType = o.o.datatype ? `^^${formatTTLTerm(o.o.datatype)}` : '';
                                body += `"${o.o.value}"${o.o.lang ? `@${o.o.lang}` : dataType}`;
                            } else {
                                body += ensureTTL(o.o.value);
                            }

                            // Attach annotation shorthand if this is the last object of the last predicate
                            // (Simplified grouping for preview)
                            if (pIdx === pKeys.length - 1 && oIdx === objs.length - 1 && hasAnnotations) {
                                body += ' {| ';
                                relevantReifiers.forEach(reifier => {
                                    reifier.props.forEach((prop, apIdx) => {
                                        body += `${formatTTLTerm(prop.p.uri)} ${prop.o.type === 'literal' ? `"${this.escape(prop.o.value)}"` : ensureTTL(prop.o.value)}`;
                                        if (apIdx < reifier.props.length - 1) body += ' ; ';
                                    });
                                });
                                body += ' |}';
                            }

                            body += (oIdx < objs.length - 1) ? ', ' : (pIdx < pKeys.length - 1 ? ' ;\n' : ' .\n\n');
                        });
                    });
                }
            });
        }

        let prefixHeader = '';
        prefixes.forEach((ns, pref) => prefixHeader += `@prefix ${pref}: <${ns}> .\n`);
        return prefixHeader + '\n' + body;
    }

    private static renderTableBody(rows: DiffRow[]): string {
        if (rows.length === 0) return '<tr><td colspan="5" style="text-align:center; padding:20px;">No changes</td></tr>';

        return rows.map(r => `
            <tr class="${r.type === 'add' ? 'diff-row-add' : 'diff-row-del'}">
                <td style="text-align:center;">
                    <span class="status-icon ${r.type === 'add' ? 'status-add' : 'status-del'}">${r.type === 'add' ? '+' : '-'}</span>
                </td>
                <td>
                    <div style="font-weight:600; font-family:var(--font-mono); font-size:10px; color:var(--accent-purple);">${this.escape(r.s.label)}</div>
                    <span class="uri-sub" title="${r.s.uri}">${r.s.uri.startsWith('<<') ? 'Nested Triple' : this.shorten(r.s.uri)}</span>
                </td>
                <td>
                    <div style="font-weight:500;">${this.escape(r.p.label)}</div>
                    <span class="uri-sub" title="${r.p.uri}">${this.shorten(r.p.uri)}</span>
                </td>
                <td>
                    ${this.renderObjectCell(r.o)}
                </td>
                <td>
                    <span class="uri-sub" title="${r.g}">${r.g ? this.shorten(r.g) : 'default'}</span>
                </td>
            </tr>
        `).join('');
    }

    private static renderObjectCell(o: DiffRow['o']): string {
        if (o.type === 'literal') {
            const lang = o.lang ? `<span style="color:#888; font-size:9px; background:#eee; padding:1px 3px; border-radius:3px;">${o.lang}</span>` : '';
            return `<div class="val-literal" style="font-family:var(--font-mono);">"${this.escape(o.value)}"${lang}</div>`;
        } else {
            const isNested = o.value.startsWith('<<');
            return `
                <div style="font-weight:600; font-family:var(--font-mono); font-size:10px; color:var(--accent-blue);">${this.escape(o.label || '')}</div>
                <span class="uri-sub val-uri" title="${o.value}">${isNested ? 'Nested Triple' : this.shorten(o.value)}</span>
            `;
        }
    }

    private static shorten(uri: string): string {
        if (!uri) return '';
        if (uri.startsWith('<<')) return uri;
        if (uri.startsWith('_:')) return uri;
        const parts = uri.split(/[#/]/);
        return parts[parts.length - 1] || uri;
    }

    private static escape(str: string): string {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    private static highlightTTL(ttl: string): string {
        const escaped = this.escape(ttl);
        return escaped
            .replace(/(".*?")/g, '<span class="ttl-string">$1</span>')
            .replace(/(^|\s)(#.*)/g, '$1<span class="ttl-prefix" style="font-style:italic;">$2</span>')
            .replace(/(@prefix|@base)/g, '<span class="ttl-keyword">$1</span>')
            .replace(/(&lt;&lt;.*?&gt;&gt;)/g, '<span style="color:#f8e3a1; font-weight:bold;">$1</span>')
            .replace(/(_:\w+)/g, '<span style="color:#d19a66;">$1</span>');
    }
}

