import { state } from '../../runtime/State';
import { GraphMergeDialog } from './GraphMergeDialog';

/**
 * GraphManager - Smart UI Component
 * Responsible for visual exploration and lifecycle management of the triple store's graph collection.
 * Integrates with the repository's stats engine to display quad counts across different stores.
 * 
 * > [!IMPORTANT]
 * > **BigInt Usage:** Graph IDs and Quad counts involve `BigInt`. Use `.toString()` when serializing for external APIs or JSON.
 * 
 * @category UI Components
 */
export class GraphManager {
    private container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
        this.setupGlobalEvents();
        this.bindEvents();
    }

    private setupGlobalEvents() {
        const onRender = () => {
            if (this.container.isConnected) {
                this.render();
            } else {
                state.dataSync.off('sync:complete', onRender);
            }
        };
        state.dataSync.on('sync:complete', onRender);
    }

    public render() {
        const stats = state.getGraphStats();

        this.container.innerHTML = `
            <div class="home-container hero-view" style="max-width:900px; height:auto; overflow:visible;">
                <h1>Graph Manager</h1>
                <div class="manager-body" style="padding:12px 0; text-align:left;">
                    <div id="treeContainer" class="repo-tree" style="max-width: 800px; margin: 0 auto;">
                        ${this.renderRepositoryTree(stats)}
                    </div>
                    
                    <div id="sourceRegistry" class="source-registry" style="max-width: 800px; margin: 40px auto 0 auto; padding-top: 24px; border-top: 1px dashed var(--border-subtle);">
                        <h2 style="font-size: 1.25rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 1.1em;">🌐</span> Source Registry
                        </h2>
                        ${this.renderSourceRegistry(stats)}
                    </div>
                </div>
            </div>
        `;
    }

    private renderRepositoryTree(stats: any[]): string {
        const repoStats = state.getRepoStats();
        const activeSession = state.currentSession;

        const repos = [
            { id: 'main', name: 'MainStore Repository', count: repoStats.main, icon: 'database', color: 'var(--accent-green)' },
            { id: 'diff', name: 'DiffStore (Cumulative Changes)', count: repoStats.diff, icon: 'history', color: 'var(--accent-blue)' }
        ];

        if (activeSession) {
            const draftAdd = activeSession.additions.size;
            const draftDel = activeSession.deletions.size;
            repos.push({ id: 'draft', name: 'DraftStore Repository (Active Session)', count: draftAdd - draftDel, icon: 'edit', color: 'var(--accent-orange)' } as any);
        }

        return repos.map(repo => {
            const categories = this.groupStatsByCategory(stats);
            const totalQuads = repo.count;

            return `
                <details open class="repo-group" style="margin-bottom:12px;">
                    <summary class="repo-header" style="list-style:none; cursor:pointer; display:flex; align-items:center; gap:8px; padding:8px; background:var(--bg-card); border-radius:4px; font-weight:bold;">
                        <span class="symbol" style="color:${repo.color}; font-size:18px;">●</span>
                        <span style="flex:1;">${repo.name}</span>
                        <span class="badge" style="background:${repo.color}22; color:${repo.color}; border:1px solid ${repo.color}44;">${totalQuads} total quads</span>
                    </summary>
                    <div class="repo-content" style="padding-left:24px; margin-top:8px;">
                        ${this.renderCategories(categories, repo.id as any)}
                    </div>
                </details>
            `;
        }).join('');
    }

    private groupStatsByCategory(stats: any[]): Record<string, any[]> {
        const categories: Record<string, any[]> = {
            'System': [],
            'Ontology': [],
            'Data': []
        };

        stats.forEach(s => {
            let cat = 'Data';
            if (s.type === 'default' || s.type === 'diff' || s.type === 'inference') cat = 'System';
            else if (s.type === 'ontology') cat = 'Ontology';

            categories[cat].push(s);
        });

        return categories;
    }

    private renderCategories(categories: Record<string, any[]>, repoId: 'main' | 'diff' | 'draft'): string {
        return Object.entries(categories)
            .filter(([_, items]) => items.length > 0)
            .map(([cat, items]) => {
                const catTotal = items.reduce((acc, s) => {
                    if (repoId === 'main') return acc + (s.mainCount || 0);
                    if (repoId === 'diff') return acc + (s.diffCount || 0);
                    if (repoId === 'draft') return acc + (s.draftCount || 0) - (s.draftDeletions || 0);
                    return acc;
                }, 0);

                return `
                    <details class="cat-group" style="margin-bottom:8px;">
                        <summary class="cat-header" style="list-style:none; cursor:pointer; display:flex; align-items:center; gap:8px; padding:6px; opacity:0.8; font-size:12px; font-weight:600;">
                            <span style="width:12px;">▼</span>
                            <span style="flex:1;">${cat} Category</span>
                            <span style="opacity:0.6;">${catTotal} quads</span>
                        </summary>
                        <div class="cat-content" style="padding-left:24px; border-left:1px solid var(--border-subtle); margin-left:6px;">
                            ${this.renderGraphRows(items, repoId)}
                        </div>
                    </details>
                `;
            }).join('');
    }

    private renderGraphRows(items: any[], repoId: 'main' | 'diff' | 'draft'): string {
        return items.map(s => {
            let count = 0;
            if (repoId === 'main') count = s.mainCount || 0;
            else if (repoId === 'diff') count = s.diffCount || 0;
            else if (repoId === 'draft') count = (s.draftCount || 0) - (s.draftDeletions || 0);

            const displayCount = repoId === 'draft' ?
                (count >= 0 ? `+${count}` : `${count}`) :
                count.toString();

            const isSystem = s.type === 'default' || s.type === 'diff' || s.type === 'inference';

            const tooltipStr = [
                `Logical URI: ${s.logicalURI}`,
                `Internal URI: ${s.uri}`,
                `Type: ${s.type}`,
                s.sourceURL ? `Source URL: ${s.sourceURL}` : null,
                s.filename ? `File: ${s.filename}` : null,
                s.sourceType ? `Source Type: ${s.sourceType}` : null,
                `Writable: ${s.canWrite !== false ? 'Yes' : 'No'}`
            ].filter(Boolean).join('\n');

            return `
                <div class="graph-row" style="display:flex; justify-content:space-between; align-items:center; padding:6px 12px; font-size:12px; border-bottom:1px solid rgba(255,255,255,0.03);" title="${tooltipStr}">
                    <div style="display:flex; flex-direction:column; gap:2px; flex:1; overflow:hidden; padding-right:16px;">
                        <span style="font-family:var(--font-mono); font-size:11px; color:var(--text-main); font-weight:500;" class="text-ellip">${s.uri}</span>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:9px; opacity:0.3; letter-spacing:0.5px;">Type: ${s.type}</span>
                            ${s.sourceType ? `<span style="font-size:8px; padding:1px 4px; border-radius:3px; background:rgba(255,255,255,0.05); color:var(--text-faint);">${s.sourceType}</span>` : ''}
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:20px; flex-shrink:0;">
                        <span style="font-weight:700; font-family:var(--font-mono); font-size:13px; min-width:30px; text-align:right;">${displayCount}</span>
                        ${(!isSystem) ?
                    `
                            <button class="btn-tool btn-move-graph" style="color:var(--accent-orange); padding:4px 8px; font-size:10px; border:1px solid rgba(255,150,50,0.2); border-radius:4px; background:transparent;" data-id="${s.id}" data-uri="${s.uri}">Move</button>
                            <button class="btn-tool btn-delete-graph" style="color:var(--accent-red); padding:4px 8px; font-size:10px; border:1px solid rgba(255,50,50,0.2); border-radius:4px; background:transparent;" data-id="${s.id}">Delete</button>
                            ` :
                    '<span style="width:40px; text-align:center; opacity:0.2; font-size:14px;">-</span>'}
                    </div>
                </div>
            `;
        }).join('');
    }

    private bindEvents() {
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target && target.classList.contains('btn-delete-graph')) {
                const idStr = target.getAttribute('data-id');
                if (idStr) {
                    this.handleDelete(idStr);
                }
            } else if (target && target.classList.contains('btn-move-graph')) {
                const idStr = target.getAttribute('data-id');
                const uri = target.getAttribute('data-uri');
                if (idStr && uri) {
                    GraphMergeDialog.render(BigInt(idStr), uri, () => this.render());
                }
            }
        });
    }

    private renderSourceRegistry(stats: any[]): string {
        const sources = new Map<string, { title: string, type: string, url: string, graphs: string[] }>();

        stats.forEach(s => {
            const key = s.sourceID || s.sourceURL || s.filename || 'local_manual';
            if (!sources.has(key)) {
                sources.set(key, {
                    title: s.sourceTitle || 'Local Source',
                    type: s.sourceType || (s.filename ? 'local' : 'system'),
                    url: s.sourceURL || s.filename || 'Internal Database',
                    graphs: []
                });
            }
            sources.get(key)!.graphs.push(s.uri);
        });

        if (sources.size === 0) return '<p style="font-size:13px; opacity:0.5;">No connected sources found.</p>';

        return `
            <div class="table-container" style="background:var(--bg-card); border-radius:8px; border:1px solid var(--border-subtle); overflow:hidden;">
                <table class="data-table" style="width:100%; border-collapse:collapse; font-size:12px;">
                    <thead style="background:rgba(255,255,255,0.02);">
                        <tr>
                            <th style="padding:12px 10px; text-align:left; border-bottom:1px solid var(--border-subtle); color:var(--text-muted); font-size:11px;">Source Name</th>
                            <th style="padding:12px 10px; text-align:left; border-bottom:1px solid var(--border-subtle); color:var(--text-muted); font-size:11px;">Type</th>
                            <th style="padding:12px 10px; text-align:left; border-bottom:1px solid var(--border-subtle); color:var(--text-muted); font-size:11px;">Location / URL</th>
                            <th style="padding:12px 10px; text-align:left; border-bottom:1px solid var(--border-subtle); color:var(--text-muted); font-size:11px;">Linked Graphs</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Array.from(sources.values()).map(src => `
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.02);">
                                <td style="padding:10px; font-weight:600; color:var(--text-main);">${src.title}</td>
                                <td style="padding:10px;">
                                    <span style="font-size:10px; padding:2px 6px; border-radius:4px; background:rgba(255,255,255,0.05); color:var(--text-muted); border:1px solid rgba(255,255,255,0.1);">
                                        ${src.type}
                                    </span>
                                </td>
                                <td style="padding:10px; font-family:var(--font-mono); font-size:11px; opacity:0.7; color:var(--primary);">${src.url}</td>
                                <td style="padding:10px;">
                                    <div style="display:flex; flex-wrap:wrap; gap:4px;">
                                        ${src.graphs.map(g => `<span style="font-size:9px; background:var(--primary)15; color:var(--primary); padding:1px 4px; border-radius:2px; border:1px solid var(--primary)33;">${g.split('/').pop()}</span>`).join('')}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    private handleDelete(idStr: string) {
        if (confirm('Delete graph?')) {
            state.removeGraph(BigInt(idStr));
            this.render();
        }
    }
}
