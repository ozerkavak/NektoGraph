# Runtime Developer Tutorial: Recipes & Patterns

This guide provides practical "How-To" recipes for developers interacting with the `state` orchestrator in the Runtime layer.

---

## 🚨 Critical Technical Note: BigInt IDs

The entire Triplestore core uses `BigInt` for internal identifiers and counts to maximize performance and handle massive datasets.

> [!WARNING]
> **Conversion Required:** You MUST convert BigInt values to Strings before sending them to the UI or JSON serializing.
> ```typescript
> const id = state.factory.id(node); 
> console.log(id.toString()); // Correct
> ```

---

## 🛠 Common Recipes

### 1. Accessing Global State
The `state` object is available as a singleton. Avoid creating new instances of `AppState`.

```typescript
import { state } from './runtime/State';

// Check total quads in the system
const stats = state.getRepoStats();
console.log(`Main Store: ${stats.main.toString()} quads`);
```

### 2. Running SPARQL Queries
The runtime provides a high-level wrapper around the `@triplestore/sparql` engine.

```typescript
async function fetchTopEntities() {
    const query = `
        SELECT ?s ?p ?o 
        WHERE { ?s ?p ?o } 
        LIMIT 10
    `;
    
    const { variables, results } = await state.executeQuery(query);
    
    results.forEach(row => {
        // results are Term objects. Use .value for the string representation.
        console.log(row['s'].value); 
    });
}
```

### 3. Managing Edit Sessions
All manual data changes (adding/removing triples) must happen within a **Session**.

```typescript
function updateUserPreferences() {
    // 1. Ensure a session is active
    state.ensureSession();
    
    // 2. Perform changes (these go to the DraftStore, not the Main floor)
    state.addTripleLiteral(
        "http://user/settings", 
        "http://schema/theme", 
        "dark"
    );
    
    // 3. Changes are only "physical" after a commit
    // state.commitSession(state.currentSession.id);
}
```

### 4. Direct Store Access (Advanced)
If you need to perform low-level pattern matching:

```typescript
// Match all quads where subject is 'Person_A'
const results = state.store.match(
    state.factory.namedNode('http://ex.org/Person_A'),
    null,
    null,
    null
);

for (const [s, p, o, g] of results) {
    // Low-level results are BigInt IDs
}
```

### 5. Managing Ephemeral UI State
Use `uiState` for temporary flags that shouldn't be persisted to the database.

```typescript
import { uiState } from './runtime/UIState';

function toggleDashboard() {
    uiState.currentDashboardActive = !uiState.currentDashboardActive;
    // Trigger global refresh via DataSync engine
    state.dataSync.refreshUI();
}
```

---

## ⚡ Performance Best Practices

1.  **Batch Imports:** Always use `state.importData()` for large files. It automatically pauses inference and indexes to prevent UI lag.
2.  **Reactive UI:** Instead of listening to low-level `store.on('data')`, subscribe to `state.dataSync.on('sync:complete', callback)`.
3.  **Graph Isolation:** Use separate named graphs for different data sources to make cleanup (`removeGraph`) instantaneous.

---

