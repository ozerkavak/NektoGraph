import { state } from '../../runtime/State';
import { NodeID, Quad } from '@triplestore/core';
import { EntityManager, TransactionWrapper } from '@triplestore/maintenance';
import { KGEntity } from '../services/kg_entity';
import { SearchComponent } from '../components/SearchComponent';
import { RemoteLoader } from '../../transport/RemoteLoader';
import { EntityRenderer } from '../components/EntityRenderer';
import '../maintenance.css';

export class MaintenanceView {
    private static container: HTMLElement | null = null;
    private static manager: EntityManager;
    private static history: TransactionWrapper;
    private static bulkList: Set<string> = new Set();
    private static recentGraphs: string[] = [];
    private static lastInspectedNode: NodeID | null = null;
    private static activeWindowId: string | null = null;

    public static init() {

        this.manager = new EntityManager(state.store);
        this.history = new TransactionWrapper(state.store);

        (window as any).maint_openEntity = (id: string) => this.showEntityWindow(state.factory.namedNode(id));
        (window as any).maint_eraseEntity = (id: string, cascade: boolean) => this.handleErase(state.factory.namedNode(id), cascade);
        (window as any).maint_moveEntity = (id: string, strategy: 'full' | 'outgoing') => this.handleMove(state.factory.namedNode(id), strategy);
        (window as any).maint_deleteQuad = (s: string, p: string, o: string, g: string) => this.handleDeleteQuad(s, p, o, g);
        (window as any).maint_moveQuad = (s: string, p: string, o: string, g: string) => this.handleMoveQuad(s, p, o, g);
        (window as any).maint_undo = () => this.handleUndo();
        (window as any).maint_redo = () => this.handleRedo();
        (window as any).maint_addToBulk = (id: string) => this.addToBulk(id);
        (window as any).maint_removeFromBulk = (id: string) => this.removeFromBulk(id);
        (window as any).maint_executeBulk = (action: 'delete_out' | 'delete_all' | 'move_full' | 'move_out') => this.handleBulkAction(action);
    }

    public static render(container: HTMLElement) {
        if (state.sessionManager.activeSession) {
            container.innerHTML = `
                <div style="padding:40px; text-align:center;">
                    <h2 style="color:var(--accent-orange);">⚠️ Session Active</h2>
                    <p style="color:var(--text-muted); margin-top:12px;">Maintenance Mode requires all active sessions to be closed.<br>Please commit or cancel your current session first.</p>
                    <button class="btn-tool" style="margin-top:20px;" onclick="startEditor()">Go to Editor</button>
                </div>
            `;
            return;
        }

        this.container = container;
        this.container.innerHTML = this.renderMaintenanceView();

        this.bindSearch();
        this.renderBulkList();
    }

    private static renderMaintenanceView() {
        return `
            <div class="maint-view-layout">
                <header class="maint-header">
                    <div class="maint-title">
                        <span class="maint-icon">🛠️</span>
                        <div class="maint-text">
                            <h1>Maintenance Mode</h1>
                            <p>Direct Store Manipulation • Session-Free Layer</p>
                        </div>
                    </div>
                    <div class="maint-controls">
                        <button class="btn-tool" onclick="maint_undo()" title="Undo Action">↩️ Undo</button>
                        <button class="btn-tool" onclick="maint_redo()" title="Redo Action">↪️ Redo</button>
                    </div>
                </header>

                <div class="maint-vertical-layout">
                    <div class="maint-panel search-panel">
                        <div class="panel-header"><h3>Entity Lookup</h3></div>
                        <div class="maint-search-box">
                            <label>Find and Open Entity</label>
                            <div style="position:relative; margin-top:8px;">
                                <input type="text" id="maint-search-input" class="form-input" placeholder="Search URI or Label...">
                                <div id="maint-search-results" class="unified-dropdown" style="display:none; position:absolute; width:100%; z-index:1000;"></div>
                            </div>
                        </div>
                    </div>

                    <div class="maint-panel bulk-panel">
                        <div class="panel-header">
                            <h3>Bulk Maintenance</h3>
                            <button class="btn-mini" onclick="document.getElementById('maint-bulk-text').value=''; MaintenanceView.syncBulkFromText()">Clear</button>
                        </div>
                        <textarea id="maint-bulk-text" class="maint-bulk-area" placeholder="Paste comma separated IDs (Short IDs or URIs)..." oninput="MaintenanceView.syncBulkFromText()"></textarea>
                        <div id="maint-bulk-stats" class="bulk-stats">0 Items Selected</div>
                        
                        <div class="maint-action-grid">
                            <div class="maint-chip-wrapper">
                                <button class="maint-chip-btn erase" onclick="maint_executeBulk('delete_out')">Erase All Outgoing</button>
                                <div class="maint-infobox">Delete only outgoing connections (Subject) for all selected entities.</div>
                            </div>
                            <div class="maint-chip-wrapper">
                                <button class="maint-chip-btn erase" onclick="maint_executeBulk('delete_all')">Erase All Both</button>
                                <div class="maint-infobox">Delete all connections (Subject & Object) for all selected entities.</div>
                            </div>
                            <div class="maint-chip-wrapper">
                                <button class="maint-chip-btn move" onclick="maint_executeBulk('move_out')">Move All Outgoing</button>
                                <div class="maint-infobox">Move only outgoing connections to the target graph for all selected entities.</div>
                            </div>
                            <div class="maint-chip-wrapper">
                                <button class="maint-chip-btn move" onclick="maint_executeBulk('move_full')">Move All Both</button>
                                <div class="maint-infobox">Move all connections to the target graph for all selected entities.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    public static showEntityWindow(id: NodeID) {
        this.lastInspectedNode = id;

        const decodedUri = state.factory.decode(id).value;
        const win = state.windowManager.create(
            decodedUri,
            'Entity Maintenance',
            (container) => {
                container.innerHTML = `<div id="maint-window-body" class="maint-modal-body"><div class="loading-spinner">Loading...</div></div>`;
                const body = container.querySelector('#maint-window-body') as HTMLElement;
                this.inspectEntityInWindow(id, body);
            },
            undefined,
            'maintenance'
        );

        this.activeWindowId = win.id;
        win.element.classList.add('maint-window');
        win.setBounds({ x: 100, y: 100, width: 850, height: 700 });
        win.bringToFront();
    }

    private static bindSearch() {
        const input = document.getElementById('maint-search-input') as HTMLInputElement;
        const results = document.getElementById('maint-search-results') as HTMLElement;

        new SearchComponent(input, {
            onSelect: (id) => {
                this.showEntityWindow(state.factory.namedNode(id));
            }
        }, results);
    }

    private static refreshActiveModal() {
        if (!this.lastInspectedNode || !this.activeWindowId) return;
        const win = state.windowManager.getWindow(this.activeWindowId);
        if (!win) return;
        const body = win.content.querySelector('#maint-window-body') as HTMLElement;
        this.inspectEntityInWindow(this.lastInspectedNode, body);
    }

    private static async inspectEntityInWindow(id: NodeID, targetContainer?: HTMLElement) {
        const container = targetContainer || document.getElementById('maint-window-body');
        if (!container) return;
        container.innerHTML = `<div class="loading-spinner">Loading connections...</div>`;

        const kg = await KGEntity.loadForDisplay(id);
        const connections = this.manager.findConnections(id);

        const graphsUsed = new Set<bigint>();
        [...connections.incoming, ...connections.outgoing].forEach(q => graphsUsed.add(q.graph));

        let provenanceHtml = Array.from(graphsUsed).map(g => {
            return `<div class="provenance-tag">${state.factory.decode(g).value.split('/').pop()}</div>`;
        }).join('');

        const decodedUri = state.factory.decode(id).value;

        container.innerHTML = `
            <div class="maint-entity-container in-window">
                <header class="maint-entity-header">
                    <div class="provenance-bar">${provenanceHtml}</div>
                    <div class="entity-identity">
                        <h2>${kg.getDisplayName()}</h2>
                        <code style="word-break: break-all;">${decodedUri}</code>
                    </div>
                    
                    <div class="maint-action-grid">
                         <div class="maint-chip-wrapper">
                            <button class="maint-chip-btn bulk" onclick="maint_addToBulk('${decodedUri}')">+ Bulk</button>
                            <div class="maint-infobox">Add entity to the bulk processing list.</div>
                        </div>

                        <div class="maint-chip-wrapper">
                            <button class="maint-chip-btn erase" onclick="maint_eraseEntity('${decodedUri}', false)">Erase Outgoing</button>
                            <div class="maint-infobox">Delete the entity and its outgoing connections (Subject).</div>
                        </div>
                        
                        <div class="maint-chip-wrapper">
                            <button class="maint-chip-btn erase" onclick="maint_eraseEntity('${decodedUri}', true)">Erase Both</button>
                            <div class="maint-infobox">Delete the entity and all its connections (Subject & Object).</div>
                        </div>

                        <div class="maint-chip-wrapper">
                            <button class="maint-chip-btn move" onclick="maint_moveEntity('${decodedUri}', 'outgoing')">Move Outgoing</button>
                            <div class="maint-infobox">Move the entity and its outgoing connections to target graph.</div>
                        </div>

                        <div class="maint-chip-wrapper">
                            <button class="maint-chip-btn move" onclick="maint_moveEntity('${decodedUri}', 'full')">Move Both</button>
                            <div class="maint-infobox">Move the entity and all its connections to target graph.</div>
                        </div>
                    </div>
                </header>
                
                <div class="maint-property-list">
                    ${this.renderMaintenanceRows(connections)}
                </div>
                </div>
            </div>
        `;
    }

    private static renderMaintenanceRows(connections: { incoming: Quad[], outgoing: Quad[] }) {

        const props = new Map<string, { label: string, values: any[] }>();

        connections.outgoing.forEach(q => {
            const pUri = state.factory.decode(q.predicate).value;
            if (!props.has(pUri)) props.set(pUri, { label: KGEntity.get(q.predicate).getDisplayName(), values: [] });
            props.get(pUri)!.values.push({ quad: q, isIncoming: false });
        });

        connections.incoming.forEach(q => {
            const pUri = state.factory.decode(q.predicate).value;
            if (!props.has(pUri)) props.set(pUri, { label: KGEntity.get(q.predicate).getDisplayName(), values: [] });
            props.get(pUri)!.values.push({ quad: q, isIncoming: true });
        });

        let html = '';
        props.forEach((data, _pUri) => {
            html += `
                <div class="maint-row">
                    <div class="maint-prop-column">
                        <span class="maint-p-label">${data.label}</span>
                    </div>
                    <div class="maint-prop-values" style="display:flex; flex-direction:column; gap:6px;">
                        ${data.values.map(v => this.renderMaintValue(v)).join('')}
                    </div>
                </div>
            `;
        });
        return html;
    }

    private static renderMaintValue(v: { quad: Quad, isIncoming: boolean }) {
        const valId = v.isIncoming ? v.quad.subject : v.quad.object;
        const valToken = state.factory.decode(valId);
        
        let displayVal: string;
        let isTriple = false;
        let chipClass = 'chip';

        if (valToken.termType === 'Triple') {
            displayVal = EntityRenderer.renderTripleValue(valId);
            isTriple = true;
            chipClass = 'chip-triple';
        } else if (valToken.termType === 'NamedNode') {
            displayVal = KGEntity.get(valId).getDisplayName();
            chipClass = 'chip clickable-chip link';
        } else {
            displayVal = valToken.value;
            chipClass = 'chip';
        }

        const q = v.quad;
        const args = `'${q.subject}', '${q.predicate}', '${q.object}', '${q.graph}'`;

        // --- Graph & Styling Decisions ---
        const gInfo = state.graphs.get(q.graph);
        const gName = gInfo?.uri.split('/').pop() || 'Unknown';
        
        // Align chip-style with source type
        if (gInfo?.type === 'ontology') chipClass += ' src-ont';
        else if (gInfo?.type === 'inference') chipClass += ' src-inf';
        else if (gInfo?.type === 'data') chipClass += ' src-data';

        const typeColor = gInfo?.type === 'ontology' ? '#3b82f6' : (gInfo?.type === 'inference' ? '#a855f7' : '#22c55e');

        // Language tag for literals
        let langTag = '';
        if (valToken.termType === 'Literal' && (valToken as any).language) {
            langTag = `<span class="lang-tag" style="background:rgba(255,255,255,0.1); font-size:9px; padding:1px 4px; border-radius:2px; margin-left:6px; opacity:0.7;">@${(valToken as any).language}</span>`;
        }

        return `
            <div class="maint-value-chip ${v.isIncoming ? 'incoming' : 'outgoing'} ${isTriple ? 'chip-compound' : ''}" data-id="${valId.toString()}" data-node-id="${valId.toString()}" data-kind="entity">
                <span class="maint-direction" style="margin-right:8px;">${v.isIncoming ? '←' : '→'}</span>
                
                <span class="${chipClass}" style="min-width: fit-content; max-width: 60%; overflow:hidden;">
                    <span class="chip-label">${displayVal}</span>
                    ${langTag}
                </span>

                <div class="graph-info-stack" style="margin-left: auto; margin-right: 12px; align-items: flex-end;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="te-gname" style="color:${typeColor}">${gName}</span>
                        <span class="te-gtype">${gInfo?.type || 'data'}</span>
                    </div>
                    <div class="te-guri">${gInfo?.uri || 'Unknown'}</div>
                </div>


                <div class="maint-val-actions">
                    <button class="btn-maint-action" onclick="maint_moveQuad(${args})" title="Move Quad">🔗</button>
                    <button class="btn-maint-action delete" onclick="maint_deleteQuad(${args})" title="Delete Quad">×</button>
                </div>
            </div>`;
    }


    // --- Bulk Logic ---

    private static addToBulk(id: string) {
        this.bulkList.add(id);
        this.syncBulkToText();
    }

    private static removeFromBulk(id: string) {
        this.bulkList.delete(id);
        this.syncBulkToText();
    }

    public static syncBulkFromText() {
        const text = (document.getElementById('maint-bulk-text') as HTMLTextAreaElement).value;
        const ids = text.split(',').map(s => s.trim()).filter(s => s.length > 0);
        this.bulkList = new Set(ids);
        this.renderBulkList();
    }

    private static syncBulkToText() {
        const textarea = document.getElementById('maint-bulk-text') as HTMLTextAreaElement;
        if (textarea) textarea.value = Array.from(this.bulkList).join(', ');
        this.renderBulkList();
    }

    private static renderBulkList() {
        const stats = document.getElementById('maint-bulk-stats');
        if (stats) stats.innerText = `${this.bulkList.size} Items Selected`;
    }

    private static resolveEntityID(input: string): NodeID | null {
        if (input.startsWith('http')) return state.factory.namedNode(input);

        // Search for this ID in the store (as fragment or suffix)
        // We look for any subject that ends with #ID or /ID or is exactly ID
        const candidates = new Set<bigint>();
        for (const [s] of state.store.match(null, null, null, null)) {
            const uri = state.factory.decode(s).value;
            if (uri.endsWith('#' + input) || uri.endsWith('/' + input) || uri === input) {
                candidates.add(s);
            }
        }

        if (candidates.size === 1) return Array.from(candidates)[0] as any;
        if (candidates.size > 1) {
            console.warn(`Ambiguous ID: ${input}. Found ${candidates.size} matches.`);
            // Return the first one or null? Let's return the first one but warn.
            return Array.from(candidates)[0] as any;
        }
        return null;
    }

    // --- Action Handlers ---
    private static async handleErase(id: NodeID, cascade: boolean) {
        // Record connections before erase for history
        const connections = this.manager.findConnections(id);
        const quadsToLose = [...connections.outgoing];
        if (cascade) quadsToLose.push(...connections.incoming);

        // Verify remote sync possibility
        const affectedRemoteGraphs = Array.from(new Set(quadsToLose.map(q => q.graph)))
            .map(g => state.graphs.get(g))
            .filter(info => info?.sourceType === 'remote' && info?.canWrite && info?.sourceURL);

        const showRemote = affectedRemoteGraphs.length > 0;

        this.showEraseModal("Delete Entity", `Are you sure you want to delete this entity ${cascade ? 'and all its connections' : ''}? This action directly affects the MainStore.`, async (syncRemote: boolean) => {
            if (syncRemote && affectedRemoteGraphs.length === 0) {
                console.warn('[Remote Sync] User requested sync but no writeable remote graphs found.');
            }

            const affectedGraphs = new Set(quadsToLose.map(q => q.graph));

            if (syncRemote) {
                for (const info of affectedRemoteGraphs) {
                    if (!info || !info.sourceURL) continue;
                    const quadsInThisGraph = quadsToLose.filter(q => q.graph === info.id);
                    if (quadsInThisGraph.length === 0) continue;

                    // Build Delete Data query
                    const triples = quadsInThisGraph.map(q => {
                        const s = state.factory.decode(q.subject).value;
                        const p = state.factory.decode(q.predicate).value;
                        const oNode = state.factory.decode(q.object);
                        const o = oNode.termType === 'NamedNode' ? `<${oNode.value}>` : `"${oNode.value}"`;
                        return `<${s}> <${p}> ${o} .`;
                    }).join('\n');

                    const update = `DELETE DATA { GRAPH <${info.uri}> { ${triples} } }`;
                    try {
                        console.log(`[Remote] Sending Erase to ${info.sourceURL}:\n`, update);
                        const resp = await RemoteLoader.doSparqlUpdate(info.sourceURL, update, info.auth);
                        console.log(`[Remote] Erase Response for ${info.uri}:`, resp);
                    } catch (e: any) {
                        console.error(`[Remote] Erase failed for ${info.uri}:`, e);
                        alert(`Failed to update remote server (${info.uri}). Error: ${e.message}`);
                    }
                }
            }

            const count = this.manager.eraseEntity(id, cascade);

            // Invalidate counts in state
            affectedGraphs.forEach(g => {
                const info = state.graphs.get(g);
                if (info) info.mainCount = undefined;
            });

            this.history.record(`Erase Entity: ${state.factory.decode(id).value.split('/').pop()}`, [
                { type: 'delete', quads: quadsToLose }
            ]);

            alert(`Successfully deleted ${count} quads (Local: ${count}${syncRemote ? ', Remote: Managed' : ''}).`);

            // Trigger global UI re-render
            state.dataSync.refreshUI();

            this.refreshActiveModal();
        }, showRemote);
    }

    private static async handleMove(id: NodeID, strategy: 'full' | 'outgoing') {
        const connections = this.manager.findConnections(id);
        const quadsToMove = strategy === 'full' ? [...connections.outgoing, ...connections.incoming] : [...connections.outgoing];

        const uniqueGraphIDs = Array.from(new Set(quadsToMove.map(q => q.graph)));
        const eligibleSources = uniqueGraphIDs.map(g => state.graphs.get(g))
            .filter(i => i?.sourceType === 'remote' && i?.canWrite && i?.sourceURL);

        const showRemote = eligibleSources.length > 0;

        this.showMoveModal(`${strategy === 'full' ? 'Move Entity' : 'Move Outgoing Data'}`, async (targetGraphURI, syncRemote) => {
            const targetGraph = state.factory.namedNode(targetGraphURI);

            if (syncRemote) {
                console.log('[Remote Sync] Starting Move Sync Process...');
                for (const info of (eligibleSources as any[])) {
                    if (!info || !info.sourceURL) continue;
                    const quads = quadsToMove.filter(q => q.graph === info.id);
                    if (quads.length === 0) continue;
                    const triples = quads.map(q => {
                        const s = state.factory.decode(q.subject).value;
                        const p = state.factory.decode(q.predicate).value;
                        const oN = state.factory.decode(q.object);
                        const oVal = oN.termType === 'NamedNode' ? `<${oN.value}>` : `"${oN.value}"`;
                        return `<${s}> <${p}> ${oVal} .`;
                    }).join('\n');
                    try {
                        const updateQuery = `DELETE DATA { GRAPH <${info.uri}> { ${triples} } }`;
                        console.log(`[Remote] Sending Delete to ${info.sourceURL}:\n`, updateQuery);
                        const resp = await RemoteLoader.doSparqlUpdate(info.sourceURL, updateQuery, info.auth);
                        console.log(`[Remote] Delete Response for ${info.uri}:`, resp);
                    } catch (e: any) {
                        console.error(`[Remote] Delete failed for ${info.uri}:`, e);
                        alert(`Failed to update remote server (${info.uri}). Error: ${e.message}`);
                    }
                }

                // 2. Add to target graph
                let targetInfo = state.graphs.get(targetGraph);
                if (syncRemote && (!targetInfo || !targetInfo.sourceURL)) {
                    // Try to inherit remote metadata from the first eligible source
                    const firstSource = eligibleSources[0];
                    if (firstSource && firstSource.sourceURL) {
                        console.log(`[Remote Sync] Target graph ${targetGraphURI} inheriting metadata from ${firstSource.uri}`);
                        state.registerGraph(targetGraphURI, 'data', undefined, {
                            id: targetGraph,
                            sourceType: 'remote',
                            sourceURL: firstSource.sourceURL,
                            auth: firstSource.auth,
                            canWrite: true
                        });
                        targetInfo = state.graphs.get(targetGraph);
                    }
                }

                if (targetInfo?.sourceType === 'remote' && targetInfo?.canWrite && targetInfo?.sourceURL) {
                    const triples = quadsToMove.map(q => {
                        const s = state.factory.decode(q.subject).value;
                        const p = state.factory.decode(q.predicate).value;
                        const oN = state.factory.decode(q.object);
                        const oVal = oN.termType === 'NamedNode' ? `<${oN.value}>` : `"${oN.value}"`;
                        return `<${s}> <${p}> ${oVal} .`;
                    }).join('\n');
                    try {
                        const insertQuery = `INSERT DATA { GRAPH <${targetGraphURI}> { ${triples} } }`;
                        console.log(`[Remote] Sending Insert to ${targetInfo.sourceURL}:\n`, insertQuery);
                        const resp = await RemoteLoader.doSparqlUpdate(targetInfo.sourceURL, insertQuery, targetInfo.auth);
                        console.log(`[Remote] Insert Response for ${targetGraphURI}:`, resp);
                    } catch (e: any) {
                        console.error(`[Remote] Insert failed for ${targetGraphURI}:`, e);
                        alert(`Failed to update remote server (${targetGraphURI}). Error: ${e.message}`);
                    }
                }
            }

            const count = this.manager.moveEntity(id, targetGraph, strategy);

            // Invalidate source counts
            const sourceGraphs = new Set(quadsToMove.map(q => q.graph));
            sourceGraphs.forEach(g => {
                const info = state.graphs.get(g);
                if (info) info.mainCount = undefined;
            });

            // Register target and invalidate count
            state.registerGraph(targetGraphURI, 'data', undefined, { id: targetGraph });
            const targetInfo = state.graphs.get(targetGraph);
            if (targetInfo) targetInfo.mainCount = undefined;

            this.history.record(`Move Entity: ${state.factory.decode(id).value.split('/').pop()} to ${targetGraphURI.split('/').pop()}`, [
                { type: 'delete', quads: quadsToMove },
                { type: 'add', quads: quadsToMove.map(q => ({ ...q, graph: targetGraph })) }
            ]);

            alert(`Moved ${count} quads to ${targetGraphURI} (Local: ${count}${syncRemote ? ', Remote: Managed' : ''}).`);

            // Trigger global UI re-render
            state.dataSync.refreshUI();

            this.refreshActiveModal();
        }, showRemote);
    }

    private static async handleDeleteQuad(sID: any, pID: any, oID: any, gID: any) {
        const sn = BigInt(sID);
        const pn = BigInt(pID);
        const on = BigInt(oID);
        const gn = BigInt(gID);

        console.log(`[Maintenance] Delete Quad Request:`, { sn, pn, on, gn });

        const sNode = state.factory.decode(sn);
        const pNode = state.factory.decode(pn);
        const oNode = state.factory.decode(on);
        const gNode = state.factory.decode(gn);

        const s = sNode.value;
        const p = pNode.value;
        const o = oNode.value;
        const g = gNode.value;

        console.log(`[Maintenance] Decoded Quad: <${s}> <${p}> ${oNode.termType === 'Literal' ? `"${o}"` : `<${o}>`} [Graph: ${g}]`);

        const info = state.graphs.get(gn);
        const showRemote = info?.sourceType === 'remote' && info?.canWrite === true;

        this.showEraseModal("Delete Data (Quad)", `Are you sure you want to delete this specific data?`, async (syncRemote: boolean) => {
            const matches = Array.from(state.store.match(sn, pn, on, gn));
            console.log(`[Maintenance] Matches in Local Store (Exact):`, matches.length);

            if (matches.length === 0) {
                const anyGraph = Array.from(state.store.match(sn, pn, on, null));
                console.log(`[Maintenance] Matches in ANY Graph:`, anyGraph.length);
                if (anyGraph.length > 0) {
                    anyGraph.forEach(q => {
                        console.log(` - Found in graph: ${state.factory.decode(q[3]).value} (ID: ${q[3]})`);
                    });
                }
            }

            // Remote Sync
            if (syncRemote && info?.sourceType === 'remote' && info?.canWrite && info?.sourceURL) {
                try {
                    const remoteG = info.remoteURI || info.logicalURI || g;
                    const oVal = oNode.termType === 'NamedNode' ? `<${o}>` : `"${o}"`;
                    // Use actual remote graph URI for the SPARQL query
                    const update = `DELETE DATA { GRAPH <${remoteG}> { <${s}> <${p}> ${oVal} } }`;
                    console.log(`[Remote] Sending Quad Delete to ${info.sourceURL}:\n`, update);
                    await RemoteLoader.doSparqlUpdate(info.sourceURL, update, info.auth);
                } catch (e: any) {
                    alert("Remote delete failed: " + e.message);
                    throw e; // Modal will handle it
                }
            }

            const success = state.store.delete(sn, pn, on, gn, 'system');
            if (success) {
                if (info) info.mainCount = undefined;

                this.history.record(`Deleted Quad: ${s.split('/').pop()}`, [{ type: 'delete', quads: [{ subject: sn, predicate: pn, object: on, graph: gn }] }]);

                state.dataSync.refreshUI();
                this.refreshActiveModal();
                alert(`Quad successfully deleted (Local: 1${syncRemote ? ', Remote: Managed' : ''}).`);
            } else {
                console.error(`[Maintenance] Local Delete failed for:`, { sn, pn, on, gn });
                alert("Failed to delete quad locally.");
            }
        }, showRemote);
    }

    private static async handleMoveQuad(sID: any, pID: any, oID: any, gID: any) {
        const sn = BigInt(sID);
        const pn = BigInt(pID);
        const on = BigInt(oID);
        const gn = BigInt(gID);

        const sNode = state.factory.decode(sn);
        const pNode = state.factory.decode(pn);
        const oNode = state.factory.decode(on);
        const gNode = state.factory.decode(gn);

        const s = sNode.value;
        const p = pNode.value;
        const o = oNode.value;
        const g = gNode.value;

        const infoSource = state.graphs.get(gn);
        const showRemote = infoSource?.sourceType === 'remote' && infoSource?.canWrite === true;

        this.showMoveModal("Move Data to Graph", async (targetGraphURI: string, syncRemote: boolean) => {
            if (targetGraphURI === g) return;

            const tn = state.factory.namedNode(targetGraphURI);

            // Remote Sync (Deletion from source)
            if (syncRemote) {
                const oVal = oNode.termType === 'NamedNode' ? `<${o}>` : `"${o}"`;

                if (infoSource?.sourceType === 'remote' && infoSource?.canWrite && infoSource?.sourceURL) {
                    const remoteGSource = infoSource.remoteURI || infoSource.logicalURI || g;
                    const updateDel = `DELETE DATA { GRAPH <${remoteGSource}> { <${s}> <${p}> ${oVal} } }`;
                    try {
                        console.log(`[Remote] Sending Quad Delete to ${infoSource.sourceURL}:\n`, updateDel);
                        await RemoteLoader.doSparqlUpdate(infoSource.sourceURL, updateDel, infoSource.auth);
                    } catch (e: any) {
                        alert(`Remote deletion failed from source graph (${infoSource.uri}). Error: ${e.message}`);
                        return;
                    }
                }

                // Remote Sync (Insertion to target)
                const infoTarget = state.graphs.get(tn);
                if (infoTarget?.sourceType === 'remote' && infoTarget?.canWrite && infoTarget?.sourceURL) {
                    const remoteGTarget = infoTarget.remoteURI || infoTarget.logicalURI || targetGraphURI;
                    const updateIns = `INSERT DATA { GRAPH <${remoteGTarget}> { <${s}> <${p}> ${oVal} } }`;
                    try {
                        console.log(`[Remote] Sending Quad Insert to ${infoTarget.sourceURL}:\n`, updateIns);
                        await RemoteLoader.doSparqlUpdate(infoTarget.sourceURL, updateIns, infoTarget.auth);
                    } catch (e: any) {
                        alert(`Remote insertion failed to target graph (${infoTarget.uri}). Error: ${e.message}`);
                        return;
                    }
                }
            }

            state.store.delete(sn, pn, on, gn, 'system');
            state.store.add(sn, pn, on, tn, 'system');

            // Refresh Source and Target metadata
            if (infoSource) infoSource.mainCount = undefined;

            state.registerGraph(targetGraphURI, 'data', undefined, { id: tn });
            const infoTargetResolved = state.graphs.get(tn);
            if (infoTargetResolved) infoTargetResolved.mainCount = undefined;

            this.history.record(`Moved Quad: ${s.split('/').pop()} to ${targetGraphURI.split('/').pop()}`, [
                { type: 'delete', quads: [{ subject: sn, predicate: pn, object: on, graph: gn }] },
                { type: 'add', quads: [{ subject: sn, predicate: pn, object: on, graph: tn }] }
            ]);

            state.dataSync.refreshUI();

            this.refreshActiveModal();
            alert(`Quad successfully moved (Local: 1${syncRemote ? ', Remote: Managed' : ''}).`);
        }, showRemote);
    }

    private static handleUndo() {
        const desc = this.history.undo();
        if (desc) {
            console.log('[Maintenance] Undo:', desc);
            this.refreshActiveModal();
        }
    }

    private static handleRedo() {
        const desc = this.history.redo();
        if (desc) {
            console.log('[Maintenance] Redo:', desc);
            this.refreshActiveModal();
        }
    }

    private static async handleBulkAction(action: 'delete_out' | 'delete_all' | 'move_full' | 'move_out') {
        if (this.bulkList.size === 0) return;

        const resolvedIds: NodeID[] = [];
        const failedIds: string[] = [];

        for (const idStr of this.bulkList) {
            const rid = this.resolveEntityID(idStr);
            if (rid) resolvedIds.push(rid);
            else failedIds.push(idStr);
        }

        if (failedIds.length > 0) {
            alert(`Some entities could not be resolved and will be skipped:\n${failedIds.join(', ')}`);
        }

        if (resolvedIds.length === 0) return;

        if (action.startsWith('delete')) {
            const cascade = action === 'delete_all';

            // Check if any quads being removed are from a remote writable source
            let anyRemote = false;
            for (const rid of resolvedIds) {
                const connections = this.manager.findConnections(rid);
                const quadsToCheck = cascade ? [...connections.incoming, ...connections.outgoing] : [...connections.outgoing];
                if (quadsToCheck.some(q => {
                    const info = state.graphs.get(q.graph);
                    return info?.sourceType === 'remote' && info?.canWrite === true;
                })) {
                    anyRemote = true;
                    break;
                }
            }

            this.showEraseModal(`Bulk Delete (${resolvedIds.length} Entities)`, `Are you sure you want to delete ${resolvedIds.length} entities and ${cascade ? 'ALL' : 'their outgoing'} connections?`, async (syncRemote) => {
                let totalCount = 0;
                const allQuadsRemoved: Quad[] = [];

                for (const rid of resolvedIds) {
                    const connections = this.manager.findConnections(rid);
                    const quadsToRemove = cascade ? [...connections.incoming, ...connections.outgoing] : [...connections.outgoing];
                    allQuadsRemoved.push(...quadsToRemove);

                    // Remote Sync
                    if (syncRemote) {
                        const affectedRemoteGraphs = Array.from(new Set(quadsToRemove.map(q => q.graph)))
                            .map(g => state.graphs.get(g))
                            .filter(info => info?.sourceType === 'remote' && info?.canWrite && info?.sourceURL);

                        for (const info of affectedRemoteGraphs) {
                            if (!info || !info.sourceURL) continue;
                            const quadsInGraph = quadsToRemove.filter(q => q.graph === info.id);
                            if (quadsInGraph.length === 0) continue;

                            const triples = quadsInGraph.map(q => {
                                const s = state.factory.decode(q.subject).value;
                                const p = state.factory.decode(q.predicate).value;
                                const oN = state.factory.decode(q.object);
                                const oVal = oN.termType === 'NamedNode' ? `<${oN.value}>` : `"${oN.value}"`;
                                return `<${s}> <${p}> ${oVal} .`;
                            }).join('\n');

                            const remoteURIForGraph = info.remoteURI || info.logicalURI || info.uri;
                            const update = `DELETE DATA { GRAPH <${remoteURIForGraph}> { ${triples} } }`;
                            try {
                                await RemoteLoader.doSparqlUpdate(info.sourceURL, update, info.auth);
                            } catch (e: any) {
                                console.error(`[Bulk Erase] Remote failed for ${info.uri}:`, e);
                            }
                        }
                    }

                    totalCount += this.manager.eraseEntity(rid, cascade);
                }

                this.history.record(`Bulk Erase: ${resolvedIds.length} items`, [{ type: 'delete', quads: allQuadsRemoved }]);
                this.bulkList.clear();
                this.syncBulkToText();
                state.dataSync.refreshUI();
                this.refreshActiveModal();
                alert(`Successfully deleted ${totalCount} quads from ${resolvedIds.length} entities.`);
            }, anyRemote);
        } else {
            const strategy: 'full' | 'outgoing' = action === 'move_full' ? 'full' : 'outgoing';

            // Check if any quads being moved are from a remote source
            let anyRemote = false;
            for (const rid of resolvedIds) {
                const connections = this.manager.findConnections(rid);
                const quadsToMove = strategy === 'full' ? [...connections.incoming, ...connections.outgoing] : [...connections.outgoing];
                if (quadsToMove.some(q => {
                    const info = state.graphs.get(q.graph);
                    return info?.sourceType === 'remote' && info?.canWrite === true;
                })) {
                    anyRemote = true;
                    break;
                }
            }

            this.showMoveModal(`Bulk Move (${resolvedIds.length} Entities)`, async (targetGraphURI, syncRemote) => {
                const targetGraph = state.factory.namedNode(targetGraphURI);
                let totalCount = 0;
                const allQuadsMoved: Quad[] = [];

                for (const rid of resolvedIds) {
                    const connections = this.manager.findConnections(rid);
                    const quadsToMove = strategy === 'full' ? [...connections.incoming, ...connections.outgoing] : [...connections.outgoing];
                    allQuadsMoved.push(...quadsToMove);

                    if (syncRemote) {
                        const affectedRemoteGraphs = Array.from(new Set(quadsToMove.map(q => q.graph)))
                            .map(g => state.graphs.get(g))
                            .filter(info => info?.sourceType === 'remote' && info?.canWrite && info?.sourceURL);

                        for (const info of affectedRemoteGraphs) {
                            if (!info || !info.sourceURL) continue;
                            const quadsInGraph = quadsToMove.filter(q => q.graph === info.id);
                            const triples = quadsInGraph.map(q => {
                                const s = state.factory.decode(q.subject).value;
                                const p = state.factory.decode(q.predicate).value;
                                const oN = state.factory.decode(q.object);
                                const oVal = oN.termType === 'NamedNode' ? `<${oN.value}>` : `"${oN.value}"`;
                                return `<${s}> <${p}> ${oVal} .`;
                            }).join('\n');

                            const remoteGSource = info.remoteURI || info.logicalURI || info.uri;
                            const targetInfo = state.graphs.get(targetGraph);
                            const remoteGTarget = targetInfo?.remoteURI || targetInfo?.logicalURI || targetGraphURI;

                            const delQuery = `DELETE DATA { GRAPH <${remoteGSource}> { ${triples} } }`;
                            const insQuery = `INSERT DATA { GRAPH <${remoteGTarget}> { ${triples} } }`;

                            try {
                                await RemoteLoader.doSparqlUpdate(info.sourceURL, delQuery, info.auth);
                                await RemoteLoader.doSparqlUpdate(info.sourceURL, insQuery, info.auth);
                            } catch (e: any) {
                                console.error(`[Bulk Move] Remote failed:`, e);
                            }
                        }
                    }

                    totalCount += this.manager.moveEntity(rid, targetGraph, strategy);
                }

                this.history.record(`Bulk Move: ${resolvedIds.length} items`, [
                    { type: 'delete', quads: allQuadsMoved },
                    { type: 'add', quads: allQuadsMoved.map(q => ({ ...q, graph: targetGraph })) }
                ]);

                this.bulkList.clear();
                this.syncBulkToText();
                state.dataSync.refreshUI();
                this.refreshActiveModal();
                alert(`Successfully moved ${totalCount} quads to ${targetGraphURI.split('/').pop()}.`);
            }, anyRemote);
        }
    }

    private static async showMoveModal(title: string, onSelect: (uri: string, syncRemote: boolean) => void, showRemoteCheck: boolean = true) {
        const modal = document.createElement('div');
        modal.className = 'maint-modal-overlay';
        modal.innerHTML = `
            <div class="maint-modal">
                <header class="maint-modal-header">
                    <h3>${title}</h3>
                    <button class="btn-close-modal">✕</button>
                </header>
                <div class="maint-modal-body">
                    <div class="graph-lookup-section">
                        <label>Target Graph (Named Graph) URI</label>
                        <div style="display:flex; gap:8px;">
                            <input type="text" id="target-graph-uri" class="form-input" style="flex:1;" placeholder="http://example.org/graphs/new" list="recent-graphs-list">
                        </div>
                        <datalist id="recent-graphs-list">
                            ${this.recentGraphs.map(g => `<option value="${g}">`).join('')}
                        </datalist>
                    </div>

                    ${showRemoteCheck ? `
                    <div class="remote-sync-option" style="margin-top:16px; padding:12px; background:rgba(255,150,50,0.05); border:1px solid rgba(255,150,50,0.2); border-radius:8px;">
                         <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-weight:600; color:var(--accent-orange);">
                            <input type="checkbox" id="sync-remote-check" style="width:18px; height:18px;">
                            Synchronize this operation with remote server?
                         </label>
                         <p style="margin:8px 0 0 28px; font-size:11px; opacity:0.7; line-height:1.4;">
                            <strong>Warning:</strong> Data integrity may be compromised if all related graphs are not synchronized.
                         </p>
                    </div>
                    ` : '<input type="checkbox" id="sync-remote-check" style="display:none;">'}

                    <div class="graph-selection-areas" style="margin-top:20px;">
                        <div class="graph-area">
                            <h4>Local Data Graphs</h4>
                            <div class="graph-list" id="local-graph-list">
                                ${Array.from(state.graphs.values())
                .filter(g => g.type === 'data')
                .map(g => `<div class="graph-item" data-uri="${g.uri}"><span>${g.uri.split('/').pop()}</span> <span class="uri-sub">${g.uri}</span></div>`)
                .join('')}
                            </div>
                        </div>

                        ${this.renderRemoteSection()}
                    </div>
                </div>
                <footer class="maint-modal-footer">
                    <button class="btn-tool cancel">Cancel</button>
                    <button class="btn-primary" id="btn-confirm-move">Confirm Move</button>
                </footer>
            </div>
        `;

        document.body.appendChild(modal);

        const input = modal.querySelector('#target-graph-uri') as HTMLInputElement;
        const syncCheck = modal.querySelector('#sync-remote-check') as HTMLInputElement;
        const confirmBtn = modal.querySelector('#btn-confirm-move') as HTMLButtonElement;
        const closeBtn = modal.querySelector('.btn-close-modal') as HTMLButtonElement;
        const cancelBtn = modal.querySelector('.cancel') as HTMLButtonElement;

        const closeModal = () => modal.remove();

        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;

        modal.querySelectorAll('.graph-item').forEach(item => {
            (item as HTMLElement).onclick = () => {
                input.value = (item as HTMLElement).dataset.uri || '';
            };
        });

        const remoteBtn = modal.querySelector('#btn-discover-remote') as HTMLButtonElement;
        if (remoteBtn) {
            remoteBtn.onclick = async () => {
                remoteBtn.innerText = 'Searching...';
                const graphs = await this.discoverRemoteGraphs();
                const list = modal.querySelector('#remote-graph-list');
                if (list) {
                    list.innerHTML = graphs.map(g => `<div class="graph-item remote" data-uri="${g}"><span>${g.split('/').pop()}</span> <span class="uri-sub">${g}</span></div>`).join('');
                    list.querySelectorAll('.graph-item').forEach(item => {
                        (item as HTMLElement).onclick = () => {
                            input.value = (item as HTMLElement).dataset.uri || '';
                        };
                    });
                }
                remoteBtn.innerText = 'Refresh Remote Graphs';
            };
        }

        confirmBtn.onclick = async () => {
            const uri = input.value.trim();
            if (!uri) {
                alert('Please select or enter a target graph.');
                return;
            }

            confirmBtn.disabled = true;
            confirmBtn.innerText = 'Syncing...';
            confirmBtn.style.opacity = '0.7';

            if (!this.recentGraphs.includes(uri)) this.recentGraphs.unshift(uri);
            if (this.recentGraphs.length > 10) this.recentGraphs.pop();

            try {
                await onSelect(uri, syncCheck?.checked || false);
            } catch (e) {
                console.error('[Maintenance] Operation failed:', e);
            } finally {
                closeModal();
            }
        };
    }

    private static renderRemoteSection() {
        // Check if we have any writable remote sources
        const writableRemotes = Array.from(state.graphs.values()).filter(g => g.sourceType === 'remote' && g.canWrite);
        if (writableRemotes.length === 0) return '';

        return `
            <div class="graph-area">
                <div class="header-with-action">
                    <h4>Remote Writable Graphs</h4>
                    <button class="btn-mini" id="btn-discover-remote">Discover</button>
                </div>
                <div class="graph-list" id="remote-graph-list">
                    <div class="empty-list-msg">Click discover to scan remote storage</div>
                </div>
            </div>
        `;
    }

    private static async discoverRemoteGraphs(): Promise<string[]> {
        const writableRemotes = Array.from(state.graphs.values()).filter(g => g.sourceType === 'remote' && g.canWrite);
        const allRemoteGraphs = new Set<string>();

        for (const remote of writableRemotes) {
            if (!remote.sourceURL) continue;
            try {
                const query = `SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o } } LIMIT 100`;
                const response = await fetch(`${remote.sourceURL}?query=${encodeURIComponent(query)}`, {
                    headers: { 'Accept': 'application/sparql-results+json' }
                });
                if (response.ok) {
                    const data = await response.json();
                    data.results.bindings.forEach((b: any) => allRemoteGraphs.add(b.g.value));
                }
            } catch (e) {
                console.warn('Remote discovery failed for', remote.sourceURL, e);
            }
        }
        return Array.from(allRemoteGraphs);
    }

    private static showEraseModal(title: string, message: string, onConfirm: (syncRemote: boolean) => void, showRemoteCheck: boolean = true) {
        const modal = document.createElement('div');
        modal.className = 'maint-modal-overlay';
        modal.innerHTML = `
            <div class="maint-modal" style="max-width: 450px;">
                <header class="maint-modal-header">
                    <h3>${title}</h3>
                    <button class="btn-close-modal">✕</button>
                </header>
                <div class="maint-modal-body">
                    <p style="margin-bottom:20px; font-size:14px; opacity:0.9; line-height:1.5;">${message}</p>
                    
                    ${showRemoteCheck ? `
                    <div class="remote-sync-option" style="margin-top:16px; padding:12px; background:rgba(255,150,50,0.05); border:1px solid rgba(255,150,50,0.2); border-radius:8px;">
                         <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-weight:600; color:var(--accent-orange);">
                            <input type="checkbox" id="sync-remote-check-erase" style="width:18px; height:18px;">
                            Synchronize this deletion with remote server?
                         </label>
                         <p style="margin:8px 0 0 28px; font-size:11px; opacity:0.7; line-height:1.4;">
                            <strong>Warning:</strong> Data integrity may be compromised if all related graphs are not synchronized.
                         </p>
                    </div>
                    ` : '<input type="checkbox" id="sync-remote-check-erase" style="display:none;">'}
                </div>
                <footer class="maint-modal-footer">
                    <button class="btn-tool cancel">Cancel</button>
                    <button class="btn-primary" id="btn-confirm-erase" style="background:var(--accent-red); border-color:var(--accent-red);">Confirm Delete</button>
                </footer>
            </div>
        `;

        document.body.appendChild(modal);

        const syncCheck = modal.querySelector('#sync-remote-check-erase') as HTMLInputElement;
        const confirmBtn = modal.querySelector('#btn-confirm-erase') as HTMLButtonElement;
        const closeBtn = modal.querySelector('.btn-close-modal') as HTMLButtonElement;
        const cancelBtn = modal.querySelector('.cancel') as HTMLButtonElement;

        const closeModal = () => modal.remove();
        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;

        confirmBtn.onclick = async () => {
            confirmBtn.disabled = true;
            confirmBtn.innerText = 'Deleting...';
            confirmBtn.style.opacity = '0.7';
            try {
                await onConfirm(syncCheck?.checked || false);
                closeModal();
            } catch (e) {
                console.error('[Maintenance] Erase failed:', e);
                confirmBtn.disabled = false;
                confirmBtn.innerText = 'Confirm Delete';
                confirmBtn.style.opacity = '1';
            }
        };
    }
}

