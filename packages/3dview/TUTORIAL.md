# 3D View Development Tutorial

Welcome to the **@triplestore/3dview** developer tutorial. This guide will help you understand how to integrate and extend the 3D visualization engine.

## 1. Setting Up the Container

The `WebGLContainer` requires a parent `HTMLElement`. It will automatically handle canvas resizing and overlay management.

```typescript
const viewer = new WebGLContainer({
    container: myDiv,
    onNodeClick: (id) => handleSelection(id),
    onNodeContextMenu: (id, x, y) => showMenu(id, x, y),
    onToggleEmptyProps: (show) => console.log("Empty props visibility:", show)
});
```

> [!TIP]
> Ensure the container element has a defined `width` and `height`. The viewer uses a `ResizeObserver` to fit the canvas perfectly.

## 2. Understanding Node Types

The engine uses specific shapes and visual cues based on the `Node3DData.type` property:

| Type | Default Shape | Purpose |
| :--- | :--- | :--- |
| `focus` | Cube (Large) | The primary entity being explored. |
| `class` | Pyramid | Represents an ontological class. |
| `property` | Sphere | Represents a relationship or predicate. |
| `value` | Cube (Small) | Represents a literal or leaf value. |
| `inverse` | Inverted Pyramid | Represents an incoming relationship or an **RDF-star Triple Node** (Quoted Triple). |

## 3. Advanced Usage: Manipulation

### Dynamic Updates
You don't need to re-mount the viewer to update data. Call `updateGraph` with new data. The engine will **preserve the positions** of nodes that have the same `id` to prevent jarring jumps.

```typescript
viewer.updateGraph(newData);
```

### Manual Node Positioning
If you want to manually set a node's position:
```typescript
const data = {
    nodes: [{
        id: '1',
        position: [x, y, z], // [number, number, number]
        // ...
    }],
    focusNodeId: '1'
};
```

## 4. Interaction System

The camera system is built around an orbit behavior:
- **Left Mouse Drag**: Rotate (Orbit) around the target.
- **Right Mouse Drag**: Pan the view.
- **Scroll**: Zoom in/out.
- **Node Dragging**: Left-click and hold a node to move it in 3D space. The engine calculates the movement based on the camera's perspective.

### 4.2 RDF-star Visualization
When dealing with RDF-star (Quoted Triples), the engine treats the triple itself as a node. It is recommended to use the `inverted_pyramid` shape or a custom color to distinguish these from standard entities.

```typescript
{
    id: 'triple-id-123',
    label: '<<:s :p :o>>',
    type: 'inverse', 
    shape: 'inverted_pyramid',
    color: '#a0a0ff' // Light indigo for reified/quoted nodes
}
```

## 5. Style Customization

Diodes and lines are shaded in the GPU. You can pass hex colors to nodes:

```typescript
{
    id: 'node-id',
    color: '#ff5500', // Crimson glow
    shape: 'sphere'
}
```

## 6. Developer Workflows

### Extending Shaders
If you need to change the visual aesthetic (e.g., adding more bloom), look into `src/shaders/standard.ts`. The `FS_SOURCE` (Fragment Shader) contains the lighting and fog calculations.

### Adding New Primitives
1. Define your vertex array in `src/geometry/primitives.ts`.
2. Add a new `VAO` property in `WebGLContainer.ts`.
3. Update `syncGPUBuffer` and `render` methods to handle the new shape filter.

---

> [!IMPORTANT]
> This library is designed to be **Worker Friendly**. While the current implementation runs on the main thread for DOM/Canvas access, the math and data processing logic is separated to facilitate future offscreen-canvas migrations.

