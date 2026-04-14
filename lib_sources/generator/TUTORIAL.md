# 🎓 IDGenerator Developer Tutorial: Resource ID Management

**Package**: `@triplestore/generator`  
**Latest Version**: 1.1 (Semantic Orchestration)  
**Type**: Standalone Browser UMD Module  

---

## 🎯 The Philosophy
`IDGenerator` is the guardian of uniqueness in your Knowledge Graph. It answers the critical question: *"Can I safely create a new entity with this URI?"* by checking both your local session states and your remote master repositories.

## 🛠️ Usage Patterns

### 1. Minimal Setup (Client-Side)
Ideal for simple, standalone local applications where local stores are available.

```typescript
import { IDGenerator } from './libs/generator.js';

const gen = new IDGenerator({
    prefix: 'id_' , // For simple local IDs
    store: myStore,
    factory: myFactory
});

const id = await gen.createUniqueId(); // "id_x7p4m2r1"
```

### 2. High-Integrity URI Management (Enterprise)
For globally distributed Knowledge Graphs where collisions across multiple users must be avoided.

```typescript
const gen = new IDGenerator({
    prefix: 'http://my-ontology.org#', // Valid URI prefix
    endpoint: {
        url: 'https://master.rdf.net/sparql',
        auth: { user: 'robot', password: '***' }
    },
    maxRetries: 15 // More retries for crowded namespaces
});
```

---

## 🏷️ The Uniqueness Validation Lifecycle

When you call `createUniqueId()`, the following sequence (Tiered Validation) occurs:

### Phase 1: Candidate Generation
The generator takes your `prefix` and appends a randomized base-36 tail of 8 characters.  
**Example:** `http://example.org/Parti_` + `x9j7f2w1`

### Phase 2: Tier 1 (Local Local Store Scan)
If a `store` and `factory` are provided, the library performs an O(1) or O(log N) scan:
1.  Encodes the candidate to a `NodeID`.
2.  Checks if it exists in any **Subject** position.
3.  Checks if it exists in any **Object** position (preventing cross-references).

### Phase 3: Tier 2 (Remote SPARQL ASK)
If an `endpoint` is provided, a lightweight `ASK` query is dispatched:
```sparql
ASK WHERE { 
  { <candidateURI> ?p ?o } 
  UNION 
  { ?s ?p <candidateURI> } 
}
```
If the query returns `true`, a collision is detected.

### Phase 4: Retry or Fail
If collision occurs, the generator increments its retry counter and repeats Phase 1. If it hits `maxRetries`, it throws a descriptive error.

---

## 🧬 Dynamic Base URI Recalibration (Integrated)

In the Antigravity Workbench, the generator is **recalibrated** whenever a new ontology is loaded. It automatically detects the dominant `owl:Ontology` base URI and sets it as the new generator prefix.

```typescript
// From AppState.ts
const owlOntology = factory.namedNode('http://www.w3.org/2002/07/owl#Ontology');
// ... logic to detect baseURI from store ...
this.generator = new IDGenerator({
    store: this.store,
    factory: this.factory,
    prefix: baseURI, // Automatically updated!
    maxRetries: 5
});
```

---

## ⚠️ Common Pitfalls

1.  **Missing Prefix Trailing**: If you intend to use URIs, ensure your prefix ends with `/` or `#`. If missing, the library will simply append the random part (e.g., `prefixID`).
2.  **Factory Mismatch**: *Architect Rule #1:* **ALWAYS** use the exact same `IDFactory` instance for the store and the generator. Mismatched factories will result in failed local existence checks.
3.  **SPARQL Permissions**: Remote validation requires the `ASK` query permission. If your endpoint is behind a firewall, ensure you've provided correct `auth` headers.

---
*Maintained by the Antigravity Core Team*

