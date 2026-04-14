# @triplestore/data-sync

**Modular UI Synchronization Engine for NektoGraph.**

A high-performance orchestration layer that ensures all internal indices and UI components remain synchronized with the underlying QuadStore. It provides a centralized reactive stream for data mutations, inference completion, and UI refresh cycles.

## Key Features

- **🔄 Orchestrated Refresh:** Manages the optimal order of updates: Inference -> Search -> Schema -> Stats -> UI.
- **⚡ Granular Synchronization:** Supports partial updates for specific entities, minimizing UI flickering and CPU overhead.
- **📡 Reactive Events:** Pure TypeScript `EventEmitter` (via `@triplestore/events`) that works seamlessly in Web Workers.
- **🎯 Priority Awareness:** Distinguishes between 'critical' updates (user-facing) and 'optional' background syncs.
- **🛡️ BigInt Native:** Orchestrates synchronization using 64-bit BigInt identifiers for maximum performance.

## Installation

```bash
# From the project root
npm install ./packages/data-sync
```

## Architecture

The `DataSyncEngine` acts as the "Air Traffic Controller" for the workbench logic. It relies on a set of dependencies (`SyncDependencies`) to perform the actual work:

- **Inference**: Recomputes RDFS/OWL rules.
- **Search**: Updates the full-text search index.
- **Schema**: Rebuilds class and property hierarchies.
- **Window Manager**: Refreshes UI windows.

## API Reference

### `DataSyncEngine`

| Method | Description |
| :--- | :--- |
| `fullRefresh()` | Performs a complete system-wide synchronization cycle. |
| `syncDirtyEntities(ids, priority)` | Synchronizes specific entities across indices and refreshes relevant UI windows. |
| `refreshUI()` | Triggers a global UI refresh event. |
| `updateInference()` | Manually triggers the inference recomputation. |

### Events

| Event | Payload | Description |
| :--- | :--- | :--- |
| `sync:start` | - | Fired when a full refresh begins. |
| `sync:complete` | - | Fired when all synchronization steps are finished. |
| `sync:granular` | `{ ids: any[] }` | Fired after a partial entity synchronization. |
| `sync:error` | `Error` | Fired if any sync step fails. |

---
