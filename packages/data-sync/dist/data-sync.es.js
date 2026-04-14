var c = Object.defineProperty;
var p = (i, t, e) => t in i ? c(i, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : i[t] = e;
var h = (i, t, e) => p(i, typeof t != "symbol" ? t + "" : t, e);
import { EventEmitter as o } from "@triplestore/events";
class y extends o {
  constructor(e) {
    super();
    /**
     * Operational mode for the sync engine.
     * 'on' - Automatic full refresh on granular updates
     * 'off' - Manual refresh or critical only
     */
    h(this, "mode", "off");
    this.deps = e, this.on("session:committed", (n) => {
      this.deps.search.updateEntityIndex && n.forEach((a) => this.deps.search.updateEntityIndex(a));
    });
  }
  /**
   * Recompute Inference reasoning quads.
   * Essential before indexing to ensure inferred data is searchable.
   */
  updateInference() {
    this.deps.inference.recompute();
  }
  /**
   * Rebuild the Unified Search Map.
   */
  updateSearchIndex() {
    this.deps.search.invalidateIndex(), this.deps.search.buildIndex();
  }
  /**
   * Update Schema Index (Classes/Properties).
   */
  updateSchemaIndex() {
    this.deps.schemaIndex.buildIndex();
  }
  /**
   * Invalidate and Recount internal graph quads.
   */
  resetStats() {
    this.deps.resetStats();
  }
  /**
   * Refresh all open UI windows and dispatch global render event.
   */
  refreshUI() {
    this.deps.invalidateCache && this.deps.invalidateCache(), this.deps.windowManager.refreshAllWindows(), this.emit("sync:complete");
  }
  /**
   * Incrementally synchronizes specific entities across indices (Search, Schema).
   * If DataSync is OFF, it will still update 'Critical' indices (Search) but skip UI Refresh.
   */
  syncDirtyEntities(e, n = "optional", a) {
    const r = Array.isArray(e) ? e : [e];
    r.forEach((s) => {
      this.deps.search.updateEntityIndex && this.deps.search.updateEntityIndex(s, a), this.deps.invalidateEntity && this.deps.invalidateEntity(s);
    }), n === "optional" && this.mode === "on" ? this.refreshUI() : n === "critical" && (r.forEach((s) => {
      if (typeof s == "string" || typeof s == "bigint") {
        const d = typeof s == "bigint" ? this.deps.factory.decode(s).value : s;
        this.deps.windowManager.refreshWindows(d);
      }
    }), this.emit("sync:granular", { ids: r }), this.emit("sync:complete"));
  }
  /**
   * Orchestrates a full system-wide refresh in the optimal order.
   * Order: Inference -> Search -> Schema -> Stats -> UI
   */
  fullRefresh() {
    this.emit("sync:start");
    try {
      this.updateInference(), this.updateSearchIndex(), this.updateSchemaIndex(), this.resetStats(), this.refreshUI();
    } catch (e) {
      this.emit("sync:error", e);
    }
  }
}
export {
  y as DataSyncEngine
};
//# sourceMappingURL=data-sync.es.js.map
