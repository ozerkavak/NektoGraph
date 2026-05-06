import { state } from '../../runtime/State';
import { uiState } from '../../runtime/UIState';
import { NodeID } from '@triplestore/core';
import { GraphSelector, type GraphOption } from '@triplestore/graph-selector';
import { SearchComponent } from './SearchComponent';
import { KGEntity } from '../services/kg_entity';
import { SchemaIndex } from '@triplestore/edit-engine';

export type TripleAddMode = 'annotation' | 'occurrence';

const MODAL_CSS = `
    .tam-overlay {
        position: fixed; inset: 0; z-index: 9000;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
    }
    .tam-dialog {
        background: var(--bg-panel, #0f172a);
        border: 1px solid rgba(59,130,246,0.35);
        border-radius: 14px;
        width: 540px; max-width: 95vw;
        min-height: 480px;
        box-shadow: 0 24px 80px rgba(0,0,0,0.6);
        display: flex; flex-direction: column;
        font-family: var(--font-main, 'Inter', sans-serif);
    }
    .tam-header {
        padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;
        background: rgba(10,18,42,0.9); border-bottom: 1px solid rgba(59,130,246,0.2);
    }
    .tam-title { font-size: 13px; font-weight: 800; color: var(--text-main, #e2e8f0); text-transform: uppercase; letter-spacing: 0.05em; }
    .tam-close { background: none; border: none; color: var(--text-muted, #94a3b8); font-size: 18px; cursor: pointer; padding: 4px 8px; border-radius: 4px; line-height:1; }
    .tam-close:hover { color: var(--text-main, #e2e8f0); background: rgba(255,255,255,0.1); }
    .tam-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .tam-field { display: flex; flex-direction: column; gap: 6px; }
    .tam-label { font-size: 10px; font-weight: 800; color: var(--text-muted, #94a3b8); text-transform: uppercase; letter-spacing: 0.07em; }
    .tam-fixed-chip {
        display: inline-flex; flex-direction: column; align-items: center; gap: 2px;
        background: rgba(80,10,20,0.5); border: 1px solid rgba(180,30,50,0.4);
        border-radius: 8px; padding: 6px 12px; align-self: flex-start; min-width: 140px;
    }
    .tam-chip-s { font-size: 9px; font-weight: 700; color: #93c5fd; background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.25); padding: 2px 8px; border-radius: 4px; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tam-chip-p { font-size: 9px; font-weight: 700; color: #10b981; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tam-chip-o { font-size: 9px; font-weight: 700; text-align: center; }
    .tam-search-wrap { position: relative; }
    .tam-input {
        width: 100%; box-sizing: border-box;
        background: rgba(0,0,0,0.3); border: 1px solid rgba(59,130,246,0.3);
        color: var(--text-main, #e2e8f0); border-radius: 6px;
        padding: 8px 12px; font-size: 12px; outline: none; transition: border-color 0.2s;
    }
    .tam-input:focus { border-color: rgba(59,130,246,0.7); }
    .tam-input::placeholder { color: var(--text-muted, #64748b); }
    .tam-selected-badge {
        display: flex; align-items: center; gap: 8px;
        background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25);
        border-radius: 6px; padding: 6px 10px; font-size: 11px; color: #10b981;
    }
    .tam-clear { background: none; border: none; color: rgba(16,185,129,0.6); cursor: pointer; font-size: 14px; line-height:1; padding: 0; margin-left: auto; }
    .tam-clear:hover { color: #ef4444; }
    .tam-literal-row { display: flex; gap: 8px; align-items: center; }
    .tam-lang { width: 80px; flex-shrink: 0; }
    .tam-type { width: 160px; flex-shrink: 0; }
    .tam-footer { padding: 14px 20px; border-top: 1px solid rgba(59,130,246,0.15); display: flex; justify-content: flex-end; gap: 8px; background: rgba(10,18,42,0.6); }
    .tam-btn { padding: 8px 20px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid; transition: all 0.2s; }
    .tam-btn-cancel { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.15); color: var(--text-muted, #94a3b8); }
    .tam-btn-cancel:hover { background: rgba(255,255,255,0.1); }
    .tam-btn-save { background: rgba(59,130,246,0.2); border-color: rgba(59,130,246,0.5); color: #93c5fd; }
    .tam-btn-save:hover { background: rgba(59,130,246,0.45); color: #fff; }
    .tam-btn-save:disabled { opacity: 0.3; cursor: not-allowed; }
    .tam-dropdown { display: none; position: absolute; top: calc(100% + 4px); left: 0; width: 100%; z-index: 100; background: var(--bg-panel, #0f172a); border: 1px solid rgba(59,130,246,0.35); border-radius: 6px; max-height: 240px; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
`;


interface ModalState {
    mode: TripleAddMode;
    winId: string;
    tripleId: NodeID;
    selectedPredicateUri: string | null;
    selectedPredicateLabel: string | null;
    selectedSubjectUri: string | null;
    selectedSubjectLabel: string | null;
    isDataProperty: boolean;
}

export class TripleAddModal {
    private static ms: ModalState | null = null;
    private static searchInstances: SearchComponent[] = [];

    static open(mode: TripleAddMode, winId: string, tripleIdStr: string) {
        this.close();
        const tripleId = BigInt(tripleIdStr);
        const term = state.factory.decode(tripleId) as any;
        if (term.termType !== 'Triple') return;

        this.ms = {
            mode, winId, tripleId,
            selectedPredicateUri: null, selectedPredicateLabel: null,
            selectedSubjectUri: null, selectedSubjectLabel: null,
            isDataProperty: false,
        };

        this.injectCSS();
        this.render(term);
    }

    private static injectCSS() {
        if (document.getElementById('tam-css')) return;
        const style = document.createElement('style');
        style.id = 'tam-css';
        style.textContent = MODAL_CSS;
        document.head.appendChild(style);
    }

    private static getAllPredicates(): Array<{ id: NodeID; uri: string; label: string; type: string }> {
        const results: Array<{ id: NodeID; uri: string; label: string; type: string }> = [];
        const lang = state.language || 'en';

        // Use the new public listProperties API
        const allSchemas = state.schemaIndex.listProperties(lang);
        
        allSchemas.forEach(schema => {
            try {
                const id = schema.property;
                const term = state.factory.decode(id);
                if (term.termType !== 'NamedNode') return;
                
                // Get Best Label from Schema (Ensure it is always a string to fix IDE type error)
                const label = (schema.labels[lang] || schema.labels['en'] || Object.values(schema.labels)[0] || term.value.split('#').pop() || term.value.split('/').pop() || term.value) as string;
                
                results.push({ id, uri: term.value, label, type: schema.type });
            } catch { }
        });

        // listProperties already returns sorted, but we might want our own sorting if we transformed labels
        return results;
    }
    private static render(term: any) {
        const ms = this.ms!;
        const sLabel = KGEntity.get(term.subject).getDisplayName();
        const pLabel = KGEntity.get(term.predicate).getDisplayName();
        const oTerm = state.factory.decode(term.object) as any;
        const isObjLiteral = oTerm.termType === 'Literal';
        const isObjTriple = oTerm.termType === 'Triple';
        const oLabel = isObjTriple ? '<<Triple>>' : (KGEntity.get(term.object).getDisplayName() || oTerm.value);

        const objChipClass = isObjLiteral ? 'color:#f59e0b; font-family:monospace;' : isObjTriple ? 'color:#a78bfa;' : 'color:#93c5fd;';
        const objChipText = isObjLiteral ? `"${oLabel}"` : oLabel;

        const isAnnotation = ms.mode === 'annotation';
        const title = isAnnotation ? '+ Add Annotation' : '+ Add Occurrence';

        const overlay = document.createElement('div');
        overlay.className = 'tam-overlay';
        overlay.id = 'tam-overlay';

        let modalHTML = '<div class="tam-dialog" id="tam-dialog"><div class="tam-header"><span class="tam-title">' + title + '</span><button class="tam-close" id="tam-btn-close">✕</button></div><div class="tam-body">';

        modalHTML += '<div class="tam-field"><span class="tam-label">Subject</span>';
        if (isAnnotation) {
            modalHTML += '<div class="tam-fixed-chip"><span class="tam-chip-s">' + sLabel + '</span><span class="tam-chip-p">' + pLabel + '</span>';
            modalHTML += '<span class="tam-chip-o" style="' + objChipClass + '">' + objChipText + '</span></div>';
        } else {
            modalHTML += '<div id="tam-subject-area"><div class="tam-search-wrap">';
            modalHTML += '<input type="text" id="tam-subject-input" class="tam-input" placeholder="Search entity..." autocomplete="off"/>';
            modalHTML += '<div id="tam-subject-dropdown" class="tam-dropdown"></div></div>';
            modalHTML += '<div id="tam-subject-selected" style="display:none; margin-top:6px;" class="tam-selected-badge">';
            modalHTML += '<span id="tam-subject-label"></span><button class="tam-clear" id="tam-subject-clear" title="Clear">✕</button></div></div>';
        }
        modalHTML += '</div>';

        modalHTML += '<div class="tam-field"><span class="tam-label">Predicate</span><div class="tam-search-wrap">';
        modalHTML += '<input type="text" id="tam-pred-input" class="tam-input" placeholder="Search predicate (all loaded predicates shown on focus)..." autocomplete="off"/>';
        modalHTML += '<div id="tam-pred-dropdown" class="tam-dropdown"></div></div>';
        modalHTML += '<div id="tam-pred-selected" style="display:none; margin-top:4px;" class="tam-selected-badge">';
        modalHTML += '<span id="tam-pred-label"></span><button class="tam-clear" id="tam-pred-clear" title="Clear">✕</button></div></div>';

        modalHTML += '<div class="tam-field" id="tam-obj-field" style="display:none;"><span class="tam-label">Object</span>';
        if (isAnnotation) {
            modalHTML += '<div id="tam-obj-area"></div>';
        } else {
            modalHTML += '<div class="tam-fixed-chip"><span class="tam-chip-s">' + sLabel + '</span><span class="tam-chip-p">' + pLabel + '</span>';
            modalHTML += '<span class="tam-chip-o" style="' + objChipClass + '">' + objChipText + '</span></div>';
        }
        modalHTML += '</div></div>';

        modalHTML += '<div class="tam-footer"><button class="tam-btn tam-btn-cancel" id="tam-btn-cancel">Cancel</button>';
        modalHTML += '<button class="tam-btn tam-btn-save" id="tam-btn-save" disabled>Save Triple</button></div></div>';

        overlay.innerHTML = modalHTML;

        document.body.appendChild(overlay);

        // bind close
        const closeBtn = document.getElementById('tam-btn-close');
        if (closeBtn) closeBtn.onclick = () => this.close();
        const cancelBtn = document.getElementById('tam-btn-cancel');
        if (cancelBtn) cancelBtn.onclick = () => this.close();
        
        overlay.addEventListener('click', (e) => { 
            if (e.target === overlay) this.close(); 
        });

        // bind save
        const saveBtn = document.getElementById('tam-btn-save');
        if (saveBtn) saveBtn.onclick = () => this.save();

        // bind predicate search
        this.bindPredicateField();

        // bind subject search (occurrence mode)
        if (!isAnnotation) {
            this.bindSubjectField();
        } else {
            // annotation: subject is fixed (the focus triple)
            ms.selectedSubjectUri = '__focustriple__'; // sentinel
        }

        // occurrence: object is fixed (handled in save logic via fixed tripleId)
        this.updateSaveButton();
    }

    private static bindPredicateField() {
        const input = document.getElementById('tam-pred-input') as HTMLInputElement;
        const dropdown = document.getElementById('tam-pred-dropdown') as HTMLElement;
        const selectedDiv = document.getElementById('tam-pred-selected')!;
        const clearBtn = document.getElementById('tam-pred-clear')!;

        if (!input || !dropdown) return;

        const showAllPredicates = (filter: string = '') => {
            const all = this.getAllPredicates();
            const display = filter.trim().length === 0
                ? all
                : all.filter(p => p.label.toLowerCase().includes(filter.toLowerCase()) || p.uri.toLowerCase().includes(filter.toLowerCase()));

            if (display.length === 0) {
                dropdown.innerHTML = `<div style="padding:12px; color:var(--text-muted); font-size:12px; text-align:center;">No predicates found.</div>`;
            } else {
                dropdown.innerHTML = display.slice(0, 100).map((p, i) => {
                    const cleanLabel = p.label.replace(/"/g, '&quot;');
                    let rowHtml = '<div class="unified-item" data-index="' + i + '" data-uri="' + p.uri + '" data-label="' + cleanLabel + '" autocomplete="off"';
                    rowHtml += ' style="padding:8px 14px; cursor:pointer; font-size:12px; border-bottom:1px solid rgba(255,255,255,0.04); display:flex; align-items:center; justify-content:space-between; transition:background 0.15s;"';
                    rowHtml += ' onmouseover="this.style.background=\'rgba(59,130,246,0.15)\'" onmouseout="this.style.background=\'\'">';
                    rowHtml += '<span style="font-weight:600; color:var(--text-main);">' + p.label + '</span>';
                    rowHtml += '<span class="chip-micro" style="opacity:0.6; font-size:9px; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">' + p.type + '</span>';
                    rowHtml += '</div>';
                    return rowHtml;
                }).join('');
            }
            dropdown.style.display = 'block';
        };

        input.addEventListener('focus', () => showAllPredicates(input.value));
        input.addEventListener('input', () => showAllPredicates(input.value));

        dropdown.addEventListener('click', (e) => {
            const item = (e.target as HTMLElement).closest('.unified-item') as HTMLElement;
            if (!item) return;
            const uri = item.dataset.uri!;
            const label = item.dataset.label!;
            this.selectPredicate(uri, label);
        });

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
                dropdown.style.display = 'none';
            }
        });

        clearBtn.onclick = () => {
            this.ms!.selectedPredicateUri = null;
            this.ms!.selectedPredicateLabel = null;
            input.value = '';
            selectedDiv.style.display = 'none';
            input.style.display = '';
            const objField = document.getElementById('tam-obj-field');
            if (objField) objField.style.display = 'none';
            this.updateSaveButton();
        };
    }

    private static selectPredicate(uri: string, label: string) {
        const ms = this.ms!;
        ms.selectedPredicateUri = uri;
        ms.selectedPredicateLabel = label;

        const input = document.getElementById('tam-pred-input') as HTMLInputElement;
        const dropdown = document.getElementById('tam-pred-dropdown') as HTMLElement;
        const selectedDiv = document.getElementById('tam-pred-selected')!;
        const selectedLabel = document.getElementById('tam-pred-label')!;

        if (input) input.style.display = 'none';
        if (dropdown) dropdown.style.display = 'none';
        selectedDiv.style.display = 'flex';
        selectedLabel.innerHTML = `<span>${label}</span>`;

        // Determine data vs object property
        const propId = state.factory.namedNode(uri);
        const schema = state.schemaIndex.getPropertySchema(propId);
        const isObj = schema ? SchemaIndex.isObjectProperty(schema, state.factory) : false; 
        ms.isDataProperty = !isObj;

        // Show object field for annotation mode
        if (ms.mode === 'annotation') {
            const objField = document.getElementById('tam-obj-field')!;
            const objArea = document.getElementById('tam-obj-area')!;
            objField.style.display = 'flex';

            if (ms.isDataProperty) {
                this.renderLiteralObjectField(objArea, schema);
            } else {
                this.renderEntityObjectField(objArea, schema);
            }
        } else {
            // occurrence: show object field (already fixed chip), just reveal
            const objField = document.getElementById('tam-obj-field')!;
            if (objField) objField.style.display = 'flex';
        }

        this.updateSaveButton();
    }

    private static renderLiteralObjectField(container: HTMLElement, schema: any) {
        const ranges = schema?.ranges || [];
        const xsdTypes = [
            { value: '', label: 'string (default)' },
            { value: 'http://www.w3.org/2001/XMLSchema#integer', label: 'xsd:integer' },
            { value: 'http://www.w3.org/2001/XMLSchema#decimal', label: 'xsd:decimal' },
            { value: 'http://www.w3.org/2001/XMLSchema#boolean', label: 'xsd:boolean' },
            { value: 'http://www.w3.org/2001/XMLSchema#date', label: 'xsd:date' },
            { value: 'http://www.w3.org/2001/XMLSchema#dateTime', label: 'xsd:dateTime' },
        ];

        // If schema has an explicit xsd range, pre-select it
        let defaultType = '';
        if (ranges.length > 0) {
            const rangeUri = (state.factory.decode(ranges[0]) as any).value || '';
            if (rangeUri.startsWith('http://www.w3.org/2001/XMLSchema#')) defaultType = rangeUri;
        }

        container.innerHTML = `
            <div class="tam-literal-row">
                <input type="text" id="tam-obj-literal" class="tam-input" placeholder="Enter value..." autocomplete="off" style="flex:1;"/>
                <select id="tam-obj-lang" class="tam-input tam-lang">
                    <option value="">no lang</option>
                    <option value="en">@en</option>
                    <option value="tr">@tr</option>
                    <option value="de">@de</option>
                    <option value="fr">@fr</option>
                </select>
                <select id="tam-obj-type" class="tam-input tam-type">
                    ${xsdTypes.map(t => `<option value="${t.value}" ${t.value === defaultType ? 'selected' : ''}>${t.label}</option>`).join('')}
                </select>
            </div>
        `;

        const litInput = document.getElementById('tam-obj-literal') as HTMLInputElement;
        litInput.addEventListener('input', () => this.updateSaveButton());
    }

    private static renderEntityObjectField(container: HTMLElement, schema: any) {
        const ms = this.ms!;
        const ranges = schema?.ranges || [];
        const rangeUri = ranges.length > 0 ? (state.factory.decode(ranges[0]) as any).value : undefined;

        container.innerHTML = `
            <div class="tam-search-wrap">
                <input type="text" id="tam-obj-entity-input" class="tam-input" placeholder="Search entity..." autocomplete="off"/>
                <div id="tam-obj-entity-dropdown" class="tam-dropdown"></div>
            </div>
            <div id="tam-obj-entity-selected" style="display:none; margin-top:6px;" class="tam-selected-badge">
                <span id="tam-obj-entity-label"></span>
                <button class="tam-clear" id="tam-obj-entity-clear" title="Clear">✕</button>
            </div>
        `;

        const input = document.getElementById('tam-obj-entity-input') as HTMLInputElement;
        const resDiv = document.getElementById('tam-obj-entity-dropdown') as HTMLElement;
        const selectedDiv = document.getElementById('tam-obj-entity-selected')!;
        const selectedLabel = document.getElementById('tam-obj-entity-label')!;
        const clearBtn = document.getElementById('tam-obj-entity-clear')!;

        const sc = new SearchComponent(input, {
            preferredClassURI: rangeUri,
            onSelect: (id, label) => {
                ms.selectedSubjectUri = ms.mode === 'annotation' ? '__focustriple__' : ms.selectedSubjectUri;
                (ms as any).selectedObjectUri = id;
                input.style.display = 'none';
                selectedDiv.style.display = 'flex';
                selectedLabel.textContent = label || id;
                this.updateSaveButton();
            },
            createAction: {
                label: 'Create New Entity',
                onClick: () => { (window as any).createNewEntity?.(); this.close(); }
            }
        }, resDiv);
        this.searchInstances.push(sc);

        clearBtn.onclick = () => {
            (ms as any).selectedObjectUri = null;
            input.style.display = '';
            selectedDiv.style.display = 'none';
            this.updateSaveButton();
        };
    }

    private static bindSubjectField() {
        const ms = this.ms!;
        const input = document.getElementById('tam-subject-input') as HTMLInputElement;
        const resDiv = document.getElementById('tam-subject-dropdown') as HTMLElement;
        const selectedDiv = document.getElementById('tam-subject-selected')!;
        const selectedLabel = document.getElementById('tam-subject-label')!;
        const clearBtn = document.getElementById('tam-subject-clear')!;

        if (!input || !resDiv) return;

        const sc = new SearchComponent(input, {
            onSelect: (id, label) => {
                ms.selectedSubjectUri = id;
                ms.selectedSubjectLabel = label || id;
                input.style.display = 'none';
                resDiv.style.display = 'none';
                selectedDiv.style.display = 'flex';
                selectedLabel.textContent = ms.selectedSubjectLabel;
                this.updateSaveButton();
            },
            createAction: {
                label: 'Create New Entity',
                onClick: () => { (window as any).createNewEntity?.(); this.close(); }
            }
        }, resDiv);
        this.searchInstances.push(sc);

        clearBtn.onclick = () => {
            ms.selectedSubjectUri = null;
            ms.selectedSubjectLabel = null;
            input.style.display = '';
            selectedDiv.style.display = 'none';
            this.updateSaveButton();
        };
    }

    private static updateSaveButton() {
        const ms = this.ms!;
        const btn = document.getElementById('tam-btn-save') as HTMLButtonElement;
        if (!btn) return;

        const hasPredicate = !!ms.selectedPredicateUri;
        const hasSubject = ms.mode === 'annotation'
            ? true
            : !!ms.selectedSubjectUri;

        let hasObject = false;
        if (ms.mode === 'occurrence') {
            hasObject = true; // fixed chip
        } else if (hasPredicate) {
            if (ms.isDataProperty) {
                const litInput = document.getElementById('tam-obj-literal') as HTMLInputElement;
                hasObject = !!litInput?.value?.trim();
            } else {
                hasObject = !!((ms as any).selectedObjectUri);
            }
        }

        btn.disabled = !(hasPredicate && hasSubject && hasObject);
    }

    private static async save() {
        const ms = this.ms!;

        const targetGraph = await this.requestTargetGraph();
        if (targetGraph === null) return; // user cancelled

        state.ensureSession();
        uiState.currentSession = state.currentSession;

        const pUri = ms.selectedPredicateUri!;
        const tripleNode = ms.tripleId;
        const gNode = targetGraph ? (state.factory as any).namedNode(targetGraph) : undefined;

        // Proactive Hydration: Ensure all parts have labels in cache BEFORE they hit UI lists
        const collectIds = (node: bigint) => (state as any).collectDeepIds(node);
        const allIds: bigint[] = [];

        if (ms.mode === 'annotation') {
            const pNode = (state.factory as any).namedNode(pUri);
            let oNode: bigint;
            if (ms.isDataProperty) {
                const litInput = document.getElementById('tam-obj-literal') as HTMLInputElement;
                const langSel = document.getElementById('tam-obj-lang') as HTMLSelectElement;
                const typeSel = document.getElementById('tam-obj-type') as HTMLSelectElement;
                const val = litInput.value.trim();
                const lang = langSel.value || undefined;
                const dtype = typeSel.value || undefined;
                oNode = (state.factory as any).literal(val, dtype, lang);
            } else {
                oNode = (state.factory as any).namedNode((ms as any).selectedObjectUri);
            }
            allIds.push(...collectIds(tripleNode), ...collectIds(pNode), ...collectIds(oNode));
        } else {
            const sNode = (state.factory as any).namedNode(ms.selectedSubjectUri!);
            const pNode = (state.factory as any).namedNode(pUri);
            allIds.push(...collectIds(sNode), ...collectIds(pNode), ...collectIds(tripleNode));
        }
        await KGEntity.ensureMany(Array.from(new Set(allIds)), 'metadata');

        if (ms.mode === 'annotation') {
            // RDF 1.2 Compliant Reification: Use a BNode (Reifier) instead of Triple-as-Subject
            const reifier = state.factory.blankNode();
            const reifiesPred = state.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#reifies');
            
            state.ensureSession();
            state.currentSession!.add(reifier, reifiesPred, tripleNode, gNode);

            if (ms.isDataProperty) {
                const litInput = document.getElementById('tam-obj-literal') as HTMLInputElement;
                const langSel = document.getElementById('tam-obj-lang') as HTMLSelectElement;
                const typeSel = document.getElementById('tam-obj-type') as HTMLSelectElement;
                const val = litInput.value.trim();
                const lang = langSel.value || undefined;
                const dtype = typeSel.value || undefined;

                const pNode = state.factory.namedNode(pUri);
                const oNode = state.factory.literal(val, dtype, lang);

                state.currentSession!.add(reifier, pNode, oNode, gNode);
            } else {
                const objUri = (ms as any).selectedObjectUri as string;
                const pNode = state.factory.namedNode(pUri);
                const oNode = state.factory.namedNode(objUri);

                state.currentSession!.add(reifier, pNode, oNode, gNode);
            }
        } else {
            // occurrence: subject predicate <<focusTriple>>
            // Note: Keeping direct object reference for now as it's common for structural links, 
            // but we could also reify this if needed by the standard.
            const sUri = ms.selectedSubjectUri!;
            const oNode = tripleNode;
            const pNode = state.factory.namedNode(pUri);
            const sNode = state.factory.namedNode(sUri);

            state.ensureSession();
            state.currentSession!.add(sNode, pNode, oNode, gNode);
        }

        if (state.dataSyncMode === 'on') state.dataSync.fullRefresh();
        
        // Ensure graph counts (Draft column) are updated
        if (gNode) {
            state.graphMonitor.incrementGraphCount(gNode, 'draft');
        }

        state.windowManager.refreshAllWindows();
        this.close();
    }

    private static async requestTargetGraph(): Promise<string | null> {
        const stats = state.getGraphStats();
        const options: GraphOption[] = stats
            .filter(g => g.type !== 'inference' && g.type !== 'diff' && g.type !== 'default')
            .map(g => {
                const isUser = g.uri === 'http://example.org/graphs/user';
                return {
                    uri: g.uri,
                    label: isUser ? 'user' : (g.uri.split('/').pop() || 'Untitled'),
                    fullUri: g.logicalURI,
                    type: g.type as string,
                    sourceType: g.sourceType || (isUser ? 'system' : 'local'),
                    location: g.sourceURL || g.filename || 'Internal Database',
                    mainCount: g.mainCount,
                    draftCount: g.draftCount,
                    isDefault: false,
                };
            });


        return GraphSelector.request({
            title: 'Select Destination Graph',
            description: 'Choose which graph to store this triple in.',
            options,
        });
    }


    static close() {
        this.searchInstances.forEach(sc => sc.destroy());
        this.searchInstances = [];
        const el = document.getElementById('tam-overlay');
        if (el) el.remove();
        this.ms = null;
    }
}
