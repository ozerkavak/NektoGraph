# Technical Audit: Edit Window & KGEntity Integration

This audit analyzes the mapping between the **Service Layer (KGEntity)** and the **UI View Layer (EntityRenderer/Editor)**. It highlights architectural successes and areas of high technical debt.

---

## 🏛️ Successes in Integration

### 1. Read Flow Efficiency
- **Identity Map Usage**: `EntityRenderer` leverages `KGEntity.loadForDisplay(id)`, which implements tiered hydration. This ensures that UI rendering and 3D View visualization share the same "Subjective" state.
- **Eager Metadata**: The strategy of identifying mentioned entities and calling `KGEntity.ensureMany(ids, 'metadata')` successfully eliminates URI pop-in during render cycles.

### 2. Reactive Invalidation
- **Strategy**: Edit actions in `editor.ts` call `kg.invalidate()`, forcing a cache bypass for the next render.
- **Result**: Immediate consistency between the session store and the UI without complex state-sync libraries.

---

## ⚠️ Identified Technical Debt (Roadmap for Optimization)

These areas represent logic that bypasses the Service Layer's intended purpose, causing duplication:

### 1. Manual URI Fragmentation
- **Location**: `EntityRenderer.renderHeader` and `Editor.updateEntityBaseURI`.
- **Debt**: Both components manually parse URIs to extract Local IDs.
- **Goal**: Move to `KGEntity` as calculated properties (`kg.localId`, `kg.baseUri`).

### 2. Redundant Duplicate Scanning
- **Location**: `Editor.addEntityPropertyValue`.
- **Debt**: Manually scans `state.store` and `session.deletions` before adding a triple.
- **Goal**: Replace with `kg.hasValue(predicate, value)`, leveraging existing structured data in the Identity Map.

### 3. Structured Data Underutilization
- **Location**: `EntityRenderer` class-lookup loops.
- **Debt**: The renderer triggers fresh `KGEntity.get()` calls for labels that are already present in the `RichEntityStructured` object.
- **Goal**: Adopt "Structured-First" rendering to minimize resolver calls.

---

## 🏗️ Architectural Roadmap

### 1. Graph Affinity
Currently, graph selection is handled by the UI (`WindowState.metadata.targetGraph`). We aim to move this to `KGEntity.affinity`, allowing the data model to "know" its persistent home, enabling script-based edits without UI context.

### 2. Logic Consolidation
Move "Empty State" heuristics and "Provenance Formatting" from the Renderer into the Service Layer to ensure all views (Workbench, Maintenance, 3D) share identical display logic.

