# Session Management Guide

**Package:** `@triplestore/edit-engine`  
**Status:** Beta v1.0  

The Session Management system is the "Write Layer" of the Antigravity Triplestore. It provides an isolated transaction environment for handling user edits, resolving conflicts, and routing changes to appropriate Named Graphs.

---

## 1. Architecture Overview

Unlike traditional databases where you write directly to the store, Antigravity uses a **Session-Based** model.

### Key Concepts

1.  **Session Manager:** The orchestrator. It creates sessions and ensures that User X doesn't interfere with User Y's work-in-progress.
2.  **Edit Session:** A "Sandbox". All changes (Additions/Deletions) made here are **virtual** until saved.
    *   *Virtual State:* The session overlays its changes on top of the actual data when you query it.
3.  **Smart Routing:** When saving, the engine decides *where* to put the data.
    *   *Affinity:* If you add a property to an existing entity, it goes to the graph where that entity lives.
    *   *New Data:* If you create a brand new entity, it goes to the User Graph (`graphs/user`).
4.  **Diff Log:** Every save operation is recorded as a "Diff" in the system log (`graphs/system/diff`), allowing for audit trails and rollback.

---

## 2. Usage Recipes

### 2.1. Basic Transaction (Add & Save)

```typescript
import { SessionManager } from '@triplestore/edit-engine';

// 1. Setup
const manager = new SessionManager(store, factory);
const session = manager.createSession('user-alice');

// 2. Prepare Data (BigInt IDs)
const s = factory.namedNode('http://example.org/Alice');
const p = factory.namedNode('http://xmlns.com/foaf/0.1/name');
const o = factory.literal('Alice Wonderland');

// 3. Edit (Virtual)
session.add(s, p, o);

// 4. Commit (Persist)
await session.save(); 
// -> Writes to Store
// -> Writes entry to Diff Log
```

### 2.2. Deleting Data (Reified Deletion)

When you delete a triple, we don't just "erase" it (unless it's in the default graph). We mark it as deleted to preserve history.

```typescript
// Delete a specific triple
session.delete(s, p, o, graphNode);

await session.save();
```

### 2.3. Exporting Changes (Diff)

You can export *only what changed* in the current session. This is useful for "Patch" files.

```typescript
const uniqueChanges = await session.exportDiff();

// Convert to simple TTL
const ttl = uniqueChanges.map(q => 
    `${termToString(q.subject)} ${termToString(q.predicate)} ${termToString(q.object)} .`
).join('\n');
```

---

## 3. UI Implementation Guide (Workbench)

If you are building a UI for this engine (like the Workbench), follow these patterns.

### 3.1. Visualizing Active Sessions
Use the `session.adedd` and `session.deleted` arrays to show a live counter.

```typescript
const active = sessionManager.activeSession;
if (active) {
    ui.showCounter('Added', active.added.length);
    ui.showCounter('Deleted', active.deleted.length);
}
```

### 3.2. Diff View
Users trust the system more if they see what will happen before they commit.
Iterate over `active.added` and `active.deleted` to show a "Git-like" diff view.

```html
<div class="diff-add">+ <http://alice> <name> "Alice"</div>
<div class="diff-del">- <http://alice> <name> "Old Name"</div>
```

### 3.3. Commit Actions
Always provide three options to the user:
1.  **Commit:** `await session.save()` (Finalize)
2.  **Discard:** `sessionManager.activeSession = undefined` (Abort)
3.  **Export:** `session.exportDiff()` (Save to file without committing)

---

## 4. Troubleshooting

### "Triple not deleting?"
*   Check if you provided the correct **Graph URI**. Deletions must target the exact graph where the triple resides. Use `store.match` to find the graph first.

### "Smart Routing put my data in the wrong graph?"
*   Smart routing checks for *Subject Affinity*. If the Subject exists in multiple graphs, it picks the first one found. Explicitly provide a graph if you need precision.

