# @triplestore/hover-card

> **Part of the Antigravity Ecosystem**  
> A premium, high-performance, context-aware tooltip engine optimized for RDF Knowledge Graphs and Linked Data.

---

## 🏗️ Architecture & Governance

This library follows the **Antigravity Source-First** model, ensuring decoupling from the main application state while providing high integration flexibility.

| Layer | Path | Responsibility |
| :--- | :--- | :--- |
| **Source of Truth** | `lib_sources/hover_card/src/` | **Edit ONLY here.** TypeScript source files. |
| **Runtime (JS)** | `apps/workbench/src/libs/hover_card.js` | Compiled UMD bundle used by the browser. |
| **Documentation** | `lib_sources/hover_card/README.md` | Primary documentation (this file). |

### 🛠️ Developer Policy
- **NEVER** edit the compiled `.js` files in `apps/workbench/src/libs/` directly. These are transient build artifacts.
- **Workflow:** 
    1. Edit TypeScript source in `lib_sources/hover_card/src/index.ts`.
    2. Build using `npx vite build` inside the library folder.
    3. Sync to the host application (e.g., via `/.agent/workflows/sync_libraries.md`).

---

## 🚀 Features (Version 1.2)

- **Sub-pixel Smooth Positioning**: Uses `requestAnimationFrame` (RAF) for high-performance rendering and zero-flicker transitions during mouse movement.
- **Rich Literal Support (New)**: 
    - **XSD Badges**: Automatically detects XSD datatypes and renders them as colored badges (e.g., `xsd:token`, `xsd:integer`).
    - **Language Tags**: Native handling for RDF Language Tags (e.g., `en`, `tr`) with distinct blue badges.
    - **Smart URI Shortening**: Intelligently shortens common namespaces for a compact UI.
- **Premium Design Aesthetics**: Built-in dark-mode support with glassmorphism effects, respecting Antigravity's design tokens.
- **Data-Agnostic Interface**: Completely decoupled from fetching logic via a flexible `entityResolver` interface.
- **Collision Detection**: Smart viewport awareness - the card automatically flips horizontally and vertically to remain visible at the edges of the screen.

---

## 📦 Integration Guide

### 📋 Browser Initialization
The library is consumed as a UMD module. In the Antigravity Workbench, it is typically initialized in the `editor.ts` setup phase.

```typescript
import { HoverCard } from '@triplestore/hover-card';

HoverCard.init({
    entityResolver: async (uri: string) => {
        // This is where you bridge the UI to your data layer
        const data = await MyDataService.fetch(uri);
        return {
            title: data.label,
            subtitle: data.category,
            contentHtml: `<div class="hover-desc">${data.comment}</div>`
        };
    }
});
```

### 🏷️ HTML Integration (Data Contract)
The library uses event delegation on `document`. Elements simply need the correct `data-` attributes to trigger the hover card.

#### 1. Knowledge Graph Entities
Any element with a `data-id` (and optionally `data-kind="entity"`) will trigger the `entityResolver`.
```html
<span data-id="http://www.cvp.org/Entity_1" data-kind="entity">Republican Patriots Party</span>
```

#### 2. Literal Values (Typed & Lang)
Literals are rendered locally by the library's `renderLiteral` engine, showing type/lang badges immediately.
```html
<!-- Typed Literal -->
<span data-kind="literal" data-value="id_e7f58um7n" data-type="http://www.w3.org/2001/XMLSchema#token">
    id_e7f58um7n
</span>

<!-- Language Literal -->
<span data-kind="literal" data-value="Merhaba Dünya" data-lang="tr">
    Merhaba Dünya
</span>
```

---

## 🛠️ Build & Maintenance

### Build Commands
Run these inside `lib_sources/hover_card/`:
```bash
npm install     # Install dependencies
npm run build   # Build UMD bundle to dist/
```

### Integration Workflow (Agentic)
To update the library in the project, use the specialized Librarian workflow:
`/.agent/workflows/promote_to_library.md`

---

## 🎨 Styles & Themes
The library injects a style block into `document.head` but respects the following CSS variables of the host system:
- `--bg-panel`: Background color of the card.
- `--border-subtle`: Border color.
- `--text-main`: Primary text color.
- `--text-muted`: Metadata text color.
- `--accent-primary`: Action/Plus icon colors.

---

## 📄 License
ISC © 2026 Antigravity Team

