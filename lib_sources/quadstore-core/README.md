# Quadstore Core

**A ultra-high-performance, Struct-of-Arrays (SoA) based RDF Quadstore for modern JavaScript.**

Quadstore Core is the engine at the heart of the Triplestore ecosystem. It is designed for maximum throughput and minimal garbage collection overhead, utilizing **BigInt-based indexing** and **TypedArrays (Struct-of-Arrays)** to manage millions of quads efficiently within a browser or Node.js environment.

[![npm version](https://img.shields.io/badge/npm-Beta v1.0-blue.svg)](https://www.npmjs.com/package/@triplestore/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ⚡ Performance Features

- **SoA Architecture:** Uses Struct-of-Arrays for superior cache locality and near-zero allocation during scans.
- **BigInt Indexing:** All internal Node IDs are 64-bit integers, providing massive scalability and high-speed comparison.
- **✨ RDF-star (RDF-star) Native:** Built-in support for **Quoted Triples** as a term type. Efficient `TripleToken` intern-ing enables attributing data to facts.
- **✨ Star Inverted Index:** Specialized $O(1)$ constituent-to-triple indices (Subject/Predicate/Object roles) for high-speed metadata discovery.
- **Multi-Index Strategy:** Optimized SPO, POS, OSP, and Graph-based indices ensure $O(1)$ lookup for common RDF patterns.
- **Worker-First:** Designed to run seamlessly in Web Workers using Transferable objects.

## 📦 Architecture

### Data Layout (Struct of Arrays)
Internally, triples are stored in column-oriented typed arrays for maximum cache locality:
```
Index: [0]      [1]      [2]
   S:  [ID:A]   [ID:B]   [ID:A]
   P:  [ID:p1]  [ID:p2]  [ID:p1]
   O:  [ID:X]   [ID:Y]   [ID:Z]
```

### Inverted Indices
To avoid $O(N)$ scans, the store maintains an `IndexMap` for each column:
- `S-Index`: Map<SubjectID, [Row0, Row2]>
- `P-Index`: Map<PredicateID, [Row0, Row2]>
- ...
Deleting a quad performs a "Swap-Remove" on the SoA and automatically updates all indices to keep pointers valid.

## 📦 Installation

```bash
npm install @triplestore/core
```

## 🛠 Quick Start

```typescript
import { IDFactory, QuadStore } from '@triplestore/core';

const factory = new IDFactory();
const store = new QuadStore();

// 1. Create IDs (BigInt)
const s = factory.namedNode('http://example.org/Alice');
const p = factory.namedNode('http://example.org/knows');
const o = factory.namedNode('http://example.org/Bob');
const g = factory.namedNode('http://example.org/graph1');

// 2. Add Quads
store.add(s, p, o, g);

// 3. Fast Patttern Matching
for (const [subject, predicate, object, graph] of store.match(s, null, null, null)) {
    const sValue = factory.decode(subject).value;
    console.log(`Found: ${sValue}`);
}
```

## 📖 Deep Dive

For advanced usage, indexing strategies, and performance tuning, see our [Comprehensive Tutorial](./TUTORIAL.md).

- [Initial Capacity & Scaling](./TUTORIAL.md#initialization)
- [Term Encoding (IDFactory)](./TUTORIAL.md#creating-terms)
- [Managing Graphs](./TUTORIAL.md#deleting-data)

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

