# 🎓 HoverCard Developer Tutorial: A Deep Dive

**Package**: `@triplestore/hover-card`  
**Latest Version**: 1.2 (Rich Literals)  
**Type**: Standalone Browser UMD Module  

---

## 🎯 The Philosophy
`HoverCard` is designed as a **"dumb" view-only component**. It doesn't know what it's showing; it only knows how to show it beautifully and efficiently. This makes it extremely portable across different RDF projects.

## 🛠️ Installation & Setup

### 1. The Container (HTML)
The library (at runtime) expects a single container element in your `index.html`:

```html
<div id="entity-hover-card" class="entity-hover-card"></div>
```

### 2. Initialization (JavaScript)
Initialize it once. The `entityResolver` is your bridge to the Knowledge Graph.

```typescript
import { HoverCard } from './libs/hover_card.js';

HoverCard.init({
    entityResolver: async (uri: string) => {
        // Step 1: Fetch metadata (labels, comments, types)
        const kg = await KGService.get(uri);
        
        // Step 2: Return formatted data
        return {
            title: kg.label,
            subtitle: kg.typeName,
            contentHtml: `<div class='hover-desc'>${kg.description}</div>`
        };
    }
});
```

---

## 🏷️ The Data Contract (The "Secret Sauce")

The real power of `HoverCard` is its automatic attachment via event delegation. You don't bind events to elements; you just add `data-` attributes.

### A. Entity Attachment
When you hover an element with `data-id`, the `entityResolver` is called.

```html
<span data-id="http://example.org/Parti_A" data-kind="entity">CVP Partisi</span>
```

### B. Literals & XSD Badges (Beta v1.0)
For literal values, the card is rendered **immediately** (no async call) using `data-value` and `data-type`.

```html
<!-- The browser sees this and automatically shows a green 'xsd:token' badge -->
<span data-kind="literal" data-value="cvp_123" data-type="http://www.w3.org/2001/XMLSchema#token">
    cvp_123
</span>
```

---

## 🧬 Under the Hood (Architecture)

### Performance: The RAF Loop
Unlike standard tooltips that use CSS `transition`, `HoverCard` uses a **RequestAnimationFrame (RAF)** loop while it's visible.  
**Why?** Because Knowledge Graph UIs are often complex (many windows, overlays). RAF ensures the card follows the mouse at **exactly** 60/120fps with zero latency, even if the main thread is busy rendering other components.

### Collision Detection (Viewport Flip)
The library calculates the `BoundingClientRect` of itself vs the window. If the mouse is near the right or bottom edge, the card automatically flips its anchor point:
- **Left/Top**: Normal anchor.
- **Right Edge**: Anchors to the left of the mouse.
- **Bottom Edge**: Anchors above the mouse.

---

## 🖌️ Custom Styling

The card injects its own CSS, but you can override it by targeting `#entity-hover-card`.  
**Special Classes:**
- `.hover-header`: The area containing Title and Subtitle/Badge.
- `.hover-body`: The area containing `contentHtml`.
- `.hover-desc`: A pre-styled class for descriptions (with 10-line clamp).
- `.type-badge`: The generic badge class.
- `.type-badge.lang`: Blue branding for language tags.
- `.type-badge.datatype`: Green branding for XSD types.

---

## ⚠️ Common Pitfalls

1. **Missing Container**: If `#entity-hover-card` is not in the DOM when `init` is called, it will fail silently with a warning. Ensure it's in your shell template.
2. **Proxy Access**: In the Antigravity project, `HoverCard` is accessed via a **Proxy** in `globals/index.ts`. This allows you to call `HoverCard.init` even if the script tag hasn't fully executed yet.
3. **pointer-events**: The card itself has `pointer-events: none` to prevent it from capturing mouseovers and causing an infinite flicker loop when it appears under the cursor.

---

## 🚀 Future Roadmap
- [ ] Support for image previews in the resolver.
- [ ] Draggable pin state.
- [ ] Multi-entity stack view.

---
*Maintained by the Antigravity Core Team*

