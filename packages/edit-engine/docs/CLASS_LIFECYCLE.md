# Class Lifecycle & Missing Class Detection

## Overview

The Class Lifecycle module (`packages/edit-engine/src/operations/class_lifecycle.ts`) manages the addition and removal of `rdf:type` definitions for entities. 

A key feature of this system is **Missing Class Detection**, which ensures data integrity and helpful user feedback when an entity's type definition is removed but its properties remain.

## Feature: Missing Class Detection

When a Class (e.g., `Person`) is removed from an Entity, properties that semantically belong to that class (e.g., `hasName`, `birthDate`) are **NOT deleted**. Instead, they are preserved but flagged.

### How it works
1.  **Implicit Grouping**: The `Intelligence` engine continues to group properties based on their Domain. If `hasName` has domain `Person`, it stays in the `Person` group.
2.  **Explicit Check**: The engine checks if the Entity actually possesses the `rdf:type Person` triple.
3.  **Flagging**: If the type is missing, the group is marked as `{ isMissing: true }`.

### UI Behavior
- **Warning Header**: The property group header turns **Red** with a **⚠️ Warning** icon.
- **Quick Fix**: A **[+ Add Class]** button appears, allowing the user to restore the class definition with one click.

## Developer Usage

### Core Operations
```typescript
import { ClassLifecycle } from '@triplestore/edit-engine';

const lifecycle = new ClassLifecycle(store, factory);

// Remove Class (Preserves properties, flags them as missing)
lifecycle.removeClass(session, entityID, classID);

// Add Class (Restores group to normal state)
lifecycle.addClass(session, entityID, classID);
```

### UI Integration (Workbench)
In `EntityRenderer`, we check `group.isMissing` to conditionally render warning styles:

```typescript
if (group.isMissing) {
    // Render Red Header
    // Render "Add Class" Button
}
```

## Benefits
- **Data Safety**: Accidental class removal doesn't destroy property data.
- **Data Cleaning**: Helps identify "Partial Entities" (e.g., imported from CSV) that have properties but lack explicit class definitions.

