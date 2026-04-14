export type NodeID = bigint;

export const NodeType = {
    URI: 0x1n,
    BNODE: 0x2n,
    LITERAL: 0x3n,
    TRIPLE: 0x5n
} as const;

export type NodeType = typeof NodeType[keyof typeof NodeType];


// Total 64 bits: [Type: 4 bits] [Partition: 4 bits] [Value: 56 bits]
export const MASK_TYPE = 0xF000000000000000n;
export const SHIFT_TYPE = 60n;


export const DEFAULT_GRAPH: NodeID = 0n;

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
    value: string; // human-readable string like << s p o >>
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
