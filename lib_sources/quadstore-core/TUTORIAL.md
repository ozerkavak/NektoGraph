# Quadstore Core

A high-performance RDF Triplestore Core using BigInt and Struct-of-Arrays memory layout.

## Installation

```bash
npm install @triplestore/core
```

## User Guide

### 1. Initialization

First, you need to create an `IDFactory` to manage RDF terms (URIs, Literals, Blank Nodes) and convert them to efficient 64-bit integers (`NodeID`). Then, initialize the `QuadStore`.

```typescript
import { IDFactory, QuadStore } from '@triplestore/core';

const factory = new IDFactory();
const store = new QuadStore(1024); // Initial capacity
```

### 2. Creating Terms

The core operates on `NodeID` (bigint). You must use the factory to create these IDs.

```typescript
const s = factory.namedNode('http://example.com/alice');
const p = factory.namedNode('http://xmlns.com/foaf/0.1/knows');
const o = factory.namedNode('http://example.com/bob');
const g = factory.namedNode('http://example.com/graph1');

const age = factory.literal('25', 'http://www.w3.org/2001/XMLSchema#integer');

// 3. Creating Quoted Triples (RDF-star)
// Quoted triples can be used as subjects or objects in other triples.
const quotedTriple = factory.triple(s, p, o); 
const confidence = factory.namedNode('http://schema/confidence');
const value = factory.literal('0.95');

// Annotate the triple: << :alice :knows :bob >> :confidence "0.95"
store.add(quotedTriple, confidence, value, g);
```

To create a `Quad` object (mostly for bulk operations):
```typescript
const quad = { subject: s, predicate: p, object: o, graph: g };
```

### 3. Adding Data

```typescript
// Add a single quad
store.add(s, p, o, g);

// Add multiple quads
store.addQuads([
  { subject: s, predicate: p, object: age, graph: g }
]);
```

### 4. Querying Data (Match)

The `match` method returns an iterator of tuples `[s, p, o, g]`.

```typescript
// Match all
for (const [s, p, o, g] of store.match(null, null, null, null)) {
    console.log(factory.decode(s).value);
}

// Match specific pattern (e.g., "Alice knows who?")
for (const match of store.match(s, p, null, null)) {
    const objectId = match[2];
    console.log('Alice knows:', factory.decode(objectId).value);
}

### 5. RDF-star & constituent discovery
You can find all quoted triples where a specific node appears as a subject, predicate, or object using the Star Inverted Index.

```typescript
// Find all quoted triples where 'Alice' (s) appears in any role
const triplesWithAlice = factory.findQuotedTriples(s); 

triplesWithAlice.forEach(tripleId => {
    const decoded = factory.decode(tripleId);
    console.log('Found nested triple:', decoded.value); // e.g., "<< Alice knows Bob >>"
});
```

### 6. Deleting Data

```typescript
// Delete specific quad
store.delete(s, p, o, g);

// Clear an entire graph
store.clearGraph(g);
```

## ⚠️ Important: Handling BigInt

This core uses `BigInt` (64-bit integers) for all Node IDs to ensure massive scalability. 

**CRITICAL:** `JSON.stringify` does NOT support BigInt by default. If you need to send IDs to a UI or save them as JSON, you must convert them to Strings first:

```typescript
const id = factory.namedNode('http://example.org');
const jsonReady = id.toString(); // "123456789012345n" 
```

## Performance Recipes

### Recipe: Pre-allocating for Large Datasets
If you know you are about to import a 1 Million quad dataset, pre-allocate the store to avoid resizing overhead.

```typescript
const store = new QuadStore(1_000_000); 
```

### Recipe: Global Search Indexing
The Core is designed to be paired with `@triplestore/search`. Always index during additions for $O(1)$ keyword lookup.

---

### `IDFactory`
- `namedNode(uri: string): NodeID`
- `blankNode(label?: string): NodeID`
- `literal(value: string, datatype?: string, language?: string): NodeID`
- `decode(id: NodeID): Token`

### `QuadStore`
- `add(s, p, o, g, source?): boolean`
- `addQuads(quads[], source?): number`
- `delete(s, p, o, g, source?): boolean`
- `match(s?, p?, o?, g?): Iterable<[NodeID, NodeID, NodeID, NodeID]>`
- `has(s, p, o, g): boolean`
- `clearGraph(graphID): number`
- `on(event, callback): void`

