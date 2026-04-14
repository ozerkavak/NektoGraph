# SPARQL Engine Features & API Specification

This document details the capabilities of the `@triplestore/sparql` library, complying with SPARQL 1.1 standards.

## Supported Query Types

### 1. SELECT
Standard projection of variables matches.
- **Modifiers:** `ORDER BY`, `LIMIT`, `OFFSET`, `DISTINCT` (via Set)
- **Aggregation:** `GROUP BY`, `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, `SAMPLE`
- **Subqueries:** Fully supported using nested loop joins.

### 2. CONSTRUCT
Generates an RDF Graph based on a template.
- **Behavior:** Returns a stream of "Hydrated Triples" (Terms, not IDs).
- **Blank Nodes:** Fresh blank nodes are generated for each solution if the template contains blank nodes.
- **Return Type:** `AsyncIterableIterator<Triple>`

### 3. ASK
Boolean check for pattern existence.
- **Return Type:** `Promise<boolean>`

## Supported Patterns

| Pattern | Status | Description |
| :--- | :--- | :--- |
| **BGP** | ✅ | Basic Graph Pattern matching. |
| **FILTER** | ✅ | Supports logical (&&, \|\|, !) and comparison operators. |
| **OPTIONAL** | ✅ | Left Join logic. Preserves solution if optional part fails. |
| **UNION** | ✅ | Merges results from alternative patterns. |
| **MINUS** | ✅ | Strict subtraction. Only removes bindings if disjoint domains have overlap. |
| **GRAPH** | ✅ | Named graph matching (Static URI and Variable). |
| **BIND** | ✅ | Variable assignment from expressions. |
| **VALUES** | ✅ | Inline data blocks for injecting bindings. |
| **SERVICE** | ⚠️ | Parsing supported. Execution currently stubbed (Silent supported). |
| **Property Paths** | ✅ | Supports `/`, `^`, `|`, `*`, `+`, `?` operators. |

## Functions Library

Comprehensive support for SPARQL 1.1 functions:
- **String:** `REGEX`, `CONCAT`, `REPLACE`, `SUBSTR`, `STRLEN`, `UCASE`, `LCASE`, `STRSTARTS`, `STRENDS`, `CONTAINS`
- **Math:** `ABS`, `ROUND`, `CEIL`, `FLOOR`, `RAND`
- **Math:** `ABS`, `ROUND`, `CEIL`, `FLOOR`, `RAND`

> **Note:** Logical functions `BOUND`, `IF`, `COALESCE` are currently **planned** but not yet implemented.

## API Usage

### `SPARQLEngine.execute(query: SparqlQuery)`

The main entry point. The return type depends on the query type:

```typescript
// SELECT
const stream = await engine.execute(selectQuery); 
// returns AsyncIterableIterator<RawBinding> (Use IDFactory to decode)

// ASK
const result = await engine.execute(askQuery);
// returns boolean

// CONSTRUCT
const triples = await engine.execute(constructQuery);
// returns AsyncIterableIterator<Triple> (Objects are fully decoded Terms)
```

