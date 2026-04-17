// --- Imports: Core & Logic ---
import { QuadStore as QuadStoreCtor, IDFactory as IDFactoryCtor, type QuadStore, type IDFactory, type NodeID, DEFAULT_GRAPH } from '@triplestore/core';
import { IDGenerator } from '@triplestore/generator';
import { QuadLoader } from '@triplestore/io';
import { UnifiedSearch } from '@triplestore/search';
import { HoverCard } from '@triplestore/hover';
import {
    SchemaInspector, InferenceEngine,
    SubClassOfModule, SubPropertyOfModule, RangeModule, DomainModule,
    TransitivePropertyModule, SymmetricPropertyModule, FunctionalPropertyModule,
    InverseFunctionalPropertyModule, ReflexivePropertyModule, InverseOfModule
} from '@triplestore/inference';
import { SPARQLEngine, QueryParser } from '@triplestore/sparql';
import { DraftStore, DefaultCommitStrategy, DIFF_GRAPH_URI, SessionManager, OverlayStore, SchemaIndex, EntityResolver, DEFAULT_WRITE_GRAPH, Vocabulary, CompositeStore } from '@triplestore/edit-engine';
import type { UnifiedSearch as UnifiedSearchType } from '@triplestore/search';
import { InferenceMonitor } from '../ui/services/inference_monitor';
import { ReactivityService } from '../ui/services/reactivity_service';
import { GraphMonitor, GraphInfo } from '../ui/services/graph_monitor';
import { SessionMonitor } from '../ui/services/session_monitor';
import { WindowManager } from '@triplestore/window-manager';

import { uiState } from './UIState';
import { DataSyncEngine } from '@triplestore/data-sync';

import { Entity3DAdapter } from '../ui/services/threed_adapter';
import { WebGLContainer } from '@triplestore/3dview';
import { KGEntity } from '../ui/services/kg_entity';
import { TripleManager, IdentityMap } from '@triplestore/kg-triple';
import { TripleEditor } from '../ui/components/TripleEditor';


// --- Constants & Configurations ---
export const ONTOLOGY_GRAPH_URI = 'http://example.org/graphs/ontology';
export const DEFAULT_USER_GRAPH = 'http://example.org/graphs/user';

/**
 * AppState: Central orchestration point for the application.
 * Manages storage, inference, SPARQL execution, and UI synchronization.
 */
export class AppState {
    public store: QuadStore;
    public diffStore: QuadStore;
    public factory: IDFactory;

    // Services
    public graphMonitor: GraphMonitor;
    public reactivity: ReactivityService;
    public sessionMonitor: SessionMonitor;

    public get graphs() { return this.graphMonitor.graphs; }

    public loader: QuadLoader;
    public inspector: SchemaInspector;
    public inference: InferenceEngine;
    public inferenceMonitor: InferenceMonitor;
    public sparql: SPARQLEngine;
    public parser: QueryParser;

    // Edit Engine Components
    public sessionManager: SessionManager;
    public overlay: OverlayStore;
    public search: UnifiedSearchType;
    public schemaIndex: SchemaIndex;
    public entityResolver: EntityResolver;
    public tripleManager: TripleManager;

    // Window Management
    public windowManager: WindowManager;
    public generator: IDGenerator;
    public dataSync: DataSyncEngine;
    
    public language: 'en' | 'tr' = 'en'; // Default language

    public prefixes: Record<string, string> = {};
    public baseURIs: string[] = [];
    public lastSparqlQuery: string = 'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 50';

    private localSourceCount = 0;
    private remoteSourceCount = 0;

    public setLanguage(lang: 'en' | 'tr') {
        this.language = lang;
        // Trigger re-render
        // Trigger re-render through DataSync engine
        this.dataSync.refreshUI();
    }

    constructor() {
        // 1. Storage Backend
        this.store = new QuadStoreCtor();
        this.diffStore = new QuadStoreCtor();
        this.factory = new IDFactoryCtor();

        // 2. Core Infrastructure & UI Monitors
        const winsLayer = document.getElementById('windows-layer');
        if (winsLayer) winsLayer.innerHTML = '';

        this.inspector = new SchemaInspector(this.factory);
        this.windowManager = new WindowManager('windows-layer');
        this.windowManager.setTheme('night');
        this.inferenceMonitor = new InferenceMonitor(this.store, this.factory);
        this.graphMonitor = new GraphMonitor(this.store, this.diffStore as any, this.factory, this.inferenceMonitor);

        this.generator = new IDGenerator({
            store: this.store,
            factory: this.factory,
            prefix: 'http://example.org/resource/',
            maxRetries: 5
        });

        // 3. Reasoning & Logic Engine
        this.inference = new InferenceEngine(this.store);

        this.inference.register(new SubClassOfModule(this.store, this.factory));
        this.inference.register(new SubPropertyOfModule(this.store, this.factory));
        this.inference.register(new RangeModule(this.store, this.factory));
        this.inference.register(new DomainModule(this.store, this.factory));
        this.inference.register(new TransitivePropertyModule(this.store, this.factory));
        this.inference.register(new SymmetricPropertyModule(this.store, this.factory));
        this.inference.register(new FunctionalPropertyModule(this.store, this.factory));
        this.inference.register(new InverseFunctionalPropertyModule(this.store, this.factory));
        this.inference.register(new ReflexivePropertyModule(this.store, this.factory));
        this.inference.register(new InverseOfModule(this.store, this.factory));

        // 4. Query & Search Engine
        this.sparql = new SPARQLEngine(this.store, this.factory);
        this.parser = new QueryParser();

        // 5. Default Graph Registration
        this.registerGraph('http://example.org/graphs/default', 'default', 'Default Graph', { id: DEFAULT_GRAPH });
        const userGraphId = this.factory.namedNode(DEFAULT_WRITE_GRAPH);
        this.registerGraph(DEFAULT_WRITE_GRAPH, 'data', 'User Data', { id: userGraphId });

        // 6. Edit System Initialization
        const commitStrategy = new DefaultCommitStrategy(this.store, this.factory, this.diffStore);
        this.sessionManager = new SessionManager(commitStrategy);
        this.overlay = new OverlayStore(this.store);
        this.schemaIndex = new SchemaIndex(this.store, this.factory);
        this.search = new UnifiedSearch({
            store: this.store,
            factory: this.factory,
            schemaIndex: this.schemaIndex
        });
        this.entityResolver = new EntityResolver(this.store, this.factory, this.schemaIndex);
        this.tripleManager = new TripleManager(this.store, this.factory);
        this.loader = new QuadLoader(this.store, this.factory);

        this.registerGraph(ONTOLOGY_GRAPH_URI, 'ontology', 'Ontology', { id: this.factory.namedNode(ONTOLOGY_GRAPH_URI) });
        this.registerGraph(DIFF_GRAPH_URI, 'diff', 'Local Session Diff', { id: this.factory.namedNode(DIFF_GRAPH_URI) });

        // 6.5 DataSync Engine Initialization
        this.dataSync = new DataSyncEngine({
            inference: this.inference,
            search: this.search,
            schemaIndex: this.schemaIndex,
            windowManager: this.windowManager,
            resetStats: () => this.resetDraftCounts(),
            invalidateCache: () => {
                try {
                    KGEntity.invalidateAll();
                    IdentityMap.clear(); 
                } catch (e) {
                    console.warn('[State] Cache invalidation failed, continuing with UI refresh:', e);
                }
            },
            invalidateEntity: (id: any) => KGEntity.get(id).invalidate(),
            factory: this.factory
        });

        // 7. Inference Graph Setup
        const inferenceGraphs = [
            'http://example.org/graphs/inference/rdfs-subclass',
            'http://example.org/graphs/inference/rdfs-subproperty',
            'http://example.org/graphs/inference/rdfs-range',
            'http://example.org/graphs/inference/rdfs-domain',
            'http://example.org/graphs/inference/owl-transitive',
            'http://example.org/graphs/inference/owl-symmetric',
            'http://example.org/graphs/inference/owl-sameas',
            'http://example.org/graphs/inference/owl-reflexive',
            'http://example.org/graphs/inference/owl-inverse'
        ];
        inferenceGraphs.forEach(uri => {
            this.registerGraph(uri, 'inference', `Inference: ${uri.split('/').pop()}`, { id: this.factory.namedNode(uri) });
            this.inferenceMonitor.registerGraph(uri);
        });

        const ignored: NodeID[] = inferenceGraphs.map(uri => this.factory.namedNode(uri));
        this.sparql.setIgnoredGraphs(ignored);

        // 8. UI Synchronization Services
        this.reactivity = new ReactivityService(this.store, this.windowManager);
        this.sessionMonitor = new SessionMonitor(this.factory, this.dataSync);
        this.reactivity.init();
    }

    // --- Graph & Repository Management ---
    public registerGraph(logicalURI: string, type: GraphInfo['type'], sourceTitle?: string, metadata?: Partial<GraphInfo>): GraphInfo {
        return this.graphMonitor.registerGraph(logicalURI, type, sourceTitle, metadata);
    }

    // --- Inference Control & Refresh ---
    private sessionListener: ((event: any) => void) | null = null;

    private bindSessionInference(session: DraftStore) {
        this.sessionListener = (event: any) => {
            this.inference.inferForSession(event, session);
        };
        session.on('data', this.sessionListener);
        this.inferenceMonitor.bindSession(session);
    }

    private unbindSessionInference(session: DraftStore) {
        if (this.sessionListener) {
            session.off('data', this.sessionListener);
            this.sessionListener = null;
        }
        this.inferenceMonitor.bindSession(null);
    }

    public refreshInference(): void {
        console.log('[Inference] Full refresh started...');
        this.inference.recompute();

        if (this.currentSession) {
            console.log('[Inference] Refreshing active session drafts...');
            const engine = this.inference as any;
            const modules = engine.getModules() as Map<string, any>;

            for (const [name, mod] of modules) {
                if (engine.isEnabled(name)) {
                    const dest = mod.targetGraphID;
                    const toRemove: any[] = [];
                    for (const q of this.currentSession.additions.match(null, null, null, dest)) {
                        toRemove.push(q);
                    }
                    toRemove.forEach(q => this.currentSession!.delete(q[0], q[1], q[2], q[3]));
                }
            }

            const sessionQuads: any[] = [];
            for (const q of this.currentSession.additions.match(null, null, null, null)) {
                sessionQuads.push({ subject: q[0], predicate: q[1], object: q[2], graph: q[3] });
            }

            if (sessionQuads.length > 0) {
                const event: any = { type: 'add', quads: sessionQuads, source: 'user' };
                this.inference.inferForSession(event, this.currentSession);
            }
        }

        this.dataSync.fullRefresh();
    }

    // --- Data Import & Importers ---
    public async importData(content: string, filename: string, targetGraphURI?: string | null, intendedType: GraphInfo['type'] = 'data', metadata?: Partial<GraphInfo>): Promise<{ triples: number, graphs: string[] }> {
        const isRemote = !!metadata?.sourceURL;
        const count = isRemote ? ++this.remoteSourceCount : ++this.localSourceCount;
        const sourceID = `${isRemote ? 'remote' : 'local'}_${count.toString().padStart(2, '0')}`.replace(/\s+/g, '_');
        const effectiveTargetURI = targetGraphURI || (intendedType === 'ontology' ? ONTOLOGY_GRAPH_URI : (`http://example.org/graphs/data_from/${filename.replace(/\s+/g, '_')}`));
 
        this.inference.pause();
        KGEntity.invalidateAll();

        const touchedGraphs = new Set<string>();

        try {
            const result = await this.loader.load(content, {
                filename,
                format: 'universal',
                graphRewriter: (g) => {
                    const logical = g || effectiveTargetURI;
                    const info = this.registerGraph(logical, intendedType, filename, {
                        sourceID, sourceURL: metadata?.sourceURL, filename, sourceType: isRemote ? 'remote' : 'local', ...metadata
                    });
                    touchedGraphs.add(info.uri);
                    return info.uri;
                },
                onPrefix: (prefix, iri) => { this.prefixes[prefix] = iri; },
                onBase: (iri) => { if (!this.baseURIs.includes(iri)) this.baseURIs.push(iri); }
            });

            const defaultQuads = this.store.match(null, null, null, DEFAULT_GRAPH);
            let hasDefaultData = false;
            for (const _ of defaultQuads) { hasDefaultData = true; break; }

            if (hasDefaultData) {
                const targetInfo = this.registerGraph(effectiveTargetURI, intendedType, filename, {
                    sourceID, sourceURL: metadata?.sourceURL, filename, sourceType: isRemote ? 'remote' : 'local', ...metadata
                });

                const targetGid = targetInfo.id;
                touchedGraphs.add(targetInfo.uri);

                const quadsToMove: any[] = [];
                for (const q of this.store.match(null, null, null, DEFAULT_GRAPH)) {
                    quadsToMove.push({ subject: q[0], predicate: q[1], object: q[2], graph: targetGid });
                }

                this.store.clearGraph(DEFAULT_GRAPH);
                this.store.addQuads(quadsToMove);

                if (intendedType === 'ontology') this.analyzeOntology(targetGid, filename);
            } else if (intendedType === 'ontology') {
                const ontologyGid = this.factory.namedNode(ONTOLOGY_GRAPH_URI);
                this.analyzeOntology(ontologyGid, filename);
                touchedGraphs.add(ONTOLOGY_GRAPH_URI);
            }

            // --- Intelligent Semantic Partitioning (v4.0 - Subject-Centric) ---
            if (intendedType === 'data') {
                const v = new Vocabulary(this.factory);
                const rdfType = v.rdfType;

                const ontSchemaTypes = new Set([
                    v.owlClass,
                    this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#Class'),
                    v.owlObjectProperty,
                    v.owlDatatypeProperty,
                    v.owlAnnotationProperty,
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#Ontology'),
                    this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#Property'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#Restriction'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#FunctionalProperty'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#InverseFunctionalProperty'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#SymmetricProperty'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#TransitiveProperty'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#ReflexiveProperty'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#IrreflexiveProperty'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#AsymmetricProperty'),
                    this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#Datatype')
                ]);

                const ontSchemaPredicates = new Set([
                    v.rdfsSubClassOf,
                    this.factory.namedNode('http://www.w3.org/2000/01/rdf-schema#subPropertyOf'),
                    v.rdfsDomain,
                    v.rdfsRange,
                    v.owlInverseOf,
                    v.owlDisjointWith,
                    v.owlUnionOf,
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#intersectionOf'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#equivalentClass'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#equivalentProperty'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#onProperty'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#allValuesFrom'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#someValuesFrom'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#hasValue'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#cardinality'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#minCardinality'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#maxCardinality'),
                    this.factory.namedNode('http://www.w3.org/2002/07/owl#imports'),
                    v.rdfFirst,
                    v.rdfRest
                ]);

                const graphsToScan = [...touchedGraphs];
                for (const graphURI of graphsToScan) {
                    const sourceGid = this.factory.namedNode(graphURI);
                    const quads = [...this.store.match(null, null, null, sourceGid)];
                    if (quads.length === 0) continue;

                    // Phase 1: Identify ontology subjects (T-Box entities)
                    const ontoSubjects = new Set<bigint>();
                    for (const q of quads) {
                        if (q[1] === rdfType && ontSchemaTypes.has(q[2])) {
                            ontoSubjects.add(q[0]);
                        } else if (ontSchemaPredicates.has(q[1])) {
                            ontoSubjects.add(q[0]);
                        }
                    }

                    if (ontoSubjects.size === 0) continue;

                    // Phase 2: Follow BNode chains (Restrictions, Lists)
                    // Any BNode referenced as object by an ontology subject is also ontology
                    let changed = true;
                    while (changed) {
                        changed = false;
                        for (const q of quads) {
                            if (!ontoSubjects.has(q[0])) continue;
                            try {
                                const objTerm = this.factory.decode(q[2]);
                                if (objTerm.termType === 'BlankNode' && !ontoSubjects.has(q[2])) {
                                    ontoSubjects.add(q[2]);
                                    changed = true;
                                }
                            } catch { /* non-decodable, skip */ }
                        }
                    }

                    // Phase 3: Collect all triples whose subject is an ontology entity
                    const quadsToMove: any[] = [];
                    for (const q of quads) {
                        if (ontoSubjects.has(q[0])) {
                            quadsToMove.push(q);
                        }
                    }

                    if (quadsToMove.length > 0) {
                        const ontGraphURI = `http://example.org/graphs/ontology_${sourceID}`;
                        const ontGid = this.factory.namedNode(ontGraphURI);

                        if (!this.graphs.has(ontGid)) {
                            this.registerGraph(ontGraphURI, 'ontology', `Schema: ${filename}`, { sourceID });
                            touchedGraphs.add(ontGraphURI);
                        }
                        for (const q of quadsToMove) {
                            this.store.delete(q[0], q[1], q[2], sourceGid);
                            this.store.add(q[0], q[1], q[2], ontGid);
                        }
                        this.analyzeOntology(ontGid, filename);
                    }
                }
            }

            for (const graphURI of touchedGraphs) {
                const gid = this.factory.namedNode(graphURI);
                const info = this.graphs.get(gid);
                if (info) {
                    let realCount = 0;
                    for (const _ of this.store.match(null, null, null, gid)) realCount++;
                    info.mainCount = realCount;
                }
            }

            // Cleanup: remove empty non-system graphs created as fallback targets
            for (const graphURI of [...touchedGraphs]) {
                const gid = this.factory.namedNode(graphURI);
                const info = this.graphs.get(gid);
                if (info && info.mainCount === 0 && info.type !== 'default' && info.type !== 'diff' && info.type !== 'inference') {
                    this.graphs.delete(gid);
                    touchedGraphs.delete(graphURI);
                }
            }

            this.dataSync.fullRefresh();
            return { triples: result.triples, graphs: Array.from(touchedGraphs) };
        } finally {
            this.inference.resume();
            // fullRefresh() above already covers UI and inference sync
        }
    }

    private analyzeOntology(graphID: NodeID, filename: string) {
        console.log(`[State] Analyzing Ontology: ${filename}`);

        const metrics = this.inspector.getMetrics(this.store, graphID);
        const info = this.graphs.get(graphID);
        if (info) info.metrics = metrics;

        // Auto-configure ID Generator prefix based on ontology definition
        const rdfType = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
        const owlOntology = this.factory.namedNode('http://www.w3.org/2002/07/owl#Ontology');

        let baseURI = 'http://example.org/resource/';
        // Find the first subject of type owl:Ontology
        for (const [s] of this.store.match(null, rdfType, owlOntology, graphID)) {
            const val = this.factory.decode(s).value;
            baseURI = val;
            if (!baseURI.endsWith('/') && !baseURI.endsWith('#')) {
                baseURI += '#';
            }
            break;
        }

        console.log(`[State] Configured Generator Prefix: ${baseURI}`);
        this.generator = new IDGenerator({
            store: this.store,
            factory: this.factory,
            prefix: baseURI,
            maxRetries: 5
        });

        this.schemaIndex.buildIndex();
    }



    public getGraphStats(): GraphInfo[] {
        return this.graphMonitor.getGraphStats();
    }

    public getRepoStats() {
        return this.graphMonitor.getRepoStats();
    }

    public incrementGraphCount(g: NodeID, target: 'main' | 'diff' | 'draft' = 'main') {
        this.graphMonitor.incrementGraphCount(g, target);
    }

    public decrementGraphCount(g: NodeID, target: 'main' | 'diff' | 'draft' = 'main') {
        this.graphMonitor.decrementGraphCount(g, target);
    }

    public decrementDraftDeletion(g: NodeID) {
        this.graphMonitor.decrementDraftDeletion(g);
    }

    /**
     * Moves all data from one named graph to another.
     * High-performance operation that bypasses session logs.
     * @param targetGraph Target Graph ID or URI (string)
     */
    public moveGraph(sourceGraphId: NodeID, targetGraph: NodeID | string) {
        let targetGraphId: NodeID;

        if (typeof targetGraph === 'string') {
            targetGraphId = this.factory.namedNode(targetGraph);
            // Ensure target graph is registered
            if (!this.graphs.has(targetGraphId)) {
                this.registerGraph(targetGraph, 'data', undefined, { id: targetGraphId });
            }
        } else {
            targetGraphId = targetGraph;
        }

        console.log(`[State] Moving graph ${sourceGraphId} to ${targetGraphId}...`);

        // 1. Safeguard: Pause inference while mutating the store
        this.inference.pause();

        // 2. Abort current session to prevent collisions with the bulk move
        if (this.currentSession) {
            console.warn('[State] Active session detected during moveGraph. Cancelling session to ensure data integrity.');
            this.cancelSession();
        }

        // 3. Execute low-level structural move in the QuadStore
        const movedCount = this.store.moveQuads(sourceGraphId, targetGraphId);

        // 4. Update internal metadata counts
        const sourceInfo = this.graphs.get(sourceGraphId);
        const targetInfo = this.graphs.get(targetGraphId);
        if (sourceInfo && targetInfo) {
            const increment = (typeof sourceInfo.mainCount === 'number') ? sourceInfo.mainCount : movedCount;
            targetInfo.mainCount = (targetInfo.mainCount || 0) + increment;
        }

        this.removeGraph(sourceGraphId);
        this.inference.resume();
        this.dataSync.fullRefresh();

        console.log(`[State] Successfully moved ${movedCount} quads.`);
    }

    /**
     * Moves specific quads to a new graph.
     * @param tripleIds IDs of the triples (statements) to move.
     * @param targetGraphId The destination graph.
     */
    public moveQuadsToGraph(tripleIds: NodeID[], targetGraphId: NodeID) {
        this.ensureSession();
        const session = this.currentSession!;
        const composite = new CompositeStore(this.store, session);

        const processedBNodes = new Set<bigint>();
        for (const tid of tripleIds) {
            // Find all instances (assertions) of this triple across all graphs
            const t = this.factory.decode(tid) as any;
            if (t.termType !== 'Triple') continue;

            const matches = Array.from(composite.match(t.subject, t.predicate, t.object, null));
            for (const q of matches) {
                const subTerm = this.factory.decode(q[0]);
                const predURI = this.factory.decode(q[1]).value;
                const isReificationLink = predURI.endsWith('#reifies') || predURI.endsWith('#occurrenceOf');

                if (subTerm.termType === 'BlankNode' && isReificationLink) {
                    if (processedBNodes.has(q[0])) continue;
                    processedBNodes.add(q[0]);
                    
                    const bundle = composite.match(q[0], null, null, q[3]);
                    for (const bq of bundle) {
                        session.delete(bq[0], bq[1], bq[2], bq[3]);
                        session.add(bq[0], bq[1], bq[2], targetGraphId);
                    }
                } else {
                    session.delete(q[0], q[1], q[2], q[3]);
                    session.add(q[0], q[1], q[2], targetGraphId);
                }
            }
        }

        this.dataSync.fullRefresh();
    }

    /**
     * Groups selected annotations of a triple behind a single BNode (Reification).
     * @param tripleId The main triple being annotated.
     * @param annotationTripleIds The IDs of the <<triple p o>> statements to group.
     * @param graphId The graph in which to perform the grouping.
     */
    public groupAnnotationsAsBNode(tripleId: NodeID, annotationTripleIds: NodeID[], targetGraphId: NodeID) {
        this.ensureSession();
        const session = this.currentSession!;
        const composite = new CompositeStore(this.store, session);
        
        // Generate a random 6-char alphanumeric BNode ID (e.g., b_xy12z3)
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const bnode = this.factory.blankNode(`b_${randomSuffix}`);
        
        // 1. Link the Triple to the BNode (Occurrence/Reification link)
        const reifiesPred = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#reifies');
        session.add(bnode, reifiesPred, tripleId, targetGraphId);

        // 2. Move each annotation to the BNode
        for (const aid of annotationTripleIds) {
            const t = this.factory.decode(aid) as any;
            if (t.termType !== 'Triple') continue;

            // Delete old from all their original graphs
            const existingQuads = composite.match(t.subject, t.predicate, t.object, null);
            for (const raw of existingQuads) {
                const originalGraphId = raw[3];
                session.delete(t.subject, t.predicate, t.object, originalGraphId);
            }

            // Add new: bnode P O
            session.add(bnode, t.predicate, t.object, targetGraphId);
        }

        this.dataSync.fullRefresh();
    }

    /**
     * Deletes multiple quads/statements.
     */
    public deleteQuads(tripleIds: NodeID[]) {
        this.ensureSession();
        const session = this.currentSession!;
        const composite = new CompositeStore(this.store, session);

        const processedBNodes = new Set<bigint>();
        for (const tid of tripleIds) {
            const t = this.factory.decode(tid) as any;
            if (t.termType !== 'Triple') continue;

            const matches = Array.from(composite.match(t.subject, t.predicate, t.object, null));
            for (const q of matches) {
                const subTerm = this.factory.decode(q[0]);
                const predURI = this.factory.decode(q[1]).value;
                const isReificationLink = predURI.endsWith('#reifies') || predURI.endsWith('#occurrenceOf');

                if (subTerm.termType === 'BlankNode' && isReificationLink) {
                    if (processedBNodes.has(q[0])) continue;
                    processedBNodes.add(q[0]);
                    
                    const bundle = composite.match(q[0], null, null, q[3]);
                    for (const bq of bundle) {
                        session.delete(bq[0], bq[1], bq[2], bq[3]);
                    }
                } else {
                    session.delete(q[0], q[1], q[2], q[3]);
                }
            }
        }

        this.dataSync.fullRefresh();
    }

    /**
     * Merges exact duplicate statements across graphs into a single graph.
     */
    public mergeDuplicateQuads(tripleIds: NodeID[], targetGraphId: NodeID) {
        let sessionStarted = false;
        
        for (const tid of tripleIds) {
            const t = this.factory.decode(tid) as any;
            if (t.termType !== 'Triple') continue;

            const sessionForLookup = this.currentSession;
            const composite = sessionForLookup ? new CompositeStore(this.store, sessionForLookup) : this.store;

            const matches = Array.from(composite.match(t.subject, t.predicate, t.object, null));
            if (matches.length === 0) continue; 

            if (!sessionStarted) {
                this.ensureSession();
                sessionStarted = true;
            }

            const session = this.currentSession!;
            
            // Delete from all original graphs
            for (const q of matches) {
                session.delete(q[0], q[1], q[2], q[3]);
            }
            
            // Add exactly one to target graph
            session.add(t.subject, t.predicate, t.object, targetGraphId);
        }

        if (sessionStarted) {
            this.dataSync.fullRefresh();
        }
    }

    /**
     * Reverses a BNode grouping, moving annotations back to the original triple.
     */
    public splitBNodeGroup(quadIds: NodeID[], targetGraphId: NodeID) {
        let sessionStarted = false;
        const affectedBNodes = new Set<bigint>();

        for (const qid of quadIds) {
            const quadToken = this.factory.decode(qid) as any;
            if (!quadToken || !quadToken.subject) continue;
            
            const subjectId = quadToken.subject;
            const subjectTerm = this.factory.decode(subjectId) as any;
            if (subjectTerm.termType !== 'BlankNode') continue;
            
            // Resolve target triple from Store OR Session (using composite view)
            let tripleId: NodeID | null = null;
            const sessionForLookup = this.currentSession;
            const searchSource = sessionForLookup ? new CompositeStore(this.store, sessionForLookup) : this.store;
            
            const occurrencePred = this.factory.namedNode('http://www.w3.org/ns/rdf-star#occurrenceOf');
            const reifiesPred = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#reifies');

            // Search all graphs for the BNode (occurrenceOf | reifies) link
            for (const q of searchSource.match(subjectId, occurrencePred, null, null)) {
                tripleId = q[2];
                break; 
            }
            if (!tripleId) {
                for (const q of searchSource.match(subjectId, reifiesPred, null, null)) {
                    tripleId = q[2];
                    break;
                }
            }

            if (tripleId) {
                if (!sessionStarted) {
                    this.ensureSession();
                    sessionStarted = true;
                }
                
                const session = this.currentSession!;
                affectedBNodes.add(subjectId);

                // Find ALL copies of this specific BNode annotation and delete from their original graphs
                for (const raw of searchSource.match(subjectId, quadToken.predicate, quadToken.object, null)) {
                     session.delete(raw[0], raw[1], raw[2], raw[3]);
                }
                
                // Add the unpacked one to the target graph
                session.add(tripleId, quadToken.predicate, quadToken.object, targetGraphId);
            }
        }

        if (sessionStarted) {
            const session = this.currentSession!;
            const composite = new CompositeStore(this.store, session);
            for (const bnodeId of affectedBNodes) {
                const remaining = Array.from(composite.match(bnodeId, null, null, null));
                const reifiesPredCleanup = this.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#reifies');
                const occPredCleanup = this.factory.namedNode('http://www.w3.org/ns/rdf-star#occurrenceOf');
                const realAnns = remaining.filter(q => q[1] !== occPredCleanup && q[1] !== reifiesPredCleanup);
                if (realAnns.length === 0) {
                    for (const q of composite.match(bnodeId, null, null, null)) {
                        session.delete(q[0], q[1], q[2], q[3]);
                    }
                }
            }
            this.dataSync.fullRefresh();
        }
    }

    public removeGraph(id: NodeID) {
        if (id === DEFAULT_GRAPH) return;
        this.store.clearGraph(id);
        const info = this.graphs.get(id);
        if (info && (info.type === 'data' || info.filename)) {
            this.graphs.delete(id);
        }

        this.dataSync.fullRefresh();
    }

    public async executeQuery(queryStr: string, baseGraphURI?: string) {
        let baseGraphID: NodeID | undefined;
        if (baseGraphURI) baseGraphID = this.factory.namedNode(baseGraphURI);

        console.log('[State] executeQuery store size:', this.store.size);
        const query = this.parser.parse(queryStr);

        if ('type' in query && query.type === 'update') {
            await this.sparql.execute(query as any, baseGraphID);
            this.resetDraftCounts(); // Force recount of all graphs for the UI
            this.reactivity.triggerManualRefresh();
            return {
                variables: ['Update Status'],
                results: [{ 'Update Status': { termType: 'Literal', value: 'Success', datatype: { value: 'http://www.w3.org/2001/XMLSchema#string' } } }]
            };
        }

        const selectQuery = query as any;
        const varNames = this.sparql.getVariableNames(selectQuery);
        const results: any[] = [];
        const execResult = await this.sparql.execute(selectQuery);

        if (typeof execResult === 'boolean') {
            return {
                variables: ['ASK'],
                results: [{
                    'ASK': {
                        termType: 'Literal',
                        value: execResult.toString(),
                        datatype: { value: 'http://www.w3.org/2001/XMLSchema#boolean' }
                    }
                }]
            };
        }

        if (typeof execResult === 'object' && execResult !== null && Symbol.asyncIterator in execResult) {
            for await (const binding of execResult as AsyncIterableIterator<any>) {
                if (!Array.isArray(binding)) continue;
                const row: Record<string, any> = {};
                varNames.forEach((name, i) => {
                    const id = (binding as any)[i];
                    row[name] = id !== 0n ? this.factory.decode(id) : null;
                });
                results.push(row);
            }
        }

        return {
            variables: varNames,
            results
        };
    }

    public async exportSessionTTL(sessionID: string): Promise<string> {
        // 1. Active Session Diff
        if (this.currentSession && this.currentSession.id === sessionID) {
            const quads: any[] = [];
            // Use additions directly
            for (const q of this.currentSession.additions.match(null, null, null, null)) {
                quads.push(q);
            }
            return quads.map((q: any) => {
                const s = this.termToNx(q[0]);
                const p = this.termToNx(q[1]);
                const o = this.termToNx(q[2]);
                return `${s} ${p} ${o} .`;
            }).join('\n');
        }

        // 2. Store Dump (Fallback for closed sessions if they were persisted to User Graph)
        const userGraph = this.factory.namedNode(DEFAULT_WRITE_GRAPH);
        const quads: any[] = [];
        for (const q of this.store.match(null, null, null, userGraph)) {
            quads.push(q);
        }
        return quads.map(q => {
            const s = this.termToNx(q.subject);
            const p = this.termToNx(q.predicate);
            const o = this.termToNx(q.object);
            return `${s} ${p} ${o} .`;
        }).join('\n');
    }


    private termToNx(id: NodeID): string {
        try {
            const term = this.factory.decode(id);
            if (term.termType === 'NamedNode') return `<${term.value}>`;
            if (term.termType === 'Literal') {
                const val = term.value.replace(/"/g, '\\"');
                if (term.language) return `"${val}"@${term.language}`;
                if (term.datatype && term.datatype !== 'http://www.w3.org/2001/XMLSchema#string') return `"${val}"^^<${term.datatype}>`;
                return `"${val}"`;
            }
            if (term.termType === 'BlankNode') return `_:${term.value}`;
        } catch (e) {
            console.error('[State] termToNx Decode Failure for ID:', id, e);
        }
        return `_:${id}`;
    }

    // --- Session Facade ---
    public currentSession: DraftStore | null = null;

    public startSession() {
        if (!this.currentSession) {
            this.currentSession = this.sessionManager.createSession();
            this.bindSessionInference(this.currentSession);
            this.sessionMonitor.trackSession(this.currentSession);
        }
        return this.currentSession;
    }

    public ensureSession() {
        if (!this.currentSession) this.startSession();
    }

    public get dataSyncMode() { return this.dataSync.mode; }
    public set dataSyncMode(v: 'on' | 'off') {
        this.dataSync.mode = v;
        if (typeof document !== 'undefined') {
            document.body.classList.toggle('datasync-on', v === 'on');
            document.body.classList.toggle('datasync-off', v === 'off');
        }
    }

    public async commitSession(sessionId: string) {
        console.time(`Commit Session: ${sessionId}`);
        const session = this.currentSession;
        if (!session || session.id !== sessionId) {
            console.timeEnd(`Commit Session: ${sessionId}`);
            return;
        }

        this.unbindSessionInference(session);

        // --- STEP 2.2: Extract Mutated Entity IDs for Granular Refresh ---
        const mutatedIds = new Set<bigint>();
        
        // 1. Collect from additions
        for (const q of session.additions.match(null, null, null, null)) {
            mutatedIds.add(q[0]); // Subject
            // RDF-star: if object is a triple, we might want to index it too? 
            // Usually, search index cares about subjects.
        }

        // 2. Collect from deletions (Faster parsing)
        for (const hash of session.deletions) {
            const underscoreIndex = hash.indexOf('_');
            if (underscoreIndex !== -1) {
                try {
                    mutatedIds.add(BigInt(hash.substring(0, underscoreIndex)));
                } catch (e) { }
            }
        }

        // Perform Physical Commit
        await this.sessionManager.commitSession(sessionId);
        this.sessionManager.closeSession(sessionId);

        // SYNC METADATA: Merge draft counts into physical counts
        this.resetDraftCounts();

        this.currentSession = null;
        uiState.currentSession = null;
        this.sessionMonitor.trackSession(null);
        
        // --- STEP 2.1: Granular Notification ---
        if (mutatedIds.size > 0 && mutatedIds.size <= 100) {
            this.dataSync.syncDirtyEntities(Array.from(mutatedIds), 'critical');
        } else if (mutatedIds.size > 100) {
            this.dataSync.fullRefresh();
        } else {
            this.dataSync.refreshUI();
        }
    }

    public cancelSession(sessionId?: string) {
        const targetId = (typeof sessionId === 'string' && sessionId) ? sessionId : this.currentSession?.id;
        if (!targetId) return;

        const session = this.currentSession;
        if (session && session.id === targetId) {
            this.unbindSessionInference(session);
        }

        // --- Cleanup New Entity Windows ---
        const toClose: string[] = [];
        this.windowManager.windows.forEach((win, winId) => {
            const entityId = win.state.entityId;
            if (!entityId || !entityId.includes(':')) return; 
            
            try {
                const node = this.factory.namedNode(entityId);
                // Standard check: if it's not in the main store, it's probably a new session-only entity
                let existsInMain = false;
                for (const _ of this.store.match(node, null, null, null)) { existsInMain = true; break; }
                if (!existsInMain) {
                    toClose.push(winId);
                }
            } catch (e) { }
        });

        toClose.forEach(id => this.windowManager.close(id));

        // Physically discard quads from DraftStore
        this.sessionManager.closeSession(targetId);

        // Close dangling windows
        toClose.forEach(id => this.windowManager.close(id));

        this.currentSession = null;
        uiState.currentSession = null;
        this.sessionMonitor.trackSession(null);

        // Reset metadata counts AFTER session is cleared to ensure 0s
        this.resetDraftCounts();

        // No need to rebuild everything on cancel, just refresh UI
        this.dataSync.refreshUI();
    }

    private resetDraftCounts() {
        for (const info of this.graphs.values()) {
            info.mainCount = undefined; // Force recount on next getGraphStats for accuracy
            info.diffCount = undefined;
            
            if (this.currentSession) {
                // Count active draft quads from memory store
                let aCount = 0;
                for (const _ of this.currentSession.additions.match(null, null, null, info.id)) aCount++;
                info.draftCount = aCount;

                let dCount = 0;
                const graphSuffix = `_${info.id}`;
                for (const key of this.currentSession.deletions) {
                    if (key.endsWith(graphSuffix)) dCount++;
                }
                info.draftDeletions = dCount;
            } else {
                info.draftCount = 0;
                info.draftDeletions = 0;
            }
        }
    }

    // Helpers
    public addTriple(s: string, p: string, o: string, graphURI?: string) {
        this.ensureSession();
        const sNode = this.factory.namedNode(s);
        const pNode = this.factory.namedNode(p);
        const oNode = this.factory.namedNode(o);
        const targetGraphNode = graphURI ? this.factory.namedNode(graphURI) : undefined;

        this.tripleManager.addTriple(this.currentSession!, sNode, pNode, oNode, targetGraphNode);
        
        // Always track metadata counts regardless of sync mode
        this.incrementGraphCount(targetGraphNode || DEFAULT_GRAPH, 'draft');

        // Async Activation: Even if DataSync is OFF, sync the entity for Search Indexing
        this.dataSync.syncDirtyEntities(sNode, 'critical', this.currentSession);

        if (this.dataSyncMode === 'on') {
            this.dataSync.fullRefresh();
        }
    }

    public addTripleLiteral(s: string, p: string, val: string, lang?: string, graphURI?: string, datatype?: string) {
        this.ensureSession();
        const sNode = this.factory.namedNode(s);
        const pNode = this.factory.namedNode(p);
        const oNode = this.factory.literal(val, datatype, lang);

        const targetGraphNode = graphURI ? this.factory.namedNode(graphURI) : DEFAULT_GRAPH;

        let exists = false;
        for (const _ of this.store.match(sNode, pNode, oNode, null)) {
            exists = true;
            break;
        }

        if (exists) {
            this.currentSession!.undelete(sNode, pNode, oNode, targetGraphNode);
            this.decrementDraftDeletion(targetGraphNode);
        } else {
            this.currentSession!.add(sNode, pNode, oNode, targetGraphNode);
            this.incrementGraphCount(targetGraphNode, 'draft');
        }

        // Async Activation: Ensure the entity is discoverable even when OFF
        this.dataSync.syncDirtyEntities(sNode, 'critical', this.currentSession);

        if (this.dataSyncMode === 'on') this.dataSync.fullRefresh();
    }

    public materializeTriple(s: string, p: string, o: string, graphURI?: string) {
        this.ensureSession();
        const sNode = this.factory.namedNode(s);
        const pNode = this.factory.namedNode(p);
        const oNode = this.factory.namedNode(o);
        const targetGraphNode = graphURI ? (typeof graphURI === 'string' ? this.factory.namedNode(graphURI) : graphURI) : DEFAULT_GRAPH;

        this.currentSession!.add(sNode, pNode, oNode, targetGraphNode);
        this.incrementGraphCount(targetGraphNode, 'draft');

        if (this.dataSyncMode === 'on') {
            this.dataSync.fullRefresh();
        } else {
             this.windowManager.refreshAllWindows(); 
        }
    }

    public materializeTripleById(s: NodeID, p: NodeID, o: NodeID, graph?: NodeID) {
        this.ensureSession();
        const targetG = graph === undefined ? DEFAULT_GRAPH : graph;
        this.currentSession!.add(s, p, o, targetG);
        this.incrementGraphCount(targetG, 'draft');

        // Async Activation: Maintain search and window state
        this.dataSync.syncDirtyEntities(s, 'critical', this.currentSession);

        if (this.dataSyncMode === 'on') this.dataSync.fullRefresh();
    }

    public materializeTripleLiteral(s: string, p: string, val: string, lang?: string, graphURI?: string, datatype?: string) {
        this.ensureSession();
        const sNode = this.factory.namedNode(s);
        const pNode = this.factory.namedNode(p);
        const oNode = this.factory.literal(val, datatype, lang);
        const targetGraphNode = graphURI ? this.factory.namedNode(graphURI) : DEFAULT_GRAPH;

        this.currentSession!.add(sNode, pNode, oNode, targetGraphNode);
        this.incrementGraphCount(targetGraphNode, 'draft');

        // Async Activation: Maintain search and window state
        this.dataSync.syncDirtyEntities(sNode, 'critical', this.currentSession);

        if (this.dataSyncMode === 'on') this.dataSync.fullRefresh();
    }

    public removeTriple(s: string, p: string, o: string, graphURI: string) {
        this.ensureSession();

        const sNode = this.factory.namedNode(s);
        const pNode = this.factory.namedNode(p);
        const targetGraphNode = graphURI ? this.factory.namedNode(graphURI) : undefined;

        // We check BOTH namedNode and literal representations for 'o', as the UI passes strings.
        let removed = false;
        try {
            const oNode = this.factory.namedNode(o);
            removed = this.tripleManager.removeTriple(this.currentSession!, sNode, pNode, oNode, targetGraphNode);
        } catch { }

        if (!removed) {
            try {
                // Heuristic fallback for literal strings sent from UI
                const oNodeLiteral = this.factory.literal(o);
                removed = this.tripleManager.removeTriple(this.currentSession!, sNode, pNode, oNodeLiteral, targetGraphNode);
            } catch { }
        }

        if (removed) {
            this.decrementGraphCount(targetGraphNode || DEFAULT_GRAPH, 'draft');
        }

        // Async Activation: Maintain search and window state
        this.dataSync.syncDirtyEntities(sNode, 'critical', this.currentSession);

        if (this.dataSyncMode === 'on') this.dataSync.fullRefresh();
    }

    public removeTripleById(s: NodeID, p: NodeID, o: NodeID, graph?: NodeID) {
        this.ensureSession();
        const removed = this.tripleManager.removeTriple(this.currentSession!, s, p, o, graph);
        if (removed) {
            this.decrementGraphCount(graph || DEFAULT_GRAPH, 'draft');
        }

        // Async Activation: Maintain search and window state
        this.dataSync.syncDirtyEntities(s, 'critical', this.currentSession);

        if (this.dataSyncMode === 'on') this.dataSync.fullRefresh();
    }

    public async openEntityEditor(id: NodeID | string) {
        let uri = typeof id === 'string' ? id : this.factory.decode(id).value;
        let node = typeof id === 'string' ? this.factory.namedNode(id) : id;

        // 1. Resolve Title Optimistically (from Cache)
        let title = 'Entity';
        try {
            const cached = KGEntity.get(node);
            if (cached && cached.isAtLeast('metadata')) {
                title = cached.getDisplayName();
            }
        } catch (e) { /* ignore cache miss */ }

        this.windowManager.create(uri, title, (c, wId) => {
            import('../ui/components/EntityRenderer').then(async m => {
                // 2. Render (Async load)
                await m.EntityRenderer.renderEntityInWindow(node, c, wId);

                // 3. Update Title Correctly (Post-Load)
                const refreshed = KGEntity.get(node);
                const win = this.windowManager.getWindow(wId);
                if (win && refreshed) {
                    win.setTitle(refreshed.getDisplayName());
                }
            }).catch(_ => {
                c.innerHTML = `<div style="color:red; padding:20px;">Failed to load view components.</div>`;
            });
        });
    }

    public async open3DEntity(id: string) {
        const entityId = this.factory.namedNode(id);
        const winIdKey = `3d_${id}`;

        this.windowManager.create(winIdKey, `3D: Loading...`, (content, winId) => {

            // Re-fetch data every time (for reactivity)
            KGEntity.loadForDisplay(entityId).then(kg => {
                try {
                    const win = this.windowManager.getWindow(winId);
                    if (!win) return;

                    // Update Title in case label changed
                    win.setTitle(`3D: ${kg.getDisplayName()}`);

                    let container = win.state.metadata?.webglContainer as WebGLContainer;

                    if (!container) {
                        container = new WebGLContainer({
                            container: content,
                            onNodeClick: (_nodeId: string, _container: any) => {
                                // User requested disabling left-click window open
                            },
                            onNodeContextMenu: (nodeId: string, x: number, y: number, container: any) => {
                                this.show3DContextMenu(nodeId, x, y, container, winId);
                            },
                            onToggleEmptyProps: (show: boolean) => {
                                if (kg.structured) {
                                    const data = Entity3DAdapter.adapt(kg.structured, show, uiState.showOrphansIn3D);
                                    container.updateGraph(data);
                                }
                            }
                        });
                        if (!win.state.metadata) win.state.metadata = {};
                        win.state.metadata.webglContainer = container;
                        win.state.metadata.granularOnly = true; // DO NOT refresh on global sync:complete unless targeted
                    } else {
                        container.mount(content);
                    }

                    if (kg.structured) {
                        const showEmpty = (container as any).showEmptyProps || false;
                        const data = Entity3DAdapter.adapt(kg.structured, showEmpty, uiState.showOrphansIn3D);
                        container.updateGraph(data);
                    } else {
                        content.innerHTML += `<div style="position:absolute; top:10px; left:10px; color:white;">No Data</div>`;
                    }
                } catch (err: any) {
                    console.error('[State] Failed to update 3D view:', err);
                    content.innerHTML = `<div style="color:red; padding:20px;">Error: ${err.message}</div>`;
                }
            }).catch(e => {
                console.error('[State] Error loading entity for 3D:', e);
                content.innerHTML = `<div style="color:red; padding:20px;">Error Loading Entity: ${e.message}</div>`;
            });
        });
    }
    
    /**
     * Generates a recursive, semantic 'Premium' label for an RDF-star Triple.
     * Uses KGEntity labels where available.
     */
    public getTriplePremiumLabel(nodeId: bigint): string {
        try {
            const t = this.factory.decode(nodeId) as any;
            if (!t || t.termType !== 'Triple') return nodeId.toString();
            
            // Fix: Constituents are raw NodeIDs (bigints). Must decode to check for nested Triples.
            const sTerm = this.factory.decode(t.subject);
            const oTerm = this.factory.decode(t.object);

            const s = sTerm.termType === 'Triple' 
                ? this.getTriplePremiumLabel(t.subject) 
                : KGEntity.get(t.subject).getDisplayName();
                
            const p = KGEntity.get(t.predicate).getDisplayName();
            
            const o = oTerm.termType === 'Triple'
                ? this.getTriplePremiumLabel(t.object)
                : (oTerm.termType === 'Literal' ? oTerm.value : KGEntity.get(t.object).getDisplayName());

            return `<< ${s} -> ${p} -> ${o} >>`;
        } catch (e) {
            return nodeId.toString();
        }
    }


    /**
     * Recursively collects all constituent NodeIDs from an RDF-star Triple.
     */
    private collectDeepIds(nodeId: bigint): bigint[] {
        const ids = [nodeId];
        try {
            const t = this.factory.decode(nodeId) as any;
            if (t && t.termType === 'Triple') {
                ids.push(...this.collectDeepIds(t.subject));
                ids.push(...this.collectDeepIds(t.predicate));
                ids.push(...this.collectDeepIds(t.object));
            }
        } catch (e) {}
        return ids;
    }

    public async openTripleEditor(tripleID: string, proxyId?: string) {
        const id = BigInt(tripleID);
        const pid = proxyId ? BigInt(proxyId) : undefined;
        const winIdKey = proxyId ? `triple_${tripleID}_proxy_${proxyId}` : `triple_${tripleID}`;

        try {
            // 1. Collect and Prefetch ALL deep constituents for consistent labeling
            const allIds = this.collectDeepIds(id);
            if (pid) allIds.push(pid);
            await KGEntity.ensureMany(allIds, 'metadata');

            let title = this.getTriplePremiumLabel(id);
            if (pid && this.entityResolver) {
                const unwrapped = this.entityResolver.unwrap(pid);
                if (unwrapped !== pid) {
                    title = `${this.getTriplePremiumLabel(unwrapped)} → ${this.getTriplePremiumLabel(id)}`;
                }
            }

            this.windowManager.create(winIdKey, title, (content, winId) => {
                TripleEditor.renderTripleInWindow(id, content, winId, pid);
            });
        } catch (e) {
            console.error('[State] Failed to open Triple Editor:', e);
            this.windowManager.create(winIdKey, `Triple Inspector`, (content, winId) => {
                TripleEditor.renderTripleInWindow(id, content, winId, pid);
            });
        }
    }

    public async copyToClipboard(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            console.log('[State] Copied to clipboard:', text);
        } catch (err) {
            console.error('[State] Clipboard copy failed:', err);
            // Fallback for non-secure contexts if needed, but modern browsers require secure for clipboard
        }
    }

    public showUriModal(label: string, uri: string) {
        const existing = document.getElementById('uri-modal-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'uri-modal-overlay';
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '20000'
        });

        overlay.innerHTML = `
            <div style="background:var(--bg-panel); border:1px solid var(--border-subtle); border-radius:12px; width:500px; padding:30px; box-shadow:0 32px 64px rgba(0,0,0,0.5); font-family:var(--font-main);">
                <div style="font-size:10px; color:var(--text-muted); font-weight:800; text-transform:uppercase; letter-spacing:0.2em; margin-bottom:12px;">Full Identifier (URI/IRI)</div>
                <div style="font-size:18px; color:white; font-weight:700; margin-bottom:20px; line-height:1.4;">${label}</div>
                
                <div style="background:rgba(0,0,0,0.3); padding:16px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); word-break:break-all; font-family:var(--font-mono); font-size:12px; color:var(--accent-primary); margin-bottom:24px;">
                    ${uri}
                </div>
                
                <div style="display:flex; gap:12px; justify-content:flex-end;">
                    <button id="uri-copy-btn" class="btn-primary" style="height:40px; padding:0 30px; font-weight:800;">COPY URI</button>
                    <button onclick="document.getElementById('uri-modal-overlay').remove()" class="btn-secondary" style="height:40px; padding:0 24px; font-weight:800;">CLOSE</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const copyBtn = document.getElementById('uri-copy-btn');
        if (copyBtn) {
            copyBtn.onclick = async () => {
                await this.copyToClipboard(uri);
                copyBtn.textContent = 'COPIED!';
                copyBtn.style.background = '#10b981';
                setTimeout(() => {
                    copyBtn.textContent = 'COPY URI';
                    copyBtn.style.background = '';
                }, 1500);
            };
        }

        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    }

    public async expand3DEntity(id: string, origin: [number, number, number], container: any, clickedNodeId: string) {
        const entityId = this.factory.namedNode(id);
        console.log('[State] Expanding 3D Entity:', id, 'at', origin);

        try {
            const kg = await KGEntity.loadForDisplay(entityId);
            if (!kg.structured) {
                console.warn('[State] No structured data for expansion:', id);
                return;
            }

            // 1. Adapt new subgraph (centered at 0,0,0)
            const showEmpty = (container as any).showEmptyProps || false;
            const subgraph = Entity3DAdapter.adapt(kg.structured, showEmpty, uiState.showOrphansIn3D);

            // 2. Get current graph nodes (Uses pinned getNodes() method)
            const currentNodes = container.getNodes() as any[];
            const nodeMap = new Map(currentNodes.map(n => [n.id, n]));

            // 3. Identification & Re-Mapping
            // We need to map nodes in the NEW subgraph to EXISTING nodes in the scene if they represent the same entity.
            const idMap = new Map<string, string>();
            // Use simple ID prefix for properties to scope them to this expansion
            const prefix = clickedNodeId.replace(/[^a-zA-Z0-9]/g, '_');

            subgraph.nodes.forEach(newNode => {
                // 3a. Focus Node -> Corresponds to the Clicked Node (the expansion origin)
                if (newNode.type === 'focus') {
                    idMap.set(newNode.id, clickedNodeId);
                    return;
                }

                // 3b. Entity Values -> GLOBAL Deduplication (LINK to Existing)
                // STRICT CHECK: Must be a 'value' (not prop/class), NOT 'isData', AND have a URI.
                // We want to link B to A if A exists.
                if (newNode.type === 'value' && !newNode.isData && newNode.semanticData?.uri) {
                    const existing = currentNodes.find(n => n.semanticData?.uri === newNode.semanticData?.uri);
                    if (existing) {
                        idMap.set(newNode.id, existing.id);
                        return;
                    }
                }

                // 3c. EVERYTHING ELSE (Classes, Properties, Data Values) -> Scope (Recreate)
                // CRITICAL: We MUST create new ID for Classes and Properties to avoid merging with
                // existing nodes from other entities. Even if "Class X" exists for Entity A,
                // Entity B must have its OWN "Class X" node to hang its own properties off of.
                // Otherwise, B will continuously show A's properties too.
                const uniqueId = `${prefix}_${newNode.id}`;
                idMap.set(newNode.id, uniqueId);
            });

            // 4. Merge Logic
            subgraph.nodes.forEach(newNode => {
                // Resolve Target ID (Scene ID)
                const targetId = idMap.get(newNode.id) || newNode.id;

                // If this is a new node, we need to offset its position.
                // If it's an existing node, we keep its position.
                if (!nodeMap.has(targetId)) {
                    // Add New Node
                    const pos = newNode.position || [0, 0, 0];

                    // CRITICAL FIX: We must CLONE the node and CLEAR its neighbors.
                    // The 'newNode' object comes from the adapter and contains raw, unscoped edges 
                    // (e.g., pointing to "Location_sub-regions").
                    // If we push 'newNode' directly, these raw edges persist and cause ghost lines 
                    // to existing nodes that happen to match the raw IDs (like the parent entity's properties).
                    const nodeToAdd = { ...newNode, id: targetId, neighbors: [] };
                    nodeToAdd.position = [pos[0] + origin[0], pos[1] + origin[1], pos[2] + origin[2]];

                    currentNodes.push(nodeToAdd);
                    nodeMap.set(targetId, nodeToAdd);
                } else {
                    // Update Existing Node
                    const existing = nodeMap.get(targetId);

                    // User Request: If this is the CLICKED node, make it RED but keep SHAPE.
                    if (targetId === clickedNodeId) {
                        existing.color = '#ff0000'; // RED
                        // Do NOT change shape/type (keep as value/cube)
                        // existing.type = 'focus'; // REMOVED
                    } else if (!existing.type && newNode.type) {
                        // Upgrade unknown/shell nodes
                        Object.assign(existing, newNode);
                    }
                }

                // 5. Merge Edges (Neighbors)
                // Edges are stored on the SOURCE node.
                // We must re-wire edges using our map.
                const sourceNode = nodeMap.get(targetId);
                // Edges *out* from this node
                if (newNode.neighbors && sourceNode) {
                    if (!sourceNode.neighbors) sourceNode.neighbors = [];

                    newNode.neighbors.forEach((edge: any) => {
                        // Resolve Target of the Edge
                        // CRITICAL: If the target was scoped (e.g. Class), we MUST point to the scoped ID.
                        const edgeTargetId = idMap.get(edge.targetId) || edge.targetId;

                        // Prevent self-loops or duplicate edges
                        const exists = sourceNode.neighbors.some((e: any) => e.targetId === edgeTargetId && e.label === edge.label);
                        if (!exists && edgeTargetId !== targetId) {
                            sourceNode.neighbors.push({ ...edge, targetId: edgeTargetId });
                        }
                    });
                }
            });

            // 6. Update Graph
            // We pass focusNodeId only if we want to recenter view, but here we just update data.
            // We might want to keep the original focus? Or just update lists.
            const focusCandidate = container.getNodes().find((n: any) => n.type === 'focus');
            container.updateGraph({
                nodes: currentNodes,
                focusNodeId: focusCandidate?.id
            });

        } catch (e) {
            console.error('[State] Expansion failed:', e);
        }
    }

    private show3DContextMenu(nodeId: string, x: number, y: number, container: any, winId: string) {
        // Remove existing context menu if any
        const existing = document.getElementById('threed-context-menu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.id = 'threed-context-menu';
        Object.assign(menu.style, {
            position: 'fixed',
            left: `${x}px`,
            top: `${y}px`,
            background: 'rgba(20, 20, 20, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '4px',
            zIndex: '9500', // Below Hover Card (9999) but above windows (100)
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            minWidth: '160px'
        });

        const addItem = (label: string, onClick: () => void) => {
            const item = document.createElement('div');
            item.textContent = label;
            Object.assign(item.style, {
                padding: '8px 12px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                borderRadius: '4px',
                transition: 'background 0.2s',
                zIndex: '9501'
            });
            item.onmouseenter = () => item.style.background = 'rgba(255,255,255,0.1)';
            item.onmouseleave = () => item.style.background = 'transparent';
            item.onclick = (e) => {
                e.stopPropagation();
                onClick();
                menu.remove();
            };
            menu.appendChild(item);
        };

        addItem('Show Info Card', () => {
            // Get rich semantic data
            const node = container.getNodeById(nodeId);
            const semantic = node?.semanticData;

            const hc = HoverCard;
            if (hc) {
                let kind: 'entity' | 'literal' = 'literal';
                let idOrValue: string = nodeId;
                let dataType: string | undefined = undefined;
                let lang: string | undefined = undefined;

                if (semantic?.nodeId) {
                    kind = 'entity';
                    idOrValue = semantic.nodeId;
                } else if (semantic?.uri) {
                    kind = 'entity';
                    idOrValue = semantic.uri;
                } else if (semantic?.literal) {
                    kind = 'literal';
                    const lit = semantic.literal;
                    idOrValue = typeof lit === 'object' ? lit.value : lit;
                    dataType = typeof lit === 'object' ? lit.dataType : undefined;
                    lang = typeof lit === 'object' ? lit.lang : undefined;
                } else if (node?.type === 'value' && node?.isData) {
                    // Strongest signal for a literal in 3D
                    kind = 'literal';
                    idOrValue = node.label;
                } else {
                    // Fallback for nodes without structured semantic data
                    const isUriLink = nodeId.startsWith('http') || nodeId.includes('://') || nodeId.startsWith('urn:');
                    kind = isUriLink ? 'entity' : 'literal';
                    idOrValue = nodeId;
                }

                setTimeout(() => {
                    hc.showHoverCard({
                        kind,
                        idOrValue: String(idOrValue),
                        dataType,
                        lang
                    }, x, y);
                }, 50);
            } else {
                // HoverCard not found
            }
        });

        const node = container.getNodeById(nodeId);
        const semantic = node?.semanticData;
        const isEntity = (node?.type === 'focus') || (node?.type === 'value' && semantic?.uri && !node?.isData);

        if (isEntity && semantic?.uri) {
            addItem('Show in Edit Window', () => {
                this.openEntityEditor(semantic.uri!);
            });

            addItem('Expand Entity Connections', () => {
                const origin = node?.position || [0, 0, 0];
                this.expand3DEntity(semantic.uri!, [origin[0], origin[1], origin[2]], container, nodeId);
            });
        }

        addItem(`${uiState.showOrphansIn3D ? '✓' : '○'} Show Orphan Properties`, () => {
            uiState.showOrphansIn3D = !uiState.showOrphansIn3D;
            // Force re-render of current window
            const win = this.windowManager.getWindow(winId);
            if (win) {
                const kg = KGEntity.get(this.factory.namedNode(winId.replace('3d_', '')));
                if (kg.structured) {
                    const showEmpty = (container as any).showEmptyProps || false;
                    const data = Entity3DAdapter.adapt(kg.structured, showEmpty, uiState.showOrphansIn3D);
                    container.updateGraph(data);
                }
            }
        });


        document.body.appendChild(menu);

        // Close menu on click outside
        const closer = (e: MouseEvent) => {
            // If click is INSIDE the menu, ignore it here (let item.onclick handle it)
            if (menu.contains(e.target as Node)) {
                return;
            }
            menu.remove();
            document.removeEventListener('mousedown', closer);
        };
        setTimeout(() => document.addEventListener('mousedown', closer), 10);
    }
}

export const state = new AppState();
(window as any).state = state;

/**
 * Global Glue for Triple Editor (RDF-star Identity Shift & Annotations)
 */
(window as any).saveTripleIdentityShift = async (winId: string, oldTripleIDStr: string) => {
    try {
        const oldId = BigInt(oldTripleIDStr);
        const sInput = document.getElementById(`te_s_${winId}`) as HTMLInputElement;
        const pInput = document.getElementById(`te_p_${winId}`) as HTMLInputElement;
        const oInput = document.getElementById(`te_o_${winId}`) as HTMLInputElement;

        if (!sInput || !pInput || !oInput) throw new Error("Could not find inputs for Triple Shift");

        const sVal = sInput.getAttribute('data-val');
        const pVal = pInput.getAttribute('data-val');
        const oVal = oInput.value;

        if (!sVal || !pVal || !oVal) throw new Error("Shift input values are missing.");

        const subjectVal = state.factory.namedNode(sVal);
        const predicateVal = state.factory.namedNode(pVal);
        let objectVal: any;
        if (oVal.startsWith('http') || oVal.includes('://')) {
            objectVal = state.factory.namedNode(oVal);
        } else {
            objectVal = state.factory.literal(oVal);
        }

        const newId = (state.factory as any).triple(subjectVal, predicateVal, objectVal);

        if (newId === oldId) {
            alert("No identity shift detected. The triple remains the same.");
            return;
        }

        state.ensureSession();

        // 1. Find all annotations pointing to the old triple as Subject
        // Check Store
        const annQuadsFromStore = Array.from(state.store.match(oldId, null, null, null));
        // Check Session
        const annQuadsFromSession = state.currentSession!.additions.match(oldId, null, null, null);

        // 2. Migrate annotations to the new triple ID
        for (const q of annQuadsFromStore) {
            state.currentSession!.add(newId, q[1], q[2], q[3]);
            state.currentSession!.delete(oldId, q[1], q[2], q[3]);
        }
        for (const q of annQuadsFromSession) {
            state.currentSession!.add(newId, q[1], q[2], q[3]);
            state.currentSession!.delete(oldId, q[1], q[2], q[3]);
        }

        // 3. Ensure the new triple exists in user session
        state.currentSession!.add(subjectVal, predicateVal, objectVal, state.factory.namedNode(DEFAULT_WRITE_GRAPH));

        alert("Identity shifted. All annotations migrated to new Triple ID.");
        state.windowManager.close(winId);
        state.windowManager.refreshAllWindows();
    } catch (e: any) {
        alert(`Identity Shift Failed: ${e.message}`);
    }
};

(window as any).addTripleAnnotation = (tripleIDStr: string, propIDStr: string, val: string) => {
    try {
        const id = BigInt(tripleIDStr);
        const p = BigInt(propIDStr);
        state.ensureSession();

        let o: any;
        if (val.startsWith('http') || val.includes('://') || val.startsWith('urn:')) {
            o = state.factory.namedNode(val);
        } else {
            o = state.factory.literal(val);
        }

        state.currentSession!.add(id, p, o, state.factory.namedNode(DEFAULT_WRITE_GRAPH));
        state.windowManager.refreshAllWindows();
    } catch (e: any) {
        alert(e.message);
    }
};

(window as any).removeTripleAnnotation = (tripleIDStr: string, propIDStr: string, objIDStr: string) => {
    try {
        const id = BigInt(tripleIDStr);
        const p = BigInt(propIDStr);
        const o = BigInt(objIDStr);
        state.ensureSession();
        state.currentSession!.delete(id, p, o, null as any);
        state.windowManager.refreshAllWindows();
    } catch (e: any) {
        alert(e.message);
    }
};

(window as any).addTripleAnnotationNew = (tripleIDStr: string, propURI: string, val: string) => {
    try {
        const id = BigInt(tripleIDStr);
        const p = state.factory.namedNode(propURI);
        state.ensureSession();
        let o: any;
        if (val.startsWith('http') || val.includes('://')) {
            o = state.factory.namedNode(val);
        } else {
            o = state.factory.literal(val);
        }
        state.currentSession!.add(id, p, o, state.factory.namedNode(DEFAULT_WRITE_GRAPH));
    } catch (e: any) {
        alert(e.message);
    }
};
