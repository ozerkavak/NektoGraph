# Runtime Layer: Core Orchestration Engine

Welcome to the **Runtime Layer**. This directory contains the central nervous system of the NektoGraph Workbench. It is responsible for orchestrating storage, reasoning, data loading, and UI synchronization.

> [!IMPORTANT]
> **Architecture Principle:** The Runtime layer is designed to be "headless". While it currently powers the Workbench UI, its core components are isolated and ready to be unified into a Web Worker for multi-threaded performance.

## 核心 (Core) Components

### 1. `State.ts` (The Global Orchestrator)
The `AppState` class is the primary singleton that holds references to all major services. It acts as the bridge between raw data (QuadStore) and the presentation layer.

- **Storage Management:** Manages the `store` (Main) and `diffStore` (Session).
- **Service Registry:** Houses the `InferenceEngine`, `SPARQLEngine`, `UnifiedSearch`, and `SessionManager`.
- **DataSync Engine:** Orchestrates granular and global UI refreshes via an `EventEmitter` to maintain reactivity.

### 2. `UIState.ts` (View Context)
Handles non-persistent, ephemeral UI states such as drag-and-drop offsets, active dashboard visibility, and active window tracking.

### 3. `declarations.d.ts` (Global Type Manifest)
Central repository for ambient type definitions, extending the `Window` object and defining interfaces for untyped external libraries.

## Key Features

- **Zero Dependency Core:** The underlying Triplestore libraries are pure TypeScript.
- **Worker-Ready:** Orchestration logic is decoupled from DOM manipulation where possible.
- **BigInt Native:** Uses `BigInt` for high-performance ID mapping and quad counts.

## Documentation Index

- [Developer Tutorial](./TUTORIAL.md) - Practical recipes for interacting with the state.
- [Architecture Audit](../ui/services/TECHNICAL_AUDIT.md) - Deep dive into performance and memory management.

---

