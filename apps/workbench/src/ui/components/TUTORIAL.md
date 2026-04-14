# UI Components: Developer Tutorial

This guide provides developers with patterns and recipes for building and extending UI components in the Antigravity Workbench.

> [!TIP]
> **Performance First:** The Workbench uses a raw DOM + string template architecture. Avoid heavy frameworks; focus on fast, reactive string rendering.

## 🖼️ View Orchestration
The Workbench uses a modular View system where each screen is a class-based component. These are managed by the `ViewManager`.

### 1. Changing Views
Use `ViewManager` to safely transition between main application states.

```typescript
import { ViewManager } from '../ViewManager';
import { HomeView } from '../views/HomeView';

// Navigates to the Home/Dashboard
HomeView.render(); 
```

### 2. Custom View Implementation
New views should utilize `ViewManager.getMain()` and `ViewManager.clearView()` to ensure consistency.

```typescript
import { ViewManager } from '../ViewManager';

export class MyNewView {
    public static render() {
        const main = ViewManager.getMain();
        ViewManager.clearView(main);
        
        const container = document.createElement('div');
        container.className = 'view-container';
        container.innerHTML = '<h1>Hello World</h1>';
        main.appendChild(container);
    }
}
```

---

## 👨‍🍳 Implementation Recipes

### 1. SessionDiffView: Visualizing Changes
Used to show "what changed" in an active session.

```typescript
import { SessionDiffView } from './ui/components/SessionDiffView';
import { state } from './state';

const diffHtml = SessionDiffView.render(state.currentSession);
document.getElementById('content').innerHTML = diffHtml;
```

### 2. SearchComponent: Smart Entity Lookup
Transforms a standard `<input>` into a high-performance, asynchronous search box.

```typescript
import { SearchComponent } from './ui/components/SearchComponent';

const input = document.getElementById('my-input');
const results = document.getElementById('my-dropdown');

new SearchComponent(input, {
    onSelect: (id, label) => console.log(`Selected: ${label} (${id})`),
    debounceMs: 300
}, results);
```

### 3. GraphManager: Repository Overview
Integrates with the repository's stats engine to show graph-level quads counts.

```typescript
import { GraphManager } from './ui/components/GraphManager';

const container = document.getElementById('view-mount');
const manager = new GraphManager(container);
manager.render();
```

### 4. GraphMergeDialog: Data Migration
Specialized modal for moving quads between named graphs.

```typescript
import { GraphMergeDialog } from './ui/components/GraphMergeDialog';

// sourceId is a BigInt
GraphMergeDialog.render(sourceId, "http://example.org/old", () => {
    // Refresh UI on complete
});
```

### 5. EntityRenderer: Hyper-Interactive Node View
The core "Active Record" style renderer for individual Knowledge Graph nodes.

```typescript
import { EntityRenderer } from './ui/components/EntityRenderer';

// Renders inside a specific container (e.g. within a window)
EntityRenderer.renderEntityInWindow(
    nodeId,      // The NodeID (bigint/uri) to render
    container,   // The DOM element to mount onto
    windowId     // Unique ID for event tracking/namespacing
);
```

> [!NOTE]
> `EntityRenderer` utilizes `KGEntity` (Active Record) for hydration and caching. It handles its own scroll-sync and event binding via `bindEvents()`.

---

## 📐 Standards & Guidelines

### 1. File Structure
- **Classes:** `PascalCase.ts` (e.g., `NotificationTray.ts`)
- **Helpers:** `snake_case.ts` (e.g., `icon_utils.ts`)

### 2. Rendering Pattern
Components should return HTML strings. Use scoped styles within the `render` logic.

```typescript
export class MyComponent {
    static render(data: any): string {
        return `
            <div class="my-comp">${data.text}</div>
            <style> .my-comp { color: var(--primary); } </style>
        `;
    }
}
```

### 3. State Interaction
Components should **request** changes via the `state` or `window` callbacks rather than mutating the store directly.

- **Good:** `<button onclick="window.save()">`
- **Bad:** `<button onclick="state.store.save()">`

