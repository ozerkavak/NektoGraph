# UI Services Tutorial: Developer Guide & Recipes

This tutorial covers the most common development tasks when working with the UI Service layer. 

---

## 1. Monitoring Graph Statistics

The `GraphMonitor` is the source of truth for all graphs currently loaded in the system.

### Recipe: Listing all Data Graphs and their Sizes
Use this when building management dashboards or status bars.

```typescript
import { state } from '../../state';

function displayGraphInfo() {
    const allStats = state.graphMonitor.getGraphStats();
    
    // Filter for user-added data graphs
    const dataGraphs = allStats.filter(g => g.type === 'data');
    
    dataGraphs.forEach(info => {
        // WARNING: info.id is a BigInt. 
        console.log(`Graph: ${info.uri}`);
        console.log(`ID: ${info.id.toString()}`); // String conversion for logs/UI
        console.log(`Quads: ${info.mainCount}`);
        console.log(`Source Type: ${info.sourceType}`);
    });
}
```

### Recipe: Manually Registering a Graph
Use this when you creating new virtual graphs or logical partitions without a file source.

```typescript
const info = state.graphMonitor.registerGraph(
    'http://example.org/my-new-graph', 
    'data', 
    'My Logical Layer'
);
console.log(`Assigned Internal ID: ${info.uri}`);
```

---

## 2. Reactivity & State Changes

Avoid listening to the `QuadStore` directly. The `ReactivityService` provides a debounced event that fires after data changes have stabilized.

### Recipe: Refreshing a Component when Data Changes
Avoid listening to the `QuadStore` directly. The `DataSyncEngine` provides a centralized reactive stream.

```typescript
import { state } from '../../state';

function setupMyComponent(container: HTMLElement) {
    const render = () => {
        container.innerHTML = `Count: ${state.getRepoStats().main}`;
    };

    // 1. Listen for the global sync completion
    state.dataSync.on('sync:complete', render);
    
    // 2. Cleanup to prevent memory leaks
    return () => state.dataSync.off('sync:complete', render);
}
```

---

## 3. Tracking User Sessions

The `SessionMonitor` tracks which entities have been touched during an active edit session (`DraftStore`).

### Recipe: Showing a "Modified" badge on Entities
Use this to highlight unsaved changes in the UI.

```typescript
import { state } from '../../state';

function updateModifiedIndicators() {
    const modifiedUris = state.sessionMonitor.getModifiedEntities();
    
    // Check if a specific entity is modified
    const targetUri = "http://example.org/entity/123";
    const isDirty = modifiedUris.includes(targetUri);
    
    if (isDirty) {
        showBadge(targetUri, "Unsaved Changes");
    }
}
```

---

## 4. Smart Data Operations with KGEntity

`KGEntity` is the central **Smart Active Record** and **Identity Map**. It manages tiered data hydration and multi-language support.

### Concept: Hydration Levels
To optimize performance, data is loaded in tiers:

| Level | Data Included | Typical Use Case |
| :--- | :--- | :--- |
| **`metadata`** | Labels, Comments, Types (Classes), and Sources. | Search results, hover cards, list items. |
| **`structured`** | Full property groups, class schemas, and inverse relations. | Entity Editor windows, 3D Graph visualization. |

### Recipe: Fetching and Displaying Entity Data
Always use `static ensure` or `ensureMany` to wait for data, then use smart accessors.

```typescript
import { KGEntity } from './kg_entity';

async function displayEntity(nodeId: NodeID) {
    // 1. Ensure metadata is loaded
    const kg = await KGEntity.ensure(nodeId, 'metadata');
    
    // 2. Use smart accessors (handles language fallbacks automatically)
    console.log(kg.getDisplayName()); // e.g. "Turkey"
    console.log(kg.getDescription()); // e.g. "A country in..."
}
```

### Recipe: Batch Hydration for Lists
When rendering a list (like search results), hydrate all metadata in one bulk operation to avoid the "N+1" fetch problem.

```typescript
// Better: One bulk fetch for the whole list
await KGEntity.ensureMany(searchResultIds, 'metadata');

results.map(r => {
    const kg = KGEntity.get(r.id);
    return `<div>${kg.getDisplayName()}</div>`;
});
```

### Recipe: Manual Cache Control
Use this when you know data has changed on the server or via a direct store manipulation that bypassed the `KGEntity` setters.

```typescript
import { KGEntity } from './kg_entity';

function onDeepRefresh() {
    // 1. Mark everything as stale
    KGEntity.invalidateAll();
    
    // 2. Trigger UI re-render through DataSync
    state.dataSync.refreshUI();
}
```

---

## 5. Rich Presentation with Hover Cards

The `HoverAdapter` transforms low-level RDF data into user-friendly HTML for tooltips and hover cards.

### Recipe: Resolving Entity Details for a Tooltip
This service handles HTML escaping and schema inference automatically.

```typescript
import { HoverAdapter } from './hover_adapter';

async function onMouseOver(uri: string) {
    const data = await HoverAdapter.resolveEntity(uri);
    
    if (data) {
        // data.title -> Entity Label
        // data.subtitle -> Type (e.g., "Class", "Data Property")
        // data.contentHtml -> Formatted HTML with comments and tags
        showTooltip(data.title, data.contentHtml);
    }
}
```

---

## 6. Transforming Data for 3D Visualization

The `Entity3DAdapter` is used to convert a complex Knowledge Graph entity into a format that the 3D WebGL renderer can understand.

### Recipe: Generating 3D Graph Data
Use this when rendering or refreshing a 3D visualization window.

```typescript
import { KGEntity } from './kg_entity';
import { Entity3DAdapter } from './threed_adapter';

async function update3DView(nodeId: NodeID, webgl: WebGLContainer) {
    // 1. Fully hydrate the entity (including structure and neighbor metadata)
    const kg = await KGEntity.loadForDisplay(nodeId);
    
    if (kg.structured) {
        // 2. Adapt the structured data for the 3D engine
        const graphData = Entity3DAdapter.adapt(kg.structured);
        
        // 3. Push to the passive renderer
        webgl.updateGraph(graphData);
    }
}
```

---

## 7. Advanced: Inference Monitoring

The `InferenceMonitor` tracks quads generated by the reasoning engine.

### Recipe: Checking Reasoning Engine Health

```typescript
import { state } from '../../state';

function checkReasoningProgress() {
    const rdfsSubclassUri = 'http://example.org/graphs/inference/rdfs-subclass';
    const stats = state.inferenceMonitor.getStats(rdfsSubclassUri);
    
    console.log(`Inferred SubClasses: ${stats.totalCount}`);
    console.log(`- In Primary Store: ${stats.mainCount}`);
    console.log(`- In Active Session: ${stats.draftCount}`);
}
```

---

## Developer Check-list

- [ ] **BigInt Check**: Did I use `.toString()` for any `NodeID` (id) before sending it to the UI?
- [ ] **Event Check**: Am I subscribing to `state.dataSync` events (`sync:complete`) instead of legacy DOM events?
- [ ] **Cleanup**: If I added a listener for `sync:complete`, did I remove it on component destruction?
- [ ] **Granularity**: Is my view suitable for `sync:granular` listeners (e.g. 3D view)?

