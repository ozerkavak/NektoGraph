# Graph Selector Tutorial: Managing Named Graph Targets

Welcome to the **@triplestore/graph-selector** developer tutorial. This guide shows how to integrated the graph selection modal into your workflow.

## 1. Basic Usage

The `request` method is the only entry point you need. It is an asynchronous call that handles the entire UI lifecycle (creation, interaction, and cleanup).

```typescript
import { GraphSelector, GraphOption } from '@triplestore/graph-selector';

async function selectTargetGraph() {
    const options: GraphOption[] = [
        { 
            uri: 'http://example.org/my-graph', 
            label: 'My Project', 
            fullUri: 'http://example.org/data/my-project-v1',
            type: 'data', 
            sourceType: 'local', 
            location: 'projects/data.ttl',
            mainCount: 450,
            draftCount: 12
        }
    ];

    const result = await GraphSelector.request({
        title: "Select Target Graph",
        description: "Choose where the new triples should be stored.",
        options
    });

    if (result) {
        console.log("Saving to:", result);
    } else {
        console.log("User cancelled selection.");
    }
}
```

## 2. Using Metrics

The selector is designed to show **Live Metrics**. When providing options, include the `mainCount` (committed quads) and `draftCount` (uncommitted session quads) to help users make informed decisions.

```typescript
{
    label: 'Main Store',
    mainCount: 15400,
    draftCount: 8,
    isDefault: true,
    defaultLabel: 'MOST RECENT'
}
```

## 3. Creating New Graphs

Users are not limited to the provided list. They can type a manual URI into the input field or click "Create New Graph". The code will return whatever string is in the input box when the primary button is clicked.

## 4. RDF-star & Reification

When creating a reified triple (RDF-star), it is standard practice to store the triple in a specific annotation graph. Use the `GraphSelector` to let the user choose between an existing annotation graph or creating a new one specifically for the reification.

---

> [!TIP]
> The modal is **Modal-Only**. It locks pointer events to its own dialogue to prevent accidental clicks on the background workbench during selection.
