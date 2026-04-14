# @triplestore/3dview

**Zero-dependency WebGL 2.0 3D Entity Voyager library.**

A high-performance, lightweight 3D graph visualization engine designed specifically for RDF/TripleStore exploration. Built for speed, modularity, and seamless integration with semantic data.

## Key Features

- **🚀 Zero Dependencies:** Pure WebGL 2.0 and TypeScript. No Three.js or heavy 3D engines required.
- **⚡ High Performance:** Uses **GPU Instancing** to render thousands of entities at 60fps.
- **🪐 Galaxy Aesthetics:** Built-in starfield background, rim lighting, and emissive pulsing effects for a premium "voyager" feel.
- **🖱️ Smooth Interaction:** Orbit camera, pan, zoom, and mouse-based entity dragging with screen-to-world projection.
- **🏷️ Semantic & RDF-star Aware:** Built-in support for RDF-style nodes (Focus, Class, Property, Value, Inverse) and **Reified Triple Nodes** (RDF-star).
- **🧩 Hybrid Overlay:** High-performance WebGL for geometry with a synchronized HTML/DOM overlay for crisp, accessible labels.

## Installation

Since this is an internal library:

```bash
# From the project root
npm install ./packages/3dview
```

## Quick Start

```typescript
import { WebGLContainer, ThreeDGraphData } from '@triplestore/3dview';

const container = document.getElementById('3d-viewport');

const viewer = new WebGLContainer({
    container: container!,
    onNodeClick: (nodeId) => console.log('Clicked:', nodeId),
});

const data: ThreeDGraphData = {
    focusNodeId: 'node-1',
    nodes: [
        { 
            id: 'node-1', 
            label: 'Entity Alpha', 
            type: 'focus', 
            shape: 'cube', 
            color: '#00ffcc',
            position: [0, 0, 0],
            neighbors: [
                { targetId: 'node-2', label: 'hasProperty', direction: 'out' }
            ]
        },
        { 
            id: 'node-2', 
            label: 'Property Beta', 
            type: 'property', 
            shape: 'sphere', 
            position: [5, 2, -3],
            neighbors: [] 
        }
    ]
};

viewer.updateGraph(data);
```

## Architecture

The library is structured into four main pillars:

1.  **Core Renderer (`WebGLContainer`)**: Manages the canvas, WebGL context, and the render loop.
2.  **Shaders**: custom ES 300 shaders for standard meshes, glowing lines, and the starfield background.
3.  **Math Engine**: A custom `Mat4` and `Ray` implementation for camera and picking logic.
4.  **Geometry Library**: Optimized vertex data for primitives (Cube, Sphere, Pyramid, Inverted Pyramid). *Note: Prism shape is reserved for future implementation.*

## API Reference

### `WebGLContainer`

The main entry point.

| Method | Description |
| :--- | :--- |
| `mount(container)` | Re-attatches the renderer to a new DOM element. |
| `updateGraph(data)` | Synchronizes the GPU buffers with new graph data. Preserves positions for existing nodes. |
| `destroy()` | Stops the animation loop and releases resources. |
| `getNodeById(id)` | Returns the current state of a node. |

## Development

```bash
# Build the library
npm run build

# Watch for changes
npm run watch
```

---

