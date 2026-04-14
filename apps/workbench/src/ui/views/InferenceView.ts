import { state } from '../../runtime/State';
import { ViewManager } from '../ViewManager';

const INFERENCE_MODULES = [
    { id: 'rdfs-subclass', name: 'SubClassOf', desc: 'Infers type hierarchy based on rdfs:subClassOf.', group: 'RDFS' },
    { id: 'rdfs-subproperty', name: 'SubPropertyOf', desc: 'Infers property hierarchy based on rdfs:subPropertyOf.', group: 'RDFS' },
    { id: 'rdfs-range', name: 'Range', desc: 'Infers object type based on property rdfs:range.', group: 'RDFS' },
    { id: 'rdfs-domain', name: 'Domain', desc: 'Infers subject type based on property rdfs:domain.', group: 'RDFS' },
    { id: 'owl-transitive', name: 'TransitiveProperty', desc: 'Propagates relations across a chain (e.g. ancestor).', group: 'OWL' },
    { id: 'owl-symmetric', name: 'SymmetricProperty', desc: 'Infers inverse relation (e.g. spouse).', group: 'OWL' },
    { id: 'owl-functional', name: 'FunctionalProperty', desc: 'Enforces unique object constraints.', group: 'OWL' },
    { id: 'owl-inverse-functional', name: 'InverseFunctional', desc: 'Enforces unique subject constraints.', group: 'OWL' },
    { id: 'owl-reflexive', name: 'ReflexiveProperty', desc: 'Infers self-relation (e.g. partOf self).', group: 'OWL' },
    { id: 'owl-inverse', name: 'InverseOf', desc: 'Infers inverse relation based on owl:inverseOf schema.', group: 'OWL' }
];

/**
 * InferenceView - Reasoning engine configuration and statistics.
 */
export class InferenceView {
    public static render() {
        const main = ViewManager.getMain();
        ViewManager.clearView(main);

        const container = document.createElement('div');
        container.className = 'view-container';
        container.id = 'inference-view-container';
        container.style.cssText = "height:100%; width:100%; overflow-y:auto; background: var(--bg-app);";
        main.appendChild(container);

        const onRender = () => {
            if (container.isConnected) this.renderContent(container);
            else state.dataSync.off('sync:complete', onRender);
        };
        state.dataSync.on('sync:complete', onRender);

        (window as any).toggleModuleInView = (id: string) => {
            if (state.inference.isEnabled(id)) {
                state.inference.disable(id);
            } else {
                state.inference.enable(id);
            }
            this.renderContent(container);
        };

        this.renderContent(container);
    }

    private static renderContent(container: HTMLElement) {
        const stats = state.getGraphStats().filter(g => g.type === 'inference');
        const activeCount = INFERENCE_MODULES.filter(m => state.inference.isEnabled(m.id)).length;

        container.innerHTML = `
            <div class="home-container hero-view inference-container" style="max-width:900px; height:auto; overflow:visible;">
                <h1>Reasoning Engine</h1>
                <p class="hero-subtitle">Configure RDFS/OWL semantics and monitor real-time inference lifecycle.</p>

                <div class="manager-body" style="padding:12px 0; text-align:left; max-width:800px; margin:0 auto;">
                    
                    ${this.renderGroup('RDFS Semantics', 'RDFS', stats, 'var(--accent-green)')}
                    
                    ${this.renderGroup('OWL 2 RL Semantics', 'OWL', stats, 'var(--accent-blue)')}

                    <div id="engineLifecycle" style="margin-top:40px; padding-top:24px; border-top:1px dashed var(--border-subtle); display:flex; justify-content:center; gap:32px; opacity:0.8;">
                         <div style="display:flex; align-items:center; gap:8px; font-size:11px; color:var(--text-muted);">
                            <span style="width:8px; height:8px; border-radius:50%; background:var(--accent-green); box-shadow:0 0 8px var(--accent-green);"></span>
                            <span>Enference Engine: <b>Active</b></span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px; font-size:11px; color:var(--text-muted);">
                            <span style="font-size:14px;">🧩</span>
                            <span>Active Modules: <b style="color:var(--primary);">${activeCount}</b></span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    private static renderGroup(title: string, groupKey: string, stats: any[], color: string) {
        const modules = INFERENCE_MODULES.filter(m => m.group === groupKey);
        const groupStats = stats.filter(s => modules.some(m => s.uri.endsWith('/' + m.id)));
        const groupQuads = groupStats.reduce((acc, s) => acc + (s.mainCount || 0) + (s.draftCount || 0), 0);

        return `
            <details open class="repo-group" style="margin-bottom:16px;">
                <summary class="repo-header" style="list-style:none; cursor:pointer; display:flex; align-items:center; gap:8px; padding:10px; background:var(--bg-card); border-radius:6px; font-weight:bold; border:1px solid var(--border-subtle); transition: background 0.2s;">
                    <span style="color:${color}; font-size:18px;">●</span>
                    <span style="flex:1; letter-spacing:0.3px;">${title}</span>
                    <span class="badge" style="background:${color}15; color:${color}; border:1px solid ${color}33; padding:2px 8px; border-radius:4px; font-size:10px; font-family:var(--font-mono);">${groupQuads} total quads</span>
                </summary>
                <div style="padding:4px 0 8px 32px; border-left:1px solid var(--border-subtle); margin-left:14px; margin-top:4px;">
                    ${modules.map(m => this.renderModuleRow(m, stats)).join('')}
                </div>
            </details>
        `;
    }

    private static renderModuleRow(m: any, stats: any[]) {
        const enabled = state.inference.isEnabled(m.id);
        const modStat = stats.find(s => s.uri.endsWith('/' + m.id));
        const count = modStat ? (modStat.mainCount || 0) + (modStat.draftCount || 0) : 0;

        return `
            <div class="module-row" style="display:flex; align-items:center; gap:16px; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.03); transition: background 0.1s;">
                <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:2px;">
                        <span style="font-weight:600; font-size:13px; color:${enabled ? 'var(--text-main)' : 'var(--text-muted)'}">${m.name}</span>
                        <span style="font-family:var(--font-mono); font-size:9px; opacity:0.2;">${m.id}</span>
                    </div>
                    <div style="font-size:11px; color:var(--text-faint); line-height:1.4;">${m.desc}</div>
                </div>
                <div style="display:flex; align-items:center; gap:24px; flex-shrink:0;">
                    <div style="text-align:right;">
                        ${count > 0 ? `<span style="font-family:var(--font-mono); font-size:12px; color:var(--accent-green); font-weight:700;">${count}</span>` : '<span style="opacity:0.1; font-size:12px; font-family:var(--font-mono);">0</span>'}
                        <div style="font-size:8px; opacity:0.2; margin-top:2px;">QUADS</div>
                    </div>
                    <div class="module-toggle ${enabled ? 'active' : ''}" onclick="window.toggleModuleInView('${m.id}')" style="transform:scale(0.85); cursor:pointer;">
                        <span class="toggle-knob"></span>
                    </div>
                </div>
            </div>
        `;
    }
}
