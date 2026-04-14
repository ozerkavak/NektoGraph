import { SparqlQuery, SparqlUpdate } from './ast';

export declare class QueryParser {
    parse(query: string): SparqlQuery | SparqlUpdate;
}
