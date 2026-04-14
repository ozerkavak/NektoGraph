# @triplestore/sparql

**High-Performance SPARQL 1.1 Query and Update Engine for NektoGraph.**

The `sparql` library provides a fully-compliant SPARQL 1.1 implementation optimized for the NektoGraph Structure-of-Arrays (SoA) architecture. It enables complex graph auditing, data retrieval, and transactional updates using the industry-standard query language.

## 🚀 Key Features

- **✅ Compliant Query Forms**: Full support for `SELECT`, `ASK`, `CONSTRUCT`, and `DESCRIBE`.
- **✨ Unified RDF-star**: Native support for quoted triples with automatic BNode identity unification and proxy unboxing.
- **⚡ Volcano Model Execution**: A streaming, pull-based engine optimized for the NektoGraph SoA architecture.
- **🏛️ Composite-Aware**: Seamlessly joins `MainStore` and `DraftStore` while respecting `DiffStore` isolation.
- **🛠️ SPARQL Update**: Support for `INSERT DATA`, `DELETE DATA`, and pattern-based `DELETE/INSERT WHERE`.
- **🛤️ Property Paths**: Advanced path traversal including alternatives, sequences, and repetitions.
- **📊 Aggregations**: Standard set functions (`COUNT`, `SUM`, `AVG`, `GROUP_CONCAT`) with `GROUP BY` and `HAVING` clauses.

## 🏗️ Core Components

- **`SPARQLEngine`**: The primary query processor. It handles pattern matching, solution modifiers, and projections.
- **`UpdateEngine`**: Manages store mutations, ensuring that updates are applied atomically or as part of larger maintenance tasks.
- **`QueryParser`**: Translates SPARQL strings into the internal Abstract Syntax Tree (AST) for the engine.
- **`Optimizer`**: Analyzes the query to reorder patterns and minimize the search space.

## 📦 Installation

This is a core library used by the Workbench and logic layers.

```bash
import { SPARQLEngine, QueryParser } from '@triplestore/sparql';
```

## 📖 Related Documents

- **[TUTORIAL](./TUTORIAL.md)**: Master the art of writing high-performance SPARQL queries against NektoGraph.

---

