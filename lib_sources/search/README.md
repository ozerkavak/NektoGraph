# @triplestore/search

**Professional Turkish-aware search engine for RDF Knowledge Graphs.**

The Search library provides a high-performance, sequence-based ranking engine specifically tuned for the Turkish language and RDF data structures. It bridges the gap between raw triple stores and user-friendly search interfaces by providing fuzzy matching, prefix boosting, and intelligent normalization.

[![npm version](https://img.shields.io/badge/npm-Beta v1.0-blue.svg)](https://www.npmjs.com/package/@triplestore/search)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Key Features

- **🇹🇷 Turkish-Aware Normalization:** Deep integration with `toLocaleLowerCase('tr-TR')` and custom character mapping (İ/i, I/ı, Ğ/g, etc.) ensuring search stability across all regions.
- **⚡ Hybrid Indexing:** Combines a high-speed prefix-based token index for $O(1)$ lookups with a linear fallback for deep-store scans.
- **🎯 Sequence-Based Ranking:**
    - **Exact Start Boost (+1000):** Matches starting with the query appear first.
    - **Containment Boost (+500):** Substring matches receive prioritized weighting.
- **🔗 Entity-Hydration Ready:** Seamlessly integrates with `KGEntity` and `CvpEntity` metadata workflows.
- **📦 Zero External Dependencies:** Vanilla TypeScript implementation designed for Browser, Node.js, and Web Workers.

## 📦 Installation

```bash
npm install @triplestore/search
```

## 🛠 Quick Start

### Initialization
```javascript
const searchEngine = new SearchLib.UnifiedSearch(store, factory, schemaIndex);
searchEngine.buildIndex(); // Generate the optimized memory index
```

### Searching
```javascript
const results = await searchEngine.search(store, "Atatürk", {
    limit: 10,
    language: 'tr'
});

// Results return as: [{ id: NodeID, score: number }]
```

## 📖 Documentation

For detailed ranking algorithms, normalization logic, and advanced search filters, see our [Comprehensive Tutorial](./TUTORIAL.md).

- [Ranking Logic & Scoring](./TUTORIAL.md#ranking)
- [Turkish Normalization Rules](./TUTORIAL.md#turkish)
- [Filtering by Class/Language](./TUTORIAL.md#filtering)

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

