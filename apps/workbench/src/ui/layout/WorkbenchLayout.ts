import { state } from '../../runtime/State';
import { uiState } from '../../runtime/UIState';
import { SystemBar } from './SystemBar.ts';
import { SessionDiffView } from '../components/SessionDiffView';
import { EditedEntities } from '../components/EditedEntities';

/**
 * WorkbenchLayout - Application Shell & Layering Engine
 * Manages the top-level DOM structure, layering (Dashboard, Windows, HoverCard),
 * and hydration of the main application workspace.
 * 
 * @category UI Layout
 */
export class WorkbenchLayout {

    static renderAppShell() {
        const app = document.getElementById('app');
        if (!app) return;

        if (app.querySelector('.app-shell')) {
            if (!document.getElementById('entity-hover-card')) {
                const shell = app.querySelector('.app-shell');
                if (shell) {
                    const hc = document.createElement('div');
                    hc.id = 'entity-hover-card';
                    hc.className = 'entity-hover-card';
                    hc.style.display = 'none';
                    shell.appendChild(hc);
                }
            }
            return;
        }

        app.innerHTML = `
        <div class="app-shell">
            <div id="system-header-container"></div>

            <header class="app-header">
                <div class="header-left">
                    <div class="header-tools" id="global-header-tools"></div>
                </div>
                <div class="header-right"></div>
            </header>

            <main id="main-content" class="main-content" style="position:relative; overflow:hidden;">
            </main>
            
            <div id="entity-hover-card" class="entity-hover-card" style="display:none;"></div>
        </div>
        `;

        const sysHeaderContainer = document.getElementById('system-header-container');
        if (sysHeaderContainer) {
            SystemBar.render(sysHeaderContainer);
        }
    }

    static async renderMainContent() {
        const main = document.getElementById('main-content');
        if (!main) return;

        main.querySelectorAll('.view-container').forEach(el => el.remove());

        let dashboardLayer = document.getElementById('dashboard-layer');
        let windowsLayer = document.getElementById('windows-layer');

        if (!dashboardLayer) {
            dashboardLayer = document.createElement('div');
            dashboardLayer.id = 'dashboard-layer';
            dashboardLayer.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; z-index:0; overflow:hidden;';
            main.appendChild(dashboardLayer);
        }

        if (!windowsLayer) {
            windowsLayer = document.createElement('div');
            windowsLayer.id = 'windows-layer';
            windowsLayer.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; pointer-events:none;';
            main.appendChild(windowsLayer);
        }

        if (dashboardLayer) {
            dashboardLayer.style.display = 'block';
        }

        if (windowsLayer) {
            const isMaintMode = !!document.querySelector('.maint-view-layout');
            windowsLayer.style.display = 'block';
            state.windowManager.setContainer('windows-layer');

            const allWins = windowsLayer.querySelectorAll('.wb-window');
            allWins.forEach((winEl: any) => {
                if (isMaintMode) {
                    winEl.style.display = winEl.classList.contains('maint-window') ? 'flex' : 'none';
                } else {
                    winEl.style.display = winEl.classList.contains('maint-window') ? 'none' : 'flex';
                }
            });
        }

        await WorkbenchLayout.renderSessionDashboard(dashboardLayer);
        WorkbenchLayout.renderSessionFooter();
    }

    static renderSessionFooter() {
        const existingFooter = document.getElementById('session-footer');
        if (existingFooter) existingFooter.remove();
    }

    static async renderSessionDashboard(container: HTMLElement) {
        const currentSession = uiState.currentSession;

        let dashboardBase = container.querySelector('.session-dashboard');
        if (!dashboardBase) {
            container.innerHTML = `<div class="session-dashboard"></div>`;
            dashboardBase = container.querySelector('.session-dashboard')!;
        }

        let controlsBar = dashboardBase.querySelector('.session-controls-bar') as HTMLElement;
        if (!controlsBar) {
            dashboardBase.innerHTML = `
                <div class="session-controls-bar" style="background: var(--bg-panel); border-bottom: 1px solid var(--border-subtle); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;"></div>
                <div class="session-body" style="flex:1; display:flex; overflow:hidden;">
                    <div class="session-list" style="width:250px; border-right:1px solid var(--border-subtle); overflow-y:auto;">
                        <div style="padding:12px; border-bottom:1px solid var(--border-subtle); color:var(--text-muted); font-size:11px;">Edited Entities</div>
                        <div id="edited-entities-content"></div>
                    </div>
                    <div class="session-diff" style="display:flex; flex-direction:column; flex:1; overflow:hidden;">
                         <div style="padding:8px; background:#0d1117; color:#8b949e; font-size:11px; border-bottom:1px solid #30363d;">Open Session Diff Quads</div>
                         <div id="session-diff-content" style="flex:1; overflow:hidden;"></div>
                    </div>
                </div>
            `;
            controlsBar = dashboardBase.querySelector('.session-controls-bar') as HTMLElement;
        }

        const sessionControlsHtml = `
            <div style="display:flex; align-items:center; gap:16px;">
                <div style="font-size:13px; font-weight:600; color:${currentSession ? 'var(--accent-green)' : 'var(--text-muted)'}; white-space:nowrap;">
                    ${currentSession ? '● Active Session' : '○ No Session'}
                </div>
                ${currentSession ? `
                    <div style="font-size:11px; color:var(--text-muted); font-family:var(--font-mono); max-width:150px; overflow:hidden; text-overflow:ellipsis;">${currentSession.id}</div>
                    <div style="font-size:11px; white-space:nowrap;">
                        <span style="color:var(--accent-green);">+${currentSession.additions.size}</span>
                        <span style="color:var(--accent-red); margin-left:8px;">-${currentSession.deletions.size}</span>
                    </div>
                ` : ''}
            </div>

            <div id="search-mount-point" style="flex:1; display:flex; justify-content:center; max-width:600px; gap:12px;"></div>

            <div style="display:flex; gap:8px; align-items:center;">
                <div style="display:flex; gap:4px; margin-right:8px; border-right:1px solid var(--border-subtle); padding-right:8px;">
                    <button class="btn-tool" onclick="window.cascadeWindows()" title="Cascade">Cascade</button>
                    <button class="btn-tool" onclick="window.minimizeAllWindows()" title="Minimize All">_ All</button>
                    <button class="btn-tool" style="color:var(--accent-red);" onclick="window.closeAllWindows()" title="Close All">× All</button>
                </div>
                ${currentSession ? `
                    <div style="display:flex; gap:8px;">
                        <button class="btn-tool" style="color:var(--accent-red);" onclick="window.cancelSession('${currentSession.id}')">Discard All</button>
                        <button class="btn-tool" onclick="window.downloadTTL()">Export TTL</button>
                        <button class="btn-tool btn-primary" onclick="window.commitSession('${currentSession.id}')">Commit Changes</button>
                    </div>
                ` : ''}
            </div>
        `;

        controlsBar.innerHTML = sessionControlsHtml;

        let searchShell = document.getElementById('persistent-search-shell');
        if (!searchShell) {
            searchShell = document.createElement('div');
            searchShell.id = 'persistent-search-shell';
            searchShell.style.cssText = 'flex:1; display:flex; justify-content:center; max-width:600px; gap:12px;';
            searchShell.innerHTML = `
                <div class="search-box" style="width:100%; max-width:400px; position:relative;">
                    <span class="search-icon" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); opacity:0.6;">🔍</span>
                    <input type="text" id="searchInput" class="search-input" 
                        placeholder="Search entity..." autocomplete="off"
                        style="width:100%; background:rgba(0,0,0,0.2); border:1px solid var(--border-subtle); border-radius:8px; padding:8px 12px 8px 36px; color:var(--text-main);">
                    <div class="search-dropdown" id="searchDropdown" style="display:none; position:absolute; top:100%; left:0; right:0; z-index:1000; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; max-height:300px; overflow-y:auto; box-shadow:0 8px 24px rgba(0,0,0,0.4);"></div>
                </div>
                <button class="btn-box primary" onclick="window.createNewEntity()" title="Create New Entity" style="white-space:nowrap;">
                    <span class="icon">+</span>
                    <span class="text">New Entity</span>
                </button>
            `;
            (window as any).bindSearchUI?.();
        }

        const mountPoint = controlsBar.querySelector('#search-mount-point');
        if (mountPoint && !mountPoint.contains(searchShell)) mountPoint.appendChild(searchShell);

        // Render Sub-Components
        const entitiesContent = dashboardBase.querySelector('#edited-entities-content') as HTMLElement;
        if (entitiesContent) await EditedEntities.render(entitiesContent);

        const diffContent = dashboardBase.querySelector('#session-diff-content');
        if (diffContent) diffContent.innerHTML = await SessionDiffView.render(currentSession);
    }
}
