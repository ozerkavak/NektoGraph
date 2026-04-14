# Transport Layer: Developer Tutorial

Welcome to the Antigravity Transport Layer developer guide. This document provides practical "recipes" for common data movement tasks.

> [!IMPORTANT]
> **BigInt Handling:** All IDs in the Antigravity ecosystem use `BigInt` for high-performance indexing. When moving data to a UI or JSON-based API, ensure you convert these to `Strings`.

---

## 👨‍🍳 Recipes

### 1. Fetching Specific Graphs from SPARQL
Don't just fetch everything. Target specific named graphs efficiently.

```typescript
import { RemoteLoader } from './RemoteLoader';

const endpoint = "https://example.org/sparql";
const targetGraphs = ["http://antigravity.org/ontology", "http://antigravity.org/data"];

const nquads = await RemoteLoader.fetchSelectedGraphs(
    endpoint, 
    targetGraphs, 
    1000 // Limit per graph
);

console.log(`Fetched ${nquads.length} bytes of N-Quads.`);
```

### 2. High-Performance Parsing in a Worker
Always run parsing in a Worker to prevent UI freezing.

```typescript
// inside worker.ts
import { UniversalParser } from './transport/UniversalParser';

const parser = new UniversalParser();
const content = "... large turtle file ...";

await parser.parse(content, 'Turtle', (quad) => {
    // Process quad one by one
    self.postMessage({ type: 'QUAD_READY', quad: serialize(quad) });
});
```

### 3. Exporting Data with BaseURI
Support relative URIs in your exports for better portability.

```typescript
import { UniversalSerializer } from './UniversalSerializer';

const serializer = new UniversalSerializer();
const myQuads = [...]; // Array of RDF/JS Quads

const turtle = await serializer.serialize(myQuads, {
    format: 'Turtle',
    baseIRI: 'https://antigravity.org/project/v1/',
    prefixes: {
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'foaf': 'http://xmlns.com/foaf/0.1/'
    }
});

console.log(turtle); // Output will include @base and @prefix headers
```

---

## ⚙️ Advanced: Troubleshooting RDF/XML
If your source uses `rdf:datatype="...#langString"`, the `UniversalParser` automatically strips these redundant headers to allow correct language tag extraction. This is a built-in "Antigravity Patch".

## 🚧 Status & Limitations
- **RDF/XML Serialization:** Currently not available (Parse-only).
- **Large Files:** For files > 500MB, use the streaming interface directly through `parseStream` in `UniversalParser.ts`.

