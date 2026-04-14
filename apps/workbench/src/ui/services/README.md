# UI Service Layer

The `apps/workbench/src/ui/services` directory contains the orchestration logic that bridges the high-performance **Triplestore Engine** with the **UI Component Layer**. These services handle reactivity, state monitoring, session tracking, and data presentation.

## Architecture

This layer is designed as a **Singleton-first** architecture, typically instantiated within the `AppState` class. It ensures that UI components do not interact with the low-level `QuadStore` or `DraftStore` directly, but rather through well-defined service interfaces.

### Core Services

| Service | Responsibility | Key Export |
|:---|:---|:---|
| **KGEntity** | Smart Active Record & Identity Map. Handles tiered hydration (`metadata`, `structured`) and multi-language display. | `KGEntity` |
| **Entity3DAdapter** | Transforms Knowledge Graph entities into stratified 3D waterfall layouts. | `Entity3DAdapter` |
| **GraphMonitor** | Registry and real-time statistics for named graphs. Tracks repo-wide sizes. | `GraphMonitor` |
| **SessionMonitor** | Real-time tracking of modified entities and transaction deltas. | `SessionMonitor` |
| **ReactivityService** | Debounced UI refresh orchestration for store mutations. | `ReactivityService` |
| **InferenceMonitor** | Live size tracking for inference graphs across Main and Session stores. | `InferenceMonitor` |
| **HoverAdapter** | Logic resolver and HTML renderer for rich entity hover cards. | `HoverAdapter` |

---

## Technical Standards

> [!IMPORTANT]
> **BigInt Handling**: This project uses `BigInt` for high-performance `NodeID` (Physical IDs). Since JSON and many UI frameworks cannot serialize `BigInt` natively, you MUST convert them to `String` (using `.toString()`) before passing them to the UI or network layers.

- **Zero Dependency**: These services rely only on the internal `@triplestore` libraries.
- **Debounced Updates**: Reactivity is throttled to 100ms by default to ensure UI stability during bulk imports or inference cycles.
- **Type Safety**: All services are strictly typed using TypeScript interfaces defined within their respective modules.

## Getting Started

To access these services in a UI component, use the global `state` object:

```typescript
import { state } from './state';

// Accessing the Graph Monitor
const stats = state.graphMonitor.getGraphStats();
console.log(`Total Graphs: ${stats.length}`);
```

Refer to the [TUTORIAL.md](./TUTORIAL.md) for detailed recipes and usage patterns.
Refer to the [TECHNICAL_AUDIT.md](./TECHNICAL_AUDIT.md) for architectural gaps and the implementation roadmap.

## Common API Patterns

### Cache Management (KGEntity)
The Identity Map (`KGEntity`) caches hydrated entity states. In certain scenarios, you must manually manage this:
```typescript
// Wipe everything (e.g., repository clear)
KGEntity.clearCache();

// Mark as stale (e.g., after a batch edit)
KGEntity.invalidateAll();
```

### Manual Graph Registration
Usually, graphs are registered during import, but you can register them manually via the monitor:
```typescript
state.graphMonitor.registerGraph('http://example.org/my-graph', 'data', 'My Layout');
```

## 3D Visualization Architecture

The 3D visualization system operates on the **Passive Renderer** principle. This architecture ensures that the rendering library is completely decoupled from business logic.

### Core Principles
- **Passive Renderer**: The `@triplestore/3dview` library maintains no dependencies on the store or application state. It exclusively renders the `ThreeDGraphData` interface provided to it.
- **Entity3DAdapter**: Acts as the sole bridge between the Knowledge Graph domain and the 3D space. It transforms a `RichEntityStructured` object into 3D coordinates, labels, and visual flags.
- **SSOT (Single Source of Truth)**: The adapter always resolves neighbor labels using `KGEntity.get().getDisplayName()`. This ensures that all 3D labels are perfectly synchronized with the central Identity Map.
- **Reactive Updates**: Upon any store change, the 3D window re-hydrates its data and updates the WebGL scene using a stable layout preservation algorithm.

