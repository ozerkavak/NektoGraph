var m = Object.defineProperty;
var w = (h, t, e) => t in h ? m(h, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : h[t] = e;
var a = (h, t, e) => w(h, typeof t != "symbol" ? t + "" : t, e);
const g = ':root{--wm-bg: rgba(25, 25, 30, .85);--wm-border: rgba(255, 255, 255, .14);--wm-highlight: rgba(255, 255, 255, .08);--wm-shadow-active: 0 40px 80px rgba(0, 0, 0, .8), 0 0 0 1px var(--wm-border);--wm-shadow-inactive: 0 15px 40px rgba(0, 0, 0, .6), 0 0 0 1px rgba(255, 255, 255, .06);--wm-text: rgba(255, 255, 255, .95);--wm-btn-hover: rgba(255, 255, 255, .12);--wm-content-bg: rgba(15, 15, 20, .7)}[data-wm-theme=day]{--wm-bg: rgba(255, 255, 255, .92);--wm-border: rgba(0, 0, 0, .12);--wm-highlight: rgba(255, 255, 255, 1);--wm-shadow-active: 0 30px 60px rgba(0, 0, 0, .2), 0 0 0 1px var(--wm-border);--wm-shadow-inactive: 0 12px 30px rgba(0, 0, 0, .12), 0 0 0 1px rgba(0, 0, 0, .06);--wm-text: #111111;--wm-btn-hover: rgba(0, 0, 0, .06);--wm-content-bg: #f8f9fa}.wb-window{border-radius:12px;background:var(--wm-bg);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);border:1px solid var(--wm-border);box-shadow:var(--wm-shadow-inactive);transition:transform .15s cubic-bezier(.2,0,0,1),opacity .2s,box-shadow .2s,border-color .2s;display:flex;flex-direction:column;pointer-events:auto;position:absolute;overflow:hidden}.wb-window.active{box-shadow:var(--wm-shadow-active);border-color:#ffffff40}[data-wm-theme=day] .wb-window.active{border-color:#0003}.wb-window:after{content:"";position:absolute;top:0;right:0;bottom:0;left:0;border-radius:12px;box-shadow:inset 0 1px 0 var(--wm-highlight);pointer-events:none;z-index:2}.window-header{height:40px;display:flex;justify-content:space-between;align-items:center;padding:0 6px 0 16px;-webkit-user-select:none;user-select:none;border-bottom:1px solid var(--wm-border);cursor:default}.window-header:active{cursor:grabbing}.win-title{font-size:13px;font-weight:500;color:var(--wm-text);letter-spacing:.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}.win-controls{display:flex;gap:6px}.win-btn{width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;color:var(--wm-text);opacity:.6;border-radius:6px;cursor:pointer;font-family:monospace;font-size:14px;transition:all .15s;z-index:10}.win-btn:hover{background:var(--wm-btn-hover);opacity:1}.win-btn.close:hover{background:#ef444433;color:#ef4444}.window-content{flex:1;position:relative;overflow:hidden;background:var(--wm-content-bg)}.wb-window.minimized{border-radius:10px 10px 0 0!important;border-bottom:none;box-shadow:0 -8px 24px #0006;background:var(--wm-bg)}.wb-window.minimized:after{border-radius:10px 10px 0 0!important}.wb-window.minimized:hover{transform:translateY(-2px)}.wb-window.maximized{border-radius:0;box-shadow:none}.resize-handle{position:absolute;z-index:100}.resize-handle.n{top:0;left:0;right:0;height:6px;cursor:ns-resize}.resize-handle.s{bottom:0;left:0;right:0;height:6px;cursor:ns-resize}.resize-handle.e{top:0;bottom:0;right:0;width:6px;cursor:ew-resize}.resize-handle.w{top:0;bottom:0;left:0;width:6px;cursor:ew-resize}.resize-handle.ne{top:0;right:0;width:12px;height:12px;cursor:nesw-resize}.resize-handle.nw{top:0;left:0;width:12px;height:12px;cursor:nwse-resize}.resize-handle.se{bottom:0;right:0;width:12px;height:12px;cursor:nwse-resize}.resize-handle.sw{bottom:0;left:0;width:12px;height:12px;cursor:nesw-resize}';
class c {
  static create(t, e = {}) {
    const s = document.createElement(t);
    return e.className && (s.className = e.className), e.id && (s.id = e.id), e.text && (s.innerText = e.text), e.html && (s.innerHTML = e.html), e.style && Object.assign(s.style, e.style), e.attributes && Object.entries(e.attributes).forEach(([i, n]) => s.setAttribute(i, n)), e.onClick && s.addEventListener("click", e.onClick), e.parent && e.parent.appendChild(s), s;
  }
  static setStyle(t, e) {
    Object.assign(t.style, e);
  }
}
class f {
  constructor(t, e, s, i, n, r) {
    a(this, "mode", "none");
    a(this, "startX", 0);
    a(this, "startY", 0);
    a(this, "startRect", { x: 0, y: 0, width: 0, height: 0 });
    this.element = t, this.handle = e, this.manager = s, this.onUpdate = i, this.onInteractStart = n, this.onInteractEnd = r, this.init();
  }
  init() {
    this.handle.addEventListener("mousedown", (t) => {
      t.button === 0 && t.target.tagName !== "BUTTON" && this.startInteraction(t, "drag");
    }), this.element.addEventListener("mousedown", (t) => {
      if (t.target !== this.element && !t.target.classList.contains("resize-handle")) return;
      const e = this.getResizeMode(t);
      e !== "none" && this.startInteraction(t, e);
    }), document.addEventListener("mousemove", this.onMouseMove.bind(this)), document.addEventListener("mouseup", this.onMouseUp.bind(this));
  }
  getResizeMode(t) {
    const e = t.target;
    if (e.classList.contains("resize-handle")) {
      if (e.classList.contains("n")) return "resize-n";
      if (e.classList.contains("s")) return "resize-s";
      if (e.classList.contains("e")) return "resize-e";
      if (e.classList.contains("w")) return "resize-w";
      if (e.classList.contains("ne")) return "resize-ne";
      if (e.classList.contains("nw")) return "resize-nw";
      if (e.classList.contains("se")) return "resize-se";
      if (e.classList.contains("sw")) return "resize-sw";
    }
    return "none";
  }
  startInteraction(t, e) {
    this.mode = e, this.startX = t.clientX, this.startY = t.clientY, this.startRect = {
      x: this.element.offsetLeft,
      y: this.element.offsetTop,
      width: this.element.offsetWidth,
      height: this.element.offsetHeight
    }, this.onInteractStart(), document.body.style.userSelect = "none";
  }
  onMouseMove(t) {
    if (this.mode === "none") return;
    const e = t.clientX - this.startX, s = t.clientY - this.startY;
    let i = { ...this.startRect };
    if (this.mode === "drag")
      i.x += e, i.y += s;
    else {
      if (this.mode.includes("e") && (i.width = Math.max(300, this.startRect.width + e)), this.mode.includes("w")) {
        const r = Math.max(300, this.startRect.width - e);
        i.x = this.startRect.x + (this.startRect.width - r), i.width = r;
      }
      if (this.mode.includes("s") && (i.height = Math.max(200, this.startRect.height + s)), this.mode.includes("n")) {
        const r = Math.max(200, this.startRect.height - s);
        i.y = this.startRect.y + (this.startRect.height - r), i.height = r;
      }
    }
    const n = this.manager.clampToBounds(i, this.mode === "drag");
    this.onUpdate(n);
  }
  onMouseUp() {
    this.mode !== "none" && (this.mode = "none", document.body.style.userSelect = "auto", this.onInteractEnd());
  }
}
class u {
  constructor(t, e, s) {
    a(this, "element");
    a(this, "contentContainer");
    a(this, "titleEl");
    a(this, "_isDestroyed", !1);
    this.state = t, this.manager = e, this.contentRenderer = s, this.element = this.render();
    const i = this.element.querySelector(".window-header");
    new f(
      this.element,
      i,
      e,
      (n) => this.setBounds(n),
      () => this.onInteractStart(),
      () => this.onInteractEnd()
    );
  }
  get id() {
    return this.state.id;
  }
  get entityId() {
    return this.state.entityId;
  }
  get content() {
    return this.contentContainer;
  }
  render() {
    var i, n, r;
    const t = c.create("div", {
      id: this.state.id,
      className: "wb-window",
      style: {
        left: this.state.x + "px",
        top: this.state.y + "px",
        width: this.state.width + "px",
        height: this.state.height + "px",
        zIndex: this.state.zIndex.toString()
      }
    }), e = c.create("div", {
      className: "window-header",
      parent: t,
      html: `
                <div class="win-title">${this.state.title}</div>
                <div class="win-controls">
                    <button class="win-btn min" title="Minimize">_</button>
                    <button class="win-btn max" title="Maximize">□</button>
                    <button class="win-btn close" title="Close">×</button>
                </div>
            `
    });
    return this.titleEl = e.querySelector(".win-title"), (i = e.querySelector(".min")) == null || i.addEventListener("click", (o) => {
      o.stopPropagation(), this.minimize();
    }), (n = e.querySelector(".max")) == null || n.addEventListener("click", (o) => {
      o.stopPropagation(), this.maximize();
    }), (r = e.querySelector(".close")) == null || r.addEventListener("click", (o) => {
      o.stopPropagation(), this.close();
    }), e.addEventListener("dblclick", () => {
      this.state.isMinimized ? this.restore() : this.maximize();
    }), this.contentContainer = c.create("div", {
      className: "window-content",
      parent: t
    }), this.contentRenderer(this.contentContainer, this.state.id), ["n", "s", "e", "w", "ne", "nw", "se", "sw"].forEach((o) => {
      c.create("div", {
        className: `resize-handle ${o}`,
        parent: t
      });
    }), t.addEventListener("mousedown", (o) => {
      o.stopPropagation(), this.bringToFront();
    }), t;
  }
  setTitle(t) {
    this.state.title = t, this.titleEl && (this.titleEl.innerText = t);
  }
  setActive(t) {
    t ? this.element.classList.add("active") : this.element.classList.remove("active");
  }
  setZIndex(t) {
    this.state.zIndex = t, this.element.style.zIndex = t.toString();
  }
  bringToFront() {
    this.manager.focus(this.state.id);
  }
  refresh() {
    this.contentContainer.innerHTML = "", this.contentRenderer(this.contentContainer, this.state.id);
  }
  setBounds(t) {
    this._isDestroyed || (this.state.x = t.x, this.state.y = t.y, this.state.width = t.width, this.state.height = t.height, this.element.style.left = t.x + "px", this.element.style.top = t.y + "px", this.element.style.width = t.width + "px", this.element.style.height = t.height + "px");
  }
  setDockPosition(t, e, s) {
    this.element.classList.add("minimized"), this.element.style.left = t + "px", this.element.style.top = e + "px", this.element.style.width = s + "px", this.element.style.height = "40px";
  }
  minimize() {
    this.state.isMinimized = !0, this.manager.minimize(this.state.id);
  }
  maximize() {
    var t, e;
    if (this.state.isMaximized) {
      this.restore();
      return;
    }
    this.state.prevBounds = {
      x: this.state.x,
      y: this.state.y,
      width: this.state.width,
      height: this.state.height
    }, this.state.isMaximized = !0, this.element.classList.remove("minimized"), this.element.classList.add("maximized"), this.setBounds({
      x: 0,
      y: 0,
      width: ((t = this.element.parentElement) == null ? void 0 : t.clientWidth) || window.innerWidth,
      height: ((e = this.element.parentElement) == null ? void 0 : e.clientHeight) || window.innerHeight
    }), this.bringToFront();
  }
  restore() {
    this.state.isMinimized ? (this.state.isMinimized = !1, this.element.classList.remove("minimized"), this.setBounds({
      x: this.state.x,
      y: this.state.y,
      width: this.state.width,
      height: this.state.height
    }), this.bringToFront(), this.manager.arrangeMinimised()) : this.state.isMaximized && (this.state.isMaximized = !1, this.element.classList.remove("maximized"), this.state.prevBounds && this.setBounds(this.state.prevBounds));
  }
  close() {
    this.manager.close(this.state.id);
  }
  destroy() {
    this._isDestroyed = !0, this.element.remove();
  }
  onInteractStart() {
    this.element.classList.add("interacting"), this.bringToFront();
  }
  onInteractEnd() {
    this.element.classList.remove("interacting");
  }
}
class b {
  constructor(t) {
    a(this, "windows", /* @__PURE__ */ new Map());
    a(this, "_container", null);
    a(this, "_activeId", null);
    a(this, "maxZ", 100);
    a(this, "onStateChange", () => {
    });
    a(this, "_containerRect", null);
    a(this, "containerId");
    this.containerId = t, window.addEventListener("resize", () => {
      this._container && (this._containerRect = this._container.getBoundingClientRect(), this.arrangeMinimised());
    });
  }
  get container() {
    return this._container || (this._container = document.getElementById(this.containerId) || document.body || document.documentElement), this._container;
  }
  get containerRect() {
    if (!this._containerRect) {
      const t = this.container;
      this._containerRect = t ? t.getBoundingClientRect() : new DOMRect(0, 0, 1024, 768);
    }
    return this._containerRect;
  }
  setTheme(t) {
    const e = this.container;
    e && e.setAttribute("data-wm-theme", t);
  }
  setContainer(t) {
    const e = document.getElementById(t);
    e && (this._container = e, this._containerRect = e.getBoundingClientRect(), this.windows.forEach((s) => {
      s.element.parentElement !== e && e.appendChild(s.element);
    }));
  }
  get activeId() {
    return this._activeId;
  }
  getWindow(t) {
    return this.windows.get(t);
  }
  listWindows() {
    return Array.from(this.windows.values()).sort((t, e) => t.state.zIndex - e.state.zIndex);
  }
  create(t, e, s, i, n) {
    if (t) {
      const d = Array.from(this.windows.values()).find((l) => l.state.entityId === t && l.state.group === n);
      if (d)
        return d.state.isMinimized && d.restore(), this.focus(d.id), e && e !== d.state.title && d.setTitle(e), d;
    }
    const r = "win_" + Date.now() + "_" + Math.floor(Math.random() * 1e3), o = new u({
      id: r,
      entityId: t,
      title: e,
      metadata: i,
      x: 50 + this.windows.size * 30,
      y: 50 + this.windows.size * 30,
      width: 900,
      height: 450,
      zIndex: ++this.maxZ,
      isMinimized: !1,
      isMaximized: !1,
      group: n
    }, this, s);
    return this.windows.set(r, o), this.container.appendChild(o.element), this.focus(r), this.onStateChange(), o;
  }
  focus(t) {
    const e = this.windows.get(t);
    e && (e.setZIndex(++this.maxZ), this._activeId = t, this.onStateChange(), this.windows.forEach((s) => s.setActive(s.id === t)));
  }
  close(t) {
    const e = this.windows.get(t);
    e && (e.destroy(), this.windows.delete(t), this._activeId === t && (this._activeId = null)), this.arrangeMinimised(), this.onStateChange();
  }
  minimize(t) {
    this.arrangeMinimised(), this.onStateChange();
  }
  minimizeAll() {
    this.windows.forEach((t) => t.minimize());
  }
  toggleMinimizeAll() {
    Array.from(this.windows.values()).every((e) => e.state.isMinimized) ? this.restoreAll() : this.minimizeAll();
  }
  restoreAll() {
    this.windows.forEach((t) => t.restore());
  }
  closeAll() {
    Array.from(this.windows.values()).forEach((t) => t.close());
  }
  cascade() {
    let t = 0;
    const e = 30, s = 50, i = 50;
    this.windows.forEach((n) => {
      n.state.isMinimized && n.restore(), n.setBounds({
        x: s + t * e,
        y: i + t * e,
        width: 900,
        height: 450
      }), n.bringToFront(), t++;
    }), this.onStateChange();
  }
  clampToBounds(t, e) {
    const s = this.containerRect, i = { ...t };
    return i.width = Math.max(300, i.width), i.height = Math.max(200, i.height), i.x < 0 && (i.x = 0), i.y < 0 && (i.y = 0), i.x + i.width > s.width && (i.x = Math.max(0, s.width - i.width), i.x + i.width > s.width && (i.width = s.width)), i.y + i.height > s.height && (i.y = Math.max(0, s.height - i.height), i.y + i.height > s.height && (i.height = s.height)), i;
  }
  arrangeMinimised() {
    const t = Array.from(this.windows.values()).filter((n) => n.state.isMinimized), e = 200, s = 10, i = 10;
    t.forEach((n, r) => {
      const o = i + r * (e + s), d = this.containerRect.height - 50;
      n.setDockPosition(o, d, e);
    });
  }
  refreshAllWindows() {
    this.windows.forEach((t) => {
      try {
        t.refresh();
      } catch (e) {
        console.error(`[WindowManager] Window ${t.id} refresh failed`, e);
      }
    });
  }
  renameWindow(t, e) {
    const s = this.windows.get(t);
    s && (s.state.entityId = e, this.onStateChange());
  }
}
if (typeof document < "u") {
  const h = "wm-standalone-style";
  if (!document.getElementById(h)) {
    const t = document.createElement("style");
    t.id = h, t.textContent = g, document.head.appendChild(t);
  }
}
export {
  c as DOM,
  f as Interactable,
  b as WindowManager,
  u as WorkbenchWindow
};
