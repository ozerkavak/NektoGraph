# Maintenance Library Tutorial

This tutorial covers common maintenance scenarios using the `@triplestore/maintenance` library.

## 1. Safely Erasing an Entity

When you delete an entity, you often want to delete all quads where it is the subject, and optionally all quads where it is the object (to avoid "dangling" references).

```typescript
import { EntityManager } from '@triplestore/maintenance';

const manager = new EntityManager(store);

// Erase entity + all incoming connections (Cascade)
const deletedCount = manager.eraseEntity(entityId, true);
console.log(`Removed ${deletedCount} quads.`);
```

## 2. Bulk Graph Migration

If you need to move a set of entities from one graph to another (e.g., from a staging graph to a production graph):

```typescript
import { EntityManager, BulkOperator } from '@triplestore/maintenance';

const manager = new EntityManager(store);
const bulk = new BulkOperator(manager);

const entitiesToMove = [id1, id2, id3];
const targetGraph = factory.namedNode('http://example.org/production');

// Move all quads (incoming and outgoing) for these entities
bulk.bulkMove(entitiesToMove, targetGraph, 'full');
```

## 3. RDF-star & Reification Cleanup
When deleting an entity that has metadata (annotations) stored via RDF-star, simply erasing the entity is not enough. You must also remove the reified triples that point to it.

```typescript
// Example: Find and delete annotations referencing an entity
const reifiedProxies = store.match(null, factory.namedNode('...#reifies'), entityId);
for (const [proxyId] of reifiedProxies) {
    // Erase the proxy (reified node) and its properties
    manager.eraseEntity(proxyId, true);
}
manager.eraseEntity(entityId, true);
```

## 4. Implementing Undo for Maintenance Tasks

Maintenance operations are destructive. Use the `TransactionWrapper` to provide a safety net.

```typescript
import { TransactionWrapper } from '@triplestore/maintenance';

const tx = new TransactionWrapper(store);

// 1. Perform your operation (e.g., delete)
const quadsToDelete = [...store.match(subject, null, null)];
for (const q of quadsToDelete) {
    store.delete(q[0], q[1], q[2], q[3]);
}

// 2. Record the action
tx.record('Delete User Profile', [
    { type: 'delete', quads: quadsToDelete.map(q => ({ subject: q[0], predicate: q[1], object: q[2], graph: q[3] })) }
]);

// 3. Oops! Undo it.
tx.undo(); // Store now contains the original quads
```

---

> [!CAUTION]
> Maintenance operations directly modify the store. Always verify your query filters before calling `eraseEntity` or `bulkMove`.

