/**
 * RDFFactory - Zero-dependency RDFJS compliant DataFactory implementation.
 * Used for interoperability between external parsers and internal engine.
 */
export interface Term {
    termType: string;
    value: string;
    equals(other: Term | null | undefined): boolean;
}
export interface NamedNode extends Term {
    termType: 'NamedNode';
}
export interface BlankNode extends Term {
    termType: 'BlankNode';
}
export interface Literal extends Term {
    termType: 'Literal';
    datatype: NamedNode;
    language: string;
}
export interface Variable extends Term {
    termType: 'Variable';
}
export interface DefaultGraph extends Term {
    termType: 'DefaultGraph';
}
export interface Quad {
    subject: Term;
    predicate: Term;
    object: Term;
    graph: Term;
    equals(other: Quad | null | undefined): boolean;
}
export declare class DataFactory {
    static namedNode(value: string): NamedNode;
    static blankNode(value?: string): BlankNode;
    static literal(value: string, languageOrDatatype?: string | NamedNode): Literal;
    static variable(value: string): Variable;
    static defaultGraph(): DefaultGraph;
    static quad(subject: Term, predicate: Term, object: Term, graph?: Term): Quad;
}
export declare const factory: typeof DataFactory;
export { RDFSyntax } from './syntax';
