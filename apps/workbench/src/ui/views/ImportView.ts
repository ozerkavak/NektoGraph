/**
 * ImportView Module - Handles local and remote RDF ingestion logic.
 */
import { state, ONTOLOGY_GRAPH_URI } from '../../runtime/State';
import { ViewManager } from '../ViewManager';

/**
 * ImportView - Handles local and remote RDF data ingestion.
 */
export class ImportView {
    private static importTarget: 'ontology' | 'data' = 'data';

    public static render() {
        const main = ViewManager.getMain();
        ViewManager.clearView(main);

        const container = document.createElement('div');
        container.className = 'view-container';
        container.style.cssText = "height:100%; width:100%; overflow-y:auto;";
        container.innerHTML = `
            <div class="home-container import-container" style="height:auto; overflow:visible;">
                <h1>📥 Data Import</h1>
                <p class="hero-subtitle">Select ingestion target</p>
                
                <div class="import-grid">
                    <button id="btnOntology" class="card card-center">
                        <span class="icon-large">🏛️</span>
                        <span style="font-weight:600; color:var(--text-main);">Ontology</span>
                    </button>
                    <button id="btnRDF" class="card card-center">
                        <span class="icon-large">📄</span>
                        <span style="font-weight:600; color:var(--text-main);">Instance Data</span>
                    </button>
                    <button id="btnRemote" class="card card-center">
                        <span class="icon-large">🌐</span>
                        <span style="font-weight:600; color:var(--text-main);">Remote / URL</span>
                    </button>
                </div>
                <input type="file" id="fileInput" style="display: none;" multiple />
            </div>
        `;
        main.appendChild(container);
 
        const fileInput = container.querySelector('#fileInput') as HTMLInputElement;
        const handleFile = (type: 'ontology' | 'data') => {
            this.importTarget = type;
            fileInput.click();
        };
 
        container.querySelector('#btnOntology')?.addEventListener('click', () => handleFile('ontology'));
        container.querySelector('#btnRDF')?.addEventListener('click', () => handleFile('data'));
        container.querySelector('#btnRemote')?.addEventListener('click', async () => {
            const { RemoteImportView } = await import('../components/RemoteImportView');
            RemoteImportView.render();
        });
 
        fileInput.addEventListener('change', (e) => {
            const files = Array.from((e.target as HTMLInputElement).files || []);
            if (files.length === 0) return;
            
            const firstFile = files[0];
            const uri = this.importTarget === 'ontology' ? ONTOLOGY_GRAPH_URI : `http://example.org/graphs/source/${firstFile.name.replace(/\s+/g, '')}/${Date.now()}`;
            this.renderVerify(files, uri);
            fileInput.value = '';
        });
    }
 
    private static renderVerify(files: File[], defaultURI: string) {
        const main = ViewManager.getMain();
        ViewManager.clearView(main);

        const container = document.createElement('div');
        container.className = 'view-container';
        container.style.cssText = "height:100%; width:100%; overflow-y:auto;";
        
        container.innerHTML = `
            <div class="home-container verify-container">
                <h1>Confirm Import</h1>
                <div class="card" style="text-align:left; cursor:default; margin-top:24px;">
                    <div class="form-group">
                        <label class="form-label">Selection (${files.length} items)</label>
                        <div class="static-val" style="font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${files.map(f => f.name).join(', ')}
                        </div>
                        <div style="font-size:12px; color:var(--text-subtle); margin-top:4px;">Total Size: ${(files.reduce((a, b) => a + b.size, 0) / 1024).toFixed(2)} KB</div>
                    </div>
 
                    <div class="form-group">
                        <label class="form-label">Target Graph URI (Root)</label>
                        <input type="text" id="targetGraphURI" class="form-input" value="${defaultURI}">
                        <p style="font-size:11px; margin-top:4px; color:var(--text-subtle);">Base URI for the import. For data batches, files may be grouped.</p>
                    </div>
                    
                    <div class="form-group" style="flex-direction:row; align-items:center; margin-bottom:16px;">
                        <input type="checkbox" id="checkPreserve" style="margin-right:8px;" checked>
                        <label for="checkPreserve" class="form-label" style="margin-bottom:0; cursor:pointer;">Preserve Named Graphs</label>
                    </div>
                    <p style="font-size:11px; color:var(--text-subtle); margin-left:24px; margin-top:-10px; margin-bottom:16px;">
                        If checked, data will be imported into graphs defined within each file. 
                    </p>
 
                    <div id="status" style="margin-bottom:16px; font-size:13px; min-height:20px;"></div>
 
                    <div style="display:flex; gap:8px;">
                        <button id="btnCancel" class="btn-tool" style="flex:1; justify-content:center;">Cancel</button>
                        <button id="btnRun" class="btn-tool btn-primary" style="flex:1; justify-content:center;">Start Ingestion</button>
                    </div>
                </div>
            </div>
        `;
 
        main.appendChild(container);
 
        const btnCancel = container.querySelector('#btnCancel') as HTMLButtonElement;
        const btnRun = container.querySelector('#btnRun') as HTMLButtonElement;
        const input = container.querySelector('#targetGraphURI') as HTMLInputElement;
        const checkPreserve = container.querySelector('#checkPreserve') as HTMLInputElement;
        const status = container.querySelector('#status')!;
 
        input.disabled = true;
        input.style.opacity = '0.5';
 
        checkPreserve.addEventListener('change', () => {
             if (checkPreserve.checked) {
                 input.disabled = true;
                 input.style.opacity = '0.5';
             } else {
                 input.disabled = false;
                 input.style.opacity = '1';
             }
        });
 
        btnCancel.onclick = () => this.render();
 
        btnRun.onclick = async () => {
            const target = input.value.trim();
            const preserve = checkPreserve.checked;
 
            if (!preserve && !target) {
                status.innerHTML = `<span style="color:var(--accent-red);">⚠️ Please enter a target graph URI or check "Preserve Named Graphs"</span>`;
                return;
            }
 
            btnRun.innerText = 'Importing Batch...';
            btnRun.disabled = true;
            btnCancel.disabled = true;
            if (!preserve) input.disabled = true;
            checkPreserve.disabled = true;
 
            let totalTriples = 0;
            const startAll = performance.now();
 
            for(let i=0; i<files.length; i++) {
                const file = files[i];
                status.innerHTML = `<span style="color:var(--primary);">⏳ [${i+1}/${files.length}] Processing: ${file.name}...</span>`;
                
                try {
                    const content = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.onerror = reject;
                        reader.readAsText(file);
                    });
 
                    const intendedType = this.importTarget;
                    // For batch data, if multiple files and no preserve, we append a suffix or just use the target
                    const fileTarget = preserve ? undefined : (files.length > 1 ? `${target}` : target);
                    
                    const res = await state.importData(content, file.name, fileTarget, intendedType);
                    totalTriples += res.triples;
                } catch (err: any) {
                    console.error(err);
                    status.innerHTML = `<span style="color:var(--accent-red);">❌ Error in ${file.name}: ${err.message || err}</span>`;
                    btnRun.innerText = "Resume / Try Again";
                    btnRun.disabled = false;
                    btnCancel.disabled = false;
                    return;
                }
            }
 
            status.innerHTML = `<span style="color:var(--accent-green);">✅ Success: ${totalTriples} total quads in ${(performance.now() - startAll).toFixed(2)}ms</span>`;
            btnRun.innerText = "Done - Return";
            btnRun.disabled = false;
            btnRun.onclick = () => this.render();
        };
    }
}
