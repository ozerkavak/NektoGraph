import { IQuadStore, IDataFactory, NodeID } from '../../../lib_sources/quadstore-core/src/index.ts';
import { SparqlQuery, Triple, SparqlUpdate } from './ast';

export type RawBinding = bigint[];
export declare class SPARQLEngine {
    private store;
    private factory;
    private optimizer;
    private evaluator;
    private aggregator;
    private ignoredGraphs;
    constructor(store: IQuadStore, factory: IDataFactory);
    setIgnoredGraphs(graphIDs: NodeID[]): void;
    execute(query: SparqlQuery | SparqlUpdate, baseGraph?: NodeID): Promise<AsyncIterableIterator<RawBinding | Triple> | boolean | void>;
    executeUpdate(update: SparqlUpdate, baseGraph?: NodeID): Promise<void>;
    private executeInternal;
    private processConstruct;
    private processDescribe;
    private constructTerm;
    private resizeBindings;
    private processExtension;
    private processOrdering;
    private processDistinct;
    private processSlicing;
    getVariableNames(query: SparqlQuery): string[];
    private isWildcard;
    private hasGroupingOrAggregation;
    private processGrouping;
    private aggregateGroup;
    private evaluateGroupExpression;
    private hasAggregates;
    private initialStream;
    private processPattern;
    private processBind;
    private processSubQuery;
    private processMinus;
    private processOptional;
    private processValues;
    private processService;
    private processFilter;
    private processBgp;
    private processGraph;
    private processGroup;
    private processUnion;
    private initialStreamFromBinding;
    private join;
    /**
     * Recursively checks if a NodeID matches a TripleTerm pattern and updates the binding.
     */
    private matchesTriplePattern;
    private joinWithPath;
    private evaluatePath;
    private transitiveClosurePlus;
    private termToId;
}
