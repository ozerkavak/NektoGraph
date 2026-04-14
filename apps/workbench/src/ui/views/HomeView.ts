import { EditorView } from './EditorView';
import { renderExport } from './ExportView';
import { ViewManager } from '../ViewManager';

/**
 * HomeView - The landing page / dashboard of the application.
 */
export class HomeView {
    public static render() {
        const main = ViewManager.getMain();
        ViewManager.clearView(main);

        const container = document.createElement('div');
        container.className = 'view-container';
        container.style.cssText = "height:100%; overflow-y:auto; padding: 2rem;";

        container.innerHTML = `
            <div class="home-container hero-view">
                <h1 class="hero-title">🚀 NektoGraph</h1>
                <p class="hero-subtitle">A lightweight, standalone data con-nektor and knowledge graph quad-storer.</p>
                
                <div class="card-grid">
                    <div id="cardImport" class="card">
                        <div class="card-icon">📥</div>
                        <div class="card-title">Import Data</div>
                        <div class="card-desc">Ingest RDF/TTL files or Ontologies. Includes high-speed parser benchmarking.</div>
                    </div>

                    <div id="cardEditor" class="card card-variant-primary">
                        <div class="card-icon text-primary">✏️</div>
                        <div class="card-title">Knowledge Editor</div>
                        <div class="card-desc">Advanced entity editor with schema-aware intelligent completion and hierarchical view.</div>
                    </div>

                    <div id="cardExport" class="card">
                        <div class="card-icon">📤</div>
                        <div class="card-title">Export Data</div>
                        <div class="card-desc">Export graphs to TTL/N-Quads or manage backups.</div>
                    </div>

                    <div id="cardGraphs" class="card">
                        <div class="card-icon">🏗️</div>
                        <div class="card-title">Graph Manager</div>
                        <div class="card-desc"> Inspect named graphs, view quad counts, and manage dataset lifecycle.</div>
                    </div>
                    
                    <div id="cardQuery" class="card">
                        <div class="card-icon">🔍</div>
                        <div class="card-title">SPARQL Console</div>
                        <div class="card-desc">Execute SPARQL 1.1 queries with syntax highlighting and table view.</div>
                    </div>

                    <div id="cardInference" class="card">
                        <div class="card-icon">🧠</div>
                        <div class="card-title">Reasoning Engine</div>
                        <div class="card-desc">Modular RDFS/OWL rule engine. Toggle rules and visualize inferences.</div>
                    </div>
                </div>
            </div>
        `;

        main.appendChild(container);

        container.querySelector('#cardEditor')?.addEventListener('click', () => EditorView.start());
        container.querySelector('#cardImport')?.addEventListener('click', () => (window as any).renderImportPage?.());
        container.querySelector('#cardExport')?.addEventListener('click', renderExport);
        container.querySelector('#cardGraphs')?.addEventListener('click', () => (window as any).renderGraphs?.());
        container.querySelector('#cardQuery')?.addEventListener('click', () => (window as any).renderQuery?.());
        container.querySelector('#cardInference')?.addEventListener('click', () => (window as any).renderInference?.());
    }
}
