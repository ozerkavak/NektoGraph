var u = Object.defineProperty;
var f = (n, t, e) => t in n ? u(n, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : n[t] = e;
var c = (n, t, e) => f(n, typeof t != "symbol" ? t + "" : t, e);
class d {
  constructor(t = {}) {
    c(this, "config");
    this.config = t;
  }
  /**
   * Executes the unique ID generation lifecycle:
   * 1. Candidate generation based on prefix/random entropy.
   * 2. Mult-tier uniqueness validation (Local -> Remote).
   * 3. Collision retry logic.
   */
  async createUniqueId() {
    const t = this.config.maxRetries ?? 10;
    for (let e = 0; e < t; e++) {
      const o = this.generateCandidate();
      if (await this.checkUniqueness(o))
        return o;
    }
    throw new Error(`Failed to generate unique ID after ${t} attempts.`);
  }
  /**
   * Generates a base-36 randomized candidate string.
   */
  generateCandidate() {
    const e = `id_${Math.random().toString(36).substring(2, 10)}`;
    return this.config.prefix ? `${this.config.prefix}${e}` : e;
  }
  /**
   * Orchestrates uniqueness checks across configured validation backends.
   * Returns true if the ID is confirmed unique (not present in any store).
   */
  async checkUniqueness(t) {
    let e = !0;
    return this.config.store && this.config.factory && (e = this.checkLocal(t)), !(!e || this.config.endpoint && !await this.checkRemote(t));
  }
  checkLocal(t) {
    if (!this.config.factory || !this.config.store) return !0;
    const e = this.config.factory.namedNode(t);
    return !(!this.config.store.match(e, null, null)[Symbol.iterator]().next().done || !this.config.store.match(null, null, e)[Symbol.iterator]().next().done);
  }
  async checkRemote(t) {
    if (!this.config.endpoint) return !0;
    const e = t.startsWith("http") ? `<${t}>` : `<${t}>`, o = `ASK WHERE { { ${e} ?p ?o } UNION { ?s ?p ${e} } }`, i = `${this.config.endpoint.url}?query=${encodeURIComponent(o)}`;
    try {
      const r = { Accept: "application/sparql-results+json" };
      if (this.config.endpoint.auth) {
        const a = btoa(`${this.config.endpoint.auth.user}:${this.config.endpoint.auth.password}`);
        r.Authorization = `Basic ${a}`;
      }
      const s = await fetch(i, { headers: r });
      if (!s.ok) throw new Error(`SPARQL Error: ${s.statusText}`);
      return !(await s.json()).boolean;
    } catch (r) {
      return console.warn("[IDGenerator] Remote validation failed, assuming collision for safety:", r), !1;
    }
  }
}
export {
  d as IDGenerator
};
