import { state, DEFAULT_USER_GRAPH } from '../../runtime/State';
import { ViewManager } from '../ViewManager';

/**
 * QueryView - SPARQL execution and result visualization.
 * Enhanced with automated target graph detection and selection for write operations.
 */
export class QueryView {
    public static render() {
        const main = ViewManager.getMain();
        ViewManager.clearView(main);

        const container = document.createElement('div');
        container.className = 'view-container';
        container.style.cssText = "height:100%; width:100%; overflow-y:auto; background: var(--bg-app);";
        container.innerHTML = `
            <div class="home-container hero-view query-container" style="height:auto; overflow:visible;">
                <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:24px;">
                   <h1 style="margin:0;">SPARQL Console</h1>
                   <div style="font-size:11px; opacity:0.5; font-family:var(--font-mono);">Engine: SPARQL 1.2 RDF-star</div>
                </div>
                
                <div class="card" style="padding:0; overflow:hidden; border-radius:var(--radius-lg); margin-bottom:24px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                    <textarea id="sparqlInput" style="width:100%; height:200px; background:var(--bg-card); border:none; padding:20px; font-family:var(--font-mono); font-size:14px; resize:vertical; outline:none; line-height:1.5;" spellcheck="false" placeholder="INSERT DATA { ... }">${state.lastSparqlQuery}</textarea>
                    <div style="background:var(--bg-panel); padding:12px 20px; border-top:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center;">
                        <div id="qUpdateTarget" style="font-size:11px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
                           <!-- Target graph indicator will appear here during execution check -->
                        </div>
                        <button id="btnExec" class="btn-primary" style="padding:10px 32px; font-weight:600; font-size:14px; box-shadow: 0 4px 12px var(--shadow-primary);">Execute</button>
                    </div>
                </div>
                
                <div id="qStatus" style="text-align:left; margin-bottom:12px; font-size:13px; min-height:18px; font-weight:500;"></div>
                <div id="qResults"></div>
            </div>
        `;
        main.appendChild(container);

        const input = container.querySelector('#sparqlInput') as HTMLTextAreaElement;
        const btn = container.querySelector('#btnExec') as HTMLButtonElement;
        const status = container.querySelector('#qStatus')!;
        const resultsDiv = container.querySelector('#qResults')!;

        input.addEventListener('input', () => {
            state.lastSparqlQuery = input.value;
        });

        btn.onclick = async () => {
            const queryStr = input.value.trim();
            if (!queryStr) return;

            status.innerHTML = `<span style="color:var(--primary);">Analyzing query...</span>`;
            resultsDiv.innerHTML = '';
            
            try {
                // 1. Parse query to detect type (Using proper SPARQL Parser)
                const parsed = state.parser.parse(queryStr);
                const isUpdate = (parsed as any).type === 'update';
                
                let targetGraphURI: string | undefined;

                // 2. If it's an update, handle graph targeting
                if (isUpdate) {
                    const updateAst = parsed as any;
                    // Check if any operation targets the default graph (empty 'graph' field in operations)
                    const needsDefaultGraph = updateAst.updates.some((op: any) => !op.graph);
                    
                    if (needsDefaultGraph) {
                         targetGraphURI = await this.showGraphPrompt();
                         
                         if (targetGraphURI === null as any) { // User cancelled via close button
                            status.innerHTML = `<span style="color:var(--text-muted);">Operation cancelled. Update requires a target graph.</span>`;
                            return;
                         }
                    }
                }

                status.innerHTML = `<span style="color:var(--primary);">Executing...</span>`;
                const start = performance.now();
                
                const res = await state.executeQuery(queryStr, targetGraphURI);
                status.innerHTML = `<span style="color:var(--accent-green);">Done in ${(performance.now() - start).toFixed(2)}ms. Results: ${res.results.length}</span>`;

                if (res.results.length === 0) {
                    resultsDiv.innerHTML = `
                        <div style="padding:40px; text-align:center; background:var(--bg-card); border-radius:12px; border:1px dashed var(--border-subtle); color:var(--text-muted);">
                           No matching results or update completed successfully.
                        </div>
                    `;
                    return;
                }

                // Render Results Table
                let table = `<div class="table-container" style="animation: slideUp 0.3s ease-out;"><table class="data-table"><thead><tr>`;
                res.variables.forEach(v => table += `<th>?${v}</th>`);
                table += `</tr></thead><tbody>`;

                res.results.forEach(row => {
                    table += `<tr>`;
                    res.variables.forEach(v => {
                        const val = row[v];
                        if (!val) {
                            table += `<td style="opacity:0.3">-</td>`;
                        } else {
                            const isNode = val.termType === 'NamedNode' || val.termType === 'BlankNode';
                            const color = isNode ? 'var(--primary)' : 'var(--accent-green)';
                            table += `<td style="color:${color}; font-weight:500;">${val.value}</td>`;
                        }
                    });
                    table += `</tr>`;
                });
                table += `</tbody></table></div>`;
                resultsDiv.innerHTML = table;

            } catch (e: any) {
                console.error('[QueryView] Execution failed:', e);
                status.innerHTML = `<span style="color:var(--accent-red);">Error: ${e.message}</span>`;
            }
        };
    }

    private static showGraphPrompt(): Promise<string | undefined> {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'maint-modal-overlay';
            modal.style.zIndex = '30000'; // Above everything
            
            // Get data graphs
            const dataGraphs = Array.from(state.graphs.values()).filter(g => g.type === 'data');
            
            modal.innerHTML = `
                <div class="maint-modal" style="width: 500px; max-width: 95vw;">
                    <header class="maint-modal-header">
                        <h3>Target Graph Selection</h3>
                        <button class="btn-close-modal">✕</button>
                    </header>
                    <div class="maint-modal-body" style="padding: 24px;">
                        <!-- Warning Box -->
                        <div style="background: rgba(255, 150, 50, 0.1); border-left: 4px solid var(--accent-orange); padding: 16px; border-radius: 4px; margin-bottom: 24px;">
                            <div style="color: var(--accent-orange); font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                ⚠️ UPDATE CONTEXT WARNING
                            </div>
                            <div style="font-size: 12px; line-height: 1.5; color: var(--text-main); opacity: 0.9;">
                                This SPARQL update targets the <b>Default Graph</b>. Since the store is session-based, you must specify which named graph should receive these changes.
                            </div>
                        </div>

                        <label style="display:block; font-size:12px; color:var(--text-muted); margin-bottom:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Select Active Data Graph</label>
                        <div id="update-graph-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap:10px; margin-bottom:24px; max-height:200px; overflow-y:auto; padding-right:4px;">
                            ${dataGraphs.map(g => `
                                <div class="graph-item-card" data-uri="${g.uri}" style="background:var(--bg-panel); border:1px solid var(--border-subtle); padding:12px; border-radius:8px; cursor:pointer; transition:all 0.2s; position:relative;">
                                    <div style="font-weight:600; font-size:12px; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${g.sourceTitle || g.uri.split('/').pop()}</div>
                                    <div style="font-size:10px; opacity:0.5; font-family:var(--font-mono); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${g.uri}</div>
                                </div>
                            `).join('')}
                        </div>

                        <div style="margin-top:20px;">
                            <label style="display:block; font-size:12px; color:var(--text-muted); margin-bottom:8px; font-weight:600;">OR SPECIFY MANUAL URI</label>
                            <input type="text" id="customTargetInput" class="form-input" style="width:100%;" placeholder="http://example.org/graphs/manual" value="${DEFAULT_USER_GRAPH}">
                        </div>
                    </div>
                    <footer class="maint-modal-footer" style="padding:16px 24px; background:var(--bg-panel);">
                        <button class="btn-tool cancel" style="margin-right:auto;">Use Default Graph</button>
                        <button class="btn-primary" id="btnExecutePrompt" style="padding:8px 24px;">Execute Update</button>
                    </footer>
                </div>
            `;
            
            document.body.appendChild(modal);

            const gridItems = modal.querySelectorAll('.graph-item-card');
            const customInput = modal.querySelector('#customTargetInput') as HTMLInputElement;

            gridItems.forEach(item => {
                (item as HTMLElement).onclick = () => {
                    const uri = (item as HTMLElement).dataset.uri!;
                    customInput.value = uri;
                    gridItems.forEach(i => (i as HTMLElement).style.borderColor = 'var(--border-subtle)');
                    gridItems.forEach(i => (i as HTMLElement).style.background = 'var(--bg-panel)');
                    (item as HTMLElement).style.borderColor = 'var(--primary)';
                    (item as HTMLElement).style.background = 'var(--bg-card)';
                };
            });

            const finalize = (val?: string) => {
                modal.remove();
                resolve(val);
            };

            (modal.querySelector('.btn-close-modal') as HTMLElement).onclick = () => resolve(null as any);
            (modal.querySelector('.cancel') as HTMLElement).onclick = () => finalize(undefined);
            
            (modal.querySelector('#btnExecutePrompt') as HTMLElement).onclick = () => {
                finalize(customInput.value.trim() || undefined);
            };
        });
    }
}
