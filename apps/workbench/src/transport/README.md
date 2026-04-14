# Antigravity Transport Layer

The **Transport Layer** is a standalone, logic-only module responsible for moving RDF data between the Antigravity Workbench and external environments. It abstracts complexity related to HTTP protocols, SPARQL standards, and multi-format parsing.

## 🚀 Key Features

- **Zero-Dependency Core Logic:** Purely functional and side-effect free outside of I/O.
- **Worker-Ready:** Designed to run inside Web Workers to keep the UI thread buttery smooth.
- **Universal Format Mesh:** Seamlessly handles Turtle, N-Quads, JSON-LD, and RDF/XML.
- **Streaming First:** Uses streaming parsers to handle large datasets without exhausting memory.

## 📦 Modules

| Module | Purpose |
| :--- | :--- |
| **RemoteLoader** | Handles HTTP/SPARQL communication. Fetches files and queries endpoints. |
| **UniversalParser** | Converts raw strings in various formats into Quad objects. |
| **UniversalSerializer** | Converts Quad objects into optimized string representations for export. |

## 🛠️ Quick Start

```typescript
import { RemoteLoader } from './RemoteLoader';
import { UniversalParser } from './UniversalParser';

// 1. Fetch data from a remote SPARQL endpoint
const quadsRaw = await RemoteLoader.fetchSparql('https://dbpedia.org/sparql', 1000);

// 2. Parse into the system
const parser = new UniversalParser();
await parser.parse(quadsRaw, 'Turtle', (quad) => {
    console.log("Parsed:", quad.subject.value);
});
```

## 📚 Documentation

- [Developer Tutorial](./TUTORIAL.md) - Deep dive into implementation recipes.
- [API Reference](./README.md) - This document.

