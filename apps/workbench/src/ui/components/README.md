# UI Components

This directory contains reusable, feature-specific, and atomic UI components for the Antigravity Workbench. Following the **Clean-up Plan**, all visual elements are consolidated here to maintain a strict separation between logic and presentation.

## Architecture

Components in this directory are typically **Passive Renderers** or **Smart Views**:
- **Passive Renderers**: Take data as input and return an HTML string (e.g., `SessionDiffView`).
- **Smart Views**: May interact with the global `state` to resolve labels or hydration status, but do not perform side-effects on the store directly.

## Component Registry

| Component | Responsibility | Description |
| :--- | :--- | :--- |
| **ViewManager** | UI Orchestration | Core utility for managing the main content container and view transitions. |
| **HomeView** | Dashboard | The landing page of the application with quick access to all modules. |
| **ImportView** | Data Ingestion | Handles local/remote RDF file selection, verification, and store ingestion. |
| **QueryView** | SPARQL Console | Provides an interface for executing SPARQL queries and visualizing results. |
| **InferenceView** | Reasoning Control | Manages RDFS/OWL inference modules and displays real-time statistics. |
| **EntityRenderer** | Data Visualization | A high-fidelity, interactive renderer for KG nodes with schema-aware grouping. |
| **GraphManager** | Dataset Lifecycle | Component for inspecting, deleting, and merging named graphs. |
| **SearchComponent** | Entity Lookup | Attaches asynchronous entity search behavior to input elements. |
| **SessionDiffView** | Change Tracking | Renders a visualization of draft additions and deletions in the active session. |

## Standards

- **Encapsulated Styles**: Use scoped `<style>` blocks within the component's `render` method to ensure visual isolation.
- **Stateless by Default**: Prefer `static render()` methods that accept a data object (like `DraftStore`) to ensure components are easy to test and re-render.
- **Identity Map Usage**: Always use `KGEntity.get()` to resolve display names for URIs to ensure consistency with the central state.

Refer to [TUTORIAL.md](./TUTORIAL.md) for implementation recipes.

