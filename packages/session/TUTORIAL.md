# Session Management Tutorial

This tutorial explains how to use the `@triplestore/session` library to create isolated editing environments.

## 1. Creating a Session

A session is managed via a `SessionManager`, which requires a `CommitStrategy`.

```typescript
import { SessionManager, DraftStore } from '@triplestore/session';
// You normally get a strategy from edit-engine or implement your own
const manager = new SessionManager(myCommitStrategy);

// Create a new sandbox for a user
const session = manager.createSession('user_123');
console.log(`Created session ${session.id}`);
```

## 2. Reading through a Composite View

To allow the UI or logic layer to see "potential changes" before they are saved, use the `CompositeStore`.

```typescript
import { CompositeStore } from '@triplestore/session';

// Create a view that combines mainStore + user session
const view = new CompositeStore(mainStore, session);

// Querying the view will respect session deletions and additions
const count = [...view.match(null, null, null)].length;
```

## 3. Implementing a Custom Commit Strategy

A Commit Strategy determines how the buffered changes in the `DraftStore` are finally persisted.

```typescript
import { ICommitStrategy, DraftStore } from '@triplestore/session';

class LogStrategy implements ICommitStrategy {
    async execute(draft: DraftStore): Promise<void> {
        console.log("Committing additions:", draft.additions.size);
        console.log("Committing deletions:", draft.deletions.size);
        // Implement logic to write to DB or MainStore here
    }
}
```

## 4. RDF-star (redstar) in Sessions

When you annotate an existing triple (`<<s p o>>`), the new annotation quad `<<s p o>> :comment "Nice"` is stored in the `DraftStore`. 

Because `CompositeStore` supports **Quoted Triples**, you can safely query for annotations from both the main store and the draft:

```typescript
// Add an annotation ONLY to the session
const tripleId = factory.triple(s, p, o);
session.add(tripleId, commentPred, factory.literal("Draft Comment"));

// Query through the view
const allComments = [...view.match(tripleId, commentPred, null)];
// allComments now includes the draft annotation!
```

## 5. Closing Sessions

Always close sessions to free up memory once the operation is complete.

```typescript
manager.closeSession(session.id);
```

---

> [!NOTE]
> The `DraftStore` handles event forwarding. Subscription to `session.on('data', ...)` will notify you of changes within that specific sandbox.

