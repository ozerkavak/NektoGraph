import { state } from '../../runtime/State';
import { uiState } from '../../runtime/UIState';
import { NodeID } from '@triplestore/core';
import { CompositeStore } from '@triplestore/edit-engine';
import { KGTriple, TripleAnnotation } from '@triplestore/kg-triple';
import { KGEntity } from '../services/kg_entity';
import { TripleAddModal } from './TripleAddModal';

const TE_CSS = `
    /* ─── Triple Editor Component Styles ──────────────────────────── */

    /* Layout */
    .te-root { height:100%; width:100%; display:flex; flex-direction:column; background:var(--bg-app); overflow:hidden; font-family:var(--font-main); }
    .te-header { padding:12px 16px; background:var(--bg-panel); border-bottom:1px solid var(--border-subtle); display:flex; flex-direction:column; align-items:center; gap:12px; position:relative; }
    .te-scroll { flex:1; min-height:0; overflow-y:scroll; display:flex; flex-direction:column; background:var(--bg-app); }
    .te-meta-panel { font-size:10px; color:var(--text-muted); opacity:0.6; display:flex; align-items:center; gap:12px; font-weight:600; letter-spacing:0.02em; }
    .te-meta-item { display:flex; align-items:center; gap:4px; }
    .te-meta-val { color:var(--accent-amber); font-weight:800; }

    /* Part chip (S / P / O in header) */
    .part-col { display:flex; flex-direction:column; align-items:center; gap:2px; min-width:30px; max-width:200px; flex-shrink:1; }
    .part-role { font-size:7px; font-weight:900; color:var(--text-muted); opacity:0.4; text-transform:uppercase; }
    .chip { min-height:20px; height:auto; padding:3px 8px; display:flex; align-items:center; justify-content:center; border-radius:3px; background:rgba(255,255,255,0.05); max-width:180px; width:fit-content; min-width:0; flex-shrink:1; }
    .chip-label { font-size:10px; font-weight:700; white-space:normal; overflow-wrap:anywhere; word-break:normal; line-height:1.2; text-align:center; display:block; }

    /* Value chips */
    .value-chip { display:inline-flex; align-items:center; }
    .chip-entity { gap:4px; background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2); padding:2px 6px; border-radius:4px; cursor:pointer; transition:all 0.2s; }
    .chip-literal { gap:4px; background:rgba(255,255,255,0.05); border:1px solid var(--border-subtle); padding:2px 6px; border-radius:4px; color:var(--text-main); font-size:10px; }
    .chip-triple { gap:6px; background:rgba(139,92,246,0.08); border:1px solid rgba(139,92,246,0.25); padding:3px 8px; border-radius:6px; cursor:pointer; }

    /* Focus triple pill (compact bordo triple reference in rows) */
    .focus-triple-pill { display:inline-flex; flex-direction:column; align-items:center; gap:1px; background:rgba(80,10,20,0.5); border:1px solid rgba(180,30,50,0.35); border-radius:6px; padding:0; min-width:80px; max-width:140px; }
    .ftp-s { font-size:8px; font-weight:700; color:var(--accent-primary); background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2); padding:1px 5px; border-radius:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:130px; text-align:center; }
    .ftp-p { font-size:8px; font-weight:700; color:#10b981; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:130px; text-align:center; }

    /* Outer collapsible containers */
    .te-outer-panel { margin:12px 16px; flex-shrink:0; border:1px solid rgba(59,130,246,0.3); border-radius:10px; overflow:hidden; background:rgba(15,25,50,0.4); }
    .te-outer-head { padding:10px 16px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; background:rgba(20,35,70,0.6); border-bottom:1px solid rgba(59,130,246,0.15); transition:background 0.2s; }
    .te-outer-title { font-size:11px; font-weight:800; color:var(--text-main); letter-spacing:0.04em; text-transform:uppercase; }
    .te-outer-hint { font-size:10px; color:var(--text-muted); opacity:0.5; }
    .te-outer-body { display:flex; flex-direction:column; }

    /* Inner section panels */
    .editor-section-panel { border-bottom:1px solid var(--border-subtle); background:rgba(255,255,255,0.01); }
    .te-section-head { padding:12px 20px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; background:rgba(255,255,255,0.02); transition:all 0.2s; }
    .te-section-title { font-size:11px; font-weight:800; color:var(--text-main); letter-spacing:0.04em; text-transform:uppercase; }
    .te-section-hint { font-size:10px; color:var(--text-muted); opacity:0.5; }

    /* Toolbars */
    .te-toolbar { display:flex; align-items:center; gap:12px; padding:10px 16px; border-bottom:1px solid rgba(59,130,246,0.15); background:rgba(10,18,42,0.85); }
    .te-bulk { padding:10px 16px; background:rgba(10,18,42,0.85); border-bottom:1px solid rgba(59,130,246,0.15); display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:30; backdrop-filter:blur(10px); }
    .te-bulk-label { font-size:10px; font-weight:900; color:var(--accent-primary); text-transform:uppercase; letter-spacing:0.05em; }
    .te-sel { font-size:10px; color:var(--text-muted); opacity:0.7; }
    .te-sel-main { font-size:10px; font-weight:800; color:var(--text-muted); opacity:0.7; }

    /* Data rows */
    .te-row { display:flex; align-items:center; justify-content:space-between; padding:10px 16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:8px; }
    .te-row-inner { display:flex; align-items:center; gap:16px; flex:1; }
    .te-row-inner-ann { display:flex; align-items:center; gap:12px; flex:1; }
    .te-source { display:flex; align-items:center; gap:8px; flex-shrink:0; }
    .te-source-stack { display:flex; flex-direction:column; align-items:flex-end; gap:2px; }
    .te-gname-ann { font-size:9px; font-weight:800; color:var(--accent-amber); padding:1px 6px; border:1px solid rgba(255,191,0,0.2); border-radius:4px; opacity:0.8; }
    .te-gname-occ { font-size:9px; font-weight:800; color:var(--accent-blue); padding:1px 6px; border:1px solid rgba(59,130,246,0.2); border-radius:4px; opacity:0.8; }
    .te-gid-suffix { font-size:8px; color:var(--text-muted); opacity:0.5; margin-right:4px; }

    /* Graph info stack (presence panel) */
    .graph-info-stack { display:flex; flex-direction:column; gap:2px; min-width:180px; }
    .te-gname { font-size:10px; font-weight:900; color:var(--accent-amber); }
    .te-gtype { font-size:8px; padding:1px 4px; background:rgba(255,255,255,0.05); border-radius:3px; color:var(--text-muted); text-transform:uppercase; }
    .te-guri { font-size:8px; color:var(--text-muted); opacity:0.5; font-family:monospace; }

    /* BNode reification group */
    .annotation-group-bnode { padding:16px; border:1px solid rgba(59,130,246,0.4); border-radius:16px; background:rgba(59,130,246,0.05); display:flex; gap:24px; align-items:stretch; }
    .bnode-label-container { display:flex; flex-direction:column; justify-content:center; align-items:flex-start; min-width:240px; padding-right:24px; border-right:1px solid rgba(59,130,246,0.2); }
    .bnode-title { font-size:9px; font-weight:900; color:var(--accent-primary); opacity:0.5; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em; }
    .annotation-rows-list { flex:1; display:flex; flex-direction:column; gap:8px; justify-content:center; }

    /* Toggle arrow */
    .te-arrow { font-size:10px; color:var(--accent-primary); transition:transform 0.3s; display:inline-block; }

    /* Buttons */
    .btn-micro { background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.35); color:#93c5fd; font-size:10px; font-weight:800; padding:5px 12px; border-radius:4px; cursor:pointer; transition:all 0.2s; text-transform:uppercase; letter-spacing:0.02em; }
    .btn-micro:hover:not(:disabled) { background:rgba(59,130,246,0.4); border-color:rgba(59,130,246,0.7); color:#fff; }
    .btn-micro:disabled { opacity:0.25; cursor:not-allowed; filter:grayscale(1); }
    .btn-toolbar-red { background:rgba(239,68,68,0.12); border-color:rgba(239,68,68,0.3); color:#fca5a5; }
    .btn-toolbar-red:hover:not(:disabled) { background:rgba(239,68,68,0.4); border-color:rgba(239,68,68,0.7); color:#fff; }

    /* Scrollbar */
    .te-scroll::-webkit-scrollbar { width:8px; }
    .te-scroll::-webkit-scrollbar-track { background:rgba(0,0,0,0.2); }
    .te-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:4px; }
    .te-scroll::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,0.2); }
`;

export class TripleEditor {
    static async renderTripleInWindow(tripleID: NodeID, container: HTMLElement, winId: string, proxyId?: NodeID) {
        (window as any).openTripleAddModal = TripleAddModal.open.bind(TripleAddModal);

        try {
            if (!state) throw new Error("State object is undefined.");

            const term = state.factory.decode(tripleID) as any;
            if (term.termType !== 'Triple') throw new Error("ID represents an Entity, not a Triple");

            // A triple is structurally nested if it appears as an object in some other quad,
            // or if it's a subject of a quad that isn't one of its OWN primary properties.
            let isNested = false;
            try {
                // 1. Check if used as Object anywhere (Strongest sign of nesting as a value)
                for (const _ of state.store.match(null, null, tripleID, null)) { isNested = true; break; }
                
                // 2. Check if used as Subject in other contexts (e.g. meta-annotations)
                if (!isNested) {
                    for (const _ of state.store.match(tripleID, null, null, null)) { 
                        // Note: technically every viewing triple is a subject of its own quads.
                        // But in our 'allIncoming' logic, we check for presence as object or unique subject.
                        isNested = true; break; 
                    }
                }
            } catch (e) {
                // Nested check failed
            }

            // 1. Load Triple & Prefetch
            const kgTriple = KGTriple.getOrCreate(tripleID, term.subject, term.predicate, term.object);
            
            // Force invalidation to ensure session drafts (like the newly added annotation) are loaded
            kgTriple.invalidate();
            kgTriple.load(state.store, state.factory, state.currentSession || undefined, 0, proxyId);

            const metadataIds = [term.subject, term.predicate, term.object];
            kgTriple.annotations.forEach((anns) => {
                anns.forEach(a => {
                    metadataIds.push(a.subject, a.predicate, a.object);
                });
            });

            const searchSource = state.currentSession ? new CompositeStore(state.store, state.currentSession) : state.store;

            // 1.5 Fetch Occurrences (Triples where [focus triple] is the Object)
            const occurrenceQuads = Array.from(searchSource.match(null, null, tripleID, null) as any[]);

            occurrenceQuads.forEach((q: any) => {
                metadataIds.push(q[0], q[1], q[3]); // S, P, G
            });

            await KGEntity.ensureMany(metadataIds, 'metadata');

            // 2. Specialized Rendering Helpers
            const renderPart = (id: NodeID, role: 's' | 'p' | 'o', depth: number = 0): string => {
                const untrapped = state.factory.decode(id) as any;
                let isTriple = untrapped.termType === 'Triple';
                let tripleID = id;

                // ─── UNWRAP BNODE (TRANSPARENT REIFICATION) ──────────────────
                if (untrapped.termType === 'BlankNode' && state.entityResolver) {
                    const unwrapped = state.entityResolver.unwrap(id);
                    if (unwrapped !== id) {
                        const ut = state.factory.decode(unwrapped) as any;
                        if (ut.termType === 'Triple') {
                            isTriple = true;
                            tripleID = unwrapped;
                        }
                    }
                }
                const t = state.factory.decode(tripleID) as any;
                // ─────────────────────────────────────────────────────────────

                const isRef = t.termType === 'NamedNode';
                const isLiteral = t.termType === 'Literal';

                if (isTriple && depth < 3) {
                    // Alternating background colors: Dark -> Lighter -> Dark
                    const backgrounds = [
                        'rgba(40, 0, 5, 0.65)',   // Level 1: Very Dark Maroon
                        'rgba(180, 30, 50, 0.35)', // Level 2: Maroon
                        'rgba(20, 0, 2, 0.8)'      // Level 3: Pitch Dark Maroon
                    ];
                    const bg = backgrounds[Math.min(depth, 2)];

                    return `
                        <div class="nested-triple" style="padding:4px 6px; border:1px dashed rgba(255,255,255,0.1); border-radius:5px; background:${bg}; display:flex; flex-wrap:wrap; align-items:center; gap:4px; max-width:fit-content;">
                            ${renderPart(t.subject, 's', depth + 1)}
                            <span style="font-size:9px; opacity:0.3; align-self:center;">-></span>
                            ${renderPart(t.predicate, 'p', depth + 1)}
                            <span style="font-size:9px; opacity:0.3; align-self:center;">-></span>
                            ${renderPart(t.object, 'o', depth + 1)}
                        </div>
                    `;
                }

                let label = '';
                if (isTriple) label = `<< Triple >>`;
                else if (isRef) label = KGEntity.get(id).getDisplayName();
                else label = t.value;

                let color = 'var(--accent-primary)';
                if (role === 'p') color = '#10b981';
                else if (role === 'o') color = 'var(--accent-amber)';

                const idVal = isLiteral ? t.value : (isRef ? t.value : id.toString());
                const kind = isTriple ? 'triple' : (isRef ? 'entity' : 'literal');
                const clickAction = (isRef || isTriple) ? `onclick="window.state.${isTriple ? 'openTripleEditor' : 'openEntityEditor'}('${idVal}')"` : '';

                return `
                    <div style="display:flex; flex-direction:column; align-items:center; gap:4px; min-width:80px;">
                        <span style="font-size:8px; font-weight:800; color:var(--text-muted); opacity:0.5; text-transform:uppercase;">${role === 's' ? 'Subject' : (role === 'p' ? 'Predicate' : 'Object')}</span>
                        <div class="chip" style="height:28px; padding:0 10px; display:flex; align-items:center; border:1px solid ${color}; background:rgba(255,255,255,0.05); border-radius:4px; cursor:${isRef || isTriple ? 'pointer' : 'default'};" 
                             data-id="${idVal}" data-kind="${kind}" ${isLiteral && t.language ? `data-lang="${t.language}"` : ''}>
                             <span class="chip-label" style="font-size:12px; font-weight:700; color:${color};" ${clickAction}>${label}</span>
                        </div>
                    </div>
                `;
            };

            // 3. Data Grouping Phase
            const annotationsBySubject = new Map<bigint, TripleAnnotation[]>();
            kgTriple.annotations.forEach((anns) => {
                anns.forEach(a => {
                    const sj = a.subject;
                    if (!annotationsBySubject.has(sj)) annotationsBySubject.set(sj, []);
                    annotationsBySubject.get(sj)!.push(a);
                });
            });

            container.innerHTML = `
                <style>${TE_CSS}</style>
                <div class="te-root">
                    
                    <header class="te-header" style="padding: 4px 12px; gap: 4px; background: rgba(40, 0, 5, 0.2);">
                        
                        ${proxyId ? `
                            <div class="proxy-breadcrumb" style="font-size: 10px; font-weight: 800; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                                <span style="opacity: 0.5;">REIFICATION PROXY:</span> 
                                <span class="te-meta-val" style="cursor: pointer; text-decoration: underline;" onclick="window.state.openTripleEditor('${tripleID.toString()}')">[via ${state.factory.decode(proxyId).value}]</span>
                                <span style="font-size: 8px; opacity: 0.3;">✦ CLICK TO VIEW MAIN TRIPLE ✦</span>
                            </div>
                        ` : ''}

                        <!-- TRIPLE BOX (Symbolic Representation) -->
                        <div style="position:relative; width: 100%; display: flex; justify-content: center; padding: 4px 0; overflow-x: auto;">
                            ${isNested ? `
                                <div class="nested-badge" style="position:absolute; top:-2px; left:50%; transform:translateX(-50%); background:linear-gradient(135deg, #8b5cf6, #6366f1); color:white; font-size:7px; font-weight:900; padding:0px 8px; border-radius:100px; z-index:20; border:1px solid rgba(255,255,255,0.2);">✦ NESTED ✦</div>
                            ` : ''}

                            <div class="triple-ensemble" style="display:flex; flex-wrap:wrap; width: 98%; justify-content:center; align-items:center; gap:4px; background:rgba(40, 0, 5, 0.6); padding:6px 12px; border:${isNested ? '2px double var(--accent-primary)' : '1px solid rgba(180,30,50,0.3)'}; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.4); position:relative; z-index:10;">
                                ${renderPart(term.subject, 's', 1)}
                                <div style="font-size:12px; color:var(--border-subtle); opacity:0.2; align-self:center;">-></div>
                                ${renderPart(term.predicate, 'p', 1)}
                                <div style="font-size:12px; color:var(--border-subtle); opacity:0.2; align-self:center;">-></div>
                                ${renderPart(term.object, 'o', 1)}
                            </div>
                        </div>

                        <!-- METADATA INFO ROW (SMALL FONT, FLAT) -->
                        <div class="te-meta-panel" style="margin: 0; padding: 0; gap: 10px;">
                            <div class="te-meta-item">
                                <span>Occured in</span> <span class="te-meta-val" style="font-size:9px;">${occurrenceQuads.length}</span> <span style="font-size:9px;">triples</span>
                            </div>
                            <span style="opacity:0.2; font-size:8px;">//</span>
                            <div class="te-meta-item">
                                <span>Triple has</span> <span class="te-meta-val" style="font-size:9px;">${Array.from(annotationsBySubject.values()).reduce((acc, curr) => acc + curr.length, 0)}</span> <span style="font-size:9px;">annotations</span>
                            </div>
                            <span style="opacity:0.2; font-size:8px;">//</span>
                            <div class="te-meta-item">
                                ${(() => {
                                    const graphs = Array.from(kgTriple.graphs);
                                    let dataCount = 0;
                                    let inferCount = 0;
                                    for (const gId of graphs) {
                                        const info = state.graphs.get(gId);
                                        if (info && info.type === 'inference') inferCount++;
                                        else dataCount++;
                                    }
                                    return `<span style="font-size:9px;">Present in </span><span class="te-meta-val" style="font-size:9px;">${dataCount}</span><span style="font-size:9px;"> data, </span><span class="te-meta-val" style="color:var(--accent-blue); font-size:9px;">${inferCount}</span><span style="font-size:9px;"> inference graphs</span>`;
                                })()}
                            </div>
                        </div>
                    </header>

                    <!-- MAIN CONTENT CONTAINER -->
                    <div id="triple-editor-content-${winId}" style="flex:1; min-height:0; overflow-y:scroll; display:flex; flex-direction:column; background:var(--bg-app);">
                        
                        <!-- PANEL 1: MULTIPLE PRESENCE (CONTEXTS) - Outer collapsible container -->
                        <div class="te-outer-panel">
                            <div class="te-outer-head" onclick="window.toggleEditorSection('${winId}', 'presence-outer')">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <span id="prefix-presence-outer-${winId}" class="te-arrow" style="transform:rotate(90deg);">▶</span>
                                    <span class="te-outer-title">Multiple presence of the triple in different graphs</span>
                                </div>
                                <span class="te-outer-hint">Manage Graph Instances</span>
                            </div>

                            <div id="content-presence-outer-${winId}" class="te-outer-body">
                                <div class="te-toolbar">
                                    <div style="display:flex; gap:6px;">
                                        <button id="btn-p-merge-${winId}" class="btn-micro" onclick="window.bulkPresenceMerge('${winId}')" disabled>Merge selected copies into target graph</button>
                                        <button id="btn-p-copy-${winId}" class="btn-micro" onclick="window.bulkPresenceCopy('${winId}')">Create a copy in selected graph</button>
                                        <button id="btn-p-delete-${winId}" class="btn-micro btn-toolbar-red" onclick="window.bulkPresenceDelete('${winId}')" disabled>Delete selected copies</button>
                                    </div>
                                    <div id="p_selection_count_${winId}" class="te-sel">0 items selected</div>
                                </div>

                                <div style="display:flex; flex-direction:column; gap:8px; padding:12px 16px; background:rgba(0,0,0,0.1);">
                                    ${(() => {
                                        const graphs = Array.from(kgTriple.graphs);
                                        const dedupedGids = [...new Set(graphs)];

                                        return dedupedGids.filter(gid => {
                                            const checkKey = `${kgTriple.subject}_${kgTriple.predicate}_${kgTriple.object}_${gid}`;
                                            return !state.currentSession?.deletions.has(checkKey);
                                        });
                                    })().map(g => {
                                        const info = state.graphs.get(g);
                                        const gName = info ? (info.sourceTitle || info.filename || 'unknown') : 'unnamed';
                                        const gType = info ? info.type : 'data';
                                        const gUri = info ? info.uri : g.toString();

                                        const renderTripleBadge = () => {
                                            const sLabel = KGEntity.get(term.subject).getDisplayName();
                                            const pLabel = KGEntity.get(term.predicate).getDisplayName();
                                            const oTerm2 = state.factory.decode(term.object) as any;
                                            const isObjLiteral2 = oTerm2.termType === 'Literal';
                                            const isObjTriple2 = oTerm2.termType === 'Triple';
                                            const oLabel2 = isObjTriple2 ? '<<Triple>>' : (KGEntity.get(term.object).getDisplayName() || oTerm2.value);
                                            const objChip2 = isObjLiteral2
                                                ? `<span style="font-size:9px; font-weight:700; color:var(--accent-amber); font-family:monospace;">&quot;${oLabel2}&quot;</span>`
                                                : isObjTriple2
                                                ? `<span style="font-size:9px; font-weight:700; color:#a78bfa;">${oLabel2}</span>`
                                                : `<span style="font-size:9px; font-weight:700; color:var(--text-main); background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.25); padding:1px 5px; border-radius:3px;">${oLabel2}</span>`;
                                            return `
                                                <div class="focus-triple-pill">
                                                    <span class="ftp-s">${sLabel}</span>
                                                    <span class="ftp-p">${pLabel}</span>
                                                    <div style="text-align:center;">${objChip2}</div>
                                                </div>
                                            `;
                                        };

                                        return `
                                            <div class="te-row">
                                                <div class="te-row-inner">
                                                    <input type="checkbox" class="p-quad-selector-${winId}"
                                                        data-graph-id="${g.toString()}"
                                                        onchange="window.updatePresenceActionsUI('${winId}')"
                                                        style="width:14px; height:14px;">
                                                    <div class="graph-info-stack">
                                                        <div style="display:flex; align-items:center; gap:6px;">
                                                            <span class="te-gname">${gName}</span>
                                                            <span class="te-gtype">${gType}</span>
                                                        </div>
                                                        <div class="te-guri">${gUri}</div>
                                                    </div>
                                                    <div style="flex:1; display:flex; justify-content:center;">
                                                        ${renderTripleBadge()}
                                                    </div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- PANEL 2+3: ANNOTATIONS & OCCURRENCES - Outer collapsible container -->
                        <div class="te-outer-panel">
                            <div class="te-outer-head" onclick="window.toggleEditorSection('${winId}', 'annoc-outer')">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <span id="prefix-annoc-outer-${winId}" class="te-arrow" style="transform:rotate(90deg);">▶</span>
                                    <span class="te-outer-title">Annotations and occurrences of the triple</span>
                                </div>
                                <span class="te-outer-hint">Bulk &amp; RDF-star Context</span>
                            </div>

                            <div id="content-annoc-outer-${winId}" class="te-outer-body">

                                <!-- BULK ACTIONS TOOLBAR -->
                                <div class="te-bulk">
                                    <div style="display:flex; align-items:center; gap:12px;">
                                        <span class="te-bulk-label">Bulk Actions:</span>
                                        <div style="display:flex; gap:6px;">
                                            <button id="btn-move-${winId}" class="btn-micro" onclick="window.bulkMoveQuads('${winId}')" disabled>Move to Graph</button>
                                            <button id="btn-group-${winId}" class="btn-micro" onclick="window.bulkGroupBNode('${winId}', '${tripleID.toString()}')" disabled>Group as BNode</button>
                                            <button id="btn-split-${winId}" class="btn-micro" onclick="window.bulkSplitBNode('${winId}')" disabled>Split BNode</button>
                                            <button id="btn-merge-${winId}" class="btn-micro" onclick="window.bulkMergeOccurrences('${winId}')" disabled>Merge Duplicates</button>
                                            <button id="btn-delete-${winId}" class="btn-micro btn-toolbar-red" onclick="window.bulkDeleteQuads('${winId}')" disabled>Delete Selected</button>
                                        </div>
                                    </div>
                                    <div id="selection_count_${winId}" class="te-sel-main">0 ITEMS SELECTED</div>
                                </div>

                        <!-- PANEL 2: ANNOTATIONS -->
                        <div class="editor-section-panel">
                            <div class="te-section-head" onclick="window.toggleEditorSection('${winId}', 'annotations')">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <span id="prefix-annotations-${winId}" class="te-arrow" style="transform:rotate(90deg);">▼</span>
                                    <span class="te-section-title">Annotations (Triple as Subject)</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <span class="te-section-hint">Click to view/hide metadata</span>
                                    <button class="btn-micro" onclick="event.stopPropagation(); window.openTripleAddModal('annotation','${winId}','${tripleID.toString()}')">+ Add Annotation</button>
                                </div>
                            </div>
                            
                            <div id="content-annotations-${winId}" style="display:flex; padding:20px; flex-direction:column; gap:20px; background:rgba(0,0,0,0.1);">
                                <div style="display:flex; flex-direction:column; gap:16px;">
                                    ${Array.from(annotationsBySubject.entries()).map(([sj, anns]) => {
                                        const isBNode = state.factory.decode(sj).termType === 'BlankNode';

                                        const renderTripleBoxWithPredicate = (id: NodeID) => {
                                            const t = state.factory.decode(id) as any;
                                            const sLabel = KGEntity.get(t.subject).getDisplayName() || t.subject.toString();
                                            const pLabel = KGEntity.get(t.predicate).getDisplayName() || t.predicate.toString();
                                            const oTerm = state.factory.decode(t.object) as any;
                                            const isObjLiteral = oTerm.termType === 'Literal';
                                            const isObjTriple = oTerm.termType === 'Triple';
                                            const oLabel = isObjTriple ? '<<Triple>>' : (KGEntity.get(t.object).getDisplayName() || oTerm.value);
                                            const objChip = isObjLiteral
                                                ? `<span style="font-size:9px; font-weight:700; color:var(--accent-amber); font-family:monospace;">&quot;${oLabel}&quot;</span>`
                                                : isObjTriple
                                                ? `<span style="font-size:9px; font-weight:700; color:#a78bfa;">${oLabel}</span>`
                                                : `<span style="font-size:9px; font-weight:700; color:var(--text-main); background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.25); padding:1px 5px; border-radius:3px;">${oLabel}</span>`;
                                            return `
                                                <div class="focus-triple-pill" style="display:inline-flex; flex-direction:column; align-items:center; gap:1px; background:rgba(80,10,20,0.5); border:1px solid rgba(180,30,50,0.35); border-radius:6px; padding:0; min-width:80px; max-width:140px;">
                                                    <span style="font-size:8px; font-weight:700; color:var(--accent-primary); background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2); padding:1px 5px; border-radius:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:130px; text-align:center;">${sLabel}</span>
                                                    <span style="font-size:8px; font-weight:700; color:#10b981; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:130px; text-align:center;">${pLabel}</span>
                                                    <div style="text-align:center;">${objChip}</div>
                                                </div>
                                            `;
                                        };

                                        const renderValueChip = (id: NodeID) => {
                                            const term = state.factory.decode(id) as any;
                                            const isTriple = term.termType === 'Triple';
                                            const isLiteral = term.termType === 'Literal';

                                            if (isTriple) {
                                                return `
                                                    <div class="value-chip chip-triple" onclick="window.state.openTripleEditor('${id.toString()}')" 
                                                        data-id="${id.toString()}"
                                                        data-kind="triple"
                                                        style="display:inline-flex; align-items:center; gap:6px; background:rgba(139, 92, 246, 0.1); border:1px solid rgba(139, 92, 246, 0.3); padding:4px 10px; border-radius:6px; cursor:pointer;" 
                                                        title="Click to view nested triple">
                                                        <span style="font-size:10px; color:var(--accent-primary); opacity:0.7;">&lt;&lt;</span>
                                                        <span style="font-size:11px; font-weight:600; color:var(--accent-primary);">Triple</span>
                                                        <span style="font-size:10px; color:var(--accent-primary); opacity:0.7;">&gt;&gt;</span>
                                                    </div>
                                                `;
                                            }

                                            if (isLiteral) {
                                                return `
                                                    <div class="value-chip chip-literal" style="display:inline-flex; align-items:center; gap:4px; background:rgba(255,255,255,0.05); border:1px solid var(--border-subtle); padding:2px 8px; border-radius:6px; color:var(--text-main); font-size:11px;">
                                                        <span style="font-family:monospace; opacity:0.9;">"${term.value}"</span>
                                                        ${term.language ? `<span style="font-size:9px; color:var(--accent-amber); opacity:0.6;">@${term.language}</span>` : ''}
                                                    </div>
                                                `;
                                            }

                                            const entity = KGEntity.get(id);
                                            const label = entity.getDisplayName() || term.value;
                                            return `
                                                <div class="value-chip chip-entity" 
                                                    onclick="window.openEntity('${term.value}')"
                                                    data-id="${id.toString()}"
                                                    data-kind="entity"
                                                    style="display:inline-flex; align-items:center; gap:6px; background:rgba(59, 130, 246, 0.1); border:1px solid rgba(59, 130, 246, 0.3); padding:2px 8px; border-radius:6px; cursor:pointer; transition:all 0.2s;"
                                                    title="${term.value}">
                                                    <div style="width:6px; height:6px; border-radius:50%; background:var(--accent-primary); box-shadow:0 0 4px var(--accent-primary);"></div>
                                                    <span style="font-size:11px; font-weight:700; color:var(--text-main);">${label}</span>
                                                </div>
                                            `;
                                        };

                                        return `
                                            <div class="annotation-group ${isBNode ? 'annotation-group-bnode' : ''}" style="${!isBNode ? 'display:flex; flex-direction:column; gap:10px;' : ''}">
                                                
                                                ${isBNode ? `
                                                    <div class="bnode-label-container" style="display:flex; flex-direction:column; justify-content:center; align-items:flex-start; min-width:240px; padding-right:24px; border-right:1px solid rgba(59, 130, 246, 0.2);">
                                                        <div style="font-size:10px; font-weight:700; color:var(--accent-primary); margin-bottom:8px;">BNode Reification Group id: ${state.factory.decode(sj).value}</div>
                                                        ${renderTripleBoxWithPredicate(tripleID)}
                                                    </div>
                                                ` : ''}

                                                <div class="annotation-rows-list" style="flex:1; display:flex; flex-direction:column; gap:8px; justify-content:center;">
                                                    ${anns.map(a => {
                                                        const pName = KGEntity.get(a.predicate).getDisplayName();
                                                        const info = state.graphs.get(a.sourceGraph);
                                                        const gName = info ? (info.filename || info.sourceTitle || 'data') : 'unnamed';
                                                        const gIdPrefix = a.sourceGraph.toString().substring(0, 10);

                                                        return `
                                                            <div class="annotation-row" style="display:flex; align-items:center; justify-content:space-between; padding:10px 16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:8px;">
                                                                <div style="display:flex; align-items:center; gap:12px; flex:1;">
                                                                    <input type="checkbox" class="quad-selector-${winId}" 
                                                                        data-quad-id="${a.id.toString()}" 
                                                                        data-graph-id="${a.sourceGraph.toString()}" 
                                                                        data-subject-id="${sj.toString()}"
                                                                        data-role="annotation"
                                                                        onchange="window.updateBulkActionsUI('${winId}')" 
                                                                        style="width:14px; height:14px; flex-shrink:0;">
                                                                    <span onclick="window.state.openTripleEditor('${a.id.toString()}', '${a.subject.toString()}')" style="font-size:9px; color:var(--accent-primary); cursor:pointer; text-decoration:underline; font-weight:800; margin-left:2px; margin-right:4px;" title="View this annotation triple with proxy context">View</span>
                                                                    ${!isBNode ? `
                                                                        <div class="triple-micro-badge" style="transform-origin: left center;">
                                                                            ${renderTripleBoxWithPredicate(tripleID)}
                                                                        </div>
                                                                    ` : ''}

                                                                    <span style="font-size:11px; color:#10b981; font-weight:800; min-width:110px; display:inline-block;">${pName}</span>
                                                                    <span style="font-size:12px; opacity:0.2;">-></span>
                                                                    <div style="flex:1;">
                                                                        ${renderValueChip(a.object)}
                                                                    </div>
                                                                </div>

                                                                <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                                                                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px;">
                                                                        <span style="font-size:9px; font-weight:800; color:var(--accent-amber); padding:1px 6px; border:1px solid rgba(255, 191, 0, 0.2); border-radius:4px; opacity:0.8;">${gName}</span>
                                                                        <span style="font-size:8px; color:var(--text-muted); opacity:0.5; margin-right:4px;">(${gIdPrefix})</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        `;
                                                    }).join('')}
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- PANEL 3: OCCURRENCES -->
                        <div class="editor-section-panel">
                            <div class="te-section-head" onclick="window.toggleEditorSection('${winId}', 'occurrences')">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <span id="prefix-occurrences-${winId}" class="te-arrow" style="color:var(--accent-amber); transform:rotate(90deg);">▼</span>
                                    <span class="te-section-title">Occurrences (Triple as Object)</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <span class="te-section-hint">Click to view/hide usage</span>
                                    <button class="btn-micro" onclick="event.stopPropagation(); window.openTripleAddModal('occurrence','${winId}','${tripleID.toString()}')">+ Add Occurrence</button>
                                </div>
                            </div>
                            
                            <div id="content-occurrences-${winId}" style="display:flex; padding:20px; flex-direction:column; gap:10px; background:rgba(0,0,0,0.1);">
                                ${occurrenceQuads.length === 0 ? `
                                    <div style="padding:20px; text-align:center; color:var(--text-muted); font-size:11px; border:1px dashed var(--border-subtle); border-radius:8px; opacity:0.5;">
                                        No occurrences found in available graphs.
                                    </div>
                                ` : occurrenceQuads.map((q: any) => {
                                    const s = q[0];
                                    const p = q[1];
                                    const g = q[3];
                                    
                                    const pName = KGEntity.get(p).getDisplayName();
                                    const info = state.graphs.get(g);
                                    const gName = info ? (info.filename || info.sourceTitle || 'data') : 'unnamed';
                                    const gIdPrefix = g.toString().substring(0, 10);

                                    const renderTripleBoxWithPredicate = (id: NodeID) => {
                                        const t = state.factory.decode(id) as any;
                                        const sLabel = KGEntity.get(t.subject).getDisplayName() || t.subject.toString();
                                        const pLabel = KGEntity.get(t.predicate).getDisplayName() || t.predicate.toString();
                                        const oTerm = state.factory.decode(t.object) as any;
                                        const isObjLiteral = oTerm.termType === 'Literal';
                                        const isObjTriple = oTerm.termType === 'Triple';
                                        const oLabel = isObjTriple ? '<<Triple>>' : (KGEntity.get(t.object).getDisplayName() || oTerm.value);
                                        const objChip = isObjLiteral
                                            ? `<span style="font-size:9px; font-weight:700; color:var(--accent-amber); font-family:monospace;">&quot;${oLabel}&quot;</span>`
                                            : isObjTriple
                                            ? `<span style="font-size:9px; font-weight:700; color:#a78bfa;">${oLabel}</span>`
                                            : `<span style="font-size:9px; font-weight:700; color:var(--text-main); background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.25); padding:1px 5px; border-radius:3px;">${oLabel}</span>`;
                                        return `
                                            <div class="focus-triple-pill" style="display:inline-flex; flex-direction:column; align-items:center; gap:1px; background:rgba(80,10,20,0.5); border:1px solid rgba(180,30,50,0.35); border-radius:6px; padding:0; min-width:80px; max-width:140px;">
                                                <span style="font-size:8px; font-weight:700; color:var(--accent-primary); background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2); padding:1px 5px; border-radius:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:130px; text-align:center;">${sLabel}</span>
                                                <span style="font-size:8px; font-weight:700; color:#10b981; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:130px; text-align:center;">${pLabel}</span>
                                                <div style="text-align:center;">${objChip}</div>
                                            </div>
                                        `;
                                    };

                                    const renderValueChip = (id: NodeID) => {
                                        const term = state.factory.decode(id) as any;
                                        const isTriple = term.termType === 'Triple';
                                        const entity = KGEntity.get(id);
                                        const label = entity.getDisplayName() || term.value;
                                        
                                        if (isTriple) {
                                            return `<div class="value-chip chip-triple" style="display:inline-block; background:rgba(139, 92, 246, 0.1); border:1px solid rgba(139, 92, 246, 0.3); padding:4px 10px; border-radius:6px; font-size:11px; color:var(--accent-primary); font-weight:600;">Triple &lt;&lt;...&gt;&gt;</div>`;
                                        }

                                        return `
                                            <div class="value-chip chip-entity" style="display:inline-flex; align-items:center; gap:6px; background:rgba(59, 130, 246, 0.1); border:1px solid rgba(59, 130, 246, 0.3); padding:2px 8px; border-radius:6px; cursor:pointer;" onclick="window.openEntity('${term.value}')">
                                                <div style="width:6px; height:6px; border-radius:50%; background:var(--accent-primary);"></div>
                                                <span style="font-size:11px; font-weight:700; color:var(--text-main);">${label}</span>
                                            </div>
                                        `;
                                    };

                                    return `
                                        <div class="te-row">
                                            <div class="te-row-inner-ann">
                                                <input type="checkbox" class="quad-selector-${winId}" 
                                                    data-quad-id="${state.factory.triple(s, p, tripleID).toString()}" 
                                                    data-graph-id="${g.toString()}" 
                                                    data-subject-id="${s.toString()}"
                                                    data-role="occurrence"
                                                    onchange="window.updateBulkActionsUI('${winId}')" 
                                                    style="width:14px; height:14px; flex-shrink:0;">
                                                <span onclick="window.state.openTripleEditor('${state.factory.triple(s, p, tripleID).toString()}', '${s.toString()}')" style="font-size:9px; color:var(--accent-primary); cursor:pointer; text-decoration:underline; font-weight:800; margin-left:2px; margin-right:4px;" title="View this occurrence link with proxy context">View</span>
                                                <div style="min-width:180px;">${renderValueChip(s)}</div>
                                                <span style="font-size:11px; color:var(--accent-amber); font-weight:800; min-width:110px; display:inline-block; text-align:center;">${pName}</span>
                                                <span style="font-size:12px; opacity:0.2;">-></span>
                                                <div>${renderTripleBoxWithPredicate(tripleID)}</div>
                                            </div>
                                            <div class="te-source">
                                                <div class="te-source-stack">
                                                    <span class="te-gname-occ">${gName}</span>
                                                    <span class="te-gid-suffix">(${gIdPrefix})</span>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                            </div><!-- end content-annoc-outer -->
                        </div><!-- end annoc outer container -->

                    </div>
                </div>


            `;

            // 4. Bind Interactions to Global Scope
            (window as any).updateBulkActionsUI = (wid: string) => {
                const checkboxes = Array.from(document.querySelectorAll(`.quad-selector-${wid}:checked`)) as HTMLInputElement[];
                const count = checkboxes.length;
                const hasOccurrence = checkboxes.some(cb => cb.dataset.role === 'occurrence');
                
                const countEl = document.getElementById(`selection_count_${wid}`);
                if (countEl) countEl.innerText = `${count} items selected`;

                const btnMove = document.getElementById(`btn-move-${wid}`) as HTMLButtonElement;
                const btnGroup = document.getElementById(`btn-group-${wid}`) as HTMLButtonElement;
                const btnSplit = document.getElementById(`btn-split-${wid}`) as HTMLButtonElement;
                const btnMerge = document.getElementById(`btn-merge-${wid}`) as HTMLButtonElement;
                const btnDelete = document.getElementById(`btn-delete-${wid}`) as HTMLButtonElement;

                const noneSelected = count === 0;
                if (btnMove) btnMove.disabled = noneSelected;
                if (btnGroup) btnGroup.disabled = noneSelected || hasOccurrence;
                if (btnDelete) btnDelete.disabled = noneSelected;
                if (btnMerge) btnMerge.disabled = count < 2;

                let hasBNodeInSelection = false;
                for (const cb of checkboxes) {
                    const sjId = cb.dataset.subjectId;
                    if (sjId) {
                        try {
                            const term = state.factory.decode(BigInt(sjId));
                            if (term.termType === 'BlankNode') {
                                hasBNodeInSelection = true;
                                break;
                            }
                        } catch (e) {}
                    }
                }
                if (btnSplit) btnSplit.disabled = !hasBNodeInSelection || noneSelected || hasOccurrence;
            };

            (window as any).bulkMoveQuads = async (wid: string) => {
                const selected = Array.from(document.querySelectorAll(`.quad-selector-${wid}:checked`)) as any[];
                if (selected.length === 0) return alert('Select items to move.');
                
                const targetUri = await (window as any).requestTargetGraph();
                if (!targetUri) return;
                
                const ids = selected.map(b => BigInt(b.dataset.quadId));
                state.ensureSession();
                uiState.currentSession = state.currentSession!;
                state.moveQuadsToGraph(ids, state.factory.namedNode(targetUri));
                
                KGTriple.getOrCreate(tripleID, term.subject, term.predicate, term.object).invalidate();
                this.renderTripleInWindow(tripleID, container, wid);
            };

            (window as any).bulkGroupBNode = async (wid: string, tidStr: string) => {
                const selected = Array.from(document.querySelectorAll(`.quad-selector-${wid}:checked`)) as any[];
                if (selected.length === 0) return alert('Select items to group.');
                const tid = BigInt(tidStr);
                const ids = selected.map(b => BigInt(b.dataset.quadId));
                
                const targetUri = await (window as any).requestTargetGraph();
                if (!targetUri) return;
                const gid = state.factory.namedNode(targetUri);
                
                state.ensureSession();
                uiState.currentSession = state.currentSession!;
                state.groupAnnotationsAsBNode(tid, ids, gid);

                KGTriple.getOrCreate(tripleID, term.subject, term.predicate, term.object).invalidate();
                this.renderTripleInWindow(tripleID, container, wid);
            };

            (window as any).bulkSplitBNode = async (wid: string) => {
                const selected = Array.from(document.querySelectorAll(`.quad-selector-${wid}:checked`)) as any[];
                if (selected.length === 0) return alert('Select items to split.');
                const ids = selected.map(b => BigInt(b.dataset.quadId)); 
                
                const targetUri = await (window as any).requestTargetGraph();
                if (!targetUri) return;
                const gid = state.factory.namedNode(targetUri);
                
                state.ensureSession();
                uiState.currentSession = state.currentSession!;
                state.splitBNodeGroup(ids, gid);

                KGTriple.getOrCreate(tripleID, term.subject, term.predicate, term.object).invalidate();
                this.renderTripleInWindow(tripleID, container, wid);
            };

            (window as any).bulkMergeOccurrences = async (wid: string) => {
                const selected = Array.from(document.querySelectorAll(`.quad-selector-${wid}:checked`)) as any[];
                if (selected.length === 0) return alert('Select items to merge.');
                const ids = selected.map(b => BigInt(b.dataset.quadId));
                
                const targetUri = await (window as any).requestTargetGraph();
                if (!targetUri) return;
                const gid = state.factory.namedNode(targetUri);
                
                state.ensureSession();
                uiState.currentSession = state.currentSession!;
                state.mergeDuplicateQuads(ids, gid);

                KGTriple.getOrCreate(tripleID, term.subject, term.predicate, term.object).invalidate();
                this.renderTripleInWindow(tripleID, container, wid);
            };

            (window as any).bulkDeleteQuads = async (wid: string) => {
                const selected = Array.from(document.querySelectorAll(`.quad-selector-${wid}:checked`)) as HTMLInputElement[];
                
                const hasBNodeOccurrence = selected.some(el => {
                    const role = el.dataset.role;
                    const sidStr = el.dataset.subjectId;
                    if (role === 'occurrence' && sidStr) {
                        try {
                            const sid = BigInt(sidStr);
                            const decoded = state.factory.decode(sid) as any;
                            return decoded.termType === 'BlankNode';
                        } catch (e) {
                            return false;
                        }
                    }
                    return false;
                });

                if (hasBNodeOccurrence) {
                    const msg = 'If you delete a bnode occurrence, you will lose related annotations. Click "OK" to continue deletion if you are sure or "Cancel" to cancel, find the annotation group and split relevant annotations.';
                    if (!confirm(msg)) return;
                } else {
                    if (!confirm('Are you sure?')) return;
                }

                const ids = selected.map((b: any) => BigInt(b.dataset.quadId));
                
                state.ensureSession();
                uiState.currentSession = state.currentSession!;
                state.deleteQuads(ids);

                KGTriple.getOrCreate(tripleID, term.subject, term.predicate, term.object).invalidate();
                this.renderTripleInWindow(tripleID, container, wid);
            };

            (window as any).toggleEditorSection = (wid: string, section: string) => {
                const content = document.getElementById(`content-${section}-${wid}`);
                const prefix = document.getElementById(`prefix-${section}-${wid}`);
                if (content && prefix) {
                    const isHidden = content.style.display === 'none';
                    content.style.display = isHidden ? 'flex' : 'none';
                    prefix.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
                    prefix.style.transition = 'transform 0.3s';
                }
            };

            (window as any).updatePresenceActionsUI = (wid: string) => {
                const checkboxes = Array.from(document.querySelectorAll(`.p-quad-selector-${wid}:checked`)) as HTMLInputElement[];
                const count = checkboxes.length;
                
                const btnMerge = document.getElementById(`btn-p-merge-${wid}`) as HTMLButtonElement;
                const btnDelete = document.getElementById(`btn-p-delete-${wid}`) as HTMLButtonElement;
                const counter = document.getElementById(`p_selection_count_${wid}`);

                if (btnMerge) btnMerge.disabled = count === 0;
                if (btnDelete) btnDelete.disabled = count === 0;
                if (counter) counter.innerText = `${count} items selected`;
            };

            (window as any).bulkPresenceMerge = async (wid: string) => {
                const selected = Array.from(document.querySelectorAll(`.p-quad-selector-${wid}:checked`)) as any[];
                if (selected.length === 0) return;
                const gids = selected.map(b => BigInt(b.dataset.graphId));
                state.ensureSession();
                uiState.currentSession = state.currentSession!;

                const targetUri = await (window as any).requestTargetGraph();
                if (!targetUri) return;
                
                const targetGid = state.factory.namedNode(targetUri);
                
                // REGISTER NEW GRAPH: If the target is a new URI string, ensure metadata is initialized
                if (!state.graphs.has(targetGid)) {
                    state.registerGraph(targetUri, 'data', targetUri.split('/').pop() || 'User Created', { id: targetGid });
                }

                for (const g of gids) {
                    if (g !== targetGid) {
                        state.removeTripleById(term.subject, term.predicate, term.object, g);
                    }
                }
                
                // Smart Merge: Only materialize if not already in target OR if it was already marked for deletion
                const isDeleted = state.currentSession?.deletions.has(`${term.subject}_${term.predicate}_${term.object}_${targetGid}`);
                const alreadyExists = state.store.has(term.subject, term.predicate, term.object, targetGid) || 
                                     (state.currentSession?.additions.has(term.subject, term.predicate, term.object, targetGid));
                
                if (!alreadyExists || isDeleted) {
                    state.materializeTripleById(term.subject, term.predicate, term.object, targetGid);
                }
                
                state.dataSync.fullRefresh();

                KGTriple.getOrCreate(tripleID, term.subject, term.predicate, term.object).invalidate();
                this.renderTripleInWindow(tripleID, container, wid);
            };

            (window as any).bulkPresenceCopy = async (wid: string) => {
                const targetUri = await (window as any).requestTargetGraph();
                if (!targetUri) return;
                
                state.ensureSession();
                uiState.currentSession = state.currentSession!;
                const targetGid = state.factory.namedNode(targetUri);
                
                // REGISTER NEW GRAPH: Ensure metadata is tracked even for on-the-fly created graphs
                if (!state.graphs.has(targetGid)) {
                    state.registerGraph(targetUri, 'data', targetUri.split('/').pop() || 'User Created', { id: targetGid });
                }

                state.materializeTripleById(term.subject, term.predicate, term.object, targetGid);
                state.dataSync.fullRefresh();

                KGTriple.getOrCreate(tripleID, term.subject, term.predicate, term.object).invalidate();
                this.renderTripleInWindow(tripleID, container, wid);
            };

            (window as any).bulkPresenceDelete = async (wid: string) => {
                if (!confirm('Are you sure you want to delete these triple instances?')) return;
                const selected = Array.from(document.querySelectorAll(`.p-quad-selector-${wid}:checked`)) as any[];
                const gids = selected.map(b => BigInt(b.dataset.graphId));
                
                state.ensureSession();
                uiState.currentSession = state.currentSession!;
                for (const g of gids) {
                    state.removeTripleById(term.subject, term.predicate, term.object, g);
                }
                state.dataSync.fullRefresh();

                KGTriple.getOrCreate(tripleID, term.subject, term.predicate, term.object).invalidate();
                this.renderTripleInWindow(tripleID, container, wid);
            };

        } catch (e: any) {
            container.innerHTML = `<div style="padding:20px; color:var(--accent-red); font-size:11px;">Error: ${e.message}</div>`;
        }
    }
}
