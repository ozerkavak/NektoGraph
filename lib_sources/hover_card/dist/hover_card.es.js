var f = Object.defineProperty;
var g = (l, t, i) => t in l ? f(l, t, { enumerable: !0, configurable: !0, writable: !0, value: i }) : l[t] = i;
var d = (l, t, i) => g(l, typeof t != "symbol" ? t + "" : t, i);
const e = class e {
  static init(t) {
    if (e.initialized && e.eventsBound) return;
    if (e.config = t, e.cardEl = document.getElementById("entity-hover-card"), !e.cardEl) {
      console.warn("[HoverCard] Deferred: #entity-hover-card not found. Initialization will retry via UI life-cycle.");
      return;
    }
    e.initialized = !0, e.eventsBound = !0, e.cardEl.style.pointerEvents = "auto", console.log("[HoverCard] Version 1.2 (Rich Literals) initialized.");
    const i = document.getElementById("hover-card-styles");
    i && i.remove();
    const r = document.createElement("style");
    r.id = "hover-card-styles", r.innerHTML = `
                #entity-hover-card {
                    position: fixed !important;
                    z-index: 10000;
                    background: #121212;
                    background: var(--bg-panel, #121212);
                    border: 1px solid var(--border-subtle, #333);
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    border-radius: 8px;
                    max-width: 380px;
                    pointer-events: auto;
                    display: none;
                    box-sizing: border-box;
                    padding: 0;
                    margin: 0;
                    font-family: var(--font-main, sans-serif);
                }
                #entity-hover-card .hover-header { 
                    padding: 14px; 
                    border-bottom: 1px solid var(--border-subtle); 
                    background: rgba(255,255,255,0.02);
                }
                #entity-hover-card .hover-title { 
                    font-weight: 700; 
                    font-size: 13px; 
                    color: var(--text-main); 
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }
                #entity-hover-card .hover-subtitle { 
                    font-size: 10px; 
                    color: var(--text-muted); 
                    margin-top: 4px; 
                    letter-spacing: 0.05em;
                }
                #entity-hover-card .type-badge {
                    font-size: 9px;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-weight: 700;
                    text-transform: uppercase;
                }
                #entity-hover-card .type-badge.lang {
                    background: rgba(59, 130, 246, 0.15);
                    color: #60a5fa;
                    border: 1px solid rgba(59, 130, 246, 0.2);
                }
                #entity-hover-card .type-badge.datatype {
                    background: rgba(16, 185, 129, 0.15);
                    color: #34d399;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }
                #entity-hover-card .hover-body { 
                    padding: 14px; 
                    font-size: 12px; 
                    color: var(--text-main); 
                    line-height: 1.6; 
                }
                #entity-hover-card .hover-desc { 
                    text-align: left !important; 
                    display: -webkit-box; 
                    -webkit-line-clamp: 10; 
                    -webkit-box-orient: vertical; 
                    overflow: hidden; 
                    white-space: pre-wrap; 
                    opacity: 0.9;
                }
            `, document.head.appendChild(r), document.addEventListener("mouseover", (n) => {
      var c, p;
      const a = n.target.closest("[data-id], .unified-item, .chip, .prop-key, .val-text");
      if (!a) return;
      const o = e.resolveTarget(a);
      o && (((c = e.currentTarget) == null ? void 0 : c.idOrValue) === o.idOrValue && ((p = e.currentTarget) == null ? void 0 : p.kind) === o.kind && e.isVisible || (clearTimeout(e.hoverTimer), e.hoverTimer = setTimeout(() => {
        e.showHoverCard(o, n.clientX, n.clientY);
      }, 400)));
    }), document.addEventListener("mouseout", (n) => {
      n.target.closest("[data-id], .unified-item, .prop-key, .val-text") && (clearTimeout(e.hoverTimer), e.hoverTimer = setTimeout(() => {
        var a;
        (a = e.cardEl) != null && a.matches(":hover") || e.hideHoverCard();
      }, 200));
    }), e.cardEl.addEventListener("mouseleave", () => {
      e.hideHoverCard();
    });
  }
  static resolveTarget(t) {
    if (t.hasAttribute("data-kind"))
      return {
        kind: t.getAttribute("data-kind"),
        idOrValue: t.getAttribute("data-value") || t.getAttribute("data-id") || "",
        dataType: t.getAttribute("data-type") || void 0,
        lang: t.getAttribute("data-lang") || void 0
      };
    let i = t.getAttribute("data-id");
    if (!i && t.classList.contains("prop-key") && (i = t.getAttribute("title")), !i) return null;
    const r = i.startsWith("http") || i.startsWith("urn:") || i.includes("://");
    return t.classList.contains("prop-key") ? { kind: "entity", idOrValue: i } : t.classList.contains("unified-item") ? { kind: "entity", idOrValue: i } : r ? { kind: "entity", idOrValue: i } : { kind: "literal", idOrValue: i };
  }
  static async showHoverCard(t, i, r) {
    var n;
    if (e.cardEl)
      if (e.currentTarget = t, e.targetX = i, e.targetY = r, e.isVisible = !0, e.cardEl.innerHTML = `<div style="padding:12px; font-size:11px; color:var(--text-muted); display:flex; gap:8px; align-items:center;">
            <div class="dot ok-bg" style="width:8px; height:8px; border-radius:50%;"></div>
            Searching Knowledge Graph...
        </div>`, e.cardEl.style.left = "-9999px", e.cardEl.style.top = "-9999px", e.cardEl.style.display = "block", e.cardEl.style.pointerEvents = "auto", e.startRafLoop(), t.kind === "entity")
        try {
          if (!((n = e.config) != null && n.entityResolver)) return;
          const s = await e.config.entityResolver(t.idOrValue);
          e.currentTarget === t && e.isVisible && s ? e.render(s) : s || (e.cardEl.style.display = "none");
        } catch {
          e.cardEl.style.display = "none";
        }
      else
        e.renderLiteral(t);
  }
  static hideHoverCard() {
    e.cardEl && (e.cardEl.style.display = "none", e.isVisible = !1, e.currentTarget = null, e.rafId && (cancelAnimationFrame(e.rafId), e.rafId = null));
  }
  static startRafLoop() {
    e.rafId && cancelAnimationFrame(e.rafId);
    const t = () => {
      if (!e.isVisible || !e.cardEl) return;
      const i = e.cardEl.getBoundingClientRect(), r = window.innerWidth, n = window.innerHeight;
      let s = e.targetX + 16, a = e.targetY + 16;
      s + i.width > r && (s = e.targetX - i.width - 16), a + i.height > n && (a = e.targetY - i.height - 16), e.cardEl.style.left = s + "px", e.cardEl.style.top = a + "px", e.rafId = requestAnimationFrame(t);
    };
    e.rafId = requestAnimationFrame(t);
  }
  static requestPositionUpdate() {
    e.startRafLoop();
  }
  static escapeHtml(t) {
    return t ? t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;") : "";
  }
  static renderLiteral(t) {
    if (!e.cardEl) return;
    let i = "LITERAL", r = "";
    if (t.lang)
      i = "LANGUAGE STRING", r = `<span class="type-badge lang">${e.escapeHtml(t.lang)}</span>`;
    else if (t.dataType) {
      let a = t.dataType;
      a.startsWith("http://www.w3.org/2001/XMLSchema#") ? a = "xsd:" + a.split("#")[1] : a = a.split("#")[1] || a.split("/").pop() || a, i = "TYPED LITERAL", r = `<span class="type-badge datatype">${e.escapeHtml(a)}</span>`;
    }
    const n = e.escapeHtml(t.idOrValue), s = `
            <div class="hover-header">
                <div class="hover-title">
                    <span style="font-family:var(--font-mono); font-size:11px; word-break:break-all; flex:1;">${n}</span>
                    ${r}
                </div>
                <div class="hover-subtitle">${i}</div>
            </div>
            <div class="hover-body">
                <div class="hover-desc" style="font-family:var(--font-mono);">${n}</div>
            </div>
        `;
    e.cardEl.innerHTML = s, e.requestPositionUpdate();
  }
  static render(t) {
    if (!e.cardEl) return;
    const i = `
            <div class="hover-header">
                <div class="hover-title">${t.title}</div>
                <div class="hover-subtitle">${t.subtitle}</div>
            </div>
            <div class="hover-body">
                ${t.contentHtml}
            </div>
        `;
    e.cardEl.innerHTML = i, e.requestPositionUpdate();
  }
};
d(e, "config"), d(e, "hoverTimer"), d(e, "currentTarget", null), d(e, "cardEl", null), // RAF State
d(e, "isVisible", !1), d(e, "targetX", 0), d(e, "targetY", 0), d(e, "rafId", null), d(e, "initialized", !1), d(e, "eventsBound", !1);
let u = e;
export {
  u as HoverCard,
  u as default
};
