export interface SparqlQuery {
    queryType: 'SELECT' | 'CONSTRUCT' | 'ASK' | 'DESCRIBE';
    variables: (Variable | NamedNode)[] | ['*'];
    where: Pattern[];
    type: 'query';
    prefixes: {
        [prefix: string]: string;
    };
    group?: Grouping[];
    having?: Expression[];
    order?: Ordering[];
    limit?: number;
    offset?: number;
    distinct?: boolean;
    reduced?: boolean;
    template?: Triple[];
}
export interface SparqlUpdate {
    type: 'update';
    prefixes: {
        [prefix: string]: string;
    };
    updates: UpdateOperation[];
}
export type UpdateOperation = InsertDeleteOperation;
export interface InsertDeleteOperation {
    updateType: 'insert' | 'delete' | 'insertdelete';
    insert?: BgpPattern[];
    delete?: BgpPattern[];
    where?: Pattern[];
    graph?: string;
}
export type Term = NamedNode | Literal | Variable | BlankNode | TripleTerm;
export interface NamedNode {
    termType: 'NamedNode';
    value: string;
    equals(other: Term | null | undefined): boolean;
}
export interface Variable {
    termType: 'Variable';
    value: string;
    equals(other: Term | null | undefined): boolean;
}
export interface Literal {
    termType: 'Literal';
    value: string;
    language: string;
    datatype?: NamedNode;
    equals(other: Term | null | undefined): boolean;
}
export interface BlankNode {
    termType: 'BlankNode';
    value: string;
    equals(other: Term | null | undefined): boolean;
}
export interface TripleTerm {
    termType: 'Triple' | 'Quad';
    subject: Term;
    predicate: Term;
    object: Term;
}
export interface Triple {
    subject: Term;
    predicate: Term | PropertyPath;
    object: Term;
}
export declare function isTriple(term: any): term is TripleTerm;
export type Pattern = BgpPattern | FilterPattern | GraphPattern | UnionPattern | OptionalPattern | MinusPattern | GroupPattern | SparqlQuery | BindPattern | ValuesPattern | ServicePattern;
export interface ValuesPattern {
    type: 'values';
    values: {
        [key: string]: Term | undefined;
    }[];
}
export interface ServicePattern {
    type: 'service';
    name: NamedNode | Variable;
    patterns: Pattern[];
    silent: boolean;
}
export interface BgpPattern {
    type: 'bgp';
    triples: Triple[];
}
export interface GroupPattern {
    type: 'group';
    patterns: Pattern[];
}
export interface GraphPattern {
    type: 'graph';
    name: NamedNode | Variable;
    patterns: Pattern[];
}
export interface UnionPattern {
    type: 'union';
    patterns: Pattern[];
}
export interface OptionalPattern {
    type: 'optional';
    patterns: Pattern[];
}
export interface MinusPattern {
    type: 'minus';
    patterns: Pattern[];
}
export interface BindPattern {
    type: 'bind';
    variable: Variable;
    expression: Expression;
}
export interface FilterPattern {
    type: 'filter';
    expression: Expression;
}
export type Expression = OperationExpression | AggregateExpression | Term;
export interface OperationExpression {
    type: 'operation';
    operator: '!' | '&&' | '||' | 'not exists' | 'notexists' | 'exists' | '>' | '<' | '=' | '!=' | '>=' | '<=' | 'not' | 'and' | 'or' | 'ucase' | 'lcase' | 'str' | 'lang' | 'bound' | 'strstarts';
    args: (ExpressionArg | Pattern)[];
}
export type ExpressionArg = Term | Expression;
export interface VariableExpression {
    variable: Variable;
    expression: Expression;
}
export interface AggregateExpression {
    type: 'aggregate';
    aggregation: 'SUM' | 'COUNT' | 'MIN' | 'MAX' | 'AVG' | 'SAMPLE' | 'GROUP_CONCAT';
    expression: Expression | Term;
    distinct?: boolean;
    separator?: string;
}
export interface Grouping {
    expression: Expression;
}
export interface Ordering {
    expression: Expression;
    descending?: boolean;
}
export interface PropertyPath {
    type: 'path';
    pathType: '|' | '/' | '^' | '+' | '*' | '?' | '!';
    items: (PropertyPath | NamedNode)[];
}
export declare function isPropertyPath(term: any): term is PropertyPath;
