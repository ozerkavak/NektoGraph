# SPARQL Engine Tutorial

This tutorial provides practical recipes for querying and updating your knowledge graph using the `@triplestore/sparql` engine.

## 1. Executing a Simple SELECT
The most common operation is finding bindings for specific patterns.

```typescript
import { SPARQLEngine, QueryParser } from '@triplestore/sparql';

const engine = new SPARQLEngine(store, factory);
const parser = new QueryParser();

const query = `
  SELECT ?name ?age
  WHERE {
    ?person <http://foaf/name> ?name .
    ?person <http://schema/age> ?age .
    FILTER(?age > 30)
  }
`;

const stream = await engine.execute(parser.parse(query));
for await (const [nameId, ageId] of stream) {
    console.log("Found:", factory.decode(nameId), factory.decode(ageId));
}
```

## 2. Using Property Paths
NektoGraph supports SPARQL 1.1 property paths for traversing hierarchies.

```sparql
# Find all ancestors of a class using the transitive '+' path
SELECT ?ancestor
WHERE {
  <http://example/MyClass> <http://www.w3.org/2000/01/rdf-schema#subClassOf>+ ?ancestor .
}
```

## 3. Data Mutation with UpdateEngine
You can modify the store using standard SPARQL Update syntax.

```typescript
import { UpdateEngine } from '@triplestore/sparql';

const updates = new UpdateEngine(store, factory, engine);

const update = `
  DELETE { ?s <http://foaf/name> ?old }
  INSERT { ?s <http://foaf/name> "New Name" }
  WHERE  { ?s <http://foaf/name> ?old . FILTER(str(?old) = "Old Name") }
`;

await updates.execute(parser.parse(update));
```

## 4. Aggregate Queries
Perform analytics directly on the graph.

```sparql
SELECT ?type (COUNT(?s) AS ?count)
WHERE {
  ?s a ?type .
}
GROUP BY ?type
HAVING (?count > 5)
```

## 5. SPARQL-star (RDF-star)
Query and update metadata about statements using the `<< >>` syntax.

```sparql
# Find all comments of a specific triple
SELECT ?comment
WHERE {
  <<:subject :predicate :object>> <http://schema/comment> ?comment .
}
```

### The Occurrence Pattern (`rdf:reifies`)
NektoGraph standardizes on the `rdf:reifies` property to link metadata (occurrences) to quoted triples. This is the preferred way to handle temporal or sourced data.

```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?occ ?date
WHERE {
  ?occ rdf:reifies << ?s ?p ?o >> ;
       :startDate ?date .
}
```

### Triple Functions
You can extract components from a reified triple using built-in functions:

```sparql
SELECT (subject(?t) AS ?s) (predicate(?t) AS ?p) (object(?t) AS ?o)
WHERE {
  ?occ rdf:reifies ?t .
}
```

---

## 6. Advanced: Cross-Graph Semantic Joins
NektoGraph uses **Semantic Partitioning**. Data is often split across graphs like `ontology`, `controlled_vocab`, and `user_data`. 

### The Universal Join Pattern
Instead of hardcoding graph names, use the "Universal Join" to find knowledge wherever it resides in the `CompositeStore`.

```sparql
SELECT ?label ?unitName ?date
WHERE {
  # Partition 1: Find the occurrence and its date
  GRAPH ?g1 {
    ?occ rdf:reifies << ?person :memberOf ?unit >> ;
         :startDate ?date .
    ?person rdfs:label ?label .
  }
  
  # Partition 2: Join with unit metadata in another graph
  GRAPH ?g2 {
     ?unit rdfs:label ?unitName .
  }
}
```

> [!IMPORTANT]
> **BNode Identity Unification**: NektoGraph automatically unifies BNode labels (e.g., `_:occ1`) across different quads during import. In the UI and SPARQL results, these unified nodes are prefixed with `b1_` (e.g., `b1_occ1`). You can safely use these IDs to join metadata quads with reification quads.

### Metadata Protection & Proxy Unboxing
NektoGraph's loader automatically "unboxes" double-indirection proxies (`occ -> bnode -> triple` becomes `occ -> triple`). However, if a proxy BNode carries its own metadata, it is preserved to ensure zero data loss.

---
```

---

> [!TIP]
> Use `engine.setIgnoredGraphs([logGraphId])` to exclude specific graphs (like audit logs) from your default SPARQL queries while still allowing explicit access via `GRAPH <...>`.

