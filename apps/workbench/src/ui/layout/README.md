# UI Layout System

The **Layout System** defines the structural skeleton of the Antigravity Workbench. It manages the viewport, layering, and global navigation elements that remain persistent while the user explores the knowledge graph.

## 🏗️ Structural Architecture

The layout follows a **Strict Z-Index Layering Policy** to ensure overlays and menus never clip behind content:

| Layer | ID | Z-Index | Responsibility |
| :--- | :--- | :--- | :--- |
| **System Bar** | `sys-root` | 10000 | Global navigation, status, and escape hatches. |
| **Overlays** | `entity-hover-card` | 1000 | Context-aware cards and popups. |
| **Windows** | `windows-layer` | 10 | The primary workspace for floating node editors. |
| **Dashboard** | `dashboard-layer` | 0 | The background surface for search and session tools. |

## 📦 Core Modules

- **[WorkbenchLayout](./WorkbenchLayout.ts)**: The primary orchestrator. Initialized once at app startup, it hydrates the layers and manages the `main-content` viewport.
- **[SystemBar](./SystemBar.ts)**: The command center. Provides access to Import, Export, Editor, Graph Manager, and SPARQL Console.

## 🛠️ Best Practices for Layout Extensions

1.  **Passive Injection**: Always use `WorkbenchLayout.renderMainContent()` to refresh the workspace instead of modifying the DOM nodes directly.
2.  **Pointer Discipline**: The `windows-layer` uses `pointer-events: none` at the root to allow interaction with the dashboard behind it, while individual windows re-enable events.
3.  **Idempotent Rendering**: Components must be able to re-render without losing global state or causing memory leaks.

---

Refer to the [Developer Tutorial](./TUTORIAL.md) for step-by-step extension guides.

