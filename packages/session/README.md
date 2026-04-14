# @triplestore/session

**Transactional Metadata and Session Management for NektoGraph.**

The `session` library provides the foundational infrastructure for creating isolated editing environments within the TripleStore. It allows multiple concurrent "Drafts" to exist without modifying the main data store until an explicit commit occurs.

## 🚀 Key Features

- **📂 DraftStore**: A sandboxed quadstore that tracks additions and deletions separately.
- **👁️ Composite View**: A virtual, read-only view that merges a Session with the Main Store for transparent querying.
- **✨ RDF-star Support**: Full support for Quoted Triple IDs. Draft reifications and annotations are isolated in the session until committed.
- **🛠️ Session Lifecycle**: Manage creation, retrieval, committing, and closing of multiple editing sessions.
- **🔌 Strategic Persistence**: Support for various `ICommitStrategy` implementations (e.g., Reified Logs, Direct Store Updates).

## 🏗️ Core Components

- **`DraftStore`**: The implementation of the session sandbox. It inherits standard quadstore events but keeps changes in local buffers.
- **`CompositeStore`**: An overlay view. When you query a `CompositeStore`, it checks the `DraftStore` for deletions before yielding results from the main store, then adds the session's new quads.
- **`SessionManager`**: The central registry for all active sessions.

## 📦 Installation

This is a core infrastructure package used by `edit-engine` and the UI.

```bash
import { SessionManager, DraftStore } from '@triplestore/session';
```

## 📖 Related Documents

- **[TUTORIAL](./TUTORIAL.md)**: How to manage multi-user sessions and implement custom commit strategies.

---

