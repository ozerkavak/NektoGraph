# Inference Engine Tutorial

This guide provides practical recipes for setting up and using the `@triplestore/inference` engine to perform real-time reasoning over your knowledge graph.

## 1. Basic Setup & Module Registration
The `InferenceEngine` acts as an orchestrator that listens to store events and routes them to active reasoning modules.

```typescript
import { InferenceEngine } from '@triplestore/inference';
import { SubClassOfModule } from '@triplestore/inference/modules/rdfs';
import { QuadStore, IDFactory, DEFAULT_GRAPH } from '@triplestore/core';

const store = new QuadStore();
const factory = new IDFactory();

// 1. Initialize Engine
const engine = new InferenceEngine(store, factory);

// 2. Register Modules
engine.register(new SubClassOfModule(store, factory));

// 3. Enable Rules
engine.enable('rdfs-subclass');
```

## 2. Triggering Inferences
Inferences are triggered automatically when data is added to the store.

```typescript
const dog = factory.namedNode('http://ex/Dog');
const animal = factory.namedNode('http://ex/Animal');
const fido = factory.namedNode('http://ex/Fido');
const subClassOf = factory.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf');
const type = factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');

// Define Schema: Dog is a subclass of Animal
store.add(dog, subClassOf, animal, DEFAULT_GRAPH);

// Define Data: Fido is a Dog
// This triggers 'rdfs-subclass' module to infer (Fido type Animal)
store.add(fido, type, dog, DEFAULT_GRAPH);

// Check Results
// Inferences are written to module-specific named graphs
const inferenceGraph = factory.namedNode('http://antigravity.org/graphs/inference/rdfs-subclass');
const results = store.match(fido, type, animal, inferenceGraph);
```

## 3. Reasoning in Sessions (Sandboxed Drafts)
You can use the inference engine to reason over transactional drafts before they are committed to the main store.

```typescript
import { DraftStore } from '@triplestore/session';

const draft = new DraftStore(store); // Overlay store

// Perform inference on the session event
// This will write inferred triples INTO the draft store, not the main store
store.on('data', (event) => {
    engine.inferForSession(event, draft);
});
```

## 4. Truth Maintenance (Auto-Cleanup)
The engine automatically manages the lifecycle of inferred triples.

- **Deduplication:** If an inferred triple already exists in the Main store (Default or Named Graph), it won't be re-added to the inference graph.
- **User Precedence:** If a user adds a triple that was previously inferred, the inferred copy is deleted to ensure the user's data remains the source of truth.
- **Support Tracking:** If the source fact that supported an inference is deleted, the inference is retracted unless another supporting fact exists.

---

> [!TIP]
> Use `engine.recompute()` to force a full scan of the store if you enable a module after data has already been loaded.
