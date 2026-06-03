export type NodeID = bigint;
export declare const NodeType: {
    readonly URI: 1n;
    readonly BNODE: 2n;
    readonly LITERAL: 3n;
    readonly TRIPLE: 5n;
};
export type NodeType = typeof NodeType[keyof typeof NodeType];
export declare const MASK_TYPE = 17293822569102704640n;
export declare const SHIFT_TYPE = 60n;
export declare const DEFAULT_GRAPH: NodeID;
export interface Quad {
    subject: NodeID;
    predicate: NodeID;
    object: NodeID;
    graph: NodeID;
}
export type EventSource = 'user' | 'inference' | 'system';
export interface DataEvent {
    type: 'add' | 'delete';
    quads: Quad[];
    source: EventSource;
}
export interface TripleToken {
    termType: 'Triple';
    subject: NodeID;
    predicate: NodeID;
    object: NodeID;
    value: string;
}
export type Token = {
    termType: 'NamedNode' | 'BlankNode' | 'Literal';
    value: string;
    datatype?: string;
    language?: string;
} | TripleToken;
export interface IDataFactory {
    namedNode(uri: string): NodeID;
    blankNode(label?: string): NodeID;
    literal(value: string, datatype?: string, language?: string): NodeID;
    triple(subject: NodeID, predicate: NodeID, object: NodeID): NodeID;
    decode(id: NodeID): Token;
}
export interface IQuadStore {
    readonly size: number;
    add(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID, source?: EventSource): boolean;
    addQuads(quads: Quad[], source?: EventSource): number;
    delete(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID, source?: EventSource): boolean;
    clearGraph(graph: NodeID, source?: EventSource): number;
    match(subject: NodeID | null, predicate: NodeID | null, object: NodeID | null, graph?: NodeID | null): Iterable<[NodeID, NodeID, NodeID, NodeID]>;
    has(subject: NodeID, predicate: NodeID, object: NodeID, graph?: NodeID): boolean;
    hasAny(subject: NodeID, predicate: NodeID, object: NodeID): boolean;
    moveQuads(sourceGraphId: NodeID, targetGraphId: NodeID): number;
    on(event: 'data', listener: (event: DataEvent) => void): void;
    off(event: 'data', listener: (event: DataEvent) => void): void;
}
