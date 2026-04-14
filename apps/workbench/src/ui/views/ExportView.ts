import { state } from '../../runtime/State';
import { SystemBar } from '../layout/SystemBar';

type ExportMode = 'triple' | 'quad';
type ExportFormat = 'Turtle' | 'JSON-LD' | 'N-Triples' | 'N-Quads' | 'TriG';

interface FormatDef {
    label: string;
    ext: string;
    mime: string;
    modes: ExportMode[]; // Supported modes
}

const FORMATS: Record<ExportFormat, FormatDef> = {
    'Turtle': { label: 'Turtle (.ttl)', ext: '.ttl', mime: 'text/turtle', modes: ['triple'] },
    'N-Triples': { label: 'N-Triples (.nt)', ext: '.nt', mime: 'application/n-triples', modes: ['triple'] },
    'N-Quads': { label: 'N-Quads (.nq)', ext: '.nq', mime: 'application/n-quads', modes: ['triple', 'quad'] },
    'TriG': { label: 'TriG (.trig)', ext: '.trig', mime: 'application/trig', modes: ['triple', 'quad'] },
    'JSON-LD': { label: 'JSON-LD (.jsonld)', ext: '.jsonld', mime: 'application/ld+json', modes: ['triple', 'quad'] }
};

/**
 * ExportView: Dedicated UI for RDF serialization and dataset backups.
 * Handles Triple/Quad modes, format selection, and graph-specific filtering.
 */
export function renderExport() {
    setupViewContainer();

    const container = document.querySelector('.view-container') as HTMLElement;
    if (!container) return;

    // View Header & Layout Initialization
    container.innerHTML = `
        <div style="max-width: 1400px; width: 100%; margin: 0 auto;">
            <div class="entity-header">
                <h1 class="entity-title">📤 Export & Backup</h1>
                <p class="entity-desc">Download your Knowledge Graph in standardized RDF formats. Select the appropriate mode (Triples vs Quads) to ensure compatibility.</p>
            </div>

            <div class="card-grid" style="display: flex; flex-direction: column; gap: 24px;">
                <div class="card" id="card-full"></div>
                <div class="card" id="card-ontology"></div>
                <div class="card" id="card-diff"></div>
            </div>
        </div>
    `;

    // Initialize sub-panels
    renderPanel('full', document.getElementById('card-full')!);
    renderPanel('diff', document.getElementById('card-diff')!);
    renderPanel('ontology', document.getElementById('card-ontology')!);
}

/**
 * Renders an export control panel (Full, Ontology, or Diff)
 */
function renderPanel(type: 'full' | 'diff' | 'ontology', root: HTMLElement) {
    let title = '';
    let icon = '';
    let desc = '';
    let defaultFilename = '';

    switch (type) {
        case 'full':
            title = 'Full Quadstore';
            icon = '📚';
            desc = 'Backup entire knowledge graph (excluding Diff).';
            defaultFilename = 'full-backup';
            break;
        case 'ontology':
            title = 'Ontology Export';
            icon = '🧠';
            desc = 'Export only ontology frameworks/schemas.';
            defaultFilename = 'ontology-export';
            break;
        case 'diff':
            title = 'DiffStore (Cumulative Changes)';
            icon = '⚡';
            desc = 'Export only cumulative changes (History).';
            defaultFilename = 'diff-store-export';
            break;
    }

    root.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <div style="font-size: 24px; background: var(--bg-hover); width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">${icon}</div>
            <div>
                <h3 class="card-title">${title}</h3>
                <div class="card-desc" style="font-size: 11px;">${desc}</div>
            </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 12px; font-size: 11px;">
                <label style="font-weight: 700; color: var(--text-muted); min-width: 90px; letter-spacing: 0.5px;">Export Mode:</label>
                <div style="display: flex; gap: 12px;">
                    <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: var(--text-main);">
                        <input type="radio" name="${type}-mode" value="triple" checked> Triples
                    </label>
                    <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: var(--text-main);">
                        <input type="radio" name="${type}-mode" value="quad"> Quads
                    </label>
                </div>
                <div style="margin-left: auto; font-size: 10px; opacity: 0.4; font-style: italic;">
                    Notes: Quads preserve Graph URIs, Triples flat all.
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 12px; font-size: 11px;">
                <label style="font-weight: 700; color: var(--text-muted); min-width: 90px; letter-spacing: 0.5px;">Format:</label>
                <select id="${type}-format" class="form-select" style="max-width: 150px; height: 26px; padding: 0 8px; font-size: 11px;"></select>
                <div id="${type}-format-help" style="margin-left: auto; font-size: 10px; opacity: 0.4; font-style: italic;">
                    Notes: Recommended: Turtle or N-Triples.
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 12px; font-size: 11px;">
                <label style="font-weight: 700; color: var(--text-muted); min-width: 90px; letter-spacing: 0.5px;">Filename:</label>
                <input type="text" id="${type}-filename" class="form-input" value="${defaultFilename}" style="max-width: 200px; height: 26px; font-size: 11px;">
                <div style="margin-left: auto; font-size: 10px; opacity: 0.4; font-style: italic;">
                    Notes: Files saved to Downloads folder.
                </div>
            </div>
        </div>

        <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="font-size: 10px; margin-bottom: 6px; opacity: 0.8; letter-spacing: 1px;">SOURCE GRAPHS</label>
            <div id="${type}-graphs" style="height: 180px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; padding: 4px; background: rgba(0,0,0,0.2);">
                <!-- Populated via JS  -->
            </div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px; display: flex; justify-content: space-between;">
                <span>Select which named graphs to include. Empty graphs hidden.</span>
                <a href="#" id="${type}-select-all" style="color: var(--accent-primary); text-decoration: none; font-weight: 600;">Select All</a>
            </div>
        </div>

        <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 6px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.03);">
            <div style="display: flex; align-items: center; gap: 20px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                     <input type="checkbox" id="${type}-check-base" checked>
                     <label style="font-size: 11px; font-weight: 600; opacity: 0.8;">ENFORCE BASE:</label>
                     <input type="text" id="${type}-base-uri" class="form-input" list="${type}-base-options" style="width: 150px; height: 22px; font-size: 10px; margin: 0;" placeholder="http://example.org/">
                     <datalist id="${type}-base-options">
                         ${[...new Set([...state.baseURIs, ...Object.values(state.prefixes)])].sort().map(uri => `<option value="${uri}"></option>`).join('')}
                     </datalist>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="${type}-check-prefix" checked>
                    <label style="font-size: 11px; font-weight: 600; opacity: 0.8;">INCLUDE PREFIXES</label>
                </div>
                <div id="${type}-base-help" style="margin-left: auto; font-size: 10px; opacity: 0.4; font-style: italic;">
                    Notes: Optimization for import/readability.
                </div>
            </div>
        </div>

        <button id="${type}-btn-export" class="btn-box primary" style="width: 100%; justify-content: center; height: 32px; font-size: 12px; font-weight: 800; letter-spacing: 1px;">
            DOWNLOAD ${title}
        </button>
        <div id="${type}-status" style="margin-top: 12px; padding: 8px; border-radius: 4px; display: none; text-align: center; font-size: 11px;"></div>
    `;

    // DOM References
    const modeRadios = document.querySelectorAll(`input[name="${type}-mode"]`) as NodeListOf<HTMLInputElement>;
    const formatSelect = document.getElementById(`${type}-format`) as HTMLSelectElement;
    const graphContainer = document.getElementById(`${type}-graphs`)!;
    const selectAllBtn = document.getElementById(`${type}-select-all`)!;
    const btnExport = document.getElementById(`${type}-btn-export`)!;
    const baseUriInput = document.getElementById(`${type}-base-uri`) as HTMLInputElement;
    const checkBase = document.getElementById(`${type}-check-base`) as HTMLInputElement;
    const baseHelp = document.getElementById(`${type}-base-help`)!;

    // 1. Graph List Discovery
    const allStats = state.getGraphStats();

    const filteredStats = allStats.filter(g => {
        const count = type === 'diff' ? (g.diffCount || 0) : (g.mainCount || 0);
        if (count === 0) return false;
        if (type === 'ontology') return g.type === 'ontology';
        return true;
    });

    const cats = groupStatsByCategory(filteredStats);

    graphContainer.innerHTML = Object.entries(cats)
        .filter(([_, items]) => items.length > 0)
        .map(([cat, items]) => {
            const catTotal = items.reduce((acc, s) => {
                const c = type === 'diff' ? (s.diffCount || 0) : (s.mainCount || 0);
                return acc + c;
            }, 0);

            const itemsHtml = items.map(graph => {
                const logicalLabel = (graph.logicalURI === '' || !graph.logicalURI) ? '(Default Graph)' : graph.logicalURI;

                let sourceInfo = graph.sourceTitle || '';
                if (graph.sourceType === 'remote' && graph.sourceURL) {
                    sourceInfo = graph.sourceURL;
                } else if (graph.filename) {
                    sourceInfo = graph.filename;
                }

                const sourceLabel = sourceInfo ? `<span style="opacity:0.5; font-size:9px; background:rgba(255,255,255,0.05); padding:1px 4px; border-radius:3px; margin-left:6px; border:1px solid rgba(255,255,255,0.03); max-width:300px; display:inline-block; overflow:hidden; text-overflow:ellipsis; vertical-align:middle;" title="${sourceInfo}">${sourceInfo}</span>` : '';
                const count = type === 'diff' ? (graph.diffCount || 0) : (graph.mainCount || 0);

                return `
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; margin-bottom: 4px; padding-left: 12px;">
                        <input type="checkbox" class="${type}-graph-check" value="${graph.uri}" checked>
                        <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${graph.uri}">
                            <span style="color:var(--text-main);">${logicalLabel}</span>
                            ${sourceLabel}
                        </span>
                        <span style="color: var(--text-muted); font-family:var(--font-mono); opacity:0.6; margin-left:12px;">${count}</span>
                    </div>
                `;
            }).join('');

            return `
                <details class="cat-group" style="margin-bottom:8px;">
                    <summary style="list-style:none; cursor:pointer; display:flex; align-items:center; gap:8px; padding:4px; opacity:0.8; font-size:11px; font-weight:600;">
                        <span>▼</span>
                        <span style="flex:1;">${cat} CATEGORY</span>
                        <span style="opacity:0.6;">${catTotal}</span>
                    </summary>
                    <div style="border-left:1px solid var(--border-subtle); margin-left:6px; padding-top:4px;">
                        ${itemsHtml}
                    </div>
                </details>
            `;
        }).join('');

    // 2. Interaction Bindings
    selectAllBtn.onclick = (e) => {
        e.preventDefault();
        const checkboxes = root.querySelectorAll(`.${type}-graph-check`) as NodeListOf<HTMLInputElement>;
        const allChecked = Array.from(checkboxes).every(c => c.checked);
        checkboxes.forEach(c => c.checked = !allChecked);
    };

    const updateFormats = () => {
        const mode = Array.from(modeRadios).find(r => r.checked)?.value as ExportMode;
        formatSelect.innerHTML = '';

        Object.entries(FORMATS).forEach(([key, def]) => {
            if (def.modes.includes(mode)) {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = def.label;
                formatSelect.appendChild(opt);
            }
        });

        const help = document.getElementById(`${type}-format-help`)!;
        help.textContent = mode === 'triple' ? "Recommended: Turtle or N-Triples." : "Recommended: N-Quads or TriG.";
    };
    modeRadios.forEach(r => r.addEventListener('change', updateFormats));
    updateFormats();

    if (state.baseURIs.length > 0) {
        baseUriInput.value = state.baseURIs[0];
    }

    checkBase.addEventListener('change', () => {
        if (checkBase.checked) {
            baseHelp.textContent = "Notes: Warning: Full URIs enforced. Larger file size.";
            baseHelp.style.color = 'var(--accent-yellow)';
        } else {
            baseHelp.textContent = "Notes: Relative URIs preserved (Smaller).";
            baseHelp.style.color = 'var(--text-muted)';
        }
    });

    btnExport.addEventListener('click', () => {
        executeExport(type);
    });
}

/**
 * Executes serialization and browser download
 */
async function executeExport(type: 'full' | 'diff' | 'ontology') {
    const statusEl = document.getElementById(`${type}-status`)!;
    statusEl.innerHTML = '';
    statusEl.style.display = 'none';

    try {
        const mode = (document.querySelector(`input[name="${type}-mode"]:checked`) as HTMLInputElement).value as ExportMode;
        const formatKey = (document.getElementById(`${type}-format`) as HTMLSelectElement).value as ExportFormat;
        const filename = (document.getElementById(`${type}-filename`) as HTMLInputElement).value || 'export';

        const checkboxes = document.querySelectorAll(`.${type}-graph-check:checked`) as NodeListOf<HTMLInputElement>;
        const selectedGraphs = new Set(Array.from(checkboxes).map(c => c.value));

        if (selectedGraphs.size === 0) throw new Error("No graphs selected for export.");

        const usePrefixes = (document.getElementById(`${type}-check-prefix`) as HTMLInputElement).checked;
        const enforceBase = (document.getElementById(`${type}-check-base`) as HTMLInputElement).checked;
        const baseURI = (document.getElementById(`${type}-base-uri`) as HTMLInputElement).value.trim();

        if (enforceBase && !baseURI) throw new Error("Base URI required for enforcement.");

        statusEl.style.display = 'block';
        statusEl.innerHTML = `⏳ Generating ${formatKey}...`;
        statusEl.style.background = 'var(--bg-hover)';

        // 1. Repository Access Configuration
        const sourceStore = type === 'diff' ? state.diffStore : state.overlay;
        const quads: any[] = [];
        let count = 0;

        const UniversalRDF = (window as any).UniversalRDF;
        if (!UniversalRDF) throw new Error("Export library (UniversalRDF) not found on window.");

        let rdfFactory: any;
        const DF = UniversalRDF.DataFactory;

        // Try direct object (statically providing namedNode etc.)
        if (DF && typeof DF.namedNode === 'function') {
            rdfFactory = DF;
        } 
        // Try constructor pattern
        else if (typeof DF === 'function') {
            try { rdfFactory = new DF(); } catch(e) { rdfFactory = DF; }
        }
        // Try nested DataFactory property
        else if (typeof UniversalRDF === 'object' && UniversalRDF.namedNode) {
            rdfFactory = UniversalRDF;
        }
        else {
            throw new Error("DataFactory instantiation failed. Library structure mismatch.");
        }

        for (const q of sourceStore.match(null, null, null, null)) {
            const graphId = q[3];
            const graphURI = graphId === 0n ? '' : state.factory.decode(graphId).value;

            if (selectedGraphs.has(graphURI)) {
                const graphInfo = state.graphs.get(graphId);
                const logicalURI = graphInfo ? graphInfo.logicalURI : graphURI;

                const finalGraphTerm = mode === 'triple'
                    ? rdfFactory.defaultGraph()
                    : (logicalURI === '' ? rdfFactory.defaultGraph() : rdfFactory.namedNode(logicalURI));

                quads.push(rdfFactory.quad(
                    createSafeTerm(q[0], rdfFactory),
                    createSafeTerm(q[1], rdfFactory),
                    createSafeTerm(q[2], rdfFactory),
                    finalGraphTerm
                ));
                count++;
            }
        }

        if (count === 0) throw new Error("Dataset is empty.");

        // 2. Serialization Stage
        const serializer = new UniversalRDF.UniversalSerializer();
        const cleanPrefixes = { ...state.prefixes };
        if (cleanPrefixes['']) delete cleanPrefixes[''];

        const output = await serializer.serialize(quads, {
            format: formatKey,
            prefixes: usePrefixes ? cleanPrefixes : undefined,
            baseIRI: enforceBase && baseURI ? baseURI : undefined
        });

        // 3. Browser Download Trigger
        const blob = new Blob([output], { type: FORMATS[formatKey].mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}${FORMATS[formatKey].ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        statusEl.innerHTML = `✅ Success! Exported ${count} quads.`;
        statusEl.style.color = 'var(--accent-green)';
        statusEl.style.background = 'rgba(34, 197, 94, 0.1)';

    } catch (e: any) {
        statusEl.innerHTML = `❌ Error: ${e.message}`;
        statusEl.style.color = 'var(--accent-red)';
        statusEl.style.background = 'rgba(239, 68, 68, 0.1)';
    }
}

/**
 * Maps BigInt internal IDs to RDF/JS Terms via specific Data Factory
 */
function createSafeTerm(id: bigint, factory: any): any {
    if (id === 0n) return factory.defaultGraph();
    const t = state.factory.decode(id);

    // RDF-Star: Recursive Quoted Triple support
    if (t.termType === 'Triple') {
        const qt = factory.quad(
            createSafeTerm(t.subject!, factory),
            createSafeTerm(t.predicate!, factory),
            createSafeTerm(t.object!, factory),
            factory.defaultGraph()
        );
        qt.termType = 'Quad';
        return qt;
    }

    if (t.termType === 'BlankNode') {
        const value = (t as any).value || `b${id.toString()}`;
        return factory.blankNode(value);
    }

    if (t.termType === 'NamedNode') return factory.namedNode((t as any).value);
    if (t.termType === 'Literal') {
        return factory.literal(
            (t as any).value, 
            t.language || (t.datatype ? factory.namedNode(t.datatype) : undefined)
        );
    }
    
    return factory.defaultGraph();
}

function groupStatsByCategory(stats: any[]): Record<string, any[]> {
    const categories: Record<string, any[]> = { 'SYSTEM': [], 'ONTOLOGY': [], 'DATA': [] };
    stats.forEach(s => {
        let cat = 'DATA';
        if (s.type === 'default' || s.type === 'diff' || s.type === 'inference') cat = 'SYSTEM';
        else if (s.type === 'ontology') cat = 'ONTOLOGY';
        categories[cat].push(s);
    });
    return categories;
}

function setupViewContainer() {
    SystemBar.closeMenus();
    const main = document.getElementById('main-content');
    if (!main) return;

    ['dashboard-layer', 'windows-layer'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    document.querySelectorAll('.view-container').forEach(el => el.remove());

    const div = document.createElement('div');
    div.className = 'view-container';
    div.style.cssText = "padding: 32px; height: 100%; overflow-y: auto; display: flex; flex-direction: column; background: var(--bg-soft);";
    main.appendChild(div);
}

(window as any).renderExportPage = renderExport;
