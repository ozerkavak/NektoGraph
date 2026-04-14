# @triplestore/events

**Zero-dependency, high-performance EventEmitter.**

A minimalist, Node.js-compatible `EventEmitter` implementation designed specifically for high-frequency reactive logic in the browser and Web Workers. It provides the backbone for the NektoGraph synchronization engine and UI orchestration layer, ensuring a decoupled architecture with zero overhead.

## Key Features

- **🚀 Zero Dependencies:** Pure TypeScript. No legacy browser shims or heavy Node.js polyfills.
- **⚡ Worker-First:** Designed to be sent over `Worker` boundaries or used within isolation layers.
- **🏗️ API Compatible:** Familiar `on`, `off`, `once`, and `emit` signatures compatible with the standard EventEmitter pattern.
- **🎯 Lightweight:** Minimal memory footprint, utilizing `Map` and `Function[]` for optimal listener tracking.

## Installation

```bash
# Internal workspace dependency
import { EventEmitter } from '@triplestore/events';
```

## API Reference

### `class EventEmitter`

| Method | Description |
| :--- | :--- |
| `on(event, listener)` | Adds a listener function for the specified event. |
| `off(event, listener)` | Removes a listener function for the specified event. |
| `once(event, listener)` | Adds a one-time listener function. |
| `emit(event, ...args)` | Synchronously calls each of the listeners registered for the event. |
| `removeAllListeners(event?)` | Removes all listeners, or those of the specified event. |
| `listenerCount(event)` | Returns the number of listeners listening to the event. |

## Why not use DOM Events?

Traditional `CustomEvent` dispatching is tied to the DOM and can become a bottleneck in high-throughput data synchronization models. This implementation allows logic-heavy components (like `DataSyncEngine` or `InferenceEngine`) to operate in pure JavaScript environments (including Web Workers) without needing a window or document context.

---
