# NektoGraph Workbench

The official graphical user interface (IDE) for the NektoGraph Knowledge Graph. A blazing fast, zero-dependency "Single Page Application" built with Vanilla TypeScript and CSS Variables.

## 🌟 Features

### 1. ✏️ Knowledge Editor
- **✨ RDF-star (Native)**: Full visualization and editing support for Quoted Triples (`<<s p o>>`).
- **🛡️ Transaction-Safe**: Edits are drafted in a local session before commit.
- **Session Review**: Users can review pending changes in the **Open Session Diff Quads** panel (Turtle-star format) before persisting them to the main store.
- **Advanced Entity Creation**: Multi-lingual label/comment support, Class management with inference awareness, and **Transparent Reification** (Promoting metadata to entity views).
- **Window Management**: Multi-window interface with Taskbar support for minimized entity tabs.
- **Tree-Master-Detail Layout**: Efficient Split View editor with Class Hierarchy sidebar and Nested Property groups.
- **Multi-Language Support**: Dedicated clusters for managing translations of textual properties (Labels, Comments, etc.).
- **Schema-Aware**: Autocomplete suggests properties based on usage and defined RDFS/OWL Schemas.
- **Inverse Resolution**: Automatically detects and displays incoming links (e.g., "Linked From").

### 2. 🔍 SPARQL Console
- Full **SPARQL-star (SPARQL 1.2)** Query Editor with syntax highlighting.
- Tabular results view with execution timing and Quoted Triple identification.

### 3. 🧠 Reasoning Dashboard
- Visualize real-time inference statistics.
- Toggle individual RDFS/OWL modules (e.g., enable `Transitive`, disable `Range`).
- View "Inferred Quads" count vs "Explicit Quads".

### 4. 🏗️ Graph Manager
- Inspect all Named Graphs (User Data vs. Inferences vs. System Graphs).
- Delete graphs individually.

## 🎨 Visual System (Premium Theme)

The Workbench uses a custom design system based on the **Zinc/Slate** palette, powered entirely by CSS Variables (`index_premium.css`).

- **No Frameworks**: No React, Vue, or Tailwind. Pure DOM manipulation for maximum performance.
- **CSS Variables**: Theme consistency via `--primary`, `--bg-app`, `--border-subtle`.
- **Semantic Classes**: `.hero-title`, `.card-variant-primary`, `.chip`, `.status-success`.

## 🛠️ Development

### Setup
```bash
# From monorepo root
npm install
cd apps/workbench
```

### Run
```bash
npm run dev
# Starts Vite dev server at http://localhost:5173
```

### Build
```bash
# Standard Production Build
npm run build 

# Official "Standalone" Build (Publish)
# This redirects output to the root /publish folder and applies post-processing
npm run build -- --outDir ../../publish
node scripts/post_process_publish.cjs
```

## 📚 Documentation (Belgeler)

Dive deeper into the system architecture and developer patterns:

- **[Runtime Orchestration Engine](./src/runtime/README.md)** - Core logic, storage, and service management.
- **[Runtime Developer Tutorial](./src/runtime/TUTORIAL.md)** - Practical recipes for interacting with the global state.
- **[UI Services Guide](./src/ui/services/README.md)** - Learn about Reactivity, Graph Monitoring, and Entity Hydration.
- **[UI Services Tutorial](./src/ui/services/TUTORIAL.md)** - Recipes for building new UI components.
- **[Transport & Parsers](./src/transport/README.md)** - Data loading, remote bridges, and format support.

