/** 
 * Nektograph V6 Library Truth (Type Repository)
 * Standalone ambient type definitions for isolated @triplestore modules.
 */

// 1. Core
export type NodeID = bigint;
export declare const DEFAULT_GRAPH: NodeID;

export interface Quad {
    subject: NodeID;
    predicate: NodeID;
    object: NodeID;
    graph: NodeID;
}

export type QuadArray = [NodeID, NodeID, NodeID, NodeID];

export interface DataEvent {
    type: 'add' | 'delete' | 'clear' | 'load';
    quads: Quad[];
    source?: string;
}

export type EventSource = 'user' | 'system' | 'inference' | 'remote' | 'initial' | string;

export interface IDataFactory {
    namedNode(val: string): NodeID;
    literal(val: string, datatype?: string, language?: string): NodeID;
    blankNode(val?: string): NodeID;
    defaultGraph(): NodeID;
    decode(id: NodeID): { 
        termType: string; 
        value: string; 
        datatype?: any; 
        language?: string;
        subject?: NodeID;
        predicate?: NodeID;
        object?: NodeID;
    };
    quad(s: NodeID, p: NodeID, o: NodeID, g?: NodeID): NodeID;
    triple(s: NodeID, p: NodeID, o: NodeID): NodeID;
}

export interface IQuadStore {
    add(s: NodeID, p: NodeID, o: NodeID, g?: NodeID, source?: EventSource): any;
    delete(s: NodeID, p: NodeID, o: NodeID, g?: NodeID, source?: EventSource): any;
    addQuads?(quads: (QuadArray | Quad)[], source?: EventSource): void;
    deleteQuads?(quads: (QuadArray | Quad)[], source?: EventSource): void;
    match(s: NodeID | null, p: NodeID | null, o: NodeID | null, g?: NodeID | null): Iterable<QuadArray>;
    size: number;
    on(event: string, callback: (data: DataEvent) => void): any;
    off(event: string, callback: (data: DataEvent) => void): any;
    has(s: NodeID, p: NodeID, o: NodeID, g?: NodeID): boolean;
    hasAny(s: NodeID, p: NodeID, o: NodeID): boolean;
    clearGraph(graph: NodeID, source?: EventSource): number;
    moveQuads(src: NodeID, dst: NodeID): number;
    getMetrics?(): any;
}

export declare class QuadStore implements IQuadStore {
    constructor();
    add(s: NodeID, p: NodeID, o: NodeID, g?: NodeID, source?: EventSource): any;
    delete(s: NodeID, p: NodeID, o: NodeID, g?: NodeID, source?: EventSource): any;
    addQuads(quads: (QuadArray | Quad)[], source?: EventSource): void;
    deleteQuads(quads: (QuadArray | Quad)[], source?: EventSource): void;
    match(s: NodeID | null, p: NodeID | null, o: NodeID | null, g?: NodeID | null): Iterable<QuadArray>;
    size: number;
    on(event: string, callback: (data: DataEvent) => void): any;
    off(event: string, callback: (data: DataEvent) => void): any;
    emit(event: string, data: any): void;
    has(s: NodeID, p: NodeID, o: NodeID, g?: NodeID): boolean;
    hasAny(s: NodeID, p: NodeID, o: NodeID): boolean;
    clearGraph(graph: NodeID, source?: EventSource): number;
    moveQuads(src: NodeID, dst: NodeID): number;
    getMetrics(): any;
}

export declare class IDFactory implements IDataFactory {
    constructor();
    namedNode(val: string): NodeID;
    literal(val: string, datatype?: string, language?: string): NodeID;
    blankNode(val?: string): NodeID;
    defaultGraph(): NodeID;
    decode(id: NodeID): { 
        termType: string; 
        value: string; 
        datatype?: any; 
        language?: string;
        subject?: NodeID;
        predicate?: NodeID;
        object?: NodeID;
    };
    quad(s: NodeID, p: NodeID, o: NodeID, g?: NodeID): NodeID;
    triple(s: NodeID, p: NodeID, o: NodeID): NodeID;
}

// 2. IO
export interface ParseOptions {
    graph?: NodeID;
    baseIRI?: string;
    filename?: string;
    format?: string;
    graphRewriter?: (g: string | undefined) => string;
    onPrefix?: (prefix: string, iri: string) => void;
    onBase?: (iri: string) => void;
}
export type ParserOptions = ParseOptions;
export interface SerializerOptions {
    baseIRI?: string;
    format?: string;
}
export declare class QuadLoader {
    constructor(store: IQuadStore, factory: IDataFactory);
    load(content: string, options?: ParseOptions): Promise<{ triples: number, graphs: string[] }>;
}
export declare class UniversalParser {
    parse(content: string, format: string, callback: (q: any) => void): Promise<{ graphs: string[] }>;
}
export declare class UniversalSerializer {
    serialize(store: IQuadStore, format: string, options?: SerializerOptions): Promise<string>;
}

// 3. Search
export declare class UnifiedSearch {
    constructor(config: { store: IQuadStore, factory: IDataFactory, schemaIndex?: any });
    search(store: IQuadStore, query: string, options?: any): Promise<any[]>;
    buildIndex(): Promise<void>;
    invalidateIndex(): void;
    updateEntityIndex(id: NodeID, sessionStore?: any): void;
    removeEntityIndex(id: NodeID): void;
}

// 4. Sparql
export declare class SPARQLEngine {
    constructor(store: IQuadStore, factory: IDataFactory);
    execute(query: string | any, options?: any): Promise<any>;
    getVariableNames(query: any): string[];
    setIgnoredGraphs(graphs: NodeID[]): void;
}
export declare class QueryParser {
    parse(query: string): any;
}

// 5. Inference
export declare class InferenceEngine {
    constructor(store: IQuadStore, factory?: IDataFactory);
    register(module: any): void;
    run(): Promise<void>;
    isEnabled(id: string): boolean;
    enable(id: string): void;
    disable(id: string): void;
    inferForSession(event: any, session: any): Promise<void>;
    getModules(): Map<string, any>;
    pause(): void;
    resume(): void;
    setIgnoredGraphs(graphs: NodeID[]): void;
    refresh(): Promise<void>;
    recompute(): Promise<void>;
}
export declare class SchemaInspector {
    constructor(factory: IDataFactory | IQuadStore);
    getMetrics(store: IQuadStore, graph?: NodeID): any;
}
export declare const SubClassOfModule: any;
export declare const SubPropertyOfModule: any;
export declare const RangeModule: any;
export declare const DomainModule: any;
export declare const TransitivePropertyModule: any;
export declare const SymmetricPropertyModule: any;
export declare const FunctionalPropertyModule: any;
export declare const InverseFunctionalPropertyModule: any;
export declare const ReflexivePropertyModule: any;
export declare const InverseOfModule: any;

// 6. Hover
export declare class HoverCard {
    static init(config: any): void;
    static showHoverCard(config: any, x: number, y: number): void;
}

// 7. Generator
export declare class IDGenerator {
    constructor(config: any);
    generate(count: number): string[];
    createUniqueId(): Promise<string>;
    checkUniqueness(id: string): Promise<boolean>;
}

// 8. Window Manager
export type WindowContentRenderer = (container: HTMLElement, winId: string) => void;
export interface WindowRect {
    x: number; y: number; width: number; height: number;
}
export interface WindowState {
    id: string;
    entityId: string | null;
    title: string;
    metadata?: any;
    x: number; y: number; width: number; height: number;
    zIndex: number;
    isMinimized: boolean;
    isMaximized: boolean;
    prevBounds?: WindowRect;
    group?: string;
}
export declare class WorkbenchWindow {
    id: string;
    state: WindowState;
    element: HTMLElement;
    content: HTMLElement;
    setTitle(title: string): void;
    bringToFront(): void;
    setBounds(rect: WindowRect): void;
    refresh(): void;
    restore(): void;
    close(): void;
}
export declare class WindowManager {
    windows: Map<string, WorkbenchWindow>;
    onStateChange: () => void;
    constructor(containerId: string);
    setTheme(theme: 'day' | 'night' | 'custom'): void;
    setContainer(containerId: string): void;
    getWindow(id: string): WorkbenchWindow | undefined;
    listWindows(): WorkbenchWindow[];
    create(entityId: string | null, title: string, contentRenderer: WindowContentRenderer, metadata?: any, group?: string): WorkbenchWindow;
    focus(id: string): void;
    close(id: string): void;
    minimize(id: string): void;
    minimizeAll(): void;
    toggleMinimizeAll(): void;
    restoreAll(): void;
    closeAll(): void;
    cascade(): void;
    refreshAllWindows(): void;
    refreshWindows(entityId: string): void;
    renameWindow(oldId: string, newEntityId: string): void;
}
