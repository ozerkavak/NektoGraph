# Edit Engine Developer Tutorial

This tutorial explains how to use the high-level orchestration features of the `@triplestore/edit-engine`.

## 1. Using the OverlayStore

The `OverlayStore` is the primary way to implement a "Draft Mode" or "Edit Session".

```typescript
import { OverlayStore } from '@triplestore/edit-engine';
import { DraftStore } from '@triplestore/session';

// 1. Initialize Overlay over your main store
const overlay = new OverlayStore(mainStore);

// 2. Start a session
const session = new DraftStore();
overlay.attachSession(session);

// 3. Any 'add' or 'delete' goes to the session
overlay.add(subject, predicate, object); 

// 4. Any 'match' reads from both mainStore + session
for (const quad of overlay.match(null, null, null)) {
    console.log(quad);
}
```

## 2. Resolving Entities

The `EntityResolver` is used when you need to know "everything" about a specific URI, including labels, types, and properties, regardless of whether they are in the main store or a current draft.

```typescript
import { EntityResolver } from '@triplestore/edit-engine';

const resolver = new EntityResolver(overlay, factory, schemaIndex);

// Basic Resolution
const entity = await resolver.resolve(entityId); 

// Advanced Structured Resolution (for Triple Editors / 3D View)
const rich = resolver.resolveStructured(entityId, 'en', session);
console.log(rich.classGroups); // Organized by class domains
console.log(rich.mentions);    // RDF-star annotations
```

### 2.1 Transparent Reification (RDF-star)
The `EntityResolver` automatically detects if a node is a proxy for a triple (via `rdf:reifies` or `rdf-star:occurrenceOf`). 

- **Unwrapping**: Use `resolver.unwrap(id)` to find the original `TripleID`.
- **Promotion**: Properties found on the reified triple are "promoted" to the main entity view automatically, allowing them to be edited as if they were direct properties.

## 3. Commit Strategies

When a user clicks "Save", the engine uses a `CommitStrategy` to synchronize the draft into the master store. The `DefaultCommitStrategy` handles most cases, including conflict resolution and event propagation.

```typescript
import { DefaultCommitStrategy } from '@triplestore/edit-engine';

const strategy = new DefaultCommitStrategy();
await strategy.commit(session, mainStore);
```

## 4. Class & Instance Lifecycle

Instead of manually adding `rdf:type` triples, use the lifecycle helpers:

```typescript
import { createClassInstance } from '@triplestore/edit-engine';

// This handles URI generation, initial labels, and required schema triples
const newInstanceUri = createClassInstance(overlay, classUri, 'My New Label');
```

## 5. Triple Edit View Integration
When building a "Triple Editor" or "Property Annotator", use `StructuredTripleMention`. This structure collects all annotations (metadata) specifically for a triple, allowing you to build rich nested UIs.

```typescript
const mention = rich.mentions.find(m => m.tripleID === myTriple);
console.log(mention.annotations); // Properties OF the triple itself
```

---

> [!NOTE]
> The Edit Engine is **Session-Aware**. It always prioritizes data in the attached session over the main store, ensuring the user sees their changes immediately.

