# @triplestore/inference

A high-performance, modular, and reactive **Forward-Chaining Inference Engine** designed for the Antigravity ecosystem. It enables real-time reasoning over RDF data with full control over which rules are active.

## 🚀 Key Features

- **Reactive Architecture**: Listens to `@triplestore/core` data events. Inferences are triggered immediately upon data insertion.
- **Isolatable Logic**: Inference results are written to separate **Named Graphs**, ensuring the original User Data remains pristine and immutable.
- **Granular Control**: Enable or disable specific reasoning modules (e.g., enable `SubClassOf` but disable `Range`) at runtime.
- **Limit Safety**: Built-in mechanisms to prevent infinite reasoning loops.
- **Batch Optimized**: Capable of processing massive data imports efficiently without checking rules triple-by-triple.
- **Smart Deduplication**: Checks for existing triples in *any* graph before inferring, preventing redundant data.
- **Auto-Cleanup**: Automatically removes inferred triples if the user explicitly adds the same triple to a source graph.

## 🛡️ Deduplication & Cleanup Strategy

The engine implements a robust strategy to ensure data integrity and user precedence:

1.  **Rule 1: No Duplication (Strict Prohibition)**
    Before adding an inferred triple (e.g., `A type Animal`), the engine checks if this exact triple already exists in **any** named graph (User, Ontology, or other Inference graphs). If it exists, the inference is blocked immediately. This uses `store.hasAny()` for O(1) checking.

2.  **Rule 2: User Override (Active Cleanup)**
    If a user explicitly adds a triple that was previously inferred (e.g., adding `A type Animal` to the Default Graph), the engine detects this collision and **removes** the corresponding inferred triple from the inference graph.

3.  **Rule 3: Truth Maintenance (Deletion Propagation)**
    If a triple that *supported* an inference is deleted, the engine verifies if any *other* triple supports the same inference. If no support remains, the inference is retracted.

## 🧩 Standard Modules (RDFS)

The library comes with a standard implementation of the **RDFS (RDF Schema)** entailment regime:

| Module ID | Title | Description | Logic (Example) |
| :--- | :--- | :--- | :--- |
| `rdfs-subclass` | **SubClassOf** | Transitive closure of class hierarchy. | `(:Dog ⊑ :Animal) ∧ (:Fido a :Dog)` ⇒ `:Fido a :Animal` |
| `rdfs-subproperty` | **SubPropertyOf** | Transitive closure of property hierarchy. | `(:hasWife ⊑ :hasSpouse) ∧ (:Bob :hasWife :Alice)` ⇒ `:Bob :hasSpouse :Alice` |
| `rdfs-range` | **Range** | Infers class membership from object values. | `(:writes range :Author)` ⇒ `:Book a :Author` |
| `rdfs-domain` | **Domain** | Infers class membership from subject values. | `(:writes domain :Person)` ⇒ `:Bob a :Person` |

## 📖 Documentation & Guides

For advanced usage, custom module implementation, and performance tuning, see our [Comprehensive Tutorial](./TUTORIAL.md).

- [Initial Setup & Registration](./TUTORIAL.md#1-basic-setup--module-registration)
- [Reasoning in Sessions](./TUTORIAL.md#3-reasoning-in-sessions-sandboxed-drafts)
- [Truth Maintenance Strategy](./TUTORIAL.md#4-truth-maintenance-auto-cleanup)

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.
