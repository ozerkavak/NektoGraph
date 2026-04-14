import { state } from './runtime/State';
import { EditorView } from './ui/views/EditorView';
import { WorkbenchLayout } from './ui/layout/WorkbenchLayout';
import { renderExport } from './ui/views/ExportView';
import { MaintenanceView } from './ui/views/MaintenanceView';
import { HoverCard } from '@triplestore/hover';
import { HoverAdapter } from './ui/services/hover_adapter';

import { HomeView } from './ui/views/HomeView';
import { ImportView } from './ui/views/ImportView';
import { GraphView } from './ui/views/GraphView';
import { QueryView } from './ui/views/QueryView';
import { InferenceView } from './ui/views/InferenceView';

import { ViewManager } from './ui/ViewManager';

export function getMain() {
    return ViewManager.getMain();
}

export function clearView(main: HTMLElement) {
    ViewManager.clearView(main);
}

let isUiInitialized = false;

export function renderDashboard() {
    if (!isUiInitialized) {
        WorkbenchLayout.renderAppShell();
        EditorView.init();
        MaintenanceView.init();
        HoverCard.init({
            entityResolver: (uri: string) => HoverAdapter.resolveEntity(uri)
        });
        isUiInitialized = true;
    }
    HomeView.render();
}

/**
 * Maintenance View Orchestration
 */
export function renderMaintenance() {
    const main = getMain();
    WorkbenchLayout.renderMainContent();
    clearView(main);

    const container = document.createElement('div');
    container.className = 'view-container';
    container.style.cssText = "height:100%; width:100%; overflow:hidden; background: var(--bg-app);";
    main.appendChild(container);

    const wins = document.getElementById('windows-layer');
    if (wins) {
        wins.style.display = 'block';
        state.windowManager.setContainer('windows-layer');
        MaintenanceView.render(container);
        wins.querySelectorAll('.wb-window').forEach((winEl: any) => {
            winEl.style.display = winEl.classList.contains('maint-window') ? 'flex' : 'none';
        });
    }
}

// Global API Bindings for Legacy HTML Compatibility
(window as any).renderLandingPage = renderDashboard;
(window as any).startEditor = () => EditorView.start();
(window as any).renderGraphs = () => GraphView.render();
(window as any).renderInference = () => InferenceView.render();
(window as any).renderQuery = () => QueryView.render();
(window as any).renderExport = renderExport;
(window as any).renderImportPage = () => ImportView.render();
(window as any).MaintenanceModule = MaintenanceView;
(window as any).renderMaintenance = renderMaintenance;

state.schemaIndex.buildIndex();
