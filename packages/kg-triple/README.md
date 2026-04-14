# @triplestore/kg-triple

**Advanced Semantic Triple Representation for NektoGraph-star.**

`kg-triple` provides a high-level abstraction for RDF triples, extending the basic Quad structure with identity mapping, automatic reification unwrapping, and deep metadata hydration. It is the primary data structure used by the Triple Editor and 3D Visualization components to represent "Rich Statements" that may exist across multiple graphs or have associated RDF-star annotations.

## Key Features

- **🆔 Identity Mapping:** Ensures a single `KGTriple` instance per unique statement (S, P, O) via an internal `IdentityMap`.
- **✨ RDF-star (Native Support):** Automatically detects and unwraps component proxies (reified nodes).
- **🌍 Multi-Graph Provenance:** Tracks every named graph where a triple is asserted or annotated.
- **📝 Metadata Hydration:** Recursively collects and organizes annotations (mentions) for any triple or reified node.
- **⚡ Reactive Sync:** Integrated with `DraftStore` to distinguish between committed data and session drafts (`isDraft`).
- **🛡️ BigInt Native:** Optimized for 64-bit BigInt identifiers used in the core engine.

## Installation

```bash
# Internal workspace dependency
import { KGTriple } from '@triplestore/kg-triple';
```

## Core Concepts

### Triple Identity
Unlike a raw `Quad`, a `KGTriple` is unique for a given (S, P, O) combination. This allows the UI to easily track a single "fact" across different contexts (e.g., seeing all graphs that contain a specific triple).

### Hydration Cycle
Triple instances start in a "dehydrated" state. Calling `load()` performs a recursive search to:
1. Find all graphs containing the triple.
2. Discover all RDF-star reification proxies pointing to the triple.
3. Collect all annotations (metadata) associated with those proxies.

---
