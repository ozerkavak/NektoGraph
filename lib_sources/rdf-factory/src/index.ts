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

class BaseTerm implements Term {
    constructor(public termType: any, public value: string) {}
    equals(other: Term | null | undefined): boolean {
        return !!other && other.termType === this.termType && other.value === this.value;
    }
}

class NamedNodeImpl extends BaseTerm implements NamedNode {
    constructor(value: string) { super('NamedNode', value); }
}

class BlankNodeImpl extends BaseTerm implements BlankNode {
    constructor(value: string) { super('BlankNode', value); }
}

class LiteralImpl extends BaseTerm implements Literal {
    constructor(value: string, public language: string, public datatype: NamedNode) {
        super('Literal', value);
    }
    equals(other: Term | null | undefined): boolean {
        return super.equals(other) && 
               (other as Literal).language === this.language && 
               (other as Literal).datatype.equals(this.datatype);
    }
}

class VariableImpl extends BaseTerm implements Variable {
    constructor(value: string) { super('Variable', value); }
}

class DefaultGraphImpl extends BaseTerm implements DefaultGraph {
    constructor() { super('DefaultGraph', ''); }
}

class QuadImpl implements Quad {
    public termType: 'Triple' | 'Quad' = 'Triple';
    public value: string = '';

    constructor(
        public subject: Term,
        public predicate: Term,
        public object: Term,
        public graph: Term
    ) {
        // RDFJS: value of a quad/triple is strictly an empty string.
        this.value = ''; 
    }
    equals(other: Quad | null | undefined): boolean {
        const o = other as any;
        return !!o && 
               (o.termType === 'Triple' || o.termType === 'Quad') &&
               this.subject.equals(o.subject) &&
               this.predicate.equals(o.predicate) &&
               this.object.equals(o.object) &&
               this.graph.equals(o.graph);
    }
}

export class DataFactory {
    static namedNode(value: string): NamedNode {
        return new NamedNodeImpl(value);
    }

    static blankNode(value?: string): BlankNode {
        return new BlankNodeImpl(value || `b${Math.random().toString(36).substring(2)}`);
    }

    static literal(value: string, languageOrDatatype?: string | NamedNode): Literal {
        if (typeof languageOrDatatype === 'string') {
            if (languageOrDatatype.indexOf(':') > 0 || languageOrDatatype.startsWith('http')) {
                return new LiteralImpl(value, '', new NamedNodeImpl(languageOrDatatype));
            }
            return new LiteralImpl(value, languageOrDatatype, new NamedNodeImpl('http://www.w3.org/1999/02/22-rdf-syntax-ns#langString'));
        }
        return new LiteralImpl(value, '', languageOrDatatype || new NamedNodeImpl('http://www.w3.org/2001/XMLSchema#string'));
    }

    static variable(value: string): Variable {
        return new VariableImpl(value);
    }

    static defaultGraph(): DefaultGraph {
        return new DefaultGraphImpl();
    }

    static quad(subject: Term, predicate: Term, object: Term, graph?: Term): Quad {
        return new QuadImpl(subject, predicate, object, graph || new DefaultGraphImpl());
    }
}

// Singleton export for easy use
export const factory = DataFactory;
