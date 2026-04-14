var ce = Object.defineProperty;
var le = (b, e, t) => e in b ? ce(b, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : b[e] = t;
var f = (b, e, t) => le(b, typeof e != "symbol" ? e + "" : e, t);
import { QuadStore as he, DEFAULT_GRAPH as W } from "@triplestore/core";
class ae {
  constructor(e) {
    f(this, "additions");
    f(this, "deletions");
    // Hashed keys: "s_p_o_g"
    f(this, "inferredAdditions");
    // Hashed keys of quads added via inference
    f(this, "id");
    f(this, "listeners", []);
    this.id = e, this.additions = new he(), this.deletions = /* @__PURE__ */ new Set(), this.inferredAdditions = /* @__PURE__ */ new Set(), this.additions.on("data", (t) => {
      this.emit(t);
    });
  }
  get size() {
    return this.additions.size;
  }
  emit(e) {
    for (const t of this.listeners)
      try {
        t(e);
      } catch (s) {
        console.error("[DraftStore] Listener Error:", s);
      }
  }
  hash(e, t, s, o = 0n) {
    return `${e}_${t}_${s}_${o}`;
  }
  add(e, t, s, o, i) {
    const a = this.hash(e, t, s, o);
    return this.deletions.has(a) && this.deletions.delete(a), i === "inference" ? this.inferredAdditions.add(a) : this.inferredAdditions.delete(a), this.additions.add(e, t, s, o, i);
  }
  delete(e, t, s, o, i) {
    const a = this.hash(e, t, s, o);
    return this.inferredAdditions.delete(a), this.additions.delete(e, t, s, o, i), this.deletions.has(a) ? !1 : (this.deletions.add(a), this.emit({
      type: "delete",
      quads: [{ subject: e, predicate: t, object: s, graph: o || 0n }],
      source: i || "user"
    }), !0);
  }
  undelete(e, t, s, o) {
    const i = this.hash(e, t, s, o);
    if (this.deletions.has(i))
      return this.deletions.delete(i), this.emit({
        type: "add",
        quads: [{ subject: e, predicate: t, object: s, graph: o || 0n }],
        source: "user"
      }), !0;
    const a = `${e}_${t}_${s}_`;
    let c = !1;
    for (const n of this.deletions)
      n.startsWith(a) && (this.deletions.delete(n), this.emit({
        type: "add",
        quads: [{ subject: e, predicate: t, object: s, graph: o || 0n }],
        source: "user"
      }), c = !0);
    return c;
  }
  match(e, t, s, o) {
    return this.additions.match(e, t, s, o);
  }
  // Delegation / Stubs
  has(e, t, s, o) {
    return this.additions.has(e, t, s, o);
  }
  hasAny(e, t, s) {
    return this.additions.hasAny(e, t, s);
  }
  addQuads(e, t) {
    let s = 0;
    for (const o of e)
      this.add(o.subject, o.predicate, o.object, o.graph, t) && s++;
    return s;
  }
  clearGraph(e, t) {
    return this.additions.clearGraph(e, t);
  }
  moveQuads(e, t) {
    return this.additions.moveQuads(e, t);
  }
  // EventEmitter Implementation
  on(e, t) {
    this.listeners.push(t);
  }
  off(e, t) {
    this.listeners = this.listeners.filter((s) => s !== t);
  }
}
class N {
  constructor(e, t) {
    f(this, "main");
    f(this, "draft");
    this.main = e, this.draft = t;
  }
  *match(e, t, s, o) {
    const i = /* @__PURE__ */ new Set();
    for (const a of this.main.match(e, t, s, o)) {
      const c = `${BigInt(a[0])}_${BigInt(a[1])}_${BigInt(a[2])}_${BigInt(a[3])}`;
      this.draft && this.draft.deletions.has(c) || (i.add(c), yield a);
    }
    if (this.draft)
      for (const a of this.draft.match(e, t, s, o)) {
        const c = `${BigInt(a[0])}_${BigInt(a[1])}_${BigInt(a[2])}_${BigInt(a[3])}`;
        i.has(c) || (i.add(c), yield a);
      }
  }
  // Read-Only Stubs
  add() {
    throw new Error("CompositeStore is read-only");
  }
  delete() {
    throw new Error("CompositeStore is read-only");
  }
  addQuads() {
    throw new Error("CompositeStore is read-only");
  }
  clearGraph() {
    throw new Error("CompositeStore is read-only");
  }
  moveQuads() {
    throw new Error("CompositeStore is read-only");
  }
  // Logic for 'has' could be optimized, but default match check is safest
  has(e, t, s, o) {
    if (this.draft) {
      const i = `${e}_${t}_${s}_${o || 0n}`;
      if (this.draft.deletions.has(i))
        return !1;
      if (this.draft.has(e, t, s, o))
        return !0;
    }
    return this.main.has(e, t, s, o);
  }
  hasAny(e, t, s) {
    return this.has(e, t, s);
  }
  // EventEmitter Stubs
  get size() {
    return 0;
  }
  on(e, t) {
  }
  off(e, t) {
  }
}
class ve {
  constructor(e) {
    f(this, "commitStrategy");
    f(this, "sessions", /* @__PURE__ */ new Map());
    f(this, "activeSession");
    this.commitStrategy = e;
  }
  createSession(e = "anon") {
    const t = `session_${Date.now()}_${e}`, s = new ae(t);
    return this.sessions.set(t, s), this.activeSession = s, s;
  }
  getSession(e) {
    const t = this.sessions.get(e);
    return t && (this.activeSession = t), t;
  }
  listSessions() {
    return Array.from(this.sessions.keys());
  }
  async commitSession(e) {
    const t = this.sessions.get(e);
    t && (await this.commitStrategy.execute(t), t.additions = new ae(e).additions, t.deletions.clear());
  }
  closeSession(e) {
    var t;
    typeof e == "string" && (this.sessions.delete(e), ((t = this.activeSession) == null ? void 0 : t.id) === e && (this.activeSession = void 0));
  }
  getCompositeView(e, t) {
    const s = this.sessions.get(e);
    return new N(t, s);
  }
}
const Pe = "http://example.org/graphs/system/diff", V = "http://example.org/ns/", de = V + "Deletion", ue = V + "subject", pe = V + "predicate", fe = V + "object", me = V + "timestamp", we = "http://example.org/graphs/user";
class Se {
  constructor(e, t, s) {
    this.store = e, this.factory = t, this.diffStore = s;
  }
  async execute(e) {
    const t = (/* @__PURE__ */ new Date()).toISOString(), s = [], o = this.diffStore || this.store;
    for (const i of e.deletions) {
      const a = i.split("_");
      if (a.length < 4) continue;
      const c = BigInt(a[0]), n = BigInt(a[1]), l = BigInt(a[2]), d = BigInt(a[3]);
      this.store.delete(c, n, l, d, "user");
      const h = this.factory.blankNode();
      s.push(
        { subject: h, predicate: this.factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), object: this.factory.namedNode(de), graph: d },
        { subject: h, predicate: this.factory.namedNode(ue), object: c, graph: d },
        { subject: h, predicate: this.factory.namedNode(pe), object: n, graph: d },
        { subject: h, predicate: this.factory.namedNode(fe), object: l, graph: d },
        { subject: h, predicate: this.factory.namedNode(me), object: this.factory.literal(t), graph: d }
      );
    }
    for (const i of e.additions.match(null, null, null, null)) {
      const a = { subject: i[0], predicate: i[1], object: i[2], graph: i[3] }, c = `${a.subject}_${a.predicate}_${a.object}_${a.graph}`;
      if (e.inferredAdditions.has(c))
        continue;
      let n = a.graph;
      if (!this.isDefaultGraph(n)) {
        const d = this.factory.decode(n).value;
        if (d && d.startsWith("http://example.org/graphs/inference/"))
          continue;
      }
      this.isDefaultGraph(n) && (n = this.findAffinityGraph(a.subject));
      const l = { ...a, graph: n };
      this.store.add(l.subject, l.predicate, l.object, l.graph, "user"), s.push(l);
    }
    s.length > 0 && o.addQuads(s, "system");
  }
  isDefaultGraph(e) {
    return !e || e === W;
  }
  findAffinityGraph(e) {
    const t = this.store.match(e, null, null, null);
    for (const s of t) {
      const o = s[3];
      if (!this.isDefaultGraph(o))
        return o;
    }
    return this.factory.namedNode(we);
  }
}
class je {
  constructor(e) {
    f(this, "session", null);
    f(this, "listeners", []);
    this.mainStore = e;
  }
  get size() {
    return this.session ? this.mainStore.size + this.session.size : this.mainStore.size;
  }
  attachSession(e) {
    this.session = e;
  }
  detachSession() {
    this.session = null;
  }
  add(e, t, s, o = W, i = "user") {
    return this.session ? (this.session.add(e, t, s, o, i), this.emit({ type: "add", quads: [{ subject: e, predicate: t, object: s, graph: o }], source: i }), !0) : (console.warn("[OverlayStore] No active session. Write ignored."), !1);
  }
  addQuads(e, t = "user") {
    if (!this.session) return 0;
    let s = 0;
    for (const o of e)
      this.session.add(o.subject, o.predicate, o.object, o.graph, t) && s++;
    return this.emit({ type: "add", quads: e, source: t }), s;
  }
  delete(e, t, s, o = W, i = "user") {
    return this.session ? (this.session.delete(e, t, s, o, i), this.emit({ type: "delete", quads: [{ subject: e, predicate: t, object: s, graph: o }], source: i }), !0) : !1;
  }
  clearGraph(e, t = "user") {
    return console.warn("[OverlayStore] clearGraph not fully supported in Overlay yet."), 0;
  }
  moveQuads(e, t) {
    return console.warn("[OverlayStore] moveQuads not fully supported in Overlay yet."), 0;
  }
  *match(e, t, s, o = null) {
    yield* new N(this.mainStore, this.session).match(e, t, s, o);
  }
  has(e, t, s, o = W) {
    return new N(this.mainStore, this.session).has(e, t, s, o);
  }
  hasAny(e, t, s) {
    return new N(this.mainStore, this.session).hasAny(e, t, s);
  }
  // --- Events ---
  on(e, t) {
    this.listeners.push(t);
  }
  off(e, t) {
    this.listeners = this.listeners.filter((s) => s !== t);
  }
  emit(e) {
    for (const t of this.listeners)
      t(e);
  }
}
class ye {
  constructor(e) {
    f(this, "rdfType");
    f(this, "rdfsLabel");
    f(this, "rdfsComment");
    f(this, "rdfsSubClassOf");
    f(this, "rdfsDomain");
    f(this, "rdfsRange");
    f(this, "owlClass");
    f(this, "owlObjectProperty");
    f(this, "owlDatatypeProperty");
    f(this, "owlAnnotationProperty");
    f(this, "owlDisjointWith");
    f(this, "owlInverseOf");
    f(this, "owlFunctionalProperty");
    f(this, "owlSymmetricProperty");
    f(this, "owlTransitiveProperty");
    f(this, "owlUnionOf");
    f(this, "rdfFirst");
    f(this, "rdfRest");
    f(this, "rdfNil");
    f(this, "owlInverseFunctionalProperty");
    f(this, "owlReflexiveProperty");
    f(this, "owlIrreflexiveProperty");
    f(this, "owlAsymmetricProperty");
    this.rdfType = e.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), this.rdfsLabel = e.namedNode("http://www.w3.org/2000/01/rdf-schema#label"), this.rdfsComment = e.namedNode("http://www.w3.org/2000/01/rdf-schema#comment"), this.rdfsSubClassOf = e.namedNode("http://www.w3.org/2000/01/rdf-schema#subClassOf"), this.rdfsDomain = e.namedNode("http://www.w3.org/2000/01/rdf-schema#domain"), this.rdfsRange = e.namedNode("http://www.w3.org/2000/01/rdf-schema#range"), this.owlClass = e.namedNode("http://www.w3.org/2002/07/owl#Class"), this.owlObjectProperty = e.namedNode("http://www.w3.org/2002/07/owl#ObjectProperty"), this.owlDatatypeProperty = e.namedNode("http://www.w3.org/2002/07/owl#DatatypeProperty"), this.owlAnnotationProperty = e.namedNode("http://www.w3.org/2002/07/owl#AnnotationProperty"), this.owlDisjointWith = e.namedNode("http://www.w3.org/2002/07/owl#disjointWith"), this.owlInverseOf = e.namedNode("http://www.w3.org/2002/07/owl#inverseOf"), this.owlFunctionalProperty = e.namedNode("http://www.w3.org/2002/07/owl#FunctionalProperty"), this.owlSymmetricProperty = e.namedNode("http://www.w3.org/2002/07/owl#SymmetricProperty"), this.owlTransitiveProperty = e.namedNode("http://www.w3.org/2002/07/owl#TransitiveProperty"), this.owlUnionOf = e.namedNode("http://www.w3.org/2002/07/owl#unionOf"), this.rdfFirst = e.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#first"), this.rdfRest = e.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"), this.rdfNil = e.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"), this.owlInverseFunctionalProperty = e.namedNode("http://www.w3.org/2002/07/owl#InverseFunctionalProperty"), this.owlReflexiveProperty = e.namedNode("http://www.w3.org/2002/07/owl#ReflexiveProperty"), this.owlIrreflexiveProperty = e.namedNode("http://www.w3.org/2002/07/owl#IrreflexiveProperty"), this.owlAsymmetricProperty = e.namedNode("http://www.w3.org/2002/07/owl#AsymmetricProperty");
  }
}
class xe {
  constructor(e, t) {
    f(this, "vocab");
    f(this, "classMap", /* @__PURE__ */ new Map());
    f(this, "propertyMap", /* @__PURE__ */ new Map());
    f(this, "subClassMap", /* @__PURE__ */ new Map());
    f(this, "parentMap", /* @__PURE__ */ new Map());
    this.store = e, this.factory = t, this.vocab = new ye(t);
  }
  /**
   * Scans the store to build the index.
   * Indexes rdfs:Class, owl:Class, rdfs:domain, rdfs:range, rdfs:subClassOf
   */
  async buildIndex() {
    this.classMap.clear(), this.propertyMap.clear(), this.subClassMap.clear(), this.parentMap.clear();
    const e = this.vocab, t = /* @__PURE__ */ new Set();
    for (const [n] of this.store.match(null, e.rdfType, e.owlClass)) t.add(n);
    for (const [n] of this.store.match(null, e.rdfType, this.factory.namedNode("http://www.w3.org/2000/01/rdf-schema#Class"))) t.add(n);
    for (const n of t) {
      try {
        if (this.factory.decode(n).termType !== "NamedNode")
          continue;
      } catch {
        continue;
      }
      const l = {};
      for (const [, , h] of this.store.match(n, this.factory.namedNode("http://www.w3.org/2000/01/rdf-schema#label"), null))
        try {
          const m = this.factory.decode(h);
          if (m.termType === "Literal") {
            const y = m.language || "en";
            l[y] = m.value;
          }
        } catch {
        }
      const d = [];
      for (const [, , h] of this.store.match(n, e.owlDisjointWith, null))
        d.push(h);
      this.classMap.set(n, { classID: n, properties: [], subClasses: [], disjointWith: d, labels: l });
    }
    for (const [n, , l] of this.store.match(null, e.rdfsSubClassOf, null))
      this.classMap.has(l) && (this.classMap.get(l).subClasses.push(n), this.subClassMap.has(l) || this.subClassMap.set(l, []), this.subClassMap.get(l).push(n), this.parentMap.has(n) || this.parentMap.set(n, []), this.parentMap.get(n).push(l));
    const s = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Map();
    for (const [n, , l] of this.store.match(null, e.rdfsDomain, null)) {
      if (o.has(n) || o.set(n, []), this.factory.decode(l).termType === "BlankNode") {
        const h = this.resolveUnion(l);
        h.length > 0 ? h.forEach((m) => o.get(n).push(m)) : o.get(n).push(l);
      } else
        o.get(n).push(l);
      s.add(n);
    }
    const i = /* @__PURE__ */ new Map();
    for (const [n, , l] of this.store.match(null, e.owlInverseOf, null))
      i.set(n, l), i.set(l, n);
    const a = (n, l) => {
      for (const d of this.store.match(n, e.rdfType, l)) return !0;
      return !1;
    }, c = [
      e.owlObjectProperty,
      e.owlDatatypeProperty,
      e.owlAnnotationProperty,
      e.owlFunctionalProperty,
      e.owlInverseFunctionalProperty,
      e.owlSymmetricProperty,
      e.owlTransitiveProperty
    ];
    for (const n of c)
      for (const [l] of this.store.match(null, e.rdfType, n))
        s.add(l);
    for (const n of s) {
      const l = o.get(n) || [], d = /* @__PURE__ */ new Set();
      for (const [, , x] of this.store.match(n, e.rdfsRange, null))
        if (this.factory.decode(x).termType === "BlankNode") {
          const L = this.resolveUnion(x);
          L.length > 0 ? L.forEach((H) => d.add(H)) : d.add(x);
        } else
          d.add(x);
      const h = Array.from(d), m = a(n, e.owlFunctionalProperty), y = a(n, e.owlInverseFunctionalProperty), R = a(n, e.owlSymmetricProperty), A = a(n, e.owlTransitiveProperty), F = a(n, e.owlReflexiveProperty), K = a(n, e.owlIrreflexiveProperty), U = a(n, e.owlAsymmetricProperty);
      let B = "Unknown";
      a(n, e.owlObjectProperty) ? B = "Object" : a(n, e.owlDatatypeProperty) ? B = "Data" : a(n, e.owlAnnotationProperty) && (B = "Annotation");
      const Q = i.get(n), z = {};
      for (const [, , x] of this.store.match(n, this.factory.namedNode("http://www.w3.org/2000/01/rdf-schema#label"), null))
        try {
          const E = this.factory.decode(x);
          if (E.termType === "Literal") {
            const L = E.language || "en";
            z[L] = E.value;
          }
        } catch {
        }
      const k = {
        property: n,
        ranges: h,
        minCount: 0,
        maxCount: m ? 1 : 1 / 0,
        isFunctional: m,
        isInverseFunctional: y,
        isSymmetric: R,
        isTransitive: A,
        isReflexive: F,
        isIrreflexive: K,
        isAsymmetric: U,
        inverseOf: Q,
        type: B,
        labels: z
      };
      this.propertyMap.set(n, k);
      for (const x of l)
        this.classMap.has(x) && this.classMap.get(x).properties.push(k);
    }
  }
  listClasses(e = "en") {
    const t = (s) => {
      if (s[e]) return s[e];
      const o = Object.keys(s).find((a) => a.startsWith(e));
      if (o) return s[o];
      if (s.en) return s.en;
      const i = Object.keys(s).find((a) => a.startsWith("en"));
      return i ? s[i] : Object.values(s)[0] || "";
    };
    return Array.from(this.classMap.values()).sort((s, o) => t(s.labels).localeCompare(t(o.labels)));
  }
  listProperties(e = "en") {
    const t = (s) => {
      if (s[e]) return s[e];
      const o = Object.keys(s).find((a) => a.startsWith(e));
      if (o) return s[o];
      if (s.en) return s.en;
      const i = Object.keys(s).find((a) => a.startsWith("en"));
      return i ? s[i] : Object.values(s)[0] || "";
    };
    return Array.from(this.propertyMap.values()).sort((s, o) => t(s.labels).localeCompare(t(o.labels)));
  }
  getSchemaForClass(e) {
    return this.classMap.get(e);
  }
  getPropertySchema(e) {
    return this.propertyMap.get(e);
  }
  getDomainsForProperty(e) {
    const t = [];
    for (const s of this.classMap.values())
      s.properties.some((o) => o.property === e) && t.push(s.classID);
    return t;
  }
  // Calculates depth from root (0 = Root). Handles multiple inheritance by taking max depth? Or min?
  // "Thing" should be 0.
  getDepth(e, t = /* @__PURE__ */ new Set()) {
    if (t.has(e)) return 0;
    t.add(e);
    const s = this.parentMap.get(e);
    if (!s || s.length === 0) return 0;
    let o = 0;
    for (const i of s)
      o = Math.max(o, this.getDepth(i, t));
    return 1 + o;
  }
  getClassHierarchy(e) {
    return this.classMap.get(e);
  }
  // Get Parents
  getSuperClasses(e) {
    return this.parentMap.get(e) || [];
  }
  // Get all children recursively
  getSubClassesRecursive(e, t = /* @__PURE__ */ new Set()) {
    if (t.has(e)) return [];
    t.add(e);
    const s = this.subClassMap.get(e) || [], o = [...s];
    for (const i of s)
      o.push(...this.getSubClassesRecursive(i, t));
    return o;
  }
  resolveUnion(e) {
    const t = this.vocab, s = [];
    for (const [, , o] of this.store.match(e, t.owlUnionOf, null))
      s.push(...this.resolveList(o));
    return s;
  }
  resolveList(e) {
    const t = this.vocab, s = [];
    let o = e;
    for (; o !== t.rdfNil; ) {
      const i = this.store.match(o, t.rdfFirst, null);
      let a = !1;
      for (const [, , n] of i) {
        s.push(n), a = !0;
        break;
      }
      if (!a) break;
      const c = this.store.match(o, t.rdfRest, null);
      a = !1;
      for (const [, , n] of c) {
        o = n, a = !0;
        break;
      }
      if (!a) break;
    }
    return s;
  }
}
class Ce {
  constructor(e, t, s) {
    this._store = e, this.factory = t, this.schemaIndex = s;
  }
  getLabel(e, t = "en", s) {
    if (this.schemaIndex) {
      const c = this.schemaIndex.getSchemaForClass(e);
      if (c && c.labels) {
        if (c.labels[t]) return c.labels[t];
        const n = Object.keys(c.labels).find((l) => l.startsWith(t));
        return n ? c.labels[n] : c.labels.en ? c.labels.en : Object.values(c.labels)[0];
      }
    }
    const o = this.factory.namedNode("http://www.w3.org/2000/01/rdf-schema#label"), i = new N(this._store, s || null), a = [];
    for (const c of i.match(e, o, null, null))
      a.push({ subject: c[0], predicate: c[1], object: c[2], graph: c[3] });
    return this.resolveLanguageValue(a, t);
  }
  getComment(e, t = "en", s) {
    const o = this.factory.namedNode("http://www.w3.org/2000/01/rdf-schema#comment"), i = new N(this._store, s || null), a = [];
    for (const c of i.match(e, o, null, null))
      a.push({ subject: c[0], predicate: c[1], object: c[2], graph: c[3] });
    return this.resolveLanguageValue(a, t);
  }
  resolveLanguageValue(e, t) {
    if (e.length === 0) return;
    for (const o of e) {
      const i = this.factory.decode(o.object);
      if (i.termType === "Literal" && i.language === t) return i.value;
    }
    for (const o of e) {
      const i = this.factory.decode(o.object);
      if (i.termType === "Literal" && (i.language === "en" || i.language === "tr")) return i.value;
    }
    return this.factory.decode(e[0].object).value;
  }
  getBestLabel(e, t) {
    if (e[t]) return e[t];
    const s = Object.keys(e).find((o) => o.startsWith(t));
    return s ? e[s] : e.en ? e.en : Object.values(e)[0];
  }
  deduplicateValues(e) {
    const t = /* @__PURE__ */ new Map();
    for (const a of e) {
      const c = this.factory.decode(a.value);
      let n = c.value;
      if (c.termType === "Literal")
        if (c.language) n += `@${c.language}`;
        else {
          const l = c.datatype, d = l && typeof l == "object" ? l.value : l;
          d && d !== "http://www.w3.org/2001/XMLSchema#string" && (n += `^^${d}`);
        }
      else
        n = `${c.termType}:${c.value}`;
      t.has(n) || t.set(n, []), t.get(n).push(a);
    }
    const s = [], o = { new: 0, data: 1, ontology: 2, inference: 3 }, i = (a) => o[a] ?? 99;
    for (const [a, c] of t) {
      let l = c.some((d) => d.source !== "inference") ? c.filter((d) => d.source !== "inference") : c;
      if (l.sort((d, h) => i(d.source) - i(h.source)), l.length > 0) {
        const d = l[0];
        d.dupeCount = c.length - 1, d.allQuads = c.map((h) => ({ quad: h.quad, source: h.source })), s.push(d);
      }
    }
    return s;
  }
  resolveMetadata(e, t) {
    const s = this.factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), o = this.factory.namedNode("http://www.w3.org/2000/01/rdf-schema#label"), i = this.factory.namedNode("http://www.w3.org/2000/01/rdf-schema#comment"), a = {}, c = {}, n = [], l = /* @__PURE__ */ new Set(), d = new N(this._store, t || null);
    for (const h of d.match(e, o, null, null)) {
      const m = this.factory.decode(h[2]);
      if (m.termType === "Literal") {
        const y = m.language || "";
        a[y] || (a[y] = m.value);
      }
      l.add(this.determineSource({ subject: h[0], predicate: h[1], object: h[2], graph: h[3] }, t));
    }
    for (const h of d.match(e, i, null, null)) {
      const m = this.factory.decode(h[2]);
      if (m.termType === "Literal") {
        const y = m.language || "";
        c[y] || (c[y] = m.value);
      }
      l.add(this.determineSource({ subject: h[0], predicate: h[1], object: h[2], graph: h[3] }, t));
    }
    for (const h of d.match(e, s, null, null))
      n.push(h[2]), l.add(this.determineSource({ subject: h[0], predicate: h[1], object: h[2], graph: h[3] }, t));
    return { labels: a, comments: c, types: n, sources: Array.from(l) };
  }
  /**
   * Recursively follow reification/occurrenceOf chains to find the ground TripleID if the node is a proxy.
   * @param node The NodeID to unwrap
   * @param session Optional session store to include draft reifications
   * @param options.strict If true, it ONLY unwraps if the proxy is truly empty (technical artifact).
   * @returns The ground TripleID if found, or the original node if it doesn't reify anything.
   */
  unwrap(e, t, s = {}) {
    let o = e;
    const i = /* @__PURE__ */ new Set(), a = new N(this._store, t || null), c = [
      "http://www.w3.org/ns/rdf-star#occurrenceOf",
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#reifies",
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#occurrenceOf"
    ];
    for (; i.size < 10 && !i.has(o); ) {
      i.add(o);
      try {
        if (this.factory.decode(o).termType === "Triple") return o;
      } catch {
      }
      let n = null, l = !1;
      for (const d of a.match(o, null, null, null))
        try {
          const h = this.factory.decode(d[1]).value;
          c.some((y) => h === y || h.endsWith("#" + y.split("#").pop())) ? n = d[2] : h.endsWith("#type") || (l = !0);
        } catch {
        }
      if (!n || s.strict && l)
        break;
      o = n;
    }
    return o;
  }
  resolveStructured(e, t = "en", s) {
    var se, oe, re, ne;
    const o = this.factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), i = this.factory.namedNode("http://www.w3.org/2000/01/rdf-schema#label"), a = this.factory.namedNode("http://www.w3.org/2000/01/rdf-schema#comment"), c = [
      "http://www.w3.org/ns/rdf-star#occurrenceOf",
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#reifies",
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#occurrenceOf"
    ], n = [], l = [], d = [], h = [], m = /* @__PURE__ */ new Map(), y = /* @__PURE__ */ new Map(), R = (r) => this.determineSource(r, s), A = new N(this._store, s || null);
    for (const r of A.match(e, null, null, null)) {
      const u = { subject: r[0], predicate: r[1], object: r[2], graph: r[3] }, p = u.predicate;
      m.has(p) || m.set(p, []), m.get(p).push(u), p === o && (n.push(u.object), l.push(u)), p === i && d.push(u), p === a && h.push(u);
    }
    const F = [];
    for (const r of A.match(null, null, null, null)) {
      const u = r[0], p = r[2], w = r[3], P = this.unwrap(u, s), I = this.unwrap(p, s);
      let O = !1;
      try {
        O = this.factory.decode(P).termType === "Triple";
      } catch {
      }
      let S = !1;
      try {
        S = this.factory.decode(I).termType === "Triple";
      } catch {
      }
      const D = O ? P : S ? I : null;
      if (!D) continue;
      const j = this.factory.decode(D);
      if (j.subject === e || j.object === e || j.predicate === e) {
        if (O && j.subject === e) {
          const g = j.predicate, C = j.object;
          ((se = m.get(g)) == null ? void 0 : se.some((M) => M.object === C)) || (m.has(g) || m.set(g, []), m.get(g).push({ subject: e, predicate: g, object: C, graph: w, isReifiedPromotion: !0 }));
        }
        if (!F.some((g) => g.tripleID === D)) {
          const g = /* @__PURE__ */ new Map(), C = [D], $ = /* @__PURE__ */ new Set();
          for (; C.length > 0; ) {
            const M = C.shift();
            if (!$.has(M)) {
              $.add(M);
              for (const v of A.match(M, null, null, null)) {
                const _ = v[1], T = this.factory.decode(_).value;
                if (c.includes(T) || T.endsWith("#type")) {
                  c.includes(T) && C.push(v[2]);
                  continue;
                }
                g.has(_) || g.set(_, []), g.get(_).push({ subject: v[0], predicate: v[1], object: v[2], graph: v[3] });
              }
              for (const v of A.match(null, null, M, null)) {
                const _ = this.factory.decode(v[1]).value;
                c.includes(_) && C.push(v[0]);
              }
            }
          }
          if (g.size > 0) {
            const M = [];
            for (const [v, _] of g)
              M.push({
                property: v,
                values: this.deduplicateValues(_.map((T) => ({ value: T.object, quad: T, source: this.determineSource(T, s) })))
              });
            F.push({
              tripleID: D,
              subject: this.unwrap(j.subject, s),
              predicate: this.unwrap(j.predicate, s),
              object: this.unwrap(j.object, s),
              annotations: M
            });
          }
        }
      }
    }
    for (const r of A.match(null, null, e, null)) {
      const u = this.unwrap(r[0], s), p = r[1];
      y.has(p) || y.set(p, []), y.get(p).push({ subject: u, predicate: p, object: e, graph: r[3] });
    }
    const U = this.deduplicateValues(l.map((r) => ({ value: r.object, quad: r, source: R(r) }))).map((r) => ({ value: r.value, quad: r.quad, source: r.source, dupeCount: r.dupeCount, allQuads: r.allQuads })), Q = this.deduplicateValues(d.map((r) => ({ value: r.object, quad: r, source: R(r) }))).map((r) => {
      const u = this.factory.decode(r.value);
      return { value: u.value, lang: (u.termType === "Literal" ? u.language : "") || "", quad: r.quad, source: r.source, dupeCount: r.dupeCount, allQuads: r.allQuads };
    }), k = this.deduplicateValues(h.map((r) => ({ value: r.object, quad: r, source: R(r) }))).map((r) => {
      const u = this.factory.decode(r.value);
      return { value: u.value, lang: (u.termType === "Literal" ? u.language : "") || "", quad: r.quad, source: r.source, dupeCount: r.dupeCount, allQuads: r.allQuads };
    }), x = {}, E = {}, L = (r, u) => {
      r.forEach((p) => {
        u[p.lang || ""] || (u[p.lang || ""] = p.value);
      }), !u.en && !u[""] && r[0] && (u[r[0].lang || ""] = r[0].value);
    };
    L(Q, x), L(k, E);
    const H = this.resolveLanguageValue(d, t), ie = this.resolveLanguageValue(h, t), q = /* @__PURE__ */ new Map(), Z = (r) => {
      var u;
      if (!q.has(r)) {
        const p = this.factory.decode(r).value, w = n.some((I) => this.factory.decode(I).value === p), P = (u = this.schemaIndex) == null ? void 0 : u.getSchemaForClass(r);
        q.set(r, {
          classID: r,
          isMissing: !w,
          dataProperties: [],
          objectProperties: [],
          unclassifiedProperties: [],
          label: P ? this.getBestLabel(P.labels, t) : void 0,
          labels: P == null ? void 0 : P.labels
        });
      }
      return q.get(r);
    };
    n.forEach((r) => Z(r));
    const J = /* @__PURE__ */ new Set();
    for (const [r, u] of m) {
      if (r === o || r === i || r === a) {
        J.add(r);
        continue;
      }
      const p = (oe = this.schemaIndex) == null ? void 0 : oe.getPropertySchema(r);
      if (p && this.schemaIndex) {
        const w = this.schemaIndex.getDomainsForProperty(r);
        w.length > 0 && (J.add(r), w.forEach((P) => {
          const I = Z(P), O = {
            property: r,
            values: this.deduplicateValues(u.map((S) => ({ value: S.object, quad: S, source: R(S) }))),
            schema: p,
            label: p ? this.getBestLabel(p.labels, t) : void 0
          };
          O.hasMentions = O.values.some((S) => {
            if (S.isReifiedPromotion) return !0;
            try {
              const j = [this.factory.triple(e, r, S.value)], g = /* @__PURE__ */ new Set();
              for (; j.length > 0; ) {
                const C = j.shift();
                if (!g.has(C)) {
                  g.add(C);
                  for (const $ of A.match(null, null, C, null)) {
                    const M = this.factory.decode($[1]).value;
                    if (c.includes(M)) {
                      const v = $[0];
                      for (const _ of A.match(v, null, null, null)) {
                        const T = this.factory.decode(_[1]).value;
                        if (!c.includes(T) && !T.endsWith("#type")) return !0;
                      }
                      j.push(v);
                    }
                  }
                }
              }
            } catch {
            }
            return !1;
          }), p.type === "Object" || p.ranges.length > 0 ? I.objectProperties.push(O) : I.dataProperties.push(O);
        }));
      }
    }
    const ee = [];
    for (const [r, u] of y) {
      const p = (re = this.schemaIndex) == null ? void 0 : re.getPropertySchema(r);
      ee.push({ property: r, values: this.deduplicateValues(u.map((w) => ({ value: w.subject, quad: w, source: R(w) }))), schema: p, isInverse: !0, label: p ? this.getBestLabel(p.labels, t) : void 0 });
    }
    const X = [];
    for (const [r, u] of m)
      if (!J.has(r)) {
        const p = (ne = this.schemaIndex) == null ? void 0 : ne.getPropertySchema(r);
        X.push({ property: r, values: this.deduplicateValues(u.map((w) => ({ value: w.object, quad: w, source: R(w) }))), schema: p, label: p ? this.getBestLabel(p.labels, t) : void 0 });
      }
    this.schemaIndex && q.forEach((r, u) => {
      var p;
      (p = this.schemaIndex.getSchemaForClass(u)) == null || p.properties.forEach((w) => {
        const P = w.type === "Object" || w.ranges.length > 0, I = P ? r.objectProperties : r.dataProperties, O = P ? r.dataProperties : r.objectProperties;
        !I.some((S) => S.property === w.property) && !O.some((S) => S.property === w.property) && I.push({ property: w.property, values: [], schema: w, label: this.getBestLabel(w.labels, t) });
      });
    });
    const Y = Array.from(q.values());
    this.schemaIndex && Y.sort((r, u) => this.schemaIndex.getDepth(r.classID) - this.schemaIndex.getDepth(u.classID));
    const te = /* @__PURE__ */ new Set(), G = (r) => te.add(r);
    return Q.forEach((r) => G(r.source)), k.forEach((r) => G(r.source)), Y.forEach((r) => {
      r.dataProperties.forEach((u) => u.values.forEach((p) => G(p.source))), r.objectProperties.forEach((u) => u.values.forEach((p) => G(p.source)));
    }), X.forEach((r) => r.values.forEach((u) => G(u.source))), { id: e, uri: this.factory.decode(e).value, label: H, labels: x, comment: ie, comments: E, allLabels: Q, allComments: k, allTypes: U, types: n, classGroups: Y, orphanProperties: X, incomings: ee, mentions: F, sources: Array.from(te) };
  }
  determineSource(e, t) {
    if (t && t.additions.has(e.subject, e.predicate, e.object, e.graph)) return "new";
    try {
      const s = this.factory.decode(e.graph).value;
      if (s === "http://example.org/graphs/ontology") return "ontology";
      if (s === "http://example.org/graphs/system/diff") return "diff";
      if (s.includes("/inference/")) return "inference";
      if (s.includes("/source/")) return "data";
    } catch {
    }
    return "data";
  }
  resolve(e) {
    const t = this.resolveStructured(e);
    return { id: t.id, label: t.label, labels: t.labels, types: t.types, properties: /* @__PURE__ */ new Map(), comment: t.comment, comments: t.comments };
  }
}
class Me {
  constructor(e, t) {
    this.store = e, this.factory = t;
  }
  removeClass(e, t, s) {
    const o = this.factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), a = new N(this.store, e).match(t, o, s, null);
    let c = !1;
    for (const n of a) {
      const l = n[3];
      e.delete(t, o, s, l), c = !0;
    }
    c || console.warn("[ClassLifecycle] Attempted to remove class that does not exist:", s);
  }
  addClass(e, t, s) {
    const o = this.factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), i = this.factory.namedNode("http://example.org/graphs/default"), c = new N(this.store, e).match(t, o, s, null);
    let n = !1;
    for (const l of c) {
      n = !0;
      break;
    }
    n || e.add(t, o, s, i);
  }
}
export {
  Me as ClassLifecycle,
  N as CompositeStore,
  we as DEFAULT_WRITE_GRAPH,
  Pe as DIFF_GRAPH_URI,
  Se as DefaultCommitStrategy,
  ae as DraftStore,
  Ce as EntityResolver,
  V as NS_AG,
  je as OverlayStore,
  fe as PROP_OBJECT,
  pe as PROP_PREDICATE,
  ue as PROP_SUBJECT,
  me as PROP_TIMESTAMP,
  xe as SchemaIndex,
  ve as SessionManager,
  de as TYPE_DELETION,
  ye as Vocabulary
};
//# sourceMappingURL=edit-engine.es.js.map
