# UI Views: Application Screens

This directory houses the **screen-level components** of the Antigravity Workbench. Unlike the static shell defined in `layout`, the `views` layer provides the dynamic logic for main application pages.

---

## 🖼️ Available Views

### 1. [ExportView.ts](file:///c:/Users/golge\calismalar/antigravity/apps/workbench/src/ui/views/ExportView.ts)
The primary interface for backing up Knowledge Graphs.
- **Features**: Triple/Quad flattening, multiple RDF formats (Turtle, JSON-LD, etc.), and graph-specific filtering.
- **Documentation**: See the [Developer Guide](file:///c:/Users/golge/calismalar/antigravity/apps/workbench/src/ui/views/README.md#developer-guide) below.

### 2. [MaintenanceView.ts](file:///c:/Users/golge/calismalar/antigravity/apps/workbench/src/ui/views/MaintenanceView.ts)
A low-level "Safe-Mode" interface for direct store manipulation, bypassing the session layer.
- **Features**: Direct quad deletion, entity migration between graphs, bulk operations via ID lists, and remote SPARQL synchronization.
- **Security**: Requires all active sessions to be closed before entry to prevent data corruption.
- **Implementation**: Utilizes `@triplestore/maintenance` for logical operations and `TransactionWrapper` for undo/redo state.

### 3. [EditorView.ts](file:///c:/Users/golge/calismalar/antigravity/apps/workbench/src/ui/views/EditorView.ts)
The heart of the application. A complex, class-based view controller for session-based graph editing.
- **Features**: Multi-window entity management, real-time search integration, session control (Commit/Cancel), and schema-aware entity creation.
- **Architecture**: Encapsulates the core workbench UI lifecycle, global API bindings, and window-system orchestration.
- **Integration**: Replaces the legacy `editor.ts`, providing a clean, modular singleton pattern for the editor state and actions.

---

## 🛠️ Developer Guide

### View Lifecycle
Views follow a standard pattern for initialization and rendering:
1. **API Initialization**: Class-based views (like `EditorView`, `MaintenanceView`) use a static `init()` method to bind global functions to `window`.
2. **Container Setup**: Uses `setupViewContainer()` or the internal orchestration of `WorkbenchLayout` to clear previous layers and prepare the workspace.
3. **Logic Injection**: DOM events, window management, and async data fetching (Indexing) are triggered via a `start()` or `render()` call.
4. **Cleanup**: Handled automatically by the main UI controller (`ui.ts`) when switching views, ensuring memory efficiency and UI consistency.

### Adding a New View
1. Create a new `.ts` file in this directory (e.g., `EditorView.ts`).
2. Implement a `renderX()` function.
3. Import and call this function from the main `ui.ts` controller.

---

## 📖 Related Links
- [View Tutorial](file:///c:/Users/golge/calismalar/antigravity/apps/workbench/src/ui/views/TUTORIAL.md)
- [Main UI Controller](file:///c:/Users/golge/calismalar/antigravity/apps/workbench/src/ui.ts)

