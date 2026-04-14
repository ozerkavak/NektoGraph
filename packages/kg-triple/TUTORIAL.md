# KG Triple Tutorial: Working with Rich Statements

Welcome to the **@triplestore/kg-triple** developer tutorial. This guide explains how to manage triples as first-class entities with deep metadata.

## 1. Creating and Retrieving Triples

Always use the `getOrCreate` static method to ensure identity consistency.

```typescript
import { KGTriple } from '@triplestore/kg-triple';

// Get a reference to a specific triple
const triple = KGTriple.getOrCreate(tripleId, subjectId, predicateId, objectId);

console.log(triple.id); // The internal NodeID (BigInt)
```

## 2. Hydrating Metadata

By default, a `KGTriple` only knows its S, P, O components. To see which graphs it belongs to or what annotations it has, you must **Hydrate** it.

```typescript
// Load metadata from the store and session
triple.load(store, factory, session);

console.log(triple.graphs.size); // Number of graphs containing this fact
console.log(triple.isDraft);     // True if the triple exists in the current session
```

## 3. Accessing Annotations (RDF-star)

Annotations are stored in a Map keyed by the annotation's predicate.

```typescript
const labelPred = factory.namedNode('...#label');
const notes = triple.annotations.get(labelPred.id);

if (notes) {
    notes.forEach(ann => {
        console.log(`Note: ${factory.decode(ann.object).value}`);
        console.log(`From Graph: ${factory.decode(ann.sourceGraph).value}`);
    });
}
```

## 4. Presence Logic

A unique feature of `kg-triple` is that it considers a triple "present" in a graph even if it isn't directly asserted there, as long as it is **annotated** in that graph. This ensures that users can discover the origin (provenance) of metadata easily.

## 5. Component Unwrapping

If a `KGTriple` is created with components that are actually "Proxies" (reified nodes), it will automatically unwrap them to their ground IDs during hydration.

```typescript
// If 'subjectID' was a proxy (e.g. n3-5), 
// after hydrate, triple.subject will be the unwrapped TripleID.
triple.load(store, factory);
```

---

> [!TIP]
> Use `triple.invalidate()` if you suspect the underlying data has changed (e.g., after a session commit) to force a fresh hydration on the next load.
