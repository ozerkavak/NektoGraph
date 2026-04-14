# @triplestore/maintenance

**Data Lifecycle and Maintenance Utilities for BKGE.**

The `maintenance` library provides essential tools for managing the health, organization, and lifecycle of data within the TripleStore. It handles destructive operations (like erasing entities) and structural migrations (like moving entities between graphs) with safety and undo support.

## 🚀 Key Features

- **🛡️ Safe Erased (Cascade)**: Completely remove an entity and all its connections (incoming and outgoing) from the store.
- **🔄 Structural Migration**: Move entities between "Named Graphs" to maintain data organization.
- **↩️ Transactional Undo/Redo**: A wrapper that records maintenance actions and allows rolling them back.
- **✨ RDF-star Awareness**: Utilities for detecting and cleaning up orphans after destructive metadata edits.
- **⚡ Bulk Operations**: Optimized for processing thousands of entities in a single batch.

## 🏗️ Core Components

- **`EntityManager`**: The core service for finding connections, erasing, and moving individual entities.
- **`BulkOperator`**: A higher-level wrapper for performing `EntityManager` operations on lists of entity IDs.
- **`TransactionWrapper`**: Records a sequence of maintenance actions to provide an "Undo" history for the administrator.

## 📦 Installation

This is an internal package used by the Workbench and system scripts.

```bash
import { EntityManager, BulkOperator } from '@triplestore/maintenance';
```

## 📖 Related Documents

- **[TUTORIAL](./TUTORIAL.md)**: Advanced scripts for bulk data cleanup, migration, and RDF-star reification management.

---

