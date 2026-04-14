import { SparqlQuery, SparqlUpdate } from './ast';
import { parseSparql } from './sparql-adapter';

export class QueryParser {
    public parse(query: string): SparqlQuery | SparqlUpdate {
        const parsed: any = parseSparql(query);

        // 1. Update (INSERT/DELETE) checks
        if (parsed.type === 'update') {
            return parsed as any as SparqlUpdate;
        }

        // 2. SPARQL 1.2 Algebra support:
        // Traqula/Comunica outputs SPARQL Algebra (types like 'project', 'translate', 'query', etc.)
        const validQueryTypes = ['query', 'project', 'translate', 'bgp', 'join'];
        if (validQueryTypes.includes(parsed.type)) {
            return parsed as any as SparqlQuery;
        }

        // 3. Fallback for legacy 'query' type with queryType validation
        if (parsed.type === 'query') {
            if (['SELECT', 'ASK', 'CONSTRUCT', 'DESCRIBE'].includes(parsed.queryType)) {
                return parsed as any as SparqlQuery;
            }
        }

        throw new Error(`Unsupported operation type/structure: ${parsed.type}`);
    }
}
