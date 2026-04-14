# 🚀 NektoGraph

**NektoGraph** is a professional-grade **Knowledge Graph Editor** ecosystem powered by an integrated, high-performance **Quadstore database engine** with native **RDF-star (RDF-star)** support. A lightweight, standalone data con-nektor and knowledge graph quad-storer, it is engineered for the modern web, providing a comprehensive knowledge engineering suite featuring reactive RDFS/OWL RL reasoning, immersive 3D graph visualization, and granular named graph orchestration. 

NektoGraph empowers developers with full **SPARQL-star** (SPARQL 1.2) Query and Update compliance, robust session isolation for transactional editing, and a high-speed I/O layer supporting multi-format data synchronization between local files and remote SPARQL endpoints. Built on a zero-dependency*, vectorized **Structure-of-Arrays (SoA)** architecture, it delivers high performance directly in the browser or Web Worker.

> [!IMPORTANT]
> **Performance Profile:** Zero-Dependency* | BigInt-Native | Struct-of-Arrays (SoA) | Web Worker First.

### 🌐 Standalone Workbench
For immediate use, you can download or access the **[NektoGraph Standalone Workbench](./publish/index.html)** (use "download raw file" option to download standalone index.html file). This is a single, self-contained HTML file that encapsulates the entire editor, database engine, and reasoning capabilities—no server or installation required.

---

## 🌟 Core Capabilities

### ⚡ Warehouse-Scale Storage
The engine utilizes a vectorized **Struct-of-Arrays (SoA)** architecture, enabling high-density data packing and near-zero garbage collection during scans. All internal identifiers are **64-bit BigInts**, ensuring massive scalability and native comparison speed.

### 🛡️ Transactional Workflows
Go beyond simple "CRUD". NektoGraph features a robust **Session Management** system that provides isolated editing sandboxes (DraftStores). Users can perform complex refactorings, run inferences, and preview changes through a **Composite View** before committing to the main store.

### 🧠 Reactive Reasoning & Query
- **Forward-Chaining Inference:** Real-time RDFS/OWL RL reasoning that reacts to data events in the background.
- **SPARQL-star Compliance:** A pull-based Volcano execution model that supports nested triple patterns and quoted triple solutions.
- **Transparent Reification:** Automated "Unwrap & Promote" logic that treats RDF-star metadata as first-class entity properties.
- **Full-Text Search:** Integrated indexing for high-speed entity lookup.

---

## 🏗️ Monorepo Architecture

The project is structured to enforce strict isolation between the engine kernel, the logic orchestration, and the user interface.

### 🧩 Nucleus (Lib Sources)
These are the low-level, zero-dependency* primitives.
*Source Truth:* [`lib_sources/`](./lib_sources) | *Compiled Target:* [`workbench/src/libs/`](./apps/workbench/src/libs)

- **[@triplestore/core](./lib_sources/quadstore-core)**: The high-performance heart. SoA-based QuadStore. [[README](./lib_sources/quadstore-core/README.md) | [TUTORIAL](./lib_sources/quadstore-core/TUTORIAL.md)]
- **[@triplestore/inference](./lib_sources/inference)**: Forward-chaining Rule Engine (RDFS/OWL RL). [[README](./lib_sources/inference/README.md)]
- **[@triplestore/io](./lib_sources/universal-rdf-io)**: High-speed streaming parsers (N3, JSON-LD) and serializers. [[README](./lib_sources/universal-rdf-io/README.md) | [TUTORIAL](./lib_sources/universal-rdf-io/TUTORIAL.md)]
- **[@triplestore/generator](./lib_sources/generator)**: Deterministic UUID and Value generation. [[README](./lib_sources/generator/README.md) | [TUTORIAL](./lib_sources/generator/TUTORIAL.md)]
- **[@triplestore/search](./lib_sources/search)**: High-performance indexing and full-text search. [[README](./lib_sources/search/README.md) | [TUTORIAL](./lib_sources/search/TUTORIAL.md)]
- **[@triplestore/hover-card](./lib_sources/hover_card)**: Reactive UI metadata preview orchestration. [[README](./lib_sources/hover_card/README.md) | [TUTORIAL](./lib_sources/hover_card/TUTORIAL.md)]
- **[@triplestore/window-manager](./lib_sources/window-manager)**: High-performance, themeable MDI window system. [[README](./lib_sources/window-manager/README.md) | [TUTORIAL](./lib_sources/window-manager/TUTORIAL.md)]

### 🛠️ Orchestration (Candidate Packages)
Higher-level logic layers being stabilized for standalone distribution.
*Location:* [`packages/`](./packages)

- **[@triplestore/edit-engine](./packages/edit-engine)**: The semantic brain. Class lifecycles and rich entity resolution. [[README](./packages/edit-engine/README.md) | [TUTORIAL](./packages/edit-engine/TUTORIAL.md)]
- **[@triplestore/data-sync](./packages/data-sync)**: Reactive UI synchronization engine for Workers. [[README](./packages/data-sync/README.md) | [TUTORIAL](./packages/data-sync/TUTORIAL.md)]
- **[@triplestore/kg-triple](./packages/kg-triple)**: Identity-mapped triple node with RDF-star reification hydration. [[README](./packages/kg-triple/README.md) | [TUTORIAL](./packages/kg-triple/TUTORIAL.md)]
- **[@triplestore/maintenance](./packages/maintenance)**: Data lifecycle tools (Migration, Safe Erasure, Bulk Ops). [[README](./packages/maintenance/README.md) | [TUTORIAL](./packages/maintenance/TUTORIAL.md)]
- **[@triplestore/graph-selector](./packages/graph-selector)**: Standardized UI modal for target graph selection. [[README](./packages/graph-selector/README.md) | [TUTORIAL](./packages/graph-selector/TUTORIAL.md)]
- **[@triplestore/events](./packages/events)**: Minimalist, zero-dependency EventEmitter for workers. [[README](./packages/events/README.md) | [TUTORIAL](./packages/events/TUTORIAL.md)]
- **[@triplestore/3dview](./packages/3dview)**: Hardware-accelerated 3D graph visualization. [[README](./packages/3dview/README.md) | [TUTORIAL](./packages/3dview/TUTORIAL.md)]
- **[@triplestore/sparql](./packages/sparql)**: Pull-based SPARQL 1.1 Query & Update engine. [[README](./packages/sparql/README.md) | [TUTORIAL](./packages/sparql/TUTORIAL.md)]
- **[@triplestore/session](./packages/session)**: Multi-user session tracking and sandbox isolation. [[README](./packages/session/README.md) | [TUTORIAL](./packages/session/TUTORIAL.md)]

### 💻 Applications
- **[Workbench](./apps/workbench)**: A frame-based IDE for managing the Knowledge Graph. Built with Vanilla JS & CSS Variables.

---

## 📖 Combined Documentation Hub

Grouped by developer and user interest themes.

### 🗄️ Storage & Transport
- **[QuadStore Core](./lib_sources/quadstore-core/README.md)**: Deep dive into SoA and BigInt-Native indexing.
- **[Transport Layer](./apps/workbench/src/transport/README.md)**: Network communication and multi-format parsing. [[Tutorial](./apps/workbench/src/transport/TUTORIAL.md)]
- **[IO & Serializers](./lib_sources/universal-rdf-io/README.md)**: High-speed streaming data processing.

### 🏛️ Logic & Reasoning
- **[SPARQL Engine](./packages/sparql/README.md)**: Writing compliant queries against the SoA kernel.
- **[Inference Engine](./lib_sources/inference/README.md)**: Real-time RDFS and OWL RL reasoning strategies.
- **[Search Primitives](./lib_sources/search/README.md)**: Implementing full-text search and indexing.

### 📝 Editing & Transactions
- **[Edit Engine](./packages/edit-engine/README.md)**: Managing entity lifecycles and schema updates.
- **[Data Sync Engine](./packages/data-sync/README.md)**: Orchestrating system-wide reactivity.
- **[Session Management](./packages/session/README.md)**: Draft-Commit workflows and overlay stores.
- **[Maintenance Tools](./packages/maintenance/README.md)**: Safe entity erasure and graph migration patterns.
- **[KG Triple Identity](./packages/kg-triple/README.md)**: RDF-star reification and hydration.

### 🎭 UI Framework & Interaction
- **[UI Architecture Overview](./apps/workbench/src/ui/services/README.md)**: The "Orchestration" layer between logic and components.
- **[Window System](./lib_sources/window-manager/README.md)**: MDI (Multiple Document Interface) architecture for Graph editing. [[Tutorial](./lib_sources/window-manager/TUTORIAL.md)]
- **[UI Layout & Shell](./apps/workbench/src/ui/layout/README.md)**: Core structural components and navigation.
- **[3D Visualization](./packages/3dview/README.md)**: Large-scale graph exploration in 3D.

---

## 🏁 Development Workflows

- **Unified Single-File Build (Publish)**: `cd apps/workbench && npm run publish`
- **Serve (Vite Monitor)**: `cd apps/workbench && npm run dev`
- **Verification**: Open `publish/index.html` via `file://` protocol to verify standalone operation.

---

## 🧩 Architecture Policy
The system follows a strict isolation policy:
`Nucleus (Kernel)` <- `Orchestration (Logic)` <- `UI (Shell)`
Each layer communicates via strictly defined TypeScript interfaces.
`Specific Libs` <- `Edit Engine` <- `UI`

---

\* Apart from the core internal modules, the project currently relies on external npm-based libraries—specifically `n3`, `jsonld-streaming-parser`, and `rdfxml-streaming-parser` for RDF processing, along with infrastructure tools like `Vite` and `TypeScript`. We have temporarily embedded and utilized these RDF libraries to handle SPARQL parsing and data import/export operations. However, we are in the process of developing our own custom libraries to provide full support for SPARQL 1.2 and RDF 1.2. Once these proprietary modules are integrated into the system in the near future, we will phase out and completely replace the use of `n3`, `jsonld-streaming-parser`, and `rdfxml-streaming-parser`.
