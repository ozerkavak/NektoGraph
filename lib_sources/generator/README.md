# @triplestore/generator

> **Part of the Antigravity Ecosystem**  
> A mission-critical URI generation engine for RDF Knowledge Graphs, featuring multi-tiered collision detection and semantic prefix orchestration.

---

## 🏗️ Architecture & Governance

This library follows the **Antigravity Source-First** model, ensuring decoupling from the main application state while providing high integration flexibility.

| Layer | Path | Responsibility |
| :--- | :--- | :--- |
| **Source of Truth** | `lib_sources/generator/src/` | **Edit ONLY here.** TypeScript source files. |
| **Runtime (JS)** | `apps/workbench/src/libs/generator.js` | Compiled UMD bundle used by the browser. |
| **Documentation** | `lib_sources/generator/README.md` | Primary documentation (this file). |

### 🛠️ Developer Policy
- **NEVER** edit the compiled `.js` files in `apps/workbench/src/libs/` directly. These are transient build artifacts.
- **Workflow:** 
    1. Edit TypeScript source in `lib_sources/generator/src/idgen.ts`.
    2. Build using `npx vite build` inside the library folder.
    3. Sync to the host application (e.g., via `/.agent/workflows/sync_libraries.md`).

---

## 🚀 Features (Version 1.1)

- **Semantic URI Orchestration**: Intelligently prepends dynamic prefixes (Base URIs) to generated IDs, ensuring compliance with OWL/RDFS ontology declarations.
- **Multi-Tier Uniqueness Validation**:
    - **Tier 1 (Local Sync/Async)**: Instant reflection against the in-memory QuadStore Subject and Object positions.
    - **Tier 2 (Remote SPARQL)**: Asynchronous `ASK` query validation against master SPARQL endpoints to prevent global collisions.
- **Collision-Resistant Entropy**: Uses base-36 randomized tails (e.g., `id_j7x8v9p2`) providing over 2.8 trillion possible IDs per prefix.
- **Fault-Tolerant Retry Engine**: Configurable retry logic with "collision-fail-safe" mode during network latency.
- **Low-Dependency Design**: Native browser ESM/UMD compatibility with zero external runtime dependencies (except `@triplestore/core` types).

---

## 📦 Integration Guide

### 📋 Browser Initialization
Consumed as a UMD module. In the Antigravity Workbench, it is typically initialized in the `AppState` setup.

```typescript
import { IDGenerator } from '@triplestore/generator';

const generator = new IDGenerator({
    store: myQuadStore, // Optional: for local uniqueness checks
    factory: myIDFactory, // Required if store is provided
    prefix: 'http://example.org/resource/', // Default URI prefix
    maxRetries: 5 // Default: 10
});

// Create a unique URI
const newUri = await generator.createUniqueId();
```

### 📋 Advanced: Remote Validation
Configure a SPARQL endpoint to ensure the generated ID does not exist in your master database.

```typescript
const generator = new IDGenerator({
    endpoint: {
        url: 'https://db.antigravity.org/sparql',
        auth: { user: 'admin', password: '***' } // Optional Basic Auth
    }
});
```

---

## 🛠️ Build & Maintenance

### Build Commands
Run these inside `lib_sources/generator/`:
```bash
npm install     # Install dependencies
npm run build   # Build UMD bundle and declaration files
```

### Integration Workflow (Agentic)
To update the library in the project, use the specialized Librarian workflow:
`/.agent/workflows/promote_to_library.md`

---

## 🧪 Testing
The library includes a comprehensive test suite for collision detection and URI formatting.
```bash
npm run test
```

---

## 📄 License
ISC © 2026 Antigravity Team

