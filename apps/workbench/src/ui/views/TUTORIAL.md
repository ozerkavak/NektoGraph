# View Implementation & Usage Tutorial

This tutorial covers how to use existing views and how to create new ones following the project's modular architecture.

---

## 👤 User Guide: Exporting Data

Follow these steps to back up your workbench data:

1. **Access the View**: Open the sidebar or main menu and select "Export & Backup".
2. **Choose Mode**:
    - **Triples**: Best for simple graph readers. Flattens all data into a single default graph.
    - **Quads**: Best for full backups. Preserves Named Graph URIs.
3. **Select Format**:
    - Use **Turtle (.ttl)** for human readability.
    - Use **N-Triples (.nt)** for high-speed bulk exports.
4. **Filter Graphs**: Expand the categories (System, Ontology, Data) and uncheck any graphs you don't wish to include.
5. **Download**: Click the "Download" button. The file will be generated in your browser and saved to your Downloads folder.

---

## 👤 User Guide: Maintenance & Data Cleanup

The Maintenance View is a powerful tool for cleaning up orphan data or moving large amounts of quads between graphs.

### Important: Before You Start
Maintenance Mode **bypasses active sessions**. You must close (commit or cancel) any open editor sessions before the system will allow you to access these tools.

### 1. Individual Entity Inspection
- **Lookup**: Use the search box to find an entity by its URI or Label.
- **Inspect**: In the window that opens, you can see every incoming and outgoing connection, categorized by their source graphs (Provenance).
- **Actions**:
    - **Erase**: Deletes the entity's outgoing quads. Use **Cascade/Both** to delete triples where this entity is the object.
    - **Move**: Transfers quads to a new Named Graph URI.

### 2. Bulk Operations
- **Paste IDs**: You can paste a comma-separated list of entity IDs or URIs into the Bulk Panel.
- **Run Actions**: Execute mass deletions or migrations for all items in the list simultaneously.

### 3. Remote Synchronization
If you are working with a **Remote Graph** (SPARQL endpoint), the Maintenance View will attempt to synchronize your deletions and moves using `SPARQL UPDATE` queries (DELETE DATA/INSERT DATA).

---

## 👤 User Guide: Knowledge Graph Editor

The Editor is the primary workspace for creating and modifying your Knowledge Graph within a protected session layer.

### 1. Starting a Session
The Editor automatically initializes a **Session** when you start making changes. All additions and deletions are kept in a "Draft" layer until you explicitly commit them.

### 2. Finding and Opening Entities
- **Search**: Use the top-right search box to find entities. Selecting one opens it in a new **Window**.
- **Multi-Window**: You can open multiple entities simultaneously, drag them around, and resize them to compare data.

### 3. Editing Lifecycle
- **Labels & Comments**: Click the "+" buttons next to labels/comments in the entity window to add new ones.
- **Properties**: Add new property-value pairs using the property editor at the bottom of the window.
- **Save Changes**: Use the **Commit Session** button in the dashboard to persist all changes to the main store.
- **Discard**: Use **Cancel Session** to wipe all draft changes.

### 4. Creating New Entities
Click "Create New Entity" in the dashboard. You will be prompted to select a **Target Graph** (e.g., User Graph or a specific source file) where the new data will be stored.

---

## 💻 Developer Guide: Creating a New View

To add a new page like `ImportView` or `QueryView`:

### Step 1: File Creation
Create `src/ui/views/HeroView.ts`:
```typescript
import { state } from '../../runtime/State';

export function renderHero() {
    // 1. Clears UI and gives us a container
    setupViewContainer(); 
    const container = document.querySelector('.view-container') as HTMLElement;
    
    // 2. Inject HTML
    container.innerHTML = `<h1>Hello World</h1>`;
}
```

### Step 2: Routing Setup
In `src/ui.ts`:
```typescript
import { HeroView } from './ui/views/HeroView';

// Initialize Global API
HeroView.init();

function handleRoute(path: string) {
    if (path === 'hero') HeroView.start();
}
```

### Complex Views (Class Pattern)
For views with heavy state management (like `EditorView`), use a class-based approach:
```typescript
export class ComplexView {
    static init() {
        // Bind window APIs here
        (window as any).myAwesomeAction = () => this.execute();
    }
    
    static async start() {
        // Setup UI and start logic
    }
}
```

### Step 3: Global Styles
Ensure your view uses classes from `premium.css` for consistent glassmorphism and typography.

---

