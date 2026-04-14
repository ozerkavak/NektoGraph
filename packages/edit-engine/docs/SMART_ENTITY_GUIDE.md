# KGEntity V2: Developer Guide

**Welcome to the new Smart Entity System!**

This guide explains how to use the new `KGEntity` (V2) to fetch and display data in the Workbench. We have moved from a "dumb container" to a "Smart Active Record" to make your life easier and fix common bugs like missing labels.

## The Old Way (Deprecated) 🚫

Previously, you had to manually manage hydration levels, often leading to bugs where an ID was shown instead of a label.

```typescript
// OLD - DON'T DO THIS
const entity = KGEntity.get(id);
await entity.hydrate('metadata'); // Manual step 1
if (needsStructure) {
  await entity.hydrate('structured'); // Manual step 2
}
// Risk: If you forgot to hydrate 'metadata' for children, they showed as IDs!
```

## The New Way (V2) ✅

In V2, you use **Static Methods** that handle everything for you.

### 1. `KGEntity.ensure(id, level)`
Use this when you need a specific entity to be ready.

*   **When to use:** Hover Cards, single item lookups.
*   **What it does:** Checks cache -> Fetches only if missing.

```typescript
// NEW
const entity = await KGEntity.ensure(id, 'metadata');
console.log(entity.label); // Guaranteed to be there!
```

### 2. `KGEntity.ensureMany(ids, level)`
Use this for **Lists** (Search Results, Tables).

*   **When to use:** Search components, list views.
*   **What it does:** Fetches missing data in *batch* (optimized).

```typescript
// NEW
const results = [id1, id2, id3];
await KGEntity.ensureMany(results, 'metadata');

// Now you can safely render all of them
results.forEach(id => {
  const e = KGEntity.get(id);
  console.log(e.getDisplayName()); 
});
```

### 3. `KGEntity.loadForDisplay(id)` (The Big Gun)
Use this for **Entity Windows / Editors**.

*   **When to use:** Opening an entity in the main window.
*   **What it does:**
    1.  Loads the main entity Structure.
    2.  **Scans** all properties.
    3.  **Prefetches** labels for every linked entity (sub-regions, types, friends).
    
*   **Benefit:** Solves the "Chip showing ID" bug forever.

```typescript
// NEW
const entity = await KGEntity.loadForDisplay(windowId);
// Render UI... all chips will have labels instantly!
```

## Internal Changes (Architecture)

*   `hydrate()` is DEPRECATED.
*   `KGEntity` now acts as an **Active Record** + **Identity Map**.
*   It separates **State** (properties) from **Fetching Logic** (ensure methods).

## Data Integrity & Validation (New in Beta v1.0) 🛡️

The system now enforces strict data integrity rules during editing to keep the Knowledge Graph clean.

### 1. Duplicate Prevention
You cannot add the same Object Property value twice if it creates a duplicate triple.
*   **Search Filtering:** The dropdown will automatically hide entities that are already linked to the current property.
*   **Save Validation:** If you bypass the UI (e.g., via copy-paste), the `Save` button will perform a deep check against both the Store and Session. You will see an error: *"This value already exists explicitly."*

### 2. Inference Materialization (The Exception)
There is one exception to the duplicate rule: **Inference**.
*   If a link exists *only* because of reasoning (e.g., `SubPropertyOf` inference shown in yellow/red), you **can** add it explicitly.
*   This "promotes" the inferred fact to an explicit fact in your session.
*   Once explicit, it cannot be added again.

