# Layout Tutorial & Extension Guide

This guide provides practical recipes for developers looking to extend the Workbench workspace or integrate new top-level tools.

## 👨‍🍳 Developer Recipes

### 1. Adding a New Tool to the System Bar
To add a new global utility (e.g., "Metrics Console"):

1.  **Modify `SystemBar.ts`**: Add a new `sys-stat` div to the innerHTML template.
    ```html
    <div class="sys-stat" data-action="open-metrics" title="System Metrics">
        <span>Metrics</span>
    </div>
    ```
2.  **Bind Global Handler**: Add the action to `SystemBar.handleEvent`.
    ```typescript
    if (action === 'open-metrics') (window as any).renderMetrics?.();
    ```
3.  **Define CSS**: Add styling for `[data-action="open-metrics"]` in `index.css`.

### 2. Switching Workspace Layers
The Workbench uses layers to separate background tools (Dashboard) from focused work (Windows).

```typescript
import { WorkbenchLayout } from './ui/layout/WorkbenchLayout';

// To focus solely on the background dashboard
function focusDashboard() {
    document.getElementById('windows-layer').style.display = 'none';
    document.getElementById('dashboard-layer').style.display = 'block';
}
```

### 3. Hydrating the Hover Card
The `entity-hover-card` is a shared global resource managed by the layout shell.

```typescript
const hoverCard = document.getElementById('entity-hover-card');
hoverCard.innerHTML = `<h3>Quick Preview</h3>...`;
hoverCard.style.left = `${x}px`;
hoverCard.style.top = `${y}px`;
hoverCard.style.display = 'block';
```

---

## 👤 User Guide: UI Controls

### Top Bar (The Command Center)
- **BKGE Logo**: Quick reset. Returns you to the main Dashboard.
- **Import/Export**: Data movement tools.
- **Graphs**: Real-time stats of your triple store distribution.
- **Maintenance**: Emergency store repair (Proceed with caution!).

### Workspace (The Desktop)
- **Floating Windows**: Every entity opens in its own window. You can drag, resize, and minimize them.
- **Taskbar (Bottom)**: Minimized windows are collected here for quick restoration.
- **Session Hub**: The central search box and commit/discard controls are always available in the background layer.

---

> [!TIP]
> **Pro Tip:** Use the `Cascade` button in the Session Hub to automatically organize a messy workspace of multiple windows.

