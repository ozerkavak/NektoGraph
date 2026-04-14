# @triplestore/graph-selector

**Standardized, High-Density Target Graph Selection Component.**

A premium UI component designed for selecting or creating **Named Graphs** in the NektoGraph ecosystem. It features a three-tier categorization logic (Recommended, System, Others), real-time triple count metrics, and clipboard integration for managing complex semantic URIs.

## Key Features

- **📊 Metric Awareness:** Displays both master store (`mainCount`) and session draft (`draftCount`) metrics for each graph.
- **🏷️ Categorized Sorting:** Automatically groups graphs into Recommended, System, and Other folders for easier navigation.
- **📋 Clipboard Sync:** Integrated "Copy to Clipboard" buttons for every graph URI.
- **🎹 Accessibility:** Full keyboard support (Enter to confirm, Escape to cancel) and auto-focus for manual entry.
- **🎨 Glassmorphic Design:** Modern, high-density layout using CSS variables and frosted-glass effects.
- **🧩 Zero Dependency:** Built with Vanilla JS and CSS, making it safe for use in any environment without framework lock-in.

## Installation

```bash
# From the project root
npm install ./packages/graph-selector
```

## Data Structure

The selector expects an array of `GraphOption` objects:

```typescript
export interface GraphOption {
    uri: string;       // The internal/ID used for the store
    label: string;     // Short display name
    fullUri: string;   // Full logical URI for copy/display
    type: string;      // Category: 'data', 'ontology', 'system'
    sourceType: string; // Origin: 'local', 'remote', 'system'
    location: string;   // File path or remote URL
    mainCount?: number;
    draftCount?: number;
}
```

## API Reference

### `static request(params: SelectorParams): Promise<string | null>`

Triggers the modal. Returns the selected URI or `null` if the user cancels.

---
