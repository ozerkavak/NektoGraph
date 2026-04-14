# @triplestore/edit-engine

**The Intelligence and Orchestration Layer for BKGE.**

The `edit-engine` provides the semantic "brain" of the application. It sits between the raw TripleStore and the UI, managing transactional editing, schema introspection, and complex entity resolution.

## 🚀 Key Features

- **🛡️ Transactional Editing**: Uses `OverlayStore` to allow users to modify data in isolated sessions without affecting the main database until committed.
- **🧠 Global Intelligence**: Integrated schema indexing that understands Class/Property hierarchies (RDFS/OWL aware).
- **✨ RDF-star (Transparent Reification)**: Native support for Quoted Triples (`<<s p o>>`). Automatically unwraps reification chains (`reifies`, `occurrenceOf`) and promotes properties to the direct view.
- **🔍 Advanced Entity Resolution**: A powerful system that resolves "Rich Entities" by merging data from core stores, active sessions, and inference results into structured UI-ready groups.
- **🔄 Lifecycle Management**: High-level operations for creating, deleting, and updating entities while maintaining ontological consistency.
- **⚡ Performance First**: Optimized indices for fast search and schema lookups.

## 🏗️ Core Components

- **`OverlayStore`**: A proxy store that sits on top of the `IQuadStore`. It routes writes to a `DraftStore` and merges reads from both.
- **`EntityResolver`**: The primary logic for fetching and assembling all facts about a given URI. It performs recursive reification unwrapping and property promotion.
- **`CommitStrategy`**: Pluggable logic for deciding how and when to merge session data into the master store.
- **`SchemaIndex`**: A cached, reactive view of the ontologies (RDFS/OWL) currently loaded into the engine.

## 📦 Installation

This is an internal package used by the Workbench.

```bash
import { OverlayStore } from '@triplestore/edit-engine';
```

## 📖 Related Documents

- **[TUTORIAL](./TUTORIAL.md)**: Deep dive into OverlayStore and Entity Resolution recipes.
- **[Architectural Guides](./docs/)**: Detailed design documents:
    - [Smart Entity System](./docs/SMART_ENTITY_GUIDE.md): V2 Entity lifecycle and prefetching strategy. (Recommended for UI Devs).
    - [Class Lifecycle](./docs/CLASS_LIFECYCLE.md): Internal logic for creating/deleting instances.
    - [Session Strategy](./docs/SESSION_GUIDE.md): Deep dive into transactional isolation levels.
- **[@triplestore/session](../session/README.md)**: Documentation for the underlying session management logic.

---

