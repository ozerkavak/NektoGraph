import { Parser as SparqlJsParser } from 'sparqljs';
import { Parser as TraqulaParser } from '@traqula/parser-sparql-1-2';
import { RDFSyntax } from '@triplestore/rdf-factory';

const legacyParser = new SparqlJsParser({ sparqlStar: true });
const traqulaParser = new TraqulaParser();

export function parseSparql(queryString: string): any {
    const normalizedQuery = RDFSyntax.normalizeRdfStar(queryString);
    
    try {
        // Option 1: Try SparqlJS with RDF-Star support (most stable 1.2 syntax for now)
        return legacyParser.parse(normalizedQuery);
    } catch (e) {
        try {
            // Option 2: Fallback to Traqula for specific 1.2 features
            // return the AST directly, do NOT convert to algebra as the engine expects AST structure
            return (traqulaParser as any).parse(normalizedQuery, { rdfStar: true });
        } catch (e2) {
            console.error('[SPARQL 1.2 Parser] Syntax Error:', e2);
            throw e2;
        }
    }
}

