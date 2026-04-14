# Window Manager Tutorial

This guide shows you how to integrate and use the window management system in your project.

## 1. Initialization

First, create a container in your HTML where the windows will live:

```html
<div id="windows-layer" style="position: absolute; inset: 0; pointer-events: none;"></div>
```

Then, initialize the `WindowManager`:

```typescript
import { WindowManager } from '@triplestore/window-manager';

const manager = new WindowManager('windows-layer');
```

## 2. Creating a Window

To create a window, you need a "renderer" function. This function is responsible for populating the window's content area.

```typescript
manager.create(
    'my-entity-id', // Unique ID (optional)
    'Dynamic Window Title',
    (container, winId) => {
        container.innerHTML = `<h1>Hello from Window ${winId}</h1>`;
        // You can use React, Vue, or Vanilla JS here to populate 'container'
    }
);
```

## 3. Switching Themes

The system supports built-in themes. You can switch them dynamically:

```typescript
// Dark Glass Mode (Default)
manager.setTheme('night');

// Professional Light Mode
manager.setTheme('day');
```

## 4. Managing Multiple Windows

You can programmatically control the layout:

```typescript
// Cascade all windows
manager.cascade();

// Minimize everything to the bottom dock
manager.minimizeAll();
```

## 5. Interaction
Windows are draggable and resizable by default. The `WindowManager` ensures they stay within the boundaries of the container.
