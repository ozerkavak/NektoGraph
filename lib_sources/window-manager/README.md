# @triplestore/window-manager

A standalone, theme-able, and high-performance floating window management system for web applications.

## Features
- **Retained-mode Architecture:** DOM elements persist for maximum performance and reactivity.
- **Theme Support:** Built-in support for Day (Light) and Night (Glassmorphism) modes via CSS variables.
- **Multi-window Management:** handles z-index stacking, focus, dragging, and resizing.
- **Layout Tools:** Built-in Cascade and Minimize-to-Dock (taskbar-like) functionality.
- **Decoupled Content:** Injects content via a renderer callback, independent of the window frame logic.

## Installation
```bash
# Internal monorepo usage
import { WindowManager } from '@triplestore/window-manager';
```

## API Reference

### `WindowManager`
The central orkestrator for all windows.

- `create(entityId, title, renderer, metadata?, group?)`: Creates a new window.
- `focus(id)`: Brings a window to the front.
- `minimizeAll()` / `restoreAll()` / `closeAll()`: Global window operations.
- `cascade()`: Arranges all windows in a cascaded layout.
- `setTheme(theme: 'day' | 'night')`: Switches the visual style of all windows.

### `WorkbenchWindow`
Represents an individual window frame.

- `setTitle(title)`: Updates the window header title.
- `bringToFront()`: Focuses this specific window.
- `refresh()`: Clears and re-renders the window content using the provided renderer.

## CSS Customization
The library uses `--wm-` prefixed CSS variables. You can override these in your application's root or by using the `data-wm-theme` attribute.
