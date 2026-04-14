# Data Sync Tutorial: Orchestrating UI Reactivity

Welcome to the **@triplestore/data-sync** developer tutorial. This guide explains how to use the synchronization engine to keep your UI alive and consistent.

## 1. Minimal Setup

The `DataSyncEngine` requires a dependency object that provides hooks into other parts of the system.

```typescript
import { DataSyncEngine } from '@triplestore/data-sync';

const sync = new DataSyncEngine({
    inference: { recompute: () => myInference.run() },
    search: { 
        invalidateIndex: () => mySearch.clear(),
        buildIndex: () => mySearch.rebuild(),
        updateEntityIndex: (id) => mySearch.update(id)
    },
    schemaIndex: { buildIndex: () => mySchema.refresh() },
    windowManager: { 
        refreshAllWindows: () => ui.renderAll(),
        refreshWindows: (id) => ui.renderSpecific(id)
    },
    resetStats: () => stats.reset(),
    factory: myNodeFactory // For BigInt decoding
});
```

## 2. Global vs. Granular Updates

### Full Refresh
When you perform a large-scale operation (like importing a TTL file or clearing a graph), use `fullRefresh()`. This ensures that every index is rebuilt from scratch.

```typescript
sync.fullRefresh();
```

### Granular Sync
For discrete edits (e.g., changing a label or adding a single triple), use `syncDirtyEntities`. This is much faster as it only updates what has changed.

```typescript
// Update a single entity with high priority
sync.syncDirtyEntities(entityId, 'critical');
```

## 3. Listening for Events

UI components should listen to `sync:complete` to know when it's safe to re-render.

```typescript
sync.on('sync:complete', () => {
    updateMyWidget();
});
```

## 4. RDF-star & Reification

When working with RDF-star (redstar) "Quoted Triples", the synchronization engine treats the triple ID as a first-class entity ID. If you modify a property of a quoted triple, pass its ID to `syncDirtyEntities`:

```typescript
// Synchronize a modified RDF-star Triple Node
sync.syncDirtyEntities(tripleNodeId, 'critical');
```

## 5. Operation Modes

The engine can be toggled between `on` and `off` modes.

- **`on`**: Every granular update triggers a `refreshUI()`.
- **`off`**: Granular updates only update background indices (like Search) but skip the UI refresh event unless `priority` is set to `critical`.

```typescript
sync.mode = 'on'; // Enable automatic UI reactivity
```

---

> [!TIP]
> Always use `critical` priority for user-initiated edits to ensure the active window reflects the change immediately, even if global automation is disabled.
