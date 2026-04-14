
import { state } from '../../runtime/State';
import { ViewManager } from '../ViewManager';
import { ImportView } from '../views/ImportView';
import { RemoteLoader } from '../../transport/RemoteLoader';

/**
 * RemoteImportView - Remote Data Bridge
 * A comprehensive interface for connecting to SPARQL endpoints and fetching remote RDF files.
 * Handles protocol switching, graph discovery, and authentication.
 * 
 * @category UI Components
 */
export class RemoteImportView {

    private static PRESETS = [
        {
            name: "Wikidata (SPARQL)",
            url: "https://query.wikidata.org/sparql",
            type: "sparql"
        },
        {
            name: "DBpedia (SPARQL)",
            url: "https://dbpedia.org/sparql",
            type: "sparql"
        }
    ];

    private static storeType: 'triple' | 'quad' = 'triple';
    private static foundGraphs: { uri: string, count: number }[] = [];
    private static abortController: AbortController | null = null;

    /**
     * Renders the Remote Import view into the main content area.
     */
    static render() {
        const main = ViewManager.getMain();
        ViewManager.clearView(main);

        const container = document.createElement('div');
        container.className = 'view-container';
        container.style.cssText = "padding: 12px; height: 100%; overflow-y: auto; background: var(--bg-soft);";

        container.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto; padding-bottom: 30px;">
                <div class="entity-header" style="margin-bottom: 12px; padding-bottom: 8px;">
                    <h1 class="entity-title" style="font-size: 18px; margin-bottom: 4px;">🌐 Remote Import</h1>
                    <p class="entity-desc" style="font-size: 12px; margin-top: 0;">Connect to SPARQL Endpoints or fetch structured data (TTL, N-Quads) from the web.</p>
                </div>
                
                <div class="card" style="padding: 16px; gap: 8px;">
                    <!-- Quick Connection Presets -->
                    <div class="form-group" style="margin-bottom: 8px;">
                        <label class="form-label" style="font-size: 10px; opacity: 0.6; text-transform: uppercase; margin-bottom: 4px;">Connection Presets</label>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            ${this.PRESETS.map(p => `
                                <button class="btn-box btn-preset" data-url="${p.url}" data-type="${p.type}" style="padding: 2px 8px; font-size: 10px; height: 22px;">
                                    ${p.name}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <div style="height: 1px; background: var(--border-subtle); margin: 12px 0;"></div>

                    <!-- Connection Configuration -->
                    <div class="form-group" style="margin-bottom: 8px;">
                        <label class="form-label" style="font-size: 11px;">Target URL / Endpoint</label>
                        <input type="text" id="remoteUrl" class="form-input" placeholder="https://example.org/data.ttl or SPARQL endpoint URL" style="font-size: 12px; height: 28px;">
                    </div>

                    <div class="form-group" style="margin-bottom: 8px;">
                        <label class="form-label" style="font-size: 11px;">Security Credentials (Optional) <span style="font-size: 9px; opacity: 0.5; font-weight: normal; margin-left: 4px;">(Username and Password will be added via HTTP Basic Authentication)</span></label>
                        <div style="display:flex; gap:8px;">
                            <input type="text" id="remoteUser" class="form-input" placeholder="Username" style="flex:1; font-size: 12px; height: 28px;">
                            <input type="password" id="remotePass" class="form-input" placeholder="Password" style="flex:1; font-size: 12px; height: 28px;">
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 12px;">
                        <label class="form-label" style="font-size: 11px;">Import Mode</label>
                        <div style="display:flex; gap:16px; align-items:center; font-size: 12px;">
                            <label class="radio-label"><input type="radio" name="remoteMode" value="auto" checked> <span style="margin-left: 4px;">Auto-Detect</span></label>
                            <label class="radio-label"><input type="radio" name="remoteMode" value="file"> <span style="margin-left: 4px;">Static File</span></label>
                            <label class="radio-label"><input type="radio" name="remoteMode" value="sparql"> <span style="margin-left: 4px;">SPARQL Protocol</span></label>
                        </div>
                    </div>

                    <!-- SPARQL Configuration Panel -->
                    <div id="sparqlPanel" style="display:none; margin-bottom: 12px; padding: 12px; background: rgba(0,0,0,0.15); border-radius: 6px; border: 1px solid var(--border-subtle);">
                        <div style="display:flex; gap:12px; margin-bottom:12px; font-size: 11px;">
                            <label class="radio-label"><input type="radio" name="storeType" value="triple" ${this.storeType === 'triple' ? 'checked' : ''}> <b style="margin-left: 4px;">TripleStore</b></label>
                            <label class="radio-label"><input type="radio" name="storeType" value="quad" ${this.storeType === 'quad' ? 'checked' : ''}> <b style="margin-left: 4px;">QuadStore</b></label>
                        </div>

                         <!-- QuadStore: Graph Selection -->
                        <div id="quadConfig" style="display:${this.storeType === 'quad' ? 'flex' : 'none'}; gap:12px; flex-direction: column;">
                           <div style="display:flex; gap:12px; align-items: center;">
                                <button id="btnFindGraphs" class="btn-box primary" style="height:28px; padding: 0 16px; font-size: 11px;">
                                    <span>🔍 Scan Endpoint for Graphs</span>
                                </button>
                                <div style="flex:1;"></div>
                                <div style="width:110px;">
                                    <label class="form-label" style="font-size:9px; margin-bottom: 2px;">Type 'all' for no limit</label>
                                    <input type="text" id="sparqlLimitQuad" class="form-input" value="1000" style="height: 22px; font-size: 11px;">
                                </div>
                           </div>
                            <div id="graphList" class="graph-scroll-list" style="max-height: 180px;">
                                <p style="opacity:0.4; font-size:10px; text-align:center; padding: 12px;">Initiate scan to select named graphs...</p>
                            </div>
                        </div>

                        <!-- TripleStore: Single Target -->
                        <div id="tripleConfig" style="display:${this.storeType === 'triple' ? 'flex' : 'none'}; gap:12px; align-items:flex-end;">
                            <div style="flex:1;">
                                <label class="form-label" style="font-size: 11px;">Internal Target Graph</label>
                                <input type="text" id="remoteTargetGraph" class="form-input" placeholder="Default: Auto-generated source graph" style="height: 28px; font-size: 12px;">
                            </div>
                            <div style="width:110px;">
                                <label class="form-label" style="font-size:9px; margin-bottom: 2px;">Type 'all' for no limit</label>
                                <input type="text" id="sparqlLimitTriple" class="form-input" value="1000" style="height: 22px; font-size: 11px;">
                            </div>
                        </div>
                    </div>

                    <div id="remoteStatus" class="status-box" style="margin-bottom: 12px; min-height: 22px; padding: 6px 10px; font-size: 11px;"></div>

                    <div style="display:flex; gap:8px;">
                        <button id="btnRemoteCancel" class="btn-box" style="flex:1; justify-content:center; height: 32px; font-size: 13px;">Cancel</button>
                        <button id="btnRemoteFetch" class="btn-box primary" style="flex:1; justify-content:center; font-weight:700; height: 32px; font-size: 13px;">FETCH & IMPORT</button>
                    </div>
                </div>
            </div>
        `;

        main.appendChild(container);
        this.bindEvents(container);
    }

    private static bindEvents(container: HTMLElement) {
        const urlInput = container.querySelector('#remoteUrl') as HTMLInputElement;
        const sparqlPanel = container.querySelector('#sparqlPanel') as HTMLElement;
        const quadConfig = container.querySelector('#quadConfig') as HTMLElement;
        const tripleConfig = container.querySelector('#tripleConfig') as HTMLElement;
        const btnFetch = container.querySelector('#btnRemoteFetch') as HTMLButtonElement;
        const btnFindGraphs = container.querySelector('#btnFindGraphs') as HTMLButtonElement;
        const status = container.querySelector('#remoteStatus') as HTMLElement;
        const graphList = container.querySelector('#graphList') as HTMLElement;

        // Mode Switching
        container.querySelectorAll('input[name="remoteMode"]').forEach(r => {
            r.addEventListener('change', (e: any) => {
                sparqlPanel.style.display = (e.target.value === 'sparql') ? 'block' : 'none';
            });
        });

        // Store Type Switching
        container.querySelectorAll('input[name="storeType"]').forEach(r => {
            r.addEventListener('change', (e: any) => {
                const type = e.target.value;
                this.storeType = type;
                quadConfig.style.display = (type === 'quad') ? 'flex' : 'none';
                tripleConfig.style.display = (type === 'triple') ? 'flex' : 'none';
            });
        });

        // Preset Handlers
        container.querySelectorAll('.btn-preset').forEach((btn: any) => {
            btn.onclick = () => {
                urlInput.value = btn.dataset.url;
                const type = btn.dataset.type;
                container.querySelectorAll('input[name="remoteMode"]').forEach((r: any) => {
                    if (r.value === type) {
                        r.checked = true;
                        r.dispatchEvent(new Event('change'));
                    }
                });
                btnFetch.innerText = 'FETCH & IMPORT';
            };
        });

        // Graph Discovery
        btnFindGraphs.onclick = async () => {
            const url = urlInput.value.trim();
            if (!url) { this.setStatus(status, 'URL is required for scanning.', 'error'); return; }

            const user = (container.querySelector('#remoteUser') as HTMLInputElement).value.trim();
            const pass = (container.querySelector('#remotePass') as HTMLInputElement).value.trim();
            const auth = (user && pass) ? { user, pass } : undefined;

            btnFindGraphs.disabled = true;
            this.setStatus(status, 'Scanning remote endpoint...', 'pending');

            try {
                this.foundGraphs = await RemoteLoader.listGraphs(url, auth);
                this.renderGraphSelection(graphList as HTMLElement);
                this.setStatus(status, `Found ${this.foundGraphs.length} graphs. Select targets below.`, 'success');
            } catch (e: any) {
                this.setStatus(status, `Scan failed: ${e.message}`, 'error');
            } finally {
                btnFindGraphs.disabled = false;
            }
        };

        // Main Fetch Action
        btnFetch.onclick = async () => {
            if (btnFetch.innerText === 'DONE') {
                ImportView.render();
                return;
            }

            const url = urlInput.value.trim();
            if (!url) { this.setStatus(status, 'URL is required.', 'error'); return; }

            const mode = (container.querySelector('input[name="remoteMode"]:checked') as HTMLInputElement).value;
            const user = (container.querySelector('#remoteUser') as HTMLInputElement).value.trim();
            const pass = (container.querySelector('#remotePass') as HTMLInputElement).value.trim();
            const auth = (user && pass) ? { user, pass } : undefined;

            if (this.abortController) this.abortController.abort();
            this.abortController = new AbortController();

            btnFetch.disabled = true;
            this.setStatus(status, 'Connecting to remote source...', 'pending');

            try {
                let rdfContent: string;
                let targetGraph: string | undefined = undefined;
                let ext = 'ttl';
                const signal = this.abortController.signal;

                let actualMode = mode === 'auto' ? (url.toLowerCase().includes('sparql') ? 'sparql' : 'file') : mode;

                if (actualMode === 'sparql') {
                    if (this.storeType === 'quad') {
                        const selected = Array.from(container.querySelectorAll('.graph-checkbox:checked')).map((cb: any) => cb.value);
                        if (selected.length === 0) throw new Error("Please select at least one graph to import.");
                        
                        const limitRaw = (container.querySelector('#sparqlLimitQuad') as HTMLInputElement).value.trim().toLowerCase();
                        const limit = limitRaw === 'all' ? -1 : (parseInt(limitRaw) || 1000);
                        
                        rdfContent = await RemoteLoader.fetchSelectedGraphs(url, selected, limit, auth, signal);
                        ext = 'nq';
                    } else {
                        const limitRaw = (container.querySelector('#sparqlLimitTriple') as HTMLInputElement).value.trim().toLowerCase();
                        const limit = limitRaw === 'all' ? -1 : (parseInt(limitRaw) || 1000);
                        targetGraph = (container.querySelector('#remoteTargetGraph') as HTMLInputElement).value.trim();
                        
                        rdfContent = await RemoteLoader.fetchSparql(url, limit, auth, signal);
                        ext = 'ttl';
                    }
                } else {
                    rdfContent = await RemoteLoader.fetchFile(url, auth, signal);
                    ext = url.split('.').pop() || 'ttl';
                }

                this.setStatus(status, `Importing ${rdfContent.length.toLocaleString()} bytes into store...`, 'pending');
                
                await state.importData(rdfContent, `remote-${Date.now()}.${ext}`, targetGraph, 'data', {
                    sourceURL: url,
                    sourceType: 'remote',
                    auth: auth,
                    canWrite: (actualMode === 'sparql')
                });

                this.setStatus(status, 'Import completed successfully.', 'success');
                btnFetch.innerText = 'DONE';
            } catch (e: any) {
                if (e.name === 'AbortError') {
                    this.setStatus(status, 'Import operation cancelled by user.', 'mute');
                } else {
                    this.setStatus(status, `Import failed: ${e.message}`, 'error');
                }
            } finally {
                btnFetch.disabled = false;
                this.abortController = null;
            }
        };

        (container.querySelector('#btnRemoteCancel') as HTMLElement).onclick = () => {
            if (this.abortController) this.abortController.abort();
            ImportView.render();
        };
    }

    private static renderGraphSelection(container: HTMLElement) {
        container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:2px; padding: 4px;">
                <label class="graph-row active">
                    <input type="checkbox" class="graph-checkbox" value="DEFAULT" checked>
                    <span style="color:var(--accent-primary); font-weight:700;">[Default Graph]</span>
                </label>
                ${this.foundGraphs.map(g => `
                    <label class="graph-row">
                        <input type="checkbox" class="graph-checkbox" value="${g.uri}" checked>
                        <span class="text-ellip" title="${g.uri}">${g.uri}</span>
                        <span class="count-tag">${g.count.toLocaleString()}</span>
                    </label>
                `).join('')}
            </div>
        `;
    }

    private static setStatus(el: HTMLElement, msg: string, type: 'error' | 'success' | 'pending' | 'mute') {
        el.innerText = msg;
        el.className = `status-box ${type}`;
        if (type === 'error') el.style.color = 'var(--accent-red)';
        else if (type === 'success') el.style.color = 'var(--accent-green)';
        else if (type === 'pending') el.style.color = 'var(--accent-primary)';
        else el.style.color = 'var(--text-muted)';
    }
}
