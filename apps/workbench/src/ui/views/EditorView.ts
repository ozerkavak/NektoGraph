import { state } from '../../runtime/State';
import { uiState } from '../../runtime/UIState';
import { WorkbenchLayout } from '../layout/WorkbenchLayout';
import { GraphSelector, type GraphOption } from '@triplestore/graph-selector';

import { SearchComponent } from '../components/SearchComponent';
import { EntityRenderer } from '../components/EntityRenderer';
import { KGEntity } from '../services/kg_entity';
import '../components/ChipMenu';

export class EditorView {
    private static headerSearchInstance: SearchComponent | null = null;

    public static init() {
        const g = window as any;
        g.bindSearchUI = this.bindSearchUI.bind(this);
        g.showDashboard = this.showDashboard.bind(this);
        g.openEntity = this.openEntity.bind(this);
        g.initCreateAndConnect = this.initCreateAndConnect.bind(this);
        g.createNewEntity = this.createNewEntity.bind(this);
        g.closeWin = this.closeWin.bind(this);
        g.minimizeWin = this.minimizeWin.bind(this);
        g.restoreWin = this.restoreWin.bind(this);
        g.cascadeWindows = this.cascadeWindows.bind(this);
        g.minimizeAllWindows = this.minimizeAllWindows.bind(this);
        g.closeAllWindows = this.closeAllWindows.bind(this);
        g.startSession = this.startSession.bind(this);
        g.commitSession = this.commitSession.bind(this);
        g.cancelSession = this.cancelSession.bind(this);
        g.downloadTTL = this.downloadTTL.bind(this);
        g.setLang = this.setLang.bind(this);
        g.addEntityLabel = this.addEntityLabel.bind(this);
        g.addEntityComment = this.addEntityComment.bind(this);
        g.removeTriple = this.removeTriple.bind(this);
        g.materializeTriple = this.materializeTriple.bind(this);
        g.addEntityPropertyValue = this.addEntityPropertyValue.bind(this);
        g.saveInlineLabel = this.saveInlineLabel.bind(this);
        g.saveInlineComment = this.saveInlineComment.bind(this);
        g.addEntityClass = this.addEntityClass.bind(this);
        g.removeEntityClass = this.removeEntityClass.bind(this);
        g.updateEntityBaseURI = this.updateEntityBaseURI.bind(this);
        g.generateNewIDForWindow = this.generateNewIDForWindow.bind(this);
        g.saveTripleIdentityShift = this.saveTripleIdentityShift.bind(this);
        g.addTripleAnnotation = this.addTripleAnnotation.bind(this);
        g.removeTripleAnnotation = this.removeTripleAnnotation.bind(this);
        g.addTripleAnnotationNew = this.addTripleAnnotationNew.bind(this);
        g.requestTargetGraph = this.requestTargetGraph.bind(this);
        g.loadEntityReferences = this.loadEntityReferences.bind(this);

        state.dataSync.on('sync:complete', () => {
            this.refreshSessionUI();
        });
    }

    public static async start() {

        await state.schemaIndex.buildIndex();
        state.search.buildIndex();

        WorkbenchLayout.renderAppShell();
        WorkbenchLayout.renderMainContent();
        state.windowManager.setContainer('windows-layer');

        this.bindSearchUI();

        let renderTimer: any = null;
        state.windowManager.onStateChange = () => {
            const dashboard = document.getElementById('dashboard-layer');
            if (dashboard && !uiState.isDragging) {
                clearTimeout(renderTimer);
                renderTimer = setTimeout(() => {
                    WorkbenchLayout.renderSessionDashboard(dashboard);
                    this.bindSearchUI();
                }, 100);
            }
        };
    }

    private static bindSearchUI() {
        const g = window as any;
        requestAnimationFrame(() => {
            const searchInput = document.getElementById('searchInput') as HTMLInputElement;
            const searchDropdown = document.getElementById('searchDropdown') as HTMLElement;

            if (!searchInput) {
                return;
            }

            if ((searchInput as any)._searchComponent) {
                this.headerSearchInstance = (searchInput as any)._searchComponent;
                return;
            }

            if (this.headerSearchInstance) {
                this.headerSearchInstance.destroy();
            }

            this.headerSearchInstance = new SearchComponent(searchInput, {
                onSelect: (id) => {
                    searchInput.value = '';
                    g.openEntity(id);
                },
                createAction: {
                    label: "Create New Entity",
                    onClick: () => {
                        g.createNewEntity();
                    }
                }
            }, searchDropdown || undefined);
        });
    }

    private static refreshSessionUI() {
        const dashboard = document.getElementById('dashboard-layer');
        if (dashboard && !uiState.isDragging && !uiState.currentDashboardActive) {
            WorkbenchLayout.renderSessionDashboard(dashboard);
            this.bindSearchUI();
        } else if (dashboard) {
            WorkbenchLayout.renderSessionDashboard(dashboard);
            this.bindSearchUI();
        }
    }

    private static showDashboard() {
        if (typeof (window as any).renderLandingPage === 'function') {
            (window as any).renderLandingPage();
        }
    }

    private static async openEntity(idVal: string) {
        const node = state.factory.namedNode(idVal);
        const kg = await KGEntity.ensure(node, 'metadata');
        const title = kg.getDisplayName();

        state.windowManager.create(idVal, title, (container, winId) => {
            try {
                const currentId = state.windowManager.getWindow(winId)?.state.entityId || idVal;
                const currentNode = state.factory.namedNode(currentId);
                EntityRenderer.renderEntityInWindow(currentNode, container, winId);
            } catch (e) {
                console.error('Render Error', e);
            }
        }, undefined, 'editor');
        uiState.currentDashboardActive = false;
        WorkbenchLayout.renderMainContent();
    }

    private static async loadEntityReferences(winId: string, entityId: string) {
        const details = document.querySelector(`#mentions_${winId} details`) as any;
        if (!details || details.dataset.loaded) return;

        const content = document.getElementById(`mentions_content_${winId}`);
        if (!content) return;

        try {
            const nodeId = BigInt(entityId);
            const kg = await KGEntity.loadMentions(nodeId);
            const entity = kg.structured;

            if (entity && entity.mentions && entity.mentions.length > 0) {
                // Resolved labels will now show correctly because we Hydrated the metadata in loadMentions
                content.innerHTML = entity.mentions.map(m => EntityRenderer.renderMentionRow(m, winId)).join('');
                details.dataset.loaded = "true";
            } else {
                content.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:11px;">No references found.</div>`;
            }
        } catch (e) {
            console.error('[EditorView] Load Mentions Failed', e);
            content.innerHTML = `<div style="padding:20px; text-align:center; color:var(--accent-red); font-size:11px;">Failed to load references.</div>`;
        }
    }

    private static async initCreateAndConnect(sourceId: string, predicateId: string, rangeURI: string) {
        try {
            state.ensureSession();
            uiState.currentSession = state.currentSession;

            const targetGraphURI = await this.requestTargetGraph();
            if (targetGraphURI === null) return;

            const newUri = await state.generator.createUniqueId();

            if (rangeURI && !rangeURI.startsWith('http://www.w3.org/2001/XMLSchema#')) {
                state.addTriple(newUri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', rangeURI, targetGraphURI);
            }

            state.addTriple(sourceId, predicateId, newUri);

            state.windowManager.create(newUri, 'New Entity', (container, winId) => {
                const currentId = state.windowManager.getWindow(winId)?.state.entityId || newUri;
                const currentNode = state.factory.namedNode(currentId);
                EntityRenderer.renderEntityInWindow(currentNode, container, winId);
            }, {
                isNew: true,
                targetGraph: targetGraphURI
            }, 'editor');

            const sourceWin = Array.from(state.windowManager.windows.values()).find(w => w.state.entityId === sourceId);
            if (sourceWin) {
                KGEntity.get(state.factory.namedNode(sourceId)).invalidate();
                sourceWin.refresh();
            }

            uiState.currentDashboardActive = false;
            WorkbenchLayout.renderMainContent();
            this.refreshSessionUI();

        } catch (e) {
            console.error("Create & Connect Failed", e);
            alert("Action failed.");
        }
    }

    private static async createNewEntity() {
        try {
            const targetGraphURI = await this.requestTargetGraph();
            if (targetGraphURI === null) return;

            const newUri = await state.generator.createUniqueId();

            state.windowManager.create(newUri, 'New Entity', (container, winId) => {
                const currentId = state.windowManager.getWindow(winId)?.state.entityId || newUri;
                const currentNode = state.factory.namedNode(currentId);
                EntityRenderer.renderEntityInWindow(currentNode, container, winId);
            }, {
                isNew: true,
                targetGraph: targetGraphURI
            }, 'editor');

            uiState.currentDashboardActive = false;
            WorkbenchLayout.renderMainContent();
        } catch (e) {
            console.error("Failed to create new entity:", e);
            alert("Failed to create entity. Check console.");
        }
    }

    private static async requestTargetGraph(subjectUri?: string): Promise<string | undefined | null> {
        const stats = state.getGraphStats();
        
        let targetGraphForSubject: string | undefined;
        let subjectLabel = "this entity";
        
        if (subjectUri) {
            try {
                const sUriStr = subjectUri.startsWith('http') ? subjectUri : state.factory.decode(BigInt(subjectUri)).value;
                const win = Array.from(state.windowManager.windows.values()).find(w => w.state.entityId === sUriStr);
                targetGraphForSubject = win?.state.metadata?.targetGraph;
                subjectLabel = KGEntity.get(state.factory.namedNode(sUriStr)).getDisplayName();
            } catch(e) {
                // Fallback
            }
        }

        const options: GraphOption[] = stats
            .filter(g => g.type !== 'inference' && g.type !== 'diff' && g.type !== 'default')
            .map(g => {
                const isUser = g.uri === 'http://example.org/graphs/user';
                const isSubjectMatch = targetGraphForSubject === g.uri;
                
                return {
                    uri: g.uri,
                    label: isUser ? 'user' : (g.uri.split('/').pop() || 'Untitled'),
                    fullUri: g.logicalURI,
                    type: g.type as string,
                    sourceType: g.sourceType || (isUser ? 'system' : 'local'),
                    location: g.sourceURL || g.filename || 'Internal Database',
                    mainCount: g.mainCount,
                    draftCount: g.draftCount,
                    isDefault: isSubjectMatch,
                    defaultLabel: isSubjectMatch ? `Default: Named graph of the [${subjectLabel}]` : undefined
                };
            });


        return GraphSelector.request({
            title: 'Select Destination Graph',
            description: "Choose where to store your changes. Note that system or inferred graphs are excluded for data integrity.",
            options
        });
    }


    private static closeWin(id: string) {
        const w = state.windowManager.getWindow(id);
        if (w && w.state.metadata?.isNew && w.state.entityId) {
            state.ensureSession();
            const sNode = state.factory.namedNode(w.state.entityId);
            const toRemove: any[] = [];

            for (const raw of state.currentSession!.additions.match(sNode, null, null, null)) {
                toRemove.push({ subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] });
            }
            for (const raw of state.currentSession!.additions.match(null, null, sNode, null)) {
                toRemove.push({ subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] });
            }

            toRemove.forEach(q => state.currentSession!.delete(q.subject, q.predicate, q.object, q.graph));
            KGEntity.get(sNode).invalidate();
        }

        state.windowManager.close(id);
        const dashboard = document.getElementById('dashboard-layer');
        if (dashboard) {
            WorkbenchLayout.renderSessionDashboard(dashboard);
            this.bindSearchUI();
        }
        WorkbenchLayout.renderSessionFooter();
    }

    private static minimizeWin(id: string) {
        state.windowManager.minimize(id);
        const dashboard = document.getElementById('dashboard-layer');
        if (dashboard) {
            WorkbenchLayout.renderSessionDashboard(dashboard);
            this.bindSearchUI();
        }
    }

    private static restoreWin(id: string) {
        const w = state.windowManager.getWindow(id);
        if (w) {
            w.restore();
            state.windowManager.focus(id);
            WorkbenchLayout.renderSessionFooter();
            WorkbenchLayout.renderSessionDashboard(document.getElementById('dashboard-layer')!);
            this.bindSearchUI();
        }
    }

    private static cascadeWindows() {
        state.windowManager.cascade();
    }

    private static minimizeAllWindows() {
        state.windowManager.toggleMinimizeAll();
        const dashboard = document.getElementById('dashboard-layer');
        if (dashboard && !uiState.isDragging) {
            WorkbenchLayout.renderSessionDashboard(dashboard);
            this.bindSearchUI();
        }
    }

    private static closeAllWindows() {
        state.windowManager.closeAll();
        const dashboard = document.getElementById('dashboard-layer');
        if (dashboard) {
            WorkbenchLayout.renderSessionDashboard(dashboard);
            this.bindSearchUI();
        }
    }

    private static startSession() {
        state.startSession();
    }

    private static async commitSession() {
        if (uiState.currentSession) {
            await state.commitSession(uiState.currentSession.id);
            state.windowManager.closeAll();
            uiState.currentSession = null;
            WorkbenchLayout.renderSessionFooter();
            const dashboard = document.getElementById('dashboard-layer');
            if (dashboard && !uiState.isDragging) {
                WorkbenchLayout.renderSessionDashboard(dashboard);
                this.bindSearchUI();
            }
            await state.schemaIndex.buildIndex();
        }
    }

    private static cancelSession(sessionIdOrEvent?: any) {
        const id = typeof sessionIdOrEvent === 'string' ? sessionIdOrEvent : undefined;
        uiState.currentSession = null;
        state.cancelSession(id);
        WorkbenchLayout.renderSessionFooter();
        const dashboard = document.getElementById('dashboard-layer');
        if (dashboard && !uiState.isDragging) {
            WorkbenchLayout.renderSessionDashboard(dashboard);
            this.bindSearchUI();
        }
        state.schemaIndex.buildIndex();
        uiState.currentDashboardActive = true;
        state.windowManager.closeAll();
        WorkbenchLayout.renderMainContent();
    }

    private static async downloadTTL() {
        if (uiState.currentSession) {
            const ttl = await state.exportSessionTTL(uiState.currentSession.id);
            const blob = new Blob([ttl], { type: 'text/turtle' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `session-${uiState.currentSession.id}.ttl`;
            a.click();
        }
    }

    private static setLang(l: 'en' | 'tr') {
        state.setLanguage(l);
        const sbLang = document.getElementById('sb-lang');
        if (sbLang) sbLang.innerText = l;
    }

    private static addEntityLabel(_winId: string, sUri: string) {
        state.ensureSession();
        uiState.currentSession = state.currentSession;
        const val = prompt("Enter Label:");
        if (val) {
            const w = state.windowManager.getWindow(_winId);
            const targetGraph = w?.state.metadata?.targetGraph;
            state.addTripleLiteral(sUri, 'http://www.w3.org/2000/01/rdf-schema#label', val, state.language, targetGraph);
            KGEntity.get(state.factory.namedNode(sUri)).invalidate();
            if (w) w.setTitle(val);
            this.refreshSessionUI();
        }
    }

    private static addEntityComment(_winId: string, sUri: string) {
        state.ensureSession();
        uiState.currentSession = state.currentSession;
        const val = prompt("Enter Comment:");
        if (val) {
            const w = state.windowManager.getWindow(_winId);
            const targetGraph = w?.state.metadata?.targetGraph;
            state.addTripleLiteral(sUri, 'http://www.w3.org/2000/01/rdf-schema#comment', val, state.language, targetGraph);
            // Redundant manual refreshes removed: State.ts handles syncDirtyEntities
        }
    }

    private static async removeTriple(_e: Event, s: string, p: string, o: string, gVal: string) {
        state.ensureSession();
        uiState.currentSession = state.currentSession;
        
        try {
            const sID = BigInt(s);
            const pID = BigInt(p);
            const oID = BigInt(o);
            const gID = (gVal && !gVal.startsWith('http')) ? BigInt(gVal) : (gVal ? state.factory.namedNode(gVal) : undefined);
            
            state.removeTripleById(sID, pID, oID, gID);
            
            const sURI = state.factory.decode(sID).value;
            const win = Array.from(state.windowManager.windows.values()).find(w => w.state.entityId === sURI);
            if (win) {
                const kg = KGEntity.get(sID);
                kg.invalidate();
                await KGEntity.ensure(sID, 'metadata');
                win.setTitle(kg.getDisplayName());
                win.refresh();
            }
        } catch(e) {
            console.warn('[EditorView] ID-based remove failed, falling back to string match', e);
            state.removeTriple(s, p, o, gVal);
        }
        this.refreshSessionUI();
    }

    private static async materializeTriple(s: string, p: string, o: string, _sourceGraph?: string) {
        const targetGraph = await EditorView.requestTargetGraph(s);
        if (targetGraph === null) return; // User cancelled

        state.ensureSession();
        uiState.currentSession = state.currentSession;

        try {
            const sID = BigInt(s);
            const pID = BigInt(p);
            const oID = BigInt(o);
            const gID = targetGraph ? state.factory.namedNode(targetGraph) : undefined;

            state.materializeTripleById(sID, pID, oID, gID);

            const sURI = state.factory.decode(sID).value;
            const win = Array.from(state.windowManager.windows.values()).find(w => w.state.entityId === sURI);
            if (win) {
                await KGEntity.ensure(sID, 'metadata');
                win.refresh();
            }
        } catch(e) {
            console.warn('[EditorView] ID-based materialize failed, falling back to string match', e);
            if (o.startsWith('http')) {
                state.materializeTriple(s, p, o, targetGraph);
            } else {
                state.materializeTripleLiteral(s, p, o, state.language, targetGraph);
            }
        }

        this.refreshSessionUI();
    }

    private static async addEntityPropertyValue(winId: string, sUri: string, pUri: string, isObject: boolean) {
        const inputId = `input_${winId}_${pUri}`;
        const input = document.getElementById(inputId) as HTMLInputElement;
        if (!input || !input.value) return;

        const sNode = state.factory.namedNode(sUri);
        const kg = KGEntity.get(sNode);
        if (kg.hasValue(pUri, input.value)) {
            alert("This value already exists (or is being added).");
            return;
        }

        const targetGraph = await EditorView.requestTargetGraph(sUri);
        if (targetGraph === null) return;

        state.ensureSession();
        uiState.currentSession = state.currentSession;

        if (isObject) {
            state.addTriple(sUri, pUri, input.value, targetGraph);
        } else {
            const ranges = input.getAttribute('data-ranges');
            const range = ranges ? ranges.split(',')[0] : undefined;
            state.addTripleLiteral(sUri, pUri, input.value.trim(), undefined, targetGraph, range);
        }

        input.value = '';
        const btn = document.getElementById(`btn_save_prop_${winId}_${pUri}`);
        if (btn) btn.style.display = 'none';
    }

    private static async saveInlineLabel(winId: string, idVal: string) {
        const input = document.getElementById(`new_label_${winId}`) as HTMLInputElement;
        const langSelect = document.getElementById(`new_label_lang_${winId}`) as HTMLSelectElement;

        if (input && input.value) {
            const kg = KGEntity.get(state.factory.namedNode(idVal));
            if (kg.structured && kg.structured.allLabels.some((l: any) => l.lang === langSelect.value)) {
                alert(`A label in ${langSelect.value.toUpperCase()} already exists for this entity.`);
                return;
            }

            const targetGraph = await EditorView.requestTargetGraph(idVal);
            if (targetGraph === null) return;

            state.ensureSession();
            uiState.currentSession = state.currentSession;
            
            state.addTripleLiteral(idVal, 'http://www.w3.org/2000/01/rdf-schema#label', input.value, langSelect.value, targetGraph);
            
            const w = state.windowManager.getWindow(winId);
            if (w) w.setTitle(input.value);
            
            input.value = '';
            // Manual refresh removed: DataSync handles incremental update
        }
    }

    private static async saveInlineComment(winId: string, idVal: string) {
        const input = document.getElementById(`new_comment_${winId}`) as HTMLTextAreaElement;
        const langSelect = document.getElementById(`new_comment_lang_${winId}`) as HTMLSelectElement;

        if (input && input.value) {
            const kg = KGEntity.get(state.factory.namedNode(idVal));
            if (kg.structured && kg.structured.allComments.some((c: any) => c.lang === langSelect.value)) {
                alert(`A description in ${langSelect.value.toUpperCase()} already exists for this entity.`);
                return;
            }

            const targetGraph = await EditorView.requestTargetGraph(idVal);
            if (targetGraph === null) return;

            state.ensureSession();
            uiState.currentSession = state.currentSession;
            
            state.addTripleLiteral(idVal, 'http://www.w3.org/2000/01/rdf-schema#comment', input.value, langSelect.value, targetGraph);
            KGEntity.get(state.factory.namedNode(idVal)).invalidate();
            input.value = '';
            state.windowManager.getWindow(winId)?.refresh();
            this.refreshSessionUI();
        }
    }

    private static async addEntityClass(winId: string, entityURI: string, classURI: string) {
        if (!classURI) return;

        const targetGraph = await EditorView.requestTargetGraph(entityURI);
        if (targetGraph === null) return;

        state.ensureSession();
        uiState.currentSession = state.currentSession;
        
        state.addTriple(entityURI, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', classURI, targetGraph);
        KGEntity.get(state.factory.namedNode(entityURI)).invalidate();
        
        state.windowManager.getWindow(winId)?.refresh();
        this.refreshSessionUI();
    }

    private static removeEntityClass(winId: string, entityURI: string, classURI: string) {
        if (!confirm('Remove this class from the entity? Properties will persist but be marked as missing/orphan.')) return;
        state.ensureSession();
        uiState.currentSession = state.currentSession;
        state.removeTriple(entityURI, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', classURI, '');
        KGEntity.get(state.factory.namedNode(entityURI)).invalidate();
        state.windowManager.getWindow(winId)?.refresh();
        this.refreshSessionUI();
    }

    private static async updateEntityBaseURI(winId: string, oldURI: string, newBase: string) {
        let localID = '';
        if (oldURI.includes('#')) localID = oldURI.split('#')[1];
        else {
            const parts = oldURI.split('/');
            localID = parts[parts.length - 1];
        }
        if (!newBase.endsWith('/') && !newBase.endsWith('#')) newBase += '#';
        const newURI = newBase + localID;
        await this.performEntityRename(winId, oldURI, newURI);
    }

    private static async generateNewIDForWindow(winId: string, oldURI: string) {
        const newURI = await state.generator.createUniqueId();
        await this.performEntityRename(winId, oldURI, newURI);
    }

    private static async performEntityRename(winId: string, oldURI: string, newURI: string) {
        if (oldURI === newURI) return;
        const sNode = state.factory.namedNode(oldURI);
        const newSNode = state.factory.namedNode(newURI);

        let hasData = false;
        for (const _ of state.store.match(sNode, null, null, null)) {
            hasData = true;
            break;
        }
        if (!hasData && uiState.currentSession) {
            for (const _ of uiState.currentSession.additions.match(sNode, null, null, null)) {
                hasData = true;
                break;
            }
        }

        if (hasData) {
            state.ensureSession();
            uiState.currentSession = state.currentSession;
            const toAdd: any[] = [];
            const toDel: any[] = [];

            for (const raw of state.currentSession!.additions.match(sNode, null, null, null)) {
                const q = { subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] };
                toDel.push(q);
                toAdd.push({ ...q, subject: newSNode });
            }
            for (const raw of state.currentSession!.additions.match(null, null, sNode, null)) {
                const q = { subject: raw[0], predicate: raw[1], object: raw[2], graph: raw[3] };
                toDel.push(q);
                toAdd.push({ ...q, object: newSNode });
            }
            toDel.forEach(q => state.currentSession!.delete(q.subject, q.predicate, q.object, q.graph));
            toAdd.forEach(q => state.currentSession!.add(q.subject, q.predicate, q.object, q.graph));
        }

        const w = state.windowManager.getWindow(winId);
        if (w) {
            state.windowManager.renameWindow(winId, newURI);
            if (w.state.title === oldURI || w.state.title === 'New Entity') {
                w.setTitle(newURI);
            }
            w.refresh();
        }
        if (hasData) {
            this.refreshSessionUI();
        }
    }

    private static saveTripleIdentityShift(winId: string, oldTripleId: string) {
        state.ensureSession();
        uiState.currentSession = state.currentSession;
        
        const sInput = document.getElementById(`te_s_${winId}`) as HTMLInputElement;
        const pInput = document.getElementById(`te_p_${winId}`) as HTMLInputElement;
        const oInput = document.getElementById(`te_o_${winId}`) as HTMLInputElement;
        
        if (!sInput || !pInput || !oInput) return;
        
        const oldToken = state.factory.decode(BigInt(oldTripleId)) as any;
        const newS = state.factory.namedNode(sInput.dataset.val!);
        const newP = state.factory.namedNode(pInput.dataset.val!);
        const newO = oInput.dataset.val ? state.factory.namedNode(oInput.dataset.val) : state.factory.literal(oInput.value);
        
        const w = state.windowManager.getWindow(winId);
        const targetGraphNode = w?.state.metadata?.targetGraph ? state.factory.namedNode(w.state.metadata.targetGraph) : undefined;
        
        state.tripleManager.migrateIdentity(state.currentSession!, oldToken.subject, oldToken.predicate, oldToken.object, newS, newP, newO, targetGraphNode);
        
        state.windowManager.refreshAllWindows();
        state.dataSync.refreshUI();
        this.refreshSessionUI();
        state.windowManager.close(winId);
    }

    private static addTripleAnnotation(tripleId: string, pUri: string, oVal: string) {
        if (!oVal) return;
        state.ensureSession();
        uiState.currentSession = state.currentSession;
        
        const tNode = BigInt(tripleId);
        state.tripleManager.addTriple(state.currentSession!, tNode, state.factory.namedNode(pUri), state.factory.literal(oVal));
        state.windowManager.refreshAllWindows();
        state.dataSync.refreshUI();
    }

    private static removeTripleAnnotation(tripleId: string, pUri: string, oStr: string) {
        state.ensureSession();
        uiState.currentSession = state.currentSession;
        
        const tNode = BigInt(tripleId);
        state.tripleManager.removeTriple(state.currentSession!, tNode, state.factory.namedNode(pUri), BigInt(oStr));
        state.windowManager.refreshAllWindows();
        state.dataSync.refreshUI();
    }

    private static addTripleAnnotationNew(tripleId: string, pUri: string, oVal: string) {
        if (!pUri || !oVal) return;
        this.addTripleAnnotation(tripleId, pUri, oVal);
    }
}
