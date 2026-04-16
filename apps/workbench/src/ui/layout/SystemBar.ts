import { state } from '../../runtime/State';

/**
 * SystemBar - Application Shell Navigation & Status Bar
 * Manages the global navigation, system health indicators, and context menus.
 * Acts as the top-most layer (z-index: 10000) for consistent access to system actions.
 * 
 * @category UI Layout
 */
export class SystemBar {

    /**
     * Internal state for UI references and stateful menu tracking.
     */
    private static ui = {
        inferenceStatus: null as HTMLElement | null,
        storeSize: null as HTMLElement | null,
        langCurrent: null as HTMLElement | null,
        menus: {
            inference: null as HTMLElement | null,
            lang: null as HTMLElement | null,
            editor: null as HTMLElement | null,
            graphs: null as HTMLElement | null,
            monitor: null as HTMLElement | null
        }
    }

    /**
     * Bootstraps the system bar into the provided container.
     * Binds click and hover listeners for global interactivity.
     * 
     * @param container - Target HTMLElement to host the system bar.
     */
    static render(container: HTMLElement) {
        const lang = state.language === 'en' ? 'EN' : 'TR';

        container.innerHTML = `
            <div class="system-header" id="sys-root">
                <div class="sys-left">
                    <div class="sys-project-name" data-toggle="monitor" style="cursor:pointer; position:relative;">
                        <span data-action="dashboard" title="Go to Dashboard">NektoGraph // WORKBENCH</span>
                        <div id="menu-monitor" class="sys-dropdown" hidden style="min-width: 200px; top:100%; left:0;">
                            <div class="sys-dd-header">System Monitor</div>
                            <div id="sb-monitor-content" style="padding:12px;"></div>
                        </div>
                    </div>

                    <div class="sys-stat" data-action="import" title="Import Data" style="cursor:pointer; color:var(--accent-primary);">
                        <span>Import</span>
                    </div>
                    <div class="sys-stat sys-menu-trigger" data-toggle="editor" style="cursor:pointer; position:relative; color:var(--accent-primary);">
                        <span data-action="start-editor">Editor</span>
                        <div id="menu-editor" class="sys-dropdown" hidden style="min-width: 240px; top:100%; left:0;">
                            <div class="sys-dd-header">Session Status</div>
                            <div id="sb-editor-content" style="padding: 12px; font-size:11px;"></div>
                        </div>
                    </div>
                    <div class="sys-stat" data-action="export" title="Export Data" style="cursor:pointer; color:var(--accent-primary);">
                        <span>Export</span>
                    </div>
                    <div class="sys-stat sys-menu-trigger" data-toggle="graphs" style="cursor:pointer; position:relative; color:var(--accent-primary);">
                        <span data-action="start-graph-manager">Graphs</span>
                        <div id="menu-graphs" class="sys-dropdown" hidden style="min-width: 380px; top:100%; left:0;">
                            <div class="sys-dd-header" style="display:grid; grid-template-columns: 1fr 60px 60px 50px; text-align:right; padding-right:12px;">
                                <span style="text-align:left;">Graph</span>
                                <span>Main</span>
                                <span>Hist</span>
                                <span>Draft</span>
                            </div>
                            <div id="sb-graphs-content"></div>
                        </div>
                    </div>
                    <div class="sys-stat sys-menu-trigger" data-toggle="inference" style="cursor:pointer; position:relative; color:var(--accent-primary);">
                        <span data-action="start-inference">Reasoning</span>
                        <div id="menu-inference" class="sys-dropdown" hidden style="min-width: 260px; top:100%; left:0;">
                            <div class="sys-dd-header">Inference Models</div>
                            <div id="sb-inf-content"></div>
                        </div>
                    </div>
                    <div class="sys-stat" data-action="start-sparql" title="SPARQL Console" style="cursor:pointer; color:var(--accent-primary);">
                        <span>Sparql</span>
                    </div>
                    <div class="sys-stat" data-action="maint-open" title="Maintenance Mode" style="cursor:pointer; color:var(--accent-red); font-weight:700;">
                        <span>Maintenance</span>
                    </div>
                </div>
                
                <div class="sys-center"></div>

                <div class="sys-right">
                    <div class="sys-stat theme-toggle" data-action="toggle-theme" title="Switch to Day/Night" style="cursor:pointer; font-size:14px; margin-right:12px; display:flex; align-items:center;">
                        <span id="sys-theme-icon">🌙</span>
                    </div>
                    <div class="sys-stat sys-menu-trigger" data-toggle="datasync" style="margin-right:12px; cursor:pointer; position:relative;">
                        <span>DataSync:</span><span class="sys-val" id="sb-datasync">${state.dataSyncMode.toUpperCase()}</span><span class="caret">▼</span>
                        <div id="menu-datasync" class="sys-dropdown" hidden style="min-width: 160px; top:100%; right:0;">
                            <div class="sys-dd-header">Synchronization</div>
                            <div class="sys-dd-item ${state.dataSyncMode === 'on' ? 'active' : ''}" data-action="set-datasync" data-val="on"><span class="dot">●</span>Auto-Sync: ON</div>
                            <div class="sys-dd-item ${state.dataSyncMode === 'off' ? 'active' : ''}" data-action="set-datasync" data-val="off"><span class="dot">●</span>Auto-Sync: OFF</div>
                        </div>
                    </div>
                    <div class="sys-stat sys-menu-trigger" data-toggle="lang">
                        <span>LANG:</span><span class="sys-val" id="sb-lang">${lang}</span><span class="caret">▼</span>
                        <div id="menu-lang" class="sys-dropdown" hidden>
                            <div class="sys-dd-header">Display Language</div>
                            <div class="sys-dd-item ${state.language === 'en' ? 'active' : ''}" data-action="set-lang" data-val="en"><span class="dot">●</span>English (EN)</div>
                            <div class="sys-dd-item ${state.language === 'tr' ? 'active' : ''}" data-action="set-lang" data-val="tr"><span class="dot">●</span>Türkçe (TR)</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.cacheElements();
        container.addEventListener('click', this.handleEvent.bind(this));

        this.setupHoverTriggers(container);
    }

    private static setupHoverTriggers(container: HTMLElement) {
        // Delayed hover for all dropdowns to ensure they stay open when moving mouse into the menu
        this.setupDelayedHover(container, 'editor', () => this.updateSessionDropdown());
        this.setupDelayedHover(container, 'graphs', () => this.renderGraphList());
        this.setupDelayedHover(container, 'inference', () => this.renderInferenceList());
        this.setupDelayedHover(container, 'monitor', () => this.renderMonitorList());
    }

    private static setupDelayedHover(container: HTMLElement, name: keyof typeof SystemBar.ui.menus, onOpen: () => void) {
        const trigger = container.querySelector(`[data-toggle="${name}"]`);
        let timeout: any;

        if (trigger) {
            trigger.addEventListener('mouseenter', () => {
                clearTimeout(timeout);
                onOpen();
                this.showMenu(name);
            });

            trigger.addEventListener('mouseleave', () => {
                timeout = setTimeout(() => this.hideMenu(name), 200);
            });

            const menu = document.getElementById(`menu-${name}`);
            if (menu) {
                menu.addEventListener('mouseenter', () => clearTimeout(timeout));
                menu.addEventListener('mouseleave', () => {
                    timeout = setTimeout(() => this.hideMenu(name), 200);
                });
            }
        }
    }

    private static showMenu(name: keyof typeof SystemBar.ui.menus) {
        const menu = this.ui.menus[name];
        if (menu) {
            menu.hidden = false;
            menu.style.display = 'block';
        }
    }

    private static hideMenu(name: keyof typeof SystemBar.ui.menus) {
        const menu = this.ui.menus[name];
        if (menu) {
            menu.hidden = true;
            menu.style.display = 'none';
        }
    }

    private static cacheElements() {
        this.ui.langCurrent = document.getElementById('sb-lang');
        this.ui.menus.inference = document.getElementById('menu-inference');
        this.ui.menus.lang = document.getElementById('menu-lang');
        this.ui.menus.editor = document.getElementById('menu-editor');
        this.ui.menus.graphs = document.getElementById('menu-graphs');
        this.ui.menus.monitor = document.getElementById('menu-monitor');
        (this.ui.menus as any).datasync = document.getElementById('menu-datasync');
    }
    private static handleEvent(e: Event) {
        const target = e.target as HTMLElement;
        const actionEl = target.closest('[data-action]');
        const toggleEl = target.closest('[data-toggle]');
        const menuEl = target.closest('.sys-dropdown');

        if (actionEl || toggleEl || menuEl) {
            e.stopPropagation();
        }

        if (actionEl) {
            const action = actionEl.getAttribute('data-action');
            const val = actionEl.getAttribute('data-val');

            if (action === 'dashboard') (window as any).showDashboard?.();
            if (action === 'import') (window as any).renderImportPage?.();
            if (action === 'export') (window as any).renderExport?.();
            if (action === 'start-editor') (window as any).startEditor?.();
            if (action === 'start-graph-manager') (window as any).renderGraphs?.();
            if (action === 'start-inference') (window as any).renderInference?.();
            if (action === 'start-sparql') (window as any).renderQuery?.();
            if (action === 'maint-open') (window as any).renderMaintenance?.();
            if (action === 'set-lang' && val) {
                (window as any).setLang?.(val);
                this.closeMenus();
            }
            if (action === 'toggle-theme') {
                const iconEl = document.getElementById('sys-theme-icon');
                const currentTheme = iconEl?.innerText === '🌙' ? 'night' : 'day';
                const nextTheme = currentTheme === 'night' ? 'day' : 'night';

                state.windowManager.setTheme(nextTheme);
                if (iconEl) iconEl.innerText = nextTheme === 'night' ? '🌙' : '☀️';
            }
            if (action === 'toggle-module' && val) this.toggleModule(val);
            if (action === 'set-datasync' && val) {
                state.dataSyncMode = val as 'on' | 'off';
                const el = document.getElementById('sb-datasync');
                if (el) el.innerText = val.toUpperCase();
                this.closeMenus();
                if (val === 'on') state.dataSync.fullRefresh();
            }
            return;
        }

        if (toggleEl) {
            const menuName = toggleEl.getAttribute('data-toggle');
            this.toggleMenu(menuName as keyof typeof SystemBar.ui.menus);
            return;
        }

        if (!target.closest('.sys-dropdown') && !target.closest('.sys-menu-trigger')) {
            this.closeMenus();
        }
    }

    private static toggleMenu(name: keyof typeof SystemBar.ui.menus) {
        const menu = this.ui.menus[name];
        if (!menu) return;

        const isHidden = menu.hidden;
        this.closeMenus();

        if (isHidden) {
            this.showMenu(name);
            if (name === 'inference') this.renderInferenceList();
            if (name === 'monitor') this.renderMonitorList();
            if (name === 'editor') this.updateSessionDropdown();
            if (name === 'graphs') this.renderGraphList();
        }
    }

    public static closeMenus() {
        Object.keys(this.ui.menus).forEach(k => this.hideMenu(k as any));
    }

    private static renderInferenceList() {
        const content = document.getElementById('sb-inf-content');
        if (!content) return;

        const infState = state.inference as any;
        if (!infState.getModules) {
            content.innerHTML = '<div class="sys-dd-item mute">Engine Not Ready</div>';
            return;
        }

        const modules = infState.getModules() as Map<string, any>;
        if (modules.size === 0) {
            content.innerHTML = '<div class="sys-dd-item mute">No Modules</div>';
            return;
        }

        const stats = state.getGraphStats();

        content.innerHTML = Array.from(modules.entries()).map(([name, mod]: any) => {
            const isEnabled = infState.isEnabled(name);
            const stat = stats.find(s => s.uri.endsWith('/' + name) || s.uri.endsWith(name));
            const main = stat ? (stat.mainCount || 0) : 0;
            const draft = stat ? (stat.draftCount || 0) : 0;
            const total = main + draft;
            const title = `Total: ${total} | Persistent: ${main} | Session: ${draft}`;

            return `<div class="sys-dd-item" data-action="toggle-module" data-val="${name}" title="${mod.desc || name}">
                <span class="circle" style="background:${isEnabled ? '#22c55e' : '#ef4444'}"></span>
                <span class="flex-1 text-ellip">${name}</span>
                <span class="badge" title="${title}">${total}</span>
            </div>`;
        }).join('');
    }

    private static toggleModule(name: string) {
        const engine = state.inference as any;
        if (engine.isEnabled(name)) {
            engine.disable(name);
        } else {
            engine.enable(name);
            if (state.currentSession) {
                const sessionQuads: any[] = [];
                for (const q of state.currentSession.additions.match(null, null, null, null)) {
                    sessionQuads.push({ subject: q[0], predicate: q[1], object: q[2], graph: q[3] });
                }
                if (sessionQuads.length > 0) {
                    state.inference.inferForSession({ type: 'add', quads: sessionQuads, source: 'user' }, state.currentSession);
                }
            }
        }
        state.dataSync.refreshUI();
        this.renderInferenceList();
    }

    private static updateSessionDropdown() {
        const content = document.getElementById('sb-editor-content');
        if (!content) return;

        const session = state.sessionManager.activeSession;
        if (!session) {
            content.innerHTML = `<span style="color:var(--accent-orange);">● No Active Session</span>`;
        } else {
            content.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="color:var(--accent-green); font-weight:bold;">● Active Session</span>
                    <span style="opacity:0.5; font-size:10px;">${session.id.slice(8, 20)}...</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; justify-content:space-between;">
                        <span>Draft Additions:</span>
                        <span style="color:var(--accent-green); font-weight:600;">+${session.additions.size}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span>Draft Deletions:</span>
                        <span style="color:var(--accent-red); font-weight:600;">-${session.deletions.size}</span>
                    </div>
                </div>
            `;
        }
    }

    private static renderMonitorList() {
        const content = document.getElementById('sb-monitor-content');
        if (!content) return;

        const repoStats = state.getRepoStats();
        content.innerHTML = `
            <div class="sys-dd-sec">System Status</div>
            <div class="sys-dd-item"><span>Server:</span><span class="badge ok-bg">ON</span></div>
            <div class="sys-dd-item"><span>Main Store:</span><span class="badge">${repoStats.main}</span></div>
            <div class="sys-dd-item"><span>Diff Store:</span><span class="badge">${repoStats.diff}</span></div>
            <div class="sys-dd-sec">Version</div>
             <div class="sys-dd-item"><span>Client:</span><span class="badge">Beta v1.0.1</span></div>
        `;
    }

    private static renderGraphList() {
        const content = document.getElementById('sb-graphs-content');
        if (!content) return;

        const stats = state.getGraphStats();
        const typePriority: Record<string, number> = {
            'data': 0,
            'default': 0,
            'ontology': 1,
            'inference': 2
        };

        const sorted = stats.sort((a, b) => {
            const pA = typePriority[a.type] !== undefined ? typePriority[a.type] : 99;
            const pB = typePriority[b.type] !== undefined ? typePriority[b.type] : 99;
            if (pA !== pB) return pA - pB;
            return a.uri.localeCompare(b.uri);
        });

        content.innerHTML = sorted.length === 0 ?
            '<div class="sys-dd-item mute">No graphs loaded</div>' :
            sorted.map((info) => {
                const short = info.uri.replace('http://example.org/graphs/', '');
                const color = info.type === 'ontology' ? '#3b82f6' : info.type === 'inference' ? '#a1a1aa' : '#22c55e';
                const m = info.mainCount || 0;
                const h = info.diffCount || 0;
                const d = (info.draftCount || 0) > 0 ? `<span style="color:var(--accent-green);">+${info.draftCount}</span>` :
                    (info.draftDeletions || 0) > 0 ? `<span style="color:var(--accent-red);">-${info.draftDeletions}</span>` : '-';

                return `<div class="sys-dd-item" style="display:grid; grid-template-columns: 1fr 60px 60px 50px; text-align:right;">
                    <div style="display:flex; align-items:center; text-align:left; overflow:hidden;">
                        <span class="circle" style="background:${color}; flex-shrink:0;"></span>
                        <span class="text-ellip" title="${info.uri}">${short}</span>
                    </div>
                    <span class="badge">${m}</span>
                    <span class="badge" style="background:rgba(59, 130, 246, 0.1); border-color:rgba(59, 130, 246, 0.2);">${h}</span>
                    <span style="font-size:10px; font-weight:700;">${d}</span>
                </div>`;
            }).join('');
    }
}

(window as any).SystemBar = SystemBar;
