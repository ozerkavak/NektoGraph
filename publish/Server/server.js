"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const sparqljs = require("sparqljs");
const parserSparql12 = require("@traqula/parser-sparql-1-2");
const http = require("http");
const fs = require("fs");
const path = require("path");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const http__namespace = /* @__PURE__ */ _interopNamespaceDefault(http);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const NodeType = {
  URI: 0x1n,
  BNODE: 0x2n,
  LITERAL: 0x3n,
  TRIPLE: 0x5n
};
const MASK_TYPE = 0xf000000000000000n;
const SHIFT_TYPE = 60n;
const DEFAULT_GRAPH = 0n;
class StringPool {
  constructor() {
    __publicField(this, "strToId");
    __publicField(this, "idToStr");
    this.strToId = /* @__PURE__ */ new Map();
    this.idToStr = [];
  }
  /**
   * Gets the existing ID or creates a new one.
   */
  getOrCreate(value) {
    let id = this.strToId.get(value);
    if (id !== void 0) {
      return id;
    }
    id = this.idToStr.length;
    this.idToStr.push(value);
    this.strToId.set(value, id);
    return id;
  }
  /**
   * Retrieves string by ID.
   */
  get(id) {
    return this.idToStr[id];
  }
  get size() {
    return this.idToStr.length;
  }
}
class StarInvertedIndex {
  constructor() {
    __publicField(this, "map", /* @__PURE__ */ new Map());
  }
  add(constituent, tripleId) {
    let list = this.map.get(constituent);
    if (!list) {
      list = [];
      this.map.set(constituent, list);
    }
    list.push(tripleId);
  }
  get(constituent) {
    return this.map.get(constituent);
  }
  remove(constituent, tripleId) {
    const list = this.map.get(constituent);
    if (!list)
      return;
    const idx = list.indexOf(tripleId);
    if (idx !== -1) {
      list.splice(idx, 1);
    }
    if (list.length === 0) {
      this.map.delete(constituent);
    }
  }
}
const XSD_INTEGER = "http://www.w3.org/2001/XMLSchema#integer";
const XSD_STRING = "http://www.w3.org/2001/XMLSchema#string";
const RDF_LANGSTRING = "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString";
const TYPE_INLINE_INT = 0x4n;
class IDFactory {
  constructor() {
    __publicField(this, "uriPool", new StringPool());
    __publicField(this, "bnodePool", new StringPool());
    __publicField(this, "literalMap", /* @__PURE__ */ new Map());
    __publicField(this, "literalArray", []);
    __publicField(this, "tripleMap", /* @__PURE__ */ new Map());
    __publicField(this, "tripleArray", []);
    // Star Inverted Indices (Constituent NodeID -> List of Triple NodeIDs)
    __publicField(this, "starIdxS", new StarInvertedIndex());
    __publicField(this, "starIdxP", new StarInvertedIndex());
    __publicField(this, "starIdxO", new StarInvertedIndex());
  }
  /**
   * Creates or retrieves a canonical ID for a Named Node (URI).
   * @param uri - The absolute URI string.
   */
  namedNode(uri) {
    const id = BigInt(this.uriPool.getOrCreate(uri));
    return NodeType.URI << SHIFT_TYPE | id;
  }
  /**
   * Creates or retrieves a canonical ID for a Blank Node.
   * @param label - Optional label. If omitted, a fresh label is generated.
   */
  blankNode(label) {
    const actualLabel = label || `b${this.bnodePool.size}`;
    const id = BigInt(this.bnodePool.getOrCreate(actualLabel));
    return NodeType.BNODE << SHIFT_TYPE | id;
  }
  /**
   * Creates a canonical ID for a Literal.
   * Attempts to inline small integers (56-bit signed) into the ID itself.
   * Otherwise, interns the complex literal in a registry.
   *
   * @param value - The lexical form.
   * @param datatype - Absolute URI of the datatype (defaults to xsd:string).
   * @param language - Language tag (if applicable).
   */
  literal(value, datatype, language) {
    if (datatype === XSD_INTEGER && !language) {
      try {
        const bigVal = BigInt(value);
        const min = -(1n << 55n);
        const max = (1n << 55n) - 1n;
        if (bigVal >= min && bigVal <= max) {
          const mask56 = (1n << 56n) - 1n;
          const packed = bigVal & mask56;
          return TYPE_INLINE_INT << SHIFT_TYPE | packed;
        }
      } catch (e) {
      }
    }
    const lang = language || "";
    const dt = datatype || (lang ? RDF_LANGSTRING : XSD_STRING);
    const key = `${value}|${dt}|${lang}`;
    let id = this.literalMap.get(key);
    if (id === void 0) {
      id = this.literalArray.length;
      this.literalArray.push({ termType: "Literal", value, datatype: dt, language: lang });
      this.literalMap.set(key, id);
    }
    return NodeType.LITERAL << SHIFT_TYPE | BigInt(id);
  }
  /**
   * Interns a Quoted Triple as a NodeID.
   */
  triple(subject, predicate, object) {
    const key = `${subject}:${predicate}:${object}`;
    let id = this.tripleMap.get(key);
    if (id === void 0) {
      id = this.tripleArray.length;
      const sStr = this.decode(subject).value || subject.toString();
      const pStr = this.decode(predicate).value || predicate.toString();
      const oStr = this.decode(object).value || object.toString();
      const displayValue = `<< ${sStr} ${pStr} ${oStr} >>`;
      this.tripleArray.push({ termType: "Triple", subject, predicate, object, value: displayValue });
      this.tripleMap.set(key, id);
      const tripleId = NodeType.TRIPLE << SHIFT_TYPE | BigInt(id);
      this.starIdxS.add(subject, tripleId);
      this.starIdxP.add(predicate, tripleId);
      this.starIdxO.add(object, tripleId);
      return tripleId;
    }
    return NodeType.TRIPLE << SHIFT_TYPE | BigInt(id);
  }
  /**
   * Efficiently find all Quoted Triples where 'constituent' is the subject, predicate, or object.
   * This is an O(1) operation using the Star Inverted Indices.
   */
  findQuotedTriples(constituent, role) {
    if (role === "S")
      return this.starIdxS.get(constituent) || [];
    if (role === "P")
      return this.starIdxP.get(constituent) || [];
    if (role === "O")
      return this.starIdxO.get(constituent) || [];
    const s = this.starIdxS.get(constituent) || [];
    const p = this.starIdxP.get(constituent) || [];
    const o = this.starIdxO.get(constituent) || [];
    return Array.from(/* @__PURE__ */ new Set([...s, ...p, ...o]));
  }
  decode(id) {
    const type = (id & MASK_TYPE) >> SHIFT_TYPE;
    const valueRaw = id & ~MASK_TYPE;
    if (type === NodeType.URI) {
      const uri = this.uriPool.get(Number(valueRaw));
      return { termType: "NamedNode", value: uri || "" };
    } else if (type === NodeType.BNODE) {
      const label = this.bnodePool.get(Number(valueRaw));
      return { termType: "BlankNode", value: label || "" };
    } else if (type === NodeType.LITERAL) {
      return this.literalArray[Number(valueRaw)];
    } else if (type === NodeType.TRIPLE) {
      return this.tripleArray[Number(valueRaw)];
    } else if (type === TYPE_INLINE_INT) {
      const isNegative = (valueRaw & 1n << 55n) !== 0n;
      let val = valueRaw;
      if (isNegative) {
        val = valueRaw | ~((1n << 56n) - 1n);
      }
      return {
        termType: "Literal",
        value: val.toString(),
        datatype: XSD_INTEGER
      };
    }
    throw new Error(`Unknown Node Type ID: ${type.toString(16)}`);
  }
}
class Index {
  constructor() {
    __publicField(this, "map", /* @__PURE__ */ new Map());
  }
  /**
   * Records that 'value' appears at 'quadIndex'.
   */
  add(value, quadIndex) {
    let list = this.map.get(value);
    if (!list) {
      list = [];
      this.map.set(value, list);
    }
    list.push(quadIndex);
  }
  /**
   * Removes the record that 'value' is at 'quadIndex'.
   */
  remove(value, quadIndex) {
    const list = this.map.get(value);
    if (!list)
      return;
    const idx = list.indexOf(quadIndex);
    if (idx !== -1) {
      const last = list.pop();
      if (idx < list.length) {
        list[idx] = last;
      }
    }
    if (list.length === 0) {
      this.map.delete(value);
    }
  }
  /**
   * Updates a pointer because the Quad moved in the Store (due to Swap-Remove).
   * @param value The value of the column (S, P, O, or G) for the moved quad.
   * @param oldQuadIndex Where it used to be.
   * @param newQuadIndex Where it is now.
   */
  updatePointer(value, oldQuadIndex, newQuadIndex) {
    const list = this.map.get(value);
    if (!list)
      return;
    const idx = list.indexOf(oldQuadIndex);
    if (idx !== -1) {
      list[idx] = newQuadIndex;
    }
  }
  /**
   * Returns all quad/row indices having this value.
   */
  get(value) {
    return this.map.get(value);
  }
  /**
       * Intersection of two lists of indices.
       * Used for compound queries (e.g. Match S=? AND P=?)
  
       */
  static intersect(listA, listB) {
    const result = [];
    const useSet = listB.length > 20;
    if (useSet) {
      const setB = new Set(listB);
      for (const val of listA) {
        if (setB.has(val))
          result.push(val);
      }
    } else {
      for (const val of listA) {
        if (listB.includes(val))
          result.push(val);
      }
    }
    return result;
  }
  clear() {
    this.map.clear();
  }
}
class QuadStore {
  constructor(initialCapacity = 1024) {
    __publicField(this, "capacity");
    __publicField(this, "_size");
    __publicField(this, "s");
    __publicField(this, "p");
    __publicField(this, "o");
    __publicField(this, "g");
    __publicField(this, "idxS");
    __publicField(this, "idxP");
    __publicField(this, "idxO");
    __publicField(this, "idxG");
    // 5th Column (Status): 0 = Active, 1 = Deleted
    __publicField(this, "status");
    __publicField(this, "listeners", []);
    this.capacity = initialCapacity;
    this._size = 0;
    this.s = new BigUint64Array(initialCapacity);
    this.p = new BigUint64Array(initialCapacity);
    this.o = new BigUint64Array(initialCapacity);
    this.g = new BigUint64Array(initialCapacity);
    this.idxS = new Index();
    this.idxP = new Index();
    this.idxO = new Index();
    this.idxG = new Index();
    this.status = new Uint8Array(initialCapacity);
  }
  get size() {
    return this._size;
  }
  on(_event, listener) {
    this.listeners.push(listener);
  }
  off(_event, listener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }
  emit(event) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
  /**
   * Adds a quad to the store.
   * Uses Indices for existence check (Intersection of S, P, O, G location lists).
   */
  add(subject, predicate, object, graph = DEFAULT_GRAPH, source = "user") {
    if (this.fastExists(subject, predicate, object, graph)) {
      return false;
    }
    this.ensureCapacity();
    const idx = this._size;
    this.s[idx] = subject;
    this.p[idx] = predicate;
    this.o[idx] = object;
    this.g[idx] = graph;
    this.idxS.add(subject, idx);
    this.idxP.add(predicate, idx);
    this.idxO.add(object, idx);
    this.idxG.add(graph, idx);
    this._size++;
    this.emit({
      type: "add",
      quads: [{ subject, predicate, object, graph }],
      source
    });
    return true;
  }
  addQuads(quads, source = "user") {
    const added = [];
    for (const q of quads) {
      if (this.fastExists(q.subject, q.predicate, q.object, q.graph))
        continue;
      this.ensureCapacity();
      const idx = this._size;
      this.s[idx] = q.subject;
      this.p[idx] = q.predicate;
      this.o[idx] = q.object;
      this.g[idx] = q.graph;
      this.idxS.add(q.subject, idx);
      this.idxP.add(q.predicate, idx);
      this.idxO.add(q.object, idx);
      this.idxG.add(q.graph, idx);
      this._size++;
      added.push(q);
    }
    if (added.length > 0) {
      this.emit({
        type: "add",
        quads: added,
        source
      });
    }
    return added.length;
  }
  delete(subject, predicate, object, graph = DEFAULT_GRAPH, source = "user") {
    const candidates = this.getIndicesForPattern(subject, predicate, object, graph) ?? [];
    if (candidates.length === 0)
      return false;
    let idxToDelete = -1;
    for (const idx of candidates) {
      if (this.status[idx] === 0) {
        idxToDelete = idx;
        break;
      }
    }
    if (idxToDelete === -1)
      return false;
    this.status[idxToDelete] = 1;
    this.idxS.remove(subject, idxToDelete);
    this.idxP.remove(predicate, idxToDelete);
    this.idxO.remove(object, idxToDelete);
    this.idxG.remove(graph, idxToDelete);
    this.emit({
      type: "delete",
      quads: [{ subject, predicate, object, graph }],
      source
    });
    return true;
  }
  *match(subject, predicate, object, graph = null) {
    const candidates = this.getIndicesForPattern(subject, predicate, object, graph);
    if (candidates === void 0) {
      for (let i = 0; i < this._size; i++) {
        if (this.status[i] === 0) {
          yield [this.s[i], this.p[i], this.o[i], this.g[i]];
        }
      }
    } else {
      for (const i of candidates) {
        if (this.status[i] === 0) {
          yield [this.s[i], this.p[i], this.o[i], this.g[i]];
        }
      }
    }
  }
  has(subject, predicate, object, graph = DEFAULT_GRAPH) {
    return this.fastExists(subject, predicate, object, graph);
  }
  hasAny(subject, predicate, object) {
    return this.fastExists(subject, predicate, object, null);
  }
  clearGraph(graphID, source = "user") {
    const indices = this.idxG.get(graphID);
    if (!indices || indices.length === 0)
      return 0;
    const toDeleteIndices = [...indices];
    let count = 0;
    for (const idx of toDeleteIndices) {
      const s = this.s[idx];
      const p = this.p[idx];
      const o = this.o[idx];
      const g = this.g[idx];
      if (this.delete(s, p, o, g, source)) {
        count++;
      }
    }
    return count;
  }
  /**
   * Moves all quads from sourceGraphId to targetGraphId.
   * This is an O(N_source) operation that modifies the graph ID array directly and updates the graph index.
   * Important: This bypasses Event emission for individual quads to avoid memory overhead.
   */
  moveQuads(sourceGraphId, targetGraphId) {
    const sourceIndices = this.idxG.get(sourceGraphId);
    if (!sourceIndices || sourceIndices.length === 0)
      return 0;
    const indicesToMove = [...sourceIndices];
    const count = indicesToMove.length;
    for (const idx of indicesToMove) {
      this.g[idx] = targetGraphId;
      this.idxG.remove(sourceGraphId, idx);
      this.idxG.add(targetGraphId, idx);
    }
    return count;
  }
  // --- Helpers ---
  fastExists(s, p, o, g) {
    const matches = this.getIndicesForPattern(s, p, o, g) ?? [];
    return matches.length > 0;
  }
  /**
   * Returns the intersection of indices for the non-null terms.
   */
  getIndicesForPattern(s, p, o, g) {
    let candidates;
    const refine = (list) => {
      if (!list) {
        candidates = [];
        return;
      }
      if (candidates === void 0) {
        candidates = [...list];
      } else {
        candidates = Index.intersect(candidates, list);
      }
    };
    if (s !== null)
      refine(this.idxS.get(s));
    if (candidates !== void 0 && candidates.length === 0)
      return [];
    if (p !== null)
      refine(this.idxP.get(p));
    if (candidates !== void 0 && candidates.length === 0)
      return [];
    if (o !== null)
      refine(this.idxO.get(o));
    if (candidates !== void 0 && candidates.length === 0)
      return [];
    if (g !== null)
      refine(this.idxG.get(g));
    return candidates;
  }
  ensureCapacity() {
    if (this._size >= this.capacity) {
      const newCap = this.capacity * 2;
      const newS = new BigUint64Array(newCap);
      const newP = new BigUint64Array(newCap);
      const newO = new BigUint64Array(newCap);
      const newG = new BigUint64Array(newCap);
      const newStatus = new Uint8Array(newCap);
      let activeIdx = 0;
      this.idxS.clear();
      this.idxP.clear();
      this.idxO.clear();
      this.idxG.clear();
      for (let i = 0; i < this._size; i++) {
        if (this.status[i] === 0) {
          newS[activeIdx] = this.s[i];
          newP[activeIdx] = this.p[i];
          newO[activeIdx] = this.o[i];
          newG[activeIdx] = this.g[i];
          newStatus[activeIdx] = 0;
          this.idxS.add(newS[activeIdx], activeIdx);
          this.idxP.add(newP[activeIdx], activeIdx);
          this.idxO.add(newO[activeIdx], activeIdx);
          this.idxG.add(newG[activeIdx], activeIdx);
          activeIdx++;
        }
      }
      this.s = newS;
      this.p = newP;
      this.o = newO;
      this.g = newG;
      this.status = newStatus;
      this._size = activeIdx;
      this.capacity = newCap;
    }
  }
}
/**
 * @license NektoGraph UnifiedSearch Beta v1.0 (Standardized)
 * Features: Beta v1.0 Sequence Boost, Turkish Beta v1.0 Normalization.
 * Source: /lib_sources/search/src/search.ts
 */
class UnifiedSearch {
  constructor(config) {
    this.index = /* @__PURE__ */ new Map();
    this.reverseIndex = /* @__PURE__ */ new Map();
    this.indexBuilt = false;
    this.propertyTypeIDs = [];
    this.mainStore = config.store;
    this.factory = config.factory;
    this.schemaIndex = config.schemaIndex;
    this.rdfsLabelID = this.factory.namedNode("http://www.w3.org/2000/01/rdf-schema#label");
    this.rdfsCommentID = this.factory.namedNode("http://www.w3.org/2000/01/rdf-schema#comment");
    this.rdfTypeID = this.factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    const propertyTypes = [
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property",
      "http://www.w3.org/2002/07/owl#ObjectProperty",
      "http://www.w3.org/2002/07/owl#DatatypeProperty",
      "http://www.w3.org/2002/07/owl#AnnotationProperty"
    ];
    this.propertyTypeIDs = propertyTypes.map((uri) => this.factory.namedNode(uri));
  }
  // [FIX] Professional Unified Normalization (Turkish Aware v5.0)
  normalize(s) {
    if (!s) return "";
    let norm = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    norm = norm.toLocaleLowerCase("tr-TR");
    const mapping = {
      "ı": "i",
      "ğ": "g",
      "ü": "u",
      "ş": "s",
      "ö": "o",
      "ç": "c",
      "İ": "i",
      "I": "i"
    };
    return norm.split("").map((char) => mapping[char] || char).join("").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  }
  /**
   * Builds a simple Prefix Index for O(1) lookups.
   * This is an expensive operation and should be called lazily or on data load.
   */
  buildIndex() {
    if (this.indexBuilt) return;
    this.index.clear();
    this.reverseIndex.clear();
    for (const [s, _p, o] of this.mainStore.match(null, null, null, null)) {
      const oTerm = this.factory.decode(o);
      if (oTerm.termType === "Literal") {
        const words = oTerm.value.split(/[\s\-_]+/);
        words.forEach((w) => this.addToIndexInternal(w, s));
      }
      if (oTerm.termType === "NamedNode") {
        const frag = oTerm.value.split("#").pop() || oTerm.value.split("/").pop();
        if (frag) this.addToIndexInternal(frag, o);
      }
      const sTerm = this.factory.decode(s);
      if (sTerm.termType === "NamedNode") {
        const frag = sTerm.value.split("#").pop() || sTerm.value.split("/").pop();
        if (frag) {
          this.addToIndexInternal(frag, s);
        }
      }
    }
    this.indexBuilt = true;
  }
  invalidateIndex() {
    this.indexBuilt = false;
    this.index.clear();
    this.reverseIndex.clear();
  }
  /**
   * Internal: Adds a token to both forward and reverse indices.
   */
  addToIndexInternal(token, id) {
    if (!token) return;
    const key = this.normalize(token);
    if (key.length < 2) return;
    if (!this.index.has(key)) this.index.set(key, []);
    const list = this.index.get(key);
    if (!list.includes(id)) {
      list.push(id);
    }
    if (!this.reverseIndex.has(id)) {
      this.reverseIndex.set(id, /* @__PURE__ */ new Set());
    }
    this.reverseIndex.get(id).add(key);
  }
  /**
   * Removes an entity from the search index.
   */
  removeEntityIndex(id) {
    const tokens = this.reverseIndex.get(id);
    if (!tokens) return;
    for (const token of tokens) {
      const list = this.index.get(token);
      if (list) {
        const idx = list.indexOf(id);
        if (idx !== -1) {
          list.splice(idx, 1);
          if (list.length === 0) {
            this.index.delete(token);
          }
        }
      }
    }
    this.reverseIndex.delete(id);
  }
  /**
   * Incrementally updates the search index for a specific entity.
   * Can optionally include data from a session (DraftStore).
   */
  updateEntityIndex(id, sessionStore) {
    this.removeEntityIndex(id);
    try {
      const sTerm = this.factory.decode(id);
      if (sTerm.termType === "NamedNode") {
        const frag = sTerm.value.split("#").pop() || sTerm.value.split("/").pop();
        if (frag) this.addToIndexInternal(frag, id);
      }
    } catch (e) {
    }
    const scanAndIndex = (store2) => {
      if (!store2) return;
      for (const [s, _p, o] of store2.match(id, null, null, null)) {
        try {
          const oTerm = this.factory.decode(o);
          if (oTerm.termType === "Literal") {
            const words = oTerm.value.split(/[\s\-_]+/);
            words.forEach((w) => this.addToIndexInternal(w, s));
          } else if (oTerm.termType === "NamedNode") {
            const frag = oTerm.value.split("#").pop() || oTerm.value.split("/").pop();
            if (frag) this.addToIndexInternal(frag, o);
          }
        } catch (e) {
        }
      }
      for (const [_s, _p, o] of store2.match(null, null, id, null)) {
        try {
          const oTerm = this.factory.decode(o);
          if (oTerm.termType === "NamedNode") {
            const frag = oTerm.value.split("#").pop() || oTerm.value.split("/").pop();
            if (frag) this.addToIndexInternal(frag, o);
          }
        } catch (e) {
        }
      }
    };
    scanAndIndex(this.mainStore);
    if (sessionStore) {
      scanAndIndex(sessionStore);
    }
  }
  /**
   * Executes a search with strict priority:
   * 1. Match in Label (Selected Language)
   * 2. Match in Label (Any Language)
   * 3. Match in Description/Comment
   * 4. Match in URI / Other Literals
   */
  async search(mainStore, query, options = {}) {
    const results = /* @__PURE__ */ new Map();
    const queryNorm = this.normalize(query);
    const queryTerms = queryNorm.split(/\s+/).filter((t) => t.length >= 1);
    const { language = "en", preferredClass, session, strictTypes, suppressDescription } = options;
    if (queryNorm.length < 2) return [];
    let storeToScan = mainStore;
    let allowedClasses = null;
    if (preferredClass && this.schemaIndex) {
      allowedClasses = /* @__PURE__ */ new Set();
      allowedClasses.add(preferredClass);
      const subclasses = this.schemaIndex.getSubClassesRecursive(preferredClass);
      if (subclasses) subclasses.forEach((c) => allowedClasses.add(c));
    }
    const labelCache = /* @__PURE__ */ new Map();
    const isValidEntity = (id) => {
      try {
        const term = this.factory.decode(id);
        return term.termType === "NamedNode" || term.termType === "BlankNode";
      } catch {
        return false;
      }
    };
    const getBestLabel = (s, session2, store2) => {
      if (labelCache.has(s)) return labelCache.get(s);
      let foundLabel = null;
      if (session2) {
        for (const q of session2.match(s, this.rdfsLabelID, null, null)) {
          const obj = this.factory.decode(q[2]);
          if (obj.termType === "Literal") {
            if (obj.language === language) {
              foundLabel = obj.value;
              break;
            }
            if (!foundLabel) foundLabel = obj.value;
          }
        }
      }
      if (!foundLabel) {
        for (const q of store2.match(s, this.rdfsLabelID, null, null)) {
          const obj = this.factory.decode(q[2]);
          if (obj.termType === "Literal" && obj.language === language) {
            foundLabel = obj.value;
            break;
          }
        }
      }
      if (!foundLabel) {
        for (const q of store2.match(s, this.rdfsLabelID, null, null)) {
          const obj = this.factory.decode(q[2]);
          if (obj.termType === "Literal") {
            foundLabel = obj.value;
            break;
          }
        }
      }
      labelCache.set(s, foundLabel);
      return foundLabel;
    };
    const updateResult = (id, score, matchedText, realLabel, reason, src) => {
      if (!isValidEntity(id)) return;
      if (allowedClasses) {
        let typeMatch = false;
        for (const q of storeToScan.match(id, this.rdfTypeID, null, null)) {
          if (allowedClasses.has(q[2])) {
            typeMatch = true;
            break;
          }
        }
        if (!typeMatch) {
          if (strictTypes) return;
          score -= 100;
        } else {
          score += 500;
        }
      }
      let isProperty = false;
      for (const tNode of this.propertyTypeIDs) {
        for (const _ of storeToScan.match(id, this.rdfTypeID, tNode, null)) {
          isProperty = true;
          break;
        }
        if (isProperty) break;
      }
      let label = realLabel;
      if (!label) {
        if (labelCache.has(id)) label = labelCache.get(id);
        else {
          label = getBestLabel(id, session, storeToScan);
        }
      }
      const finalLabel = label || this.factory.decode(id).value.split("#").pop() || "Entity";
      const existing = results.get(id);
      let displayDesc = void 0;
      if (!isProperty && !suppressDescription) {
        if (reason.startsWith("Label")) {
          displayDesc = void 0;
        } else if (reason === "Description" && matchedText) {
          const normMatched = this.normalize(matchedText);
          const searchFor = queryTerms[0] || queryNorm.trim();
          const idx = normMatched.indexOf(searchFor);
          if (idx >= 0) {
            const start = Math.max(0, idx - 30);
            const end = Math.min(matchedText.length, idx + searchFor.length + 30);
            displayDesc = (start > 0 ? "..." : "") + matchedText.substring(start, end) + (end < matchedText.length ? "..." : "");
          } else {
            displayDesc = matchedText.substring(0, 60) + (matchedText.length > 60 ? "..." : "");
          }
        } else {
          displayDesc = matchedText;
        }
      } else if (suppressDescription) {
        displayDesc = void 0;
      }
      if (existing) {
        if (score > existing.score) {
          existing.score = score;
          existing.debugReason = reason;
          existing.matchedText = matchedText;
          if (reason.startsWith("Label")) {
            existing.labels = [matchedText];
            existing.description = void 0;
          } else {
            existing.description = displayDesc;
          }
        }
      } else {
        results.set(id, { id, labels: [finalLabel], description: displayDesc, score, source: src, debugReason: reason, matchedText });
      }
    };
    const scanQuad = (s, p, o, src) => {
      try {
        const oTerm = this.factory.decode(o);
        if (oTerm.termType === "Literal") {
          const normVal = this.normalize(oTerm.value);
          const allTermsMatch = queryTerms.every((term) => normVal.includes(term));
          if (allTermsMatch && queryTerms.length > 0) {
            let sequenceBoost = 0;
            if (normVal.startsWith(queryNorm)) sequenceBoost = 1e3;
            else if (normVal.includes(queryNorm)) sequenceBoost = 500;
            const isStart = normVal.startsWith(queryTerms[0]);
            const startBoost = isStart ? 50 : 0;
            const scorePadding = sequenceBoost + startBoost;
            if (p === this.rdfsLabelID) {
              if (oTerm.language === language) updateResult(s, 100 + scorePadding, oTerm.value, oTerm.value, `Label (${language})`, src);
              else updateResult(s, 80 + scorePadding, oTerm.value, oTerm.value, `Label (${oTerm.language})`, src);
            } else if (p === this.rdfsCommentID) {
              const realLabel = getBestLabel(s, session, storeToScan);
              updateResult(s, 50 + scorePadding / 2, oTerm.value, realLabel, "Description", src);
            } else {
              const realLabel = getBestLabel(s, session, storeToScan);
              updateResult(s, 20 + scorePadding / 3, oTerm.value, realLabel, "Other Property", src);
            }
          }
        } else if (oTerm.termType === "NamedNode") {
          const uri = this.normalize(oTerm.value);
          if (queryTerms.every((t) => uri.includes(t)) && queryTerms.length > 0) {
            const fragment = this.normalize(oTerm.value.split("#").pop() || oTerm.value.split("/").pop() || "");
            const isStart = queryTerms.some((t) => fragment.startsWith(t));
            const realLabel = getBestLabel(o, session, storeToScan);
            updateResult(o, 40 + (isStart ? 30 : 0), oTerm.value, realLabel, "URI Match", src);
          }
        }
      } catch (e) {
      }
    };
    const useIndex = this.indexBuilt;
    if (useIndex) {
      const candidates = /* @__PURE__ */ new Set();
      const queryTerms2 = queryNorm.trim().split(/\s+/).filter((t) => t.length >= 1);
      const sortedTerms = [...queryTerms2].sort((a, b) => b.length - a.length);
      const lookupTerm = sortedTerms.length > 0 ? sortedTerms[0] : queryNorm;
      for (const [token, ids] of this.index) {
        if (token.includes(lookupTerm)) {
          ids.forEach((id) => candidates.add(id));
          if (candidates.size > 5e3) break;
        }
      }
      const MASK_TYPE2 = 0xF000000000000000n;
      const SHIFT_TYPE2 = 60n;
      const TYPE_URI = 0x1n;
      const TYPE_LITERAL = 0x3n;
      candidates.forEach((id) => {
        let bestLabel = null;
        let bestMatch = null;
        for (const [_, p, o] of this.mainStore.match(id, null, null, null)) {
          const type = (o & MASK_TYPE2) >> SHIFT_TYPE2;
          if (type === TYPE_LITERAL) {
            try {
              const oTerm = this.factory.decode(o);
              if (p === this.rdfsLabelID) {
                if (!bestLabel || oTerm.language === language) bestLabel = oTerm.value;
              }
              const normVal = this.normalize(oTerm.value);
              if (queryTerms2.every((term) => normVal.includes(term))) {
                let sequenceBoost = 0;
                if (normVal.startsWith(queryNorm)) sequenceBoost = 1e3;
                else if (normVal.includes(queryNorm)) sequenceBoost = 500;
                const isStart = normVal.startsWith(queryTerms2[0] || "");
                const startBoost = isStart ? 50 : 0;
                const scorePadding = sequenceBoost + startBoost;
                let score = 0;
                let reason = "";
                if (p === this.rdfsLabelID) {
                  score = oTerm.language === language ? 100 + scorePadding : 80 + scorePadding;
                  reason = `Label (${oTerm.language})`;
                } else if (p === this.rdfsCommentID) {
                  score = 50 + scorePadding / 2;
                  reason = "Description";
                } else {
                  score = 20 + scorePadding / 3;
                  reason = "Other Property";
                }
                if (!bestMatch || score > bestMatch.score) {
                  bestMatch = { score, text: oTerm.value, reason };
                }
              }
            } catch {
            }
          } else if (type === TYPE_URI) {
            try {
              const oTerm = this.factory.decode(o);
              const uri = this.normalize(oTerm.value);
              if (queryTerms2.every((t) => uri.includes(t))) {
                const fragment = this.normalize(oTerm.value.split("#").pop() || oTerm.value.split("/").pop() || "");
                const isStart = queryTerms2.some((t) => fragment.startsWith(t));
                const score = 40 + (isStart ? 30 : 0);
                if (!bestMatch || score > bestMatch.score) {
                  bestMatch = { score, text: oTerm.value, reason: "URI Match" };
                }
              }
            } catch {
            }
          }
        }
        try {
          const sTerm = this.factory.decode(id);
          if (sTerm.termType === "NamedNode") {
            const val = this.normalize(sTerm.value);
            if (queryTerms2.every((t) => val.includes(t))) {
              const score = 40;
              if (!bestMatch || score > bestMatch.score) {
                bestMatch = { score, text: sTerm.value, reason: "URI Match" };
              }
            }
          }
        } catch {
        }
        if (bestMatch) {
          updateResult(id, bestMatch.score, bestMatch.text, bestLabel, bestMatch.reason, "store");
        }
      });
    } else {
      let limit = 2e4;
      for (const [s, p, o] of storeToScan.match(null, null, null, null)) {
        if (limit-- <= 0) break;
        scanQuad(s, p, o, "store");
        try {
          const sTerm = this.factory.decode(s);
          if (sTerm.termType === "NamedNode" && this.normalize(sTerm.value).includes(queryNorm)) {
            const realLabel = getBestLabel(s, session, storeToScan);
            updateResult(s, 40, sTerm.value, realLabel, "URI Match", "store");
          }
        } catch {
        }
      }
    }
    if (session) {
      for (const raw of session.match(null, null, null, null)) {
        scanQuad(raw[0], raw[1], raw[2], "session");
        try {
          const sTerm = this.factory.decode(raw[0]);
          if (sTerm.termType === "NamedNode" && this.normalize(sTerm.value).includes(queryNorm)) {
            const realLabel = getBestLabel(raw[0], session, storeToScan);
            updateResult(raw[0], 40, sTerm.value, realLabel, "URI Match", "session");
          }
        } catch {
        }
      }
    }
    const resultsArray = Array.from(results.values()).filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 50);
    return resultsArray;
  }
}
if (typeof window !== "undefined") {
  window.SearchLib = { UnifiedSearch };
}
class InferenceEngine {
  constructor(store2) {
    __publicField(this, "modules", /* @__PURE__ */ new Map());
    __publicField(this, "enabledModules", /* @__PURE__ */ new Set());
    __publicField(this, "boundHandler");
    this.store = store2;
    this.boundHandler = this.handleEvent.bind(this);
    this.store.on("data", this.boundHandler);
  }
  /**
   * register a new inference module.
   * By default, modules are disabled until enabled.
   */
  register(module2) {
    this.modules.set(module2.name, module2);
  }
  getModules() {
    return this.modules;
  }
  /**
   * Enable a registered module.
   * Triggers a full recompute for that module.
   */
  enable(name) {
    const mod = this.modules.get(name);
    if (mod && !this.enabledModules.has(name)) {
      this.enabledModules.add(name);
      const quads = mod.recompute();
      this.writeInferences(quads);
    }
  }
  /**
   * Disable an active module.
   * Clears the module's target graph and internal state.
   */
  disable(name) {
    if (this.enabledModules.has(name)) {
      const mod = this.modules.get(name);
      this.enabledModules.delete(name);
      this.store.clearGraph(mod.targetGraphID, "inference");
      mod.clear();
    }
  }
  dispose() {
    this.store.off("data", this.boundHandler);
  }
  /**
   * Clear all inferences and module states, then recompute everything for the Main store.
   */
  recompute() {
    for (const name of this.enabledModules) {
      const mod = this.modules.get(name);
      this.store.clearGraph(mod.targetGraphID, "inference");
      mod.clear();
      const quads = mod.recompute();
      this.writeInferences(quads);
    }
  }
  /**
   * Check if a module is currently enabled.
   */
  isEnabled(name) {
    return this.enabledModules.has(name);
  }
  pause() {
    this.store.off("data", this.boundHandler);
  }
  resume() {
    if (this.store.on) this.store.on("data", this.boundHandler);
  }
  handleEvent(event) {
    if (event.source === "inference") return;
    if (this.enabledModules.size === 0) return;
    if (event.type === "add") {
      for (const q of event.quads) {
        const occurrences = this.store.match(q.subject, q.predicate, q.object, null);
        for (const quad of occurrences) {
          const g = quad[3];
          for (const modName of this.enabledModules) {
            const mod = this.modules.get(modName);
            if (mod.targetGraphID === g) {
              try {
                this.store.delete(quad[0], quad[1], quad[2], quad[3], "inference");
              } catch (e) {
              }
            }
          }
        }
      }
    }
    for (const name of this.enabledModules) {
      const mod = this.modules.get(name);
      if (mod) {
        const result = mod.process(event);
        if (result.remove.length > 0) {
          for (const q of result.remove) {
            try {
              this.store.delete(q.subject, q.predicate, q.object, q.graph, "inference");
            } catch {
            }
          }
        }
        if (result.add.length > 0) {
          this.writeInferences(result.add);
        }
      }
    }
  }
  /**
   * Writes inferred quads to the store, BUT only if they don't already exist.
   * (Deduplication)
   */
  writeInferences(quads) {
    const toAdd = [];
    for (const q of quads) {
      if (!this.store.hasAny(q.subject, q.predicate, q.object)) {
        toAdd.push(q);
      }
    }
    if (toAdd.length > 0) {
      this.store.addQuads(toAdd, "inference");
    }
  }
  /**
   * Process an event from an external source (e.g. Session Draft)
   * and write the resulting inferences to a target store (e.g. Session Draft).
   * 
   * @param event The data event from the external source
   * @param targetStore The store to write inferences to
   */
  inferForSession(event, targetStore) {
    for (const name of this.enabledModules) {
      const mod = this.modules.get(name);
      if (mod) {
        const result = mod.process(event);
        if (result.remove.length > 0) {
          for (const q of result.remove) {
            try {
              targetStore.delete(q.subject, q.predicate, q.object, q.graph, "inference");
            } catch {
            }
          }
        }
        if (result.add.length > 0) {
          const toAdd = [];
          for (const q of result.add) {
            if (!targetStore.hasAny(q.subject, q.predicate, q.object)) {
              toAdd.push(q);
            }
          }
          if (toAdd.length > 0) {
            targetStore.addQuads(toAdd, "inference");
          }
        }
      }
    }
  }
}
class RDFSyntax {
  /**
   * Normalizes experimental RDF 1.2 "Triple Term" syntax <<( s p o )>> 
   * into standard RDF-star "Quoted Triple" syntax << s p o >>.
   * This ensures compatibility with parsers (N3.js, SparqlJS) that follow 
   * the RDF-star Community Group report.
   */
  static normalizeRdfStar(content) {
    if (!content.includes("<<")) return content;
    return content.replace(/<<\s*\(\s*/g, "<< ").replace(/\s*\)\s*>>/g, " >>");
  }
}
function isTriple(term) {
  return term && (term.termType === "Triple" || term.type === "triple" || term.termType === "Quad" || term.type === "quad");
}
function isPropertyPath(term) {
  return term && term.type === "path";
}
class Optimizer {
  /**
   * Reorders triples in a BGP to ensure efficient Joining.
   * Simple Heuristic: 
   * 1. Start with the most specific triple (fewest variables).
   * 2. Next triple must share a variable with the already selected triples (Connectedness).
   */
  optimize(bgp) {
    const triples = [...bgp.triples];
    if (triples.length <= 1) return triples;
    const ordered = [];
    const pool = new Set(triples);
    const availableVars = /* @__PURE__ */ new Set();
    let bestStart = null;
    let minVars = 4;
    for (const t of pool) {
      const vCount = this.countVars(t);
      if (vCount < minVars) {
        minVars = vCount;
        bestStart = t;
      }
    }
    if (bestStart) {
      this.addToOrdered(bestStart, ordered, pool, availableVars);
    }
    while (pool.size > 0) {
      let bestNext = null;
      let bestScore = -1;
      for (const t of pool) {
        const vars = this.getVars(t);
        const isConnected = vars.some((v) => availableVars.has(v.value));
        const newVars = vars.filter((v) => !availableVars.has(v.value)).length;
        if (isConnected) {
          const score = 10 - newVars;
          if (score > bestScore) {
            bestScore = score;
            bestNext = t;
          }
        }
      }
      if (!bestNext) {
        const next = pool.values().next();
        bestNext = next.value ? next.value : null;
      }
      this.addToOrdered(bestNext, ordered, pool, availableVars);
    }
    return ordered;
  }
  addToOrdered(t, ordered, pool, vars) {
    ordered.push(t);
    pool.delete(t);
    this.getVars(t).forEach((v) => vars.add(v.value));
  }
  countVars(t) {
    const predIsVar = !("type" in t.predicate) && t.predicate.termType === "Variable";
    return (t.subject.termType === "Variable" ? 1 : 0) + (predIsVar ? 1 : 0) + (t.object.termType === "Variable" ? 1 : 0);
  }
  getVars(t) {
    const vars = [];
    if (t.subject.termType === "Variable") vars.push(t.subject);
    if (!("type" in t.predicate) && t.predicate.termType === "Variable") {
      vars.push(t.predicate);
    }
    if (t.object.termType === "Variable") vars.push(t.object);
    return vars;
  }
}
function makeLiteral(factory2, value, language, datatype) {
  const dt = datatype ? datatype.value : void 0;
  const id = factory2.literal(value, dt, language);
  return factory2.decode(id);
}
function evaluateFunction(op, args, factory2) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  if (op === "isiri" || op === "isuri") {
    const b = ((_a = args[0]) == null ? void 0 : _a.termType) === "NamedNode";
    return makeLiteral(factory2, b ? "true" : "false", void 0, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
  }
  if (op === "isblank") {
    const b = ((_b = args[0]) == null ? void 0 : _b.termType) === "BlankNode";
    return makeLiteral(factory2, b ? "true" : "false", void 0, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
  }
  if (op === "isliteral") {
    const b = ((_c = args[0]) == null ? void 0 : _c.termType) === "Literal";
    return makeLiteral(factory2, b ? "true" : "false", void 0, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
  }
  if (op === "istriple") {
    const arg = args[0];
    const b = (arg == null ? void 0 : arg.termType) === "Triple" || typeof arg === "bigint" && (arg & 0x3n << 60n) !== 0n;
    return makeLiteral(factory2, b ? "true" : "false", void 0, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
  }
  const getResolvedTriple = (t) => {
    if (!t) return null;
    if (typeof t === "bigint") return factory2.decode(t);
    return t;
  };
  const ensureDecoded = (t) => {
    if (typeof t === "bigint") return factory2.decode(t);
    return t;
  };
  if (op === "subject") {
    const arg = getResolvedTriple(args[0]);
    if ((arg == null ? void 0 : arg.subject) !== void 0) return ensureDecoded(arg.subject);
  }
  if (op === "predicate") {
    const arg = getResolvedTriple(args[0]);
    if ((arg == null ? void 0 : arg.predicate) !== void 0) return ensureDecoded(arg.predicate);
  }
  if (op === "object") {
    const arg = getResolvedTriple(args[0]);
    if ((arg == null ? void 0 : arg.object) !== void 0) return ensureDecoded(arg.object);
  }
  if (op === "datatype") {
    if (((_d = args[0]) == null ? void 0 : _d.termType) === "Literal") {
      const lit = args[0];
      const dt = lit.datatype ? lit.datatype.value : "http://www.w3.org/2001/XMLSchema#string";
      return factory2.decode(factory2.namedNode(dt));
    }
  }
  if (op === "lang") {
    if (((_e = args[0]) == null ? void 0 : _e.termType) === "Literal") {
      const lit = args[0];
      return makeLiteral(factory2, lit.language || "");
    }
  }
  if (op === "ucase") {
    const arg = args[0];
    if ((arg == null ? void 0 : arg.termType) === "Literal") {
      return makeLiteral(factory2, arg.value.toUpperCase(), arg.language, arg.datatype);
    }
  }
  if (op === "lcase") {
    const arg = args[0];
    if ((arg == null ? void 0 : arg.termType) === "Literal") {
      return makeLiteral(factory2, arg.value.toLowerCase(), arg.language, arg.datatype);
    }
  }
  if (op === "concat") {
    let val = "";
    for (const arg of args) {
      if ((arg == null ? void 0 : arg.termType) === "Literal") val += arg.value;
    }
    return makeLiteral(factory2, val);
  }
  if (op === "contains") {
    if (((_f = args[0]) == null ? void 0 : _f.termType) === "Literal" && ((_g = args[1]) == null ? void 0 : _g.termType) === "Literal") {
      const b = args[0].value.includes(args[1].value);
      return makeLiteral(factory2, b ? "true" : "false", void 0, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
    }
  }
  if (op === "strstarts") {
    if (((_h = args[0]) == null ? void 0 : _h.termType) === "Literal" && ((_i = args[1]) == null ? void 0 : _i.termType) === "Literal") {
      const b = args[0].value.startsWith(args[1].value);
      return makeLiteral(factory2, b ? "true" : "false", void 0, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
    }
  }
  if (op === "strends") {
    if (((_j = args[0]) == null ? void 0 : _j.termType) === "Literal" && ((_k = args[1]) == null ? void 0 : _k.termType) === "Literal") {
      const b = args[0].value.endsWith(args[1].value);
      return makeLiteral(factory2, b ? "true" : "false", void 0, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
    }
  }
  if (op === "regex") {
    const text = args[0];
    const pattern = args[1];
    const flags = args[2];
    if ((text == null ? void 0 : text.termType) === "Literal" && (pattern == null ? void 0 : pattern.termType) === "Literal") {
      const f = (flags == null ? void 0 : flags.termType) === "Literal" ? flags.value : void 0;
      try {
        const re = new RegExp(pattern.value, f);
        const b = re.test(text.value);
        return makeLiteral(factory2, b ? "true" : "false", void 0, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
      } catch (e) {
        return null;
      }
    }
  }
  if (op === "replace") {
    const text = args[0];
    const pattern = args[1];
    const replacement = args[2];
    const flags = args[3];
    if ((text == null ? void 0 : text.termType) === "Literal" && (pattern == null ? void 0 : pattern.termType) === "Literal" && (replacement == null ? void 0 : replacement.termType) === "Literal") {
      const f = (flags == null ? void 0 : flags.termType) === "Literal" ? flags.value : "g";
      try {
        const re = new RegExp(pattern.value, f);
        const val = text.value.replace(re, replacement.value);
        return makeLiteral(factory2, val, text.language, text.datatype);
      } catch (e) {
        return null;
      }
    }
  }
  if (op === "substr") {
    const str = args[0];
    const start = args[1];
    const len = args[2];
    if ((str == null ? void 0 : str.termType) === "Literal" && (start == null ? void 0 : start.termType) === "Literal") {
      let s = parseInt(start.value) - 1;
      if (s < 0) s = 0;
      let l = (len == null ? void 0 : len.termType) === "Literal" ? parseInt(len.value) : void 0;
      let val = "";
      if (l !== void 0) val = str.value.substr(s, l);
      else val = str.value.substring(s);
      return makeLiteral(factory2, val, str.language, str.datatype);
    }
  }
  if (op === "strlen") {
    const str = args[0];
    if ((str == null ? void 0 : str.termType) === "Literal") {
      return makeLiteral(factory2, str.value.length.toString(), void 0, { value: "http://www.w3.org/2001/XMLSchema#integer" });
    }
  }
  if (op === "abs") {
    const val = getNumeric(args[0]);
    if (val !== null) return makeLiteral(factory2, Math.abs(val).toString(), void 0, args[0].datatype);
  }
  if (op === "round") {
    const val = getNumeric(args[0]);
    if (val !== null) return makeLiteral(factory2, Math.round(val).toString(), void 0, args[0].datatype);
  }
  if (op === "ceil") {
    const val = getNumeric(args[0]);
    if (val !== null) return makeLiteral(factory2, Math.ceil(val).toString(), void 0, args[0].datatype);
  }
  if (op === "floor") {
    const val = getNumeric(args[0]);
    if (val !== null) return makeLiteral(factory2, Math.floor(val).toString(), void 0, args[0].datatype);
  }
  if (op === "rand") {
    return makeLiteral(factory2, Math.random().toString(), void 0, { value: "http://www.w3.org/2001/XMLSchema#double" });
  }
  return null;
}
function getNumeric(term) {
  if ((term == null ? void 0 : term.termType) === "Literal") {
    const n = parseFloat(term.value);
    return isNaN(n) ? null : n;
  }
  return null;
}
class ExpressionEvaluator {
  constructor(factory2) {
    this.factory = factory2;
  }
  // RDF-Star note: TripleTerm is handled in evaluateExpressionValueSync.
  /**
   * Synchronous evaluation of an expression to a value (number, string, boolean).
   * Used for ORDER BY and simple comparisons.
   */
  evaluateExpressionValueSync(expr, binding, varMap) {
    var _a;
    const term = this.evaluateBinder(expr, binding, varMap);
    if (!term) return null;
    if (term.termType === "Literal") {
      const dt = (_a = term.datatype) == null ? void 0 : _a.value;
      if (dt === "http://www.w3.org/2001/XMLSchema#integer" || dt === "http://www.w3.org/2001/XMLSchema#double" || dt === "http://www.w3.org/2001/XMLSchema#decimal") {
        const n = parseFloat(term.value);
        return isNaN(n) ? term.value : n;
      }
      if (dt === "http://www.w3.org/2001/XMLSchema#boolean") {
        return term.value === "true" || term.value === "1";
      }
      return term.value;
    }
    if (isTriple(term)) {
      return `<<triple>>`;
    }
    return term.value;
  }
  /**
   * Evaluates an expression or term to a bound Term object.
   * Handles variable binding lookup and function calls.
   */
  evaluateBinder(expr, binding, varMap) {
    if ("termType" in expr) {
      return this.resolveTerm(expr, binding, varMap);
    }
    if (expr.type === "operation") {
      const op = expr.operator;
      const args = expr.args;
      const resolvedArgs = [];
      for (const arg of args) {
        const res = this.evaluateBinder(arg, binding, varMap);
        if (res) resolvedArgs.push(res);
        else return null;
      }
      const result = evaluateFunction(op, resolvedArgs, this.factory);
      if (result && typeof result === "object" && "termType" in result) return result;
      return null;
    }
    return null;
  }
  /**
   * Asynchronous evaluation of boolean expressions (Filters).
   * Supports EXISTS/NOT EXISTS which require calling back into the engine.
   */
  async evaluateAsBoolean(expr, binding, varMap, existenceCheck) {
    var _a, _b;
    if ("termType" in expr) {
      const val = this.getTermValue(expr, binding, varMap);
      if (val && typeof val === "object" && val.termType === "Literal" && ((_a = val.datatype) == null ? void 0 : _a.value) === "http://www.w3.org/2001/XMLSchema#boolean") {
        return val.value === "true" || val.value === "1";
      }
      return !!val;
    }
    if (expr.type === "operation") {
      const op = expr.operator;
      const args = expr.args;
      if (op === "!" || op === "not") {
        return !await this.evaluateAsBoolean(args[0], binding, varMap, existenceCheck);
      }
      if (op === "&&" || op === "and") {
        return await this.evaluateAsBoolean(args[0], binding, varMap, existenceCheck) && await this.evaluateAsBoolean(args[1], binding, varMap, existenceCheck);
      }
      if (op === "||" || op === "or") {
        return await this.evaluateAsBoolean(args[0], binding, varMap, existenceCheck) || await this.evaluateAsBoolean(args[1], binding, varMap, existenceCheck);
      }
      if (op === "exists" || op === "not exists" || op === "notexists") {
        if (!existenceCheck) throw new Error("Existence check required for EXISTS filter but no engine callback provided.");
        const pattern = args[0];
        const exists = await existenceCheck(pattern, binding);
        return op === "exists" ? exists : !exists;
      }
      const evalArgValue = async (arg) => {
        if ("termType" in arg) return this.getTermValue(arg, binding, varMap);
        if ("type" in arg) {
          const t = arg.type;
          if (t === "bgp" || t === "query" || t === "graph" || t === "union" || t === "optional" || t === "minus" || t === "values" || t === "service" || t === "filter" || t === "bind" || t === "group") {
            return null;
          }
        }
        if ("type" in arg && arg.type === "operation") {
          const term2 = this.evaluateBinder(arg, binding, varMap);
          if (term2) return this.getTermValue(term2, binding, varMap);
          return await this.evaluateAsBoolean(arg, binding, varMap, existenceCheck);
        }
        return null;
      };
      if (op === "=" || op === "!=") {
        const v1 = await evalArgValue(args[0]);
        const v2 = await evalArgValue(args[1]);
        const areEqual = this.areValuesEqual(v1, v2);
        return op === "=" ? areEqual : !areEqual;
      }
      if ([">", "<", ">=", "<="].includes(op)) {
        const v1 = await evalArgValue(args[0]);
        const v2 = await evalArgValue(args[1]);
        if (v1 == null || v2 == null) return false;
        switch (op) {
          case ">":
            return v1 > v2;
          case "<":
            return v1 < v2;
          case ">=":
            return v1 >= v2;
          case "<=":
            return v1 <= v2;
        }
      }
      const term = this.evaluateBinder(expr, binding, varMap);
      if (term && term.termType === "Literal") {
        if (((_b = term.datatype) == null ? void 0 : _b.value) === "http://www.w3.org/2001/XMLSchema#boolean") {
          return term.value === "true" || term.value === "1";
        }
        return !!term.value;
      }
      return false;
    }
    return false;
  }
  areValuesEqual(v1, v2) {
    var _a, _b;
    if (v1 === v2) return true;
    if (v1 == null || v2 == null) return false;
    if (isTriple(v1) && isTriple(v2)) {
      return this.areValuesEqual(v1.subject, v2.subject) && this.areValuesEqual(v1.predicate, v2.predicate) && this.areValuesEqual(v1.object, v2.object);
    }
    if (typeof v1 === "object" && typeof v2 === "object") {
      if (v1.termType && v1.termType === v2.termType) {
        return v1.value === v2.value && ((_a = v1.datatype) == null ? void 0 : _a.value) === ((_b = v2.datatype) == null ? void 0 : _b.value) && v1.language === v2.language;
      }
    }
    return false;
  }
  /**
   * Resolves a Term (Variable or Constant) to its bound value in the current binding.
   * Returns null if variable is unbound.
   */
  resolveTerm(term, binding, varMap) {
    if (term.termType === "Variable") {
      const idx = varMap.get(term.value);
      if (idx === void 0) return null;
      const id = binding[idx];
      if (id === 0n) return null;
      return this.factory.decode(id);
    }
    if (isTriple(term)) {
      const s = this.resolveTerm(term.subject, binding, varMap);
      const p = this.resolveTerm(term.predicate, binding, varMap);
      const o = this.resolveTerm(term.object, binding, varMap);
      if (!s || !p || !o) return null;
      return {
        termType: "Triple",
        type: "triple",
        // Added for isTriple compatibility
        subject: s,
        predicate: p,
        object: o
      };
    }
    return term;
  }
  /**
   * Gets the primitive value (number, string, boolean) from a Term.
   * Used for comparisons.
   */
  getTermValue(term, binding, varMap) {
    var _a;
    const t = this.resolveTerm(term, binding, varMap);
    if (!t) return null;
    if (t.termType === "Literal") {
      const lit = t;
      const dt = (_a = lit.datatype) == null ? void 0 : _a.value;
      if (dt === "http://www.w3.org/2001/XMLSchema#integer" || dt === "http://www.w3.org/2001/XMLSchema#decimal" || dt === "http://www.w3.org/2001/XMLSchema#double") {
        const n = parseFloat(lit.value);
        return isNaN(n) ? lit.value : n;
      }
      if (dt === "http://www.w3.org/2001/XMLSchema#boolean") {
        return lit.value === "true" || lit.value === "1";
      }
      return lit.value;
    }
    if (t.termType === "NamedNode") return t.value;
    if (isTriple(t)) return t;
    return null;
  }
}
class Aggregator {
  constructor(factory2) {
    this.factory = factory2;
  }
  computeAggregate(agg, bindings, varMap) {
    const op = agg.aggregation.toUpperCase();
    if (op === "COUNT") {
      if (agg.expression) {
        if ("termType" in agg.expression && agg.expression.termType === "Variable") {
          const idx = varMap.get(agg.expression.value);
          if (idx !== void 0) {
            let count = 0;
            for (const b of bindings) {
              if (b[idx] !== 0n) count++;
            }
            return this.factory.literal(count.toString(), "http://www.w3.org/2001/XMLSchema#integer");
          }
        }
      }
      return this.factory.literal(bindings.length.toString(), "http://www.w3.org/2001/XMLSchema#integer");
    }
    if (op === "SAMPLE") {
      if ("termType" in agg.expression && agg.expression.termType === "Variable") {
        const idx = varMap.get(agg.expression.value);
        if (idx !== void 0) {
          for (const b of bindings) {
            if (b[idx] !== 0n) {
              return b[idx];
            }
          }
        }
      }
      return 0n;
    }
    const values = [];
    const stringValues = [];
    if ("termType" in agg.expression && agg.expression.termType === "Variable") {
      const idx = varMap.get(agg.expression.value);
      if (idx !== void 0) {
        for (const b of bindings) {
          const id = b[idx];
          if (id === 0n) continue;
          const term = this.factory.decode(id);
          if (term.termType === "Literal") {
            if (op === "GROUP_CONCAT") {
              stringValues.push(term.value);
            } else {
              const n = parseFloat(term.value);
              if (!isNaN(n)) values.push(n);
            }
          }
        }
      }
    }
    let resultNum = 0;
    if (op === "SUM") {
      resultNum = values.reduce((a, b) => a + b, 0);
    } else if (op === "AVG") {
      resultNum = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    } else if (op === "MIN") {
      resultNum = values.length > 0 ? Math.min(...values) : 0;
    } else if (op === "MAX") {
      resultNum = values.length > 0 ? Math.max(...values) : 0;
    } else if (op === "GROUP_CONCAT") {
      const sep = agg.separator || " ";
      const val = stringValues.join(sep);
      return this.factory.literal(val, "http://www.w3.org/2001/XMLSchema#string");
    }
    return this.factory.literal(resultNum.toString(), "http://www.w3.org/2001/XMLSchema#decimal");
  }
}
class SPARQLEngine {
  // Graphs to exclude from Default Graph queries
  constructor(store2, factory2) {
    __publicField(this, "optimizer", new Optimizer());
    __publicField(this, "evaluator");
    __publicField(this, "aggregator");
    __publicField(this, "ignoredGraphs", /* @__PURE__ */ new Set());
    this.store = store2;
    this.factory = factory2;
    this.evaluator = new ExpressionEvaluator(factory2);
    this.aggregator = new Aggregator(factory2);
  }
  setIgnoredGraphs(graphIDs) {
    this.ignoredGraphs = new Set(graphIDs);
  }
  async execute(query, baseGraph) {
    if (query.type === "update") {
      return this.executeUpdate(query, baseGraph);
    }
    const q = query;
    if (q.queryType === "ASK") {
      const { stream } = await this.executeInternal(q);
      for await (const _ of stream) return true;
      return false;
    }
    if (q.queryType === "CONSTRUCT") {
      return this.processConstruct(q);
    }
    if (q.queryType === "DESCRIBE") {
      return this.processDescribe(q);
    }
    const result = await this.executeInternal(q);
    return result.stream;
  }
  async executeUpdate(update, baseGraph) {
    for (const op of update.updates) {
      const graph = op.graph ? this.factory.namedNode(op.graph) : baseGraph || void 0;
      if (op.updateType === "insert" || op.updateType === "insertdelete") {
        for (const bgp of op.insert || []) {
          for (const triple of bgp.triples) {
            const s = this.termToId(triple.subject);
            const p = this.termToId(triple.predicate);
            const o = this.termToId(triple.object);
            this.store.add(s, p, o, graph);
          }
        }
      }
      if (op.updateType === "delete" || op.updateType === "insertdelete") {
        for (const bgp of op.delete || []) {
          for (const triple of bgp.triples) {
            const s = this.termToId(triple.subject);
            const p = this.termToId(triple.predicate);
            const o = this.termToId(triple.object);
            this.store.delete(s, p, o, graph);
          }
        }
      }
    }
  }
  async executeInternal(query, inputMap, inputStream) {
    if (query.queryType !== "SELECT" && query.queryType !== "ASK" && query.queryType !== "CONSTRUCT" && query.queryType !== "DESCRIBE") {
      throw new Error(`Only SELECT, ASK, CONSTRUCT and DESCRIBE queries are supported.Got: ${query.queryType} `);
    }
    const varMap = inputMap ? new Map(inputMap) : /* @__PURE__ */ new Map();
    const varNames = this.getVariableNames(query);
    varNames.forEach((name) => {
      if (!varMap.has(name)) varMap.set(name, varMap.size);
    });
    let stream = inputStream || this.initialStream(varMap.size);
    if (inputStream && varMap.size > inputMap.size) {
      stream = this.resizeBindings(stream, varMap.size);
    }
    if (query.where && Array.isArray(query.where)) {
      for (const pattern of query.where) {
        stream = this.processPattern(stream, pattern, varMap);
      }
    } else if (query.input) {
      stream = this.processPattern(stream, query.input, varMap);
    }
    if (this.hasGroupingOrAggregation(query)) {
      stream = this.processGrouping(stream, query, varMap);
    }
    stream = this.processExtension(stream, query, varMap);
    if (query.distinct || query.reduced) {
      stream = this.processDistinct(stream, query, varMap);
    }
    if (query.order && query.order.length > 0) {
      stream = await this.processOrdering(stream, query.order, varMap);
    }
    if (query.offset || query.limit) {
      stream = this.processSlicing(stream, query.offset, query.limit);
    }
    return { stream, varMap };
  }
  // Process CONSTRUCT
  async *processConstruct(query) {
    const { stream, varMap } = await this.executeInternal(query);
    const template = query.template || [];
    for await (const binding of stream) {
      const bnodeMap = /* @__PURE__ */ new Map();
      for (const t of template) {
        const s = this.constructTerm(t.subject, binding, varMap, bnodeMap);
        const p = this.constructTerm(t.predicate, binding, varMap, bnodeMap);
        const o = this.constructTerm(t.object, binding, varMap, bnodeMap);
        if (s && p && o) {
          yield { subject: s, predicate: p, object: o };
        }
      }
    }
  }
  // Process DESCRIBE
  async *processDescribe(query) {
    const resources = /* @__PURE__ */ new Set();
    if (query.where && query.where.length > 0) {
      const { stream, varMap } = await this.executeInternal(query);
      for await (const binding of stream) {
        if (this.isWildcard(query.variables)) {
          for (const id of binding) {
            if (id !== 0n) resources.add(id);
          }
        } else {
          const vars = query.variables;
          for (const v of vars) {
            if (typeof v === "object" && v && "termType" in v && v.termType === "Variable") {
              const idx = varMap.get(v.value);
              if (idx !== void 0 && binding[idx] !== 0n) {
                resources.add(binding[idx]);
              }
            }
          }
        }
      }
    }
    if (Array.isArray(query.variables) && !this.isWildcard(query.variables)) {
      const vars = query.variables;
      for (const v of vars) {
        if (typeof v === "object" && v && "termType" in v && v.termType === "NamedNode") {
          resources.add(this.factory.namedNode(v.value));
        }
      }
    }
    const yieldedKeys = /* @__PURE__ */ new Set();
    for (const subjectId of resources) {
      const matches = this.store.match(subjectId, null, null, null);
      for (const [s, p, o] of matches) {
        const key = `${s}| ${p}| ${o} `;
        if (!yieldedKeys.has(key)) {
          yieldedKeys.add(key);
          yield {
            subject: this.factory.decode(s),
            predicate: this.factory.decode(p),
            object: this.factory.decode(o)
          };
        }
      }
    }
  }
  constructTerm(term, binding, varMap, bnodeMap) {
    if (term.termType === "Variable") {
      const idx = varMap.get(term.value);
      if (idx === void 0) return null;
      const id = binding[idx];
      if (id === 0n) return null;
      return this.factory.decode(id);
    } else if (term.termType === "BlankNode") {
      const label = term.value;
      if (!bnodeMap.has(label)) {
        const newId = this.factory.blankNode();
        bnodeMap.set(label, newId);
      }
      const id = bnodeMap.get(label);
      return this.factory.decode(id);
    } else if (isTriple(term)) {
      const s = this.constructTerm(term.subject, binding, varMap, bnodeMap);
      const p = this.constructTerm(term.predicate, binding, varMap, bnodeMap);
      const o = this.constructTerm(term.object, binding, varMap, bnodeMap);
      if (!s || !p || !o) return null;
      return {
        termType: "Triple",
        subject: s,
        predicate: p,
        object: o
      };
    } else {
      return term;
    }
  }
  // Process CONSTRUCT
  async *resizeBindings(input, newSize) {
    for await (const b of input) {
      const newB = new Array(newSize).fill(0n);
      for (let i = 0; i < b.length; i++) newB[i] = b[i];
      yield newB;
    }
  }
  // Evaluate non-aggregate expressions in SELECT clause
  async *processExtension(input, query, varMap) {
    const extensions = [];
    if (query.variables && !this.isWildcard(query.variables)) {
      const vars = query.variables;
      for (const v of vars) {
        if ("expression" in v) {
          if (v.expression.type !== "aggregate") {
            const idx = varMap.get(v.variable.value);
            if (idx !== void 0) {
              extensions.push({ idx, expr: v.expression });
            }
          }
        }
      }
    }
    if (extensions.length === 0) {
      yield* input;
      return;
    }
    for await (const binding of input) {
      const newBinding = [...binding];
      for (const ext of extensions) {
        const val = this.evaluator.evaluateBinder(ext.expr, binding, varMap);
        if (val) {
          newBinding[ext.idx] = this.termToId(val);
        }
      }
      yield newBinding;
    }
  }
  async processOrdering(input, orders, varMap) {
    const all = [];
    for await (const b of input) all.push(b);
    all.sort((a, b) => {
      for (const order of orders) {
        const valA = this.evaluator.evaluateExpressionValueSync(order.expression, a, varMap);
        const valB = this.evaluator.evaluateExpressionValueSync(order.expression, b, varMap);
        if (valA === valB) continue;
        if (valA == null) return 1;
        if (valB == null) return -1;
        let cmp = 0;
        if (valA < valB) cmp = -1;
        else if (valA > valB) cmp = 1;
        if (order.descending) cmp *= -1;
        if (cmp !== 0) return cmp;
      }
      return 0;
    });
    return async function* () {
      yield* all;
    }();
  }
  async *processDistinct(input, query, varMap) {
    const seen = /* @__PURE__ */ new Set();
    let projectedIndices = null;
    if (query.variables && !this.isWildcard(query.variables)) {
      projectedIndices = [];
      for (const v of query.variables) {
        const name = "variable" in v ? v.variable.value : v.value;
        const idx = varMap.get(name);
        if (idx !== void 0) projectedIndices.push(idx);
      }
    }
    for await (const binding of input) {
      let key = "";
      if (projectedIndices) {
        for (const idx of projectedIndices) {
          const val = binding[idx];
          key += (val ? val.toString() : "0") + "|";
        }
      } else {
        key = binding.map((b) => b.toString()).join("|");
      }
      if (!seen.has(key)) {
        seen.add(key);
        yield binding;
      }
    }
  }
  async *processSlicing(input, offset = 0, limit) {
    let count = 0;
    let yielded = 0;
    for await (const b of input) {
      if (count < offset) {
        count++;
        continue;
      }
      if (limit !== void 0 && yielded >= limit) {
        break;
      }
      yield b;
      yielded++;
    }
  }
  getVariableNames(query) {
    const vars = /* @__PURE__ */ new Set();
    const traverseTerm = (t) => {
      if (t.termType === "Variable") vars.add(t.value);
      else if (t.termType === "BlankNode") vars.add("_:" + t.value);
      else if (isTriple(t)) {
        traverseTerm(t.subject);
        traverseTerm(t.predicate);
        traverseTerm(t.object);
      }
    };
    const traverse = (patterns) => {
      for (const p of patterns) {
        if (p.type === "bgp") {
          for (const t of p.triples) {
            traverseTerm(t.subject);
            if (!isPropertyPath(t.predicate)) {
              traverseTerm(t.predicate);
            }
            traverseTerm(t.object);
          }
        } else if (p.type === "graph") {
          if (p.name.termType === "Variable") vars.add(p.name.value);
          traverse(p.patterns);
        } else if (p.type === "union" || p.type === "minus" || p.type === "optional" || p.type === "group" || p.type === "service") {
          traverse(p.patterns);
        } else if (p.type === "filter") {
          traverseExpression(p.expression);
        } else if (p.type === "bind") {
          vars.add(p.variable.value);
          traverseExpression(p.expression);
        } else if (p.type === "values") {
          for (const row of p.values) {
            for (const v of Object.keys(row)) {
              if (v.startsWith("?")) vars.add(v.substring(1));
              else vars.add(v);
            }
          }
        } else if (p.type === "query") {
          if (this.isWildcard(p.variables)) {
            traverse(p.where);
          } else if (p.variables) {
            const queryVars = p.variables;
            queryVars.forEach((v) => {
              if (typeof v === "object" && v && "value" in v) vars.add(v.value);
            });
          }
        }
      }
    };
    function traverseExpression(expr) {
      if ("termType" in expr) {
        traverseTerm(expr);
        return;
      }
      if ("type" in expr) {
        if (expr.type === "operation") {
          for (const arg of expr.args) {
            traverseExpression(arg);
          }
        } else if (expr.type !== "aggregate") {
          traverse([expr]);
        }
      }
    }
    if (query.where && Array.isArray(query.where)) {
      traverse(query.where);
    } else if (query.input) {
      traverse([query.input]);
    }
    if (query.variables && !this.isWildcard(query.variables)) {
      const selectVars = query.variables;
      for (const v of selectVars) {
        if ("variable" in v) {
          vars.add(v.variable.value);
        } else if (v.termType === "Variable") {
          vars.add(v.value);
        }
      }
    }
    return Array.from(vars);
  }
  isWildcard(vars) {
    if (!Array.isArray(vars) || vars.length !== 1) return false;
    const v = vars[0];
    return v === "*" || typeof v === "object" && v !== null && (v.termType === "Wildcard" || v.value === "*");
  }
  hasGroupingOrAggregation(query) {
    if (query.group && query.group.length > 0) return true;
    if (query.having && query.having.length > 0) return true;
    if (query.variables && !this.isWildcard(query.variables)) {
      const selectVars = query.variables;
      return selectVars.some((v) => "expression" in v && v.expression.type === "aggregate");
    }
    return false;
  }
  async *processGrouping(input, query, varMap) {
    const groups = /* @__PURE__ */ new Map();
    const implicitGroup = !query.group || query.group.length === 0;
    const allBindings = [];
    for await (const b of input) allBindings.push(b);
    if (implicitGroup) {
      if (allBindings.length > 0 || this.hasAggregates(query)) {
        if (query.having && query.having.length > 0) {
          let match = true;
          for (const h of query.having) {
            if (!await this.evaluateGroupExpression(h, allBindings, varMap)) {
              match = false;
              break;
            }
          }
          if (!match) return;
        }
        yield this.aggregateGroup(allBindings, query, varMap);
      }
      return;
    }
    for (const binding of allBindings) {
      let key = "";
      if (query.group) {
        for (const g of query.group) {
          if ("termType" in g.expression && g.expression.termType === "Variable") {
            const idx = varMap.get(g.expression.value);
            if (idx !== void 0) {
              key += binding[idx].toString() + "|";
            }
          } else if (g.expression && g.expression.value) {
            key += g.expression.value + "|";
          }
        }
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(binding);
    }
    for (const groupBindings of groups.values()) {
      if (query.having && query.having.length > 0) {
        let match = true;
        for (const h of query.having) {
          if (!await this.evaluateGroupExpression(h, groupBindings, varMap)) {
            match = false;
            break;
          }
        }
        if (!match) continue;
      }
      yield this.aggregateGroup(groupBindings, query, varMap);
    }
  }
  aggregateGroup(bindings, query, varMap) {
    let result;
    if (bindings.length > 0) {
      result = [...bindings[0]];
    } else {
      result = new Array(varMap.size).fill(0n);
    }
    if (query.variables && !this.isWildcard(query.variables)) {
      const selectVars = query.variables;
      for (const v of selectVars) {
        if ("expression" in v && v.expression.type === "aggregate") {
          const agg = v.expression;
          const aliasIdx = varMap.get(v.variable.value);
          const valueId = this.aggregator.computeAggregate(agg, bindings, varMap);
          result[aliasIdx] = valueId;
        }
      }
    }
    return result;
  }
  async evaluateGroupExpression(expr, bindings, varMap) {
    if ("type" in expr && expr.type === "aggregate") {
      const valId = this.aggregator.computeAggregate(expr, bindings, varMap);
      if (valId === 0n) return null;
      const term = this.factory.decode(valId);
      return this.evaluator.evaluateExpressionValueSync(term, bindings.length > 0 ? bindings[0] : [], varMap);
    }
    if ("termType" in expr) {
      const t = expr;
      if (t.termType === "Variable") {
        if (bindings.length > 0) {
          return this.evaluator.evaluateExpressionValueSync(t, bindings[0], varMap);
        }
        return null;
      }
      return this.evaluator.evaluateExpressionValueSync(t, [], varMap);
    }
    if (expr.type === "operation") {
      const op = expr.operator;
      const args = expr.args;
      const evalArg = async (idx) => await this.evaluateGroupExpression(args[idx], bindings, varMap);
      if (op === "!" || op === "not") return !await evalArg(0);
      if (op === "&&" || op === "and") return await evalArg(0) && await evalArg(1);
      if (op === "||" || op === "or") return await evalArg(0) || await evalArg(1);
      const v1 = args.length > 0 ? await evalArg(0) : null;
      const v2 = args.length > 1 ? await evalArg(1) : null;
      if ([">", "<", "=", "!=", ">=", "<="].includes(op)) {
        if (v1 == null || v2 == null) return false;
        switch (op) {
          case ">":
            return v1 > v2;
          case "<":
            return v1 < v2;
          case "=":
            return v1 == v2;
          case "!=":
            return v1 != v2;
          case ">=":
            return v1 >= v2;
          case "<=":
            return v1 <= v2;
        }
      }
      return false;
    }
    return null;
  }
  hasAggregates(query) {
    if (!query.variables || this.isWildcard(query.variables)) return false;
    const selectVars = query.variables;
    return selectVars.some((v) => "expression" in v && v.expression.type === "aggregate");
  }
  async *initialStream(size) {
    yield new Array(size).fill(0n);
  }
  // UPDATED: Added targetGraphVar to processPattern signature
  processPattern(input, pattern, varMap, graphContext = null, targetGraphVar) {
    switch (pattern.type) {
      case "bgp":
        return this.processBgp(input, pattern, varMap, graphContext, targetGraphVar);
      case "graph":
        return this.processGraph(input, pattern, varMap);
      case "union":
        return this.processUnion(input, pattern, varMap, graphContext);
      case "minus":
        return this.processMinus(input, pattern, varMap, graphContext);
      case "optional":
        return this.processOptional(input, pattern, varMap, graphContext);
      case "values":
        return this.processValues(input, pattern, varMap);
      case "service":
        return this.processService(input, pattern, varMap);
      case "filter":
        return this.processFilter(input, pattern, varMap, graphContext);
      case "group":
        return this.processGroup(input, pattern, varMap, graphContext);
      case "query":
        return this.processSubQuery(input, pattern, varMap);
      case "bind":
        return this.processBind(input, pattern, varMap, graphContext);
      default:
        return input;
    }
  }
  // Process BIND
  async *processBind(input, pattern, varMap, _graphContext) {
    const targetIdx = varMap.get(pattern.variable.value);
    if (targetIdx === void 0) {
      yield* input;
      return;
    }
    for await (const binding of input) {
      const resultTerm = this.evaluator.evaluateBinder(pattern.expression, binding, varMap);
      if (resultTerm) {
        const newBinding = [...binding];
        newBinding[targetIdx] = this.termToId(resultTerm);
        yield newBinding;
      } else {
        yield binding;
      }
    }
  }
  // Process SubQuery: Join current input with results of subquery
  async *processSubQuery(input, subQuery, outerMap) {
    const { stream: innerStream, varMap: innerMap } = await this.executeInternal(subQuery);
    const innerResults = [];
    for await (const b of innerStream) innerResults.push(b);
    const joinVars = [];
    const visibleVars = subQuery.variables;
    if (this.isWildcard(visibleVars)) {
      for (const [name, idx] of innerMap.entries()) {
        if (outerMap.has(name)) {
          joinVars.push({ innerIdx: idx, outerIdx: outerMap.get(name) });
        }
      }
    } else {
      const vars = visibleVars;
      for (const v of vars) {
        const name = "variable" in v ? v.variable.value : v.value;
        if (innerMap.has(name) && outerMap.has(name)) {
          joinVars.push({ innerIdx: innerMap.get(name), outerIdx: outerMap.get(name) });
        }
      }
    }
    for await (const outerBinding of input) {
      for (const innerBinding of innerResults) {
        let compatible = true;
        for (const j of joinVars) {
          const outerVal = outerBinding[j.outerIdx];
          const innerVal = innerBinding[j.innerIdx];
          if (outerVal !== 0n && innerVal !== 0n && outerVal !== innerVal) {
            compatible = false;
            break;
          }
        }
        if (compatible) {
          const newBinding = [...outerBinding];
          if (this.isWildcard(visibleVars)) {
            for (const [name, idx] of innerMap.entries()) {
              const outerIdx = outerMap.get(name);
              if (outerIdx !== void 0 && innerBinding[idx] !== 0n) {
                newBinding[outerIdx] = innerBinding[idx];
              }
            }
          } else {
            const vars = visibleVars;
            for (const v of vars) {
              const name = "variable" in v ? v.variable.value : v.value;
              const idx = innerMap.get(name);
              if (idx !== void 0 && innerBinding[idx] !== 0n) {
                const outerIdx = outerMap.get(name);
                if (outerIdx !== void 0) {
                  newBinding[outerIdx] = innerBinding[idx];
                }
              }
            }
          }
          yield newBinding;
        }
      }
    }
  }
  async *processMinus(input, pattern, varMap, graphContext) {
    const minusVars = /* @__PURE__ */ new Set();
    const collectVars = (p) => {
      if (p.type === "bgp") {
        for (const t of p.triples) {
          if (t.subject.termType === "Variable") minusVars.add(t.subject.value);
          if ("termType" in t.predicate) {
            if (t.predicate.termType === "Variable") minusVars.add(t.predicate.value);
          }
          if (t.object.termType === "Variable") minusVars.add(t.object.value);
        }
      } else if (p.type === "graph") {
        if (p.name.termType === "Variable") minusVars.add(p.name.value);
        p.patterns.forEach(collectVars);
      } else if ("patterns" in p) {
        p.patterns.forEach(collectVars);
      }
      if (p.type === "bind") {
        minusVars.add(p.variable.value);
      }
      if (p.type === "values") {
        for (const row of p.values) {
          for (const k of Object.keys(row)) {
            const vName = k.startsWith("?") ? k.substring(1) : k;
            minusVars.add(vName);
          }
        }
      }
      if (p.type === "query") {
        if (this.isWildcard(p.variables)) {
          p.where.forEach(collectVars);
        } else if (p.variables) {
          p.variables.forEach((v) => {
            if (v && typeof v !== "string" && "value" in v) minusVars.add(v.value);
          });
        }
      }
    };
    pattern.patterns.forEach(collectVars);
    for await (const binding of input) {
      let shared = false;
      for (const vName of minusVars) {
        const idx = varMap.get(vName);
        if (idx !== void 0 && binding[idx] !== 0n) {
          shared = true;
          break;
        }
      }
      if (!shared) {
        yield binding;
        continue;
      }
      let hasMatch = false;
      let innerStream = this.initialStreamFromBinding(binding);
      for (const subP of pattern.patterns) {
        innerStream = this.processPattern(innerStream, subP, varMap, graphContext);
      }
      for await (const _ of innerStream) {
        hasMatch = true;
        break;
      }
      if (!hasMatch) {
        yield binding;
      }
    }
  }
  async *processOptional(input, pattern, varMap, graphContext) {
    for await (const binding of input) {
      let hasMatch = false;
      let innerStream = this.initialStreamFromBinding(binding);
      for (const subP of pattern.patterns) {
        innerStream = this.processPattern(innerStream, subP, varMap, graphContext);
      }
      for await (const newBinding of innerStream) {
        hasMatch = true;
        yield newBinding;
      }
      if (!hasMatch) {
        yield binding;
      }
    }
  }
  async *processValues(input, pattern, varMap) {
    const rows = pattern.values;
    if (rows.length === 0) return;
    const valueRows = [];
    for (const row of rows) {
      const valueRow = /* @__PURE__ */ new Map();
      for (const [varName, term] of Object.entries(row)) {
        let vName = varName;
        if (vName.startsWith("?")) vName = vName.substring(1);
        if (varMap.has(vName)) {
          const idx = varMap.get(vName);
          if (term) {
            const id = this.termToId(term);
            valueRow.set(idx, id);
          }
        }
      }
      valueRows.push(valueRow);
    }
    for await (const binding of input) {
      for (const valueRow of valueRows) {
        let compatible = true;
        for (const [idx, val] of valueRow) {
          const existing = binding[idx];
          if (existing !== void 0 && existing !== 0n) {
            if (existing !== val) {
              compatible = false;
              break;
            }
          }
        }
        if (compatible) {
          const newBinding = [...binding];
          for (const [idx, val] of valueRow) {
            if (idx >= newBinding.length) {
              while (newBinding.length <= idx) newBinding.push(0n);
            }
            newBinding[idx] = val;
          }
          yield newBinding;
        }
      }
    }
  }
  async *processService(input, pattern, _varMap) {
    const serviceUri = pattern.name.value;
    console.warn(`SERVICE clause execution not fully implemented.Target: ${serviceUri} `);
    if (pattern.silent) {
      yield* input;
    } else {
      throw new Error(`SERVICE execution failed: ${serviceUri} (Not Implemented)`);
    }
  }
  async *processFilter(input, pattern, varMap, graphContext) {
    for await (const binding of input) {
      const pass = await this.evaluator.evaluateAsBoolean(
        pattern.expression,
        binding,
        varMap,
        async (pat, currentBinding) => {
          let innerStream = this.initialStreamFromBinding(currentBinding);
          innerStream = this.processPattern(innerStream, pat, varMap, graphContext);
          for await (const _ of innerStream) return true;
          return false;
        }
      );
      if (pass) {
        yield binding;
      }
    }
  }
  processBgp(input, bgp, varMap, _graphContext, targetGraphVar) {
    let stream = input;
    const tripleList = bgp.triples || bgp.patterns || [];
    const triples = this.optimizer.optimize({ ...bgp, triples: tripleList });
    for (const t of triples) {
      if (isPropertyPath(t.predicate)) {
        stream = this.joinWithPath(stream, t, varMap, _graphContext);
      } else {
        stream = this.join(stream, t, varMap, _graphContext, targetGraphVar);
      }
    }
    return stream;
  }
  async *processGraph(input, pattern, varMap) {
    const isVar = pattern.name.termType === "Variable";
    const gIdx = isVar ? varMap.get(pattern.name.value) : -1;
    const gStatic = !isVar ? this.termToId(pattern.name) : null;
    for await (const binding of input) {
      const boundG = gIdx !== -1 && binding[gIdx] !== 0n ? binding[gIdx] : null;
      const gReq = boundG !== null ? boundG : gStatic;
      const targetGraphVar = isVar && boundG === null ? gIdx : void 0;
      let innerStream = this.initialStreamFromBinding(binding);
      for (const subPattern of pattern.patterns) {
        innerStream = this.processPattern(innerStream, subPattern, varMap, gReq, targetGraphVar);
      }
      yield* innerStream;
    }
  }
  async *processGroup(input, pattern, varMap, graphContext) {
    let stream = input;
    for (const subP of pattern.patterns) {
      stream = this.processPattern(stream, subP, varMap, graphContext);
    }
    yield* stream;
  }
  async *processUnion(input, pattern, varMap, graphContext) {
    for await (const binding of input) {
      for (const subPattern of pattern.patterns) {
        let innerStream = this.initialStreamFromBinding(binding);
        innerStream = this.processPattern(innerStream, subPattern, varMap, graphContext);
        yield* innerStream;
      }
    }
  }
  async *initialStreamFromBinding(binding) {
    yield binding;
  }
  // UPDATED: join with targetGraphVar
  async *join(input, pattern, varMap, graphContext, targetGraphVar) {
    const sTerm = pattern.subject;
    const pTerm = pattern.predicate;
    const oTerm = pattern.object;
    const getIdx = (t) => {
      if (t.termType === "Variable") return varMap.get(t.value);
      if (t.termType === "BlankNode") return varMap.get("_:" + t.value);
      return -1;
    };
    const sIdx = getIdx(sTerm);
    const pIdx = getIdx(pTerm);
    const oIdx = getIdx(oTerm);
    const hasVars = (t) => {
      if (t.termType === "Variable") return true;
      if (isTriple(t)) return hasVars(t.subject) || hasVars(t.predicate) || hasVars(t.object);
      return false;
    };
    const getStaticId = (t) => {
      if (t.termType === "Variable" || t.termType === "BlankNode") return null;
      if (isTriple(t) && hasVars(t)) return null;
      return this.termToId(t);
    };
    const sIdStatic = getStaticId(sTerm);
    const pIdStatic = getStaticId(pTerm);
    const oIdStatic = getStaticId(oTerm);
    for await (const binding of input) {
      const sReq = sIdx !== -1 && binding[sIdx] !== 0n ? binding[sIdx] : sIdStatic;
      const pReq = pIdx !== -1 && binding[pIdx] !== 0n ? binding[pIdx] : pIdStatic;
      const oReq = oIdx !== -1 && binding[oIdx] !== 0n ? binding[oIdx] : oIdStatic;
      for (const [mS, mP, mO, mG] of this.store.match(sReq, pReq, oReq, graphContext)) {
        if (graphContext === null && this.ignoredGraphs.has(mG)) continue;
        const newBinding = [...binding];
        let compatible = true;
        if (isTriple(sTerm) && hasVars(sTerm)) {
          if (!this.matchesTriplePattern(mS, sTerm, newBinding, varMap)) compatible = false;
        } else if (sIdx !== -1) {
          newBinding[sIdx] = mS;
        }
        if (compatible && isTriple(pTerm) && hasVars(pTerm)) {
          if (!this.matchesTriplePattern(mP, pTerm, newBinding, varMap)) compatible = false;
        } else if (compatible && pIdx !== -1) {
          newBinding[pIdx] = mP;
        }
        if (compatible && isTriple(oTerm) && hasVars(oTerm)) {
          if (!this.matchesTriplePattern(mO, oTerm, newBinding, varMap)) compatible = false;
        } else if (compatible && oIdx !== -1) {
          newBinding[oIdx] = mO;
        }
        if (compatible) {
          if (targetGraphVar !== void 0 && targetGraphVar !== -1) {
            newBinding[targetGraphVar] = mG;
          }
          yield newBinding;
        }
      }
    }
  }
  /** 
   * Recursively checks if a NodeID matches a TripleTerm pattern and updates the binding.
   */
  matchesTriplePattern(id, pattern, binding, varMap) {
    const token = this.factory.decode(id);
    if ((token == null ? void 0 : token.termType) !== "Triple") return false;
    const matchPart = (partId, partPattern) => {
      if (partPattern.termType === "Variable") {
        const idx = varMap.get(partPattern.value);
        if (binding[idx] !== 0n && binding[idx] !== partId) return false;
        binding[idx] = partId;
        return true;
      }
      if (isTriple(partPattern)) {
        return this.matchesTriplePattern(partId, partPattern, binding, varMap);
      }
      return this.termToId(partPattern) === partId;
    };
    return matchPart(token.subject, pattern.subject) && matchPart(token.predicate, pattern.predicate) && matchPart(token.object, pattern.object);
  }
  async *joinWithPath(input, pattern, varMap, graphContext) {
    const sTerm = pattern.subject;
    const oTerm = pattern.object;
    const path2 = pattern.predicate;
    const sIdx = sTerm.termType === "Variable" ? varMap.get(sTerm.value) : -1;
    const oIdx = oTerm.termType === "Variable" ? varMap.get(oTerm.value) : -1;
    const sIdStatic = sTerm.termType !== "Variable" ? this.termToId(sTerm) : null;
    const oIdStatic = oTerm.termType !== "Variable" ? this.termToId(oTerm) : null;
    for await (const binding of input) {
      const startNode = sIdx !== -1 && binding[sIdx] !== 0n ? binding[sIdx] : sIdStatic;
      const endNodeConstraint = oIdx !== -1 && binding[oIdx] !== 0n ? binding[oIdx] : oIdStatic;
      if (startNode === null) {
        const allSubjects = /* @__PURE__ */ new Set();
        for (const [s, _p, _o, _g] of this.store.match(null, null, null, graphContext)) {
          allSubjects.add(s);
        }
        for (const subj of allSubjects) {
          const reachable = this.evaluatePath(subj, path2, graphContext);
          for (const reached of reachable) {
            if (endNodeConstraint === null || reached === endNodeConstraint) {
              const newBinding = [...binding];
              if (sIdx !== -1) newBinding[sIdx] = subj;
              if (oIdx !== -1) newBinding[oIdx] = reached;
              yield newBinding;
            }
          }
        }
      } else {
        const reachable = this.evaluatePath(startNode, path2, graphContext);
        for (const reached of reachable) {
          if (endNodeConstraint === null || reached === endNodeConstraint) {
            const newBinding = [...binding];
            if (sIdx !== -1) newBinding[sIdx] = startNode;
            if (oIdx !== -1) newBinding[oIdx] = reached;
            yield newBinding;
          }
        }
      }
    }
  }
  evaluatePath(start, path2, graphContext) {
    if (path2.termType === "NamedNode") {
      const propId = this.factory.namedNode(path2.value);
      const results = /* @__PURE__ */ new Set();
      for (const [_s, _p, o, _g] of this.store.match(start, propId, null, graphContext)) {
        results.add(o);
      }
      return results;
    }
    const pathObj = path2;
    const pathType = pathObj.pathType;
    if (pathType === "OneOrMorePath" || pathType === "+") {
      return this.transitiveClosurePlus(start, pathObj.items[0], graphContext);
    }
    if (pathType === "ZeroOrMorePath" || pathType === "*") {
      const result = this.transitiveClosurePlus(start, pathObj.items[0], graphContext);
      result.add(start);
      return result;
    }
    if (pathType === "ZeroOrOnePath" || pathType === "?") {
      const oneStep = this.evaluatePath(start, pathObj.items[0], graphContext);
      oneStep.add(start);
      return oneStep;
    }
    if (pathType === "SequencePath" || pathType === "/") {
      let current = /* @__PURE__ */ new Set([start]);
      for (const subPath of pathObj.items) {
        const next = /* @__PURE__ */ new Set();
        for (const node of current) {
          const reached = this.evaluatePath(node, subPath, graphContext);
          for (const r of reached) next.add(r);
        }
        current = next;
      }
      return current;
    }
    if (pathType === "AlternativePath" || pathType === "|") {
      const result = /* @__PURE__ */ new Set();
      for (const subPath of pathObj.items) {
        const reached = this.evaluatePath(start, subPath, graphContext);
        for (const r of reached) result.add(r);
      }
      return result;
    }
    if (pathType === "InversePath" || pathType === "^") {
      const innerPath = pathObj.items[0];
      const results = /* @__PURE__ */ new Set();
      if (innerPath.termType === "NamedNode") {
        const propId = this.factory.namedNode(innerPath.value);
        for (const [s, _p, _o, _g] of this.store.match(null, propId, start, graphContext)) {
          results.add(s);
        }
      }
      return results;
    }
    throw new Error(`Unsupported property path type: ${pathType} `);
  }
  transitiveClosurePlus(start, innerPath, graphContext) {
    const visited = /* @__PURE__ */ new Set();
    const queue = [start];
    const result = /* @__PURE__ */ new Set();
    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      const reachable = this.evaluatePath(current, innerPath, graphContext);
      for (const node of reachable) {
        result.add(node);
        if (!visited.has(node)) {
          queue.push(node);
        }
      }
    }
    return result;
  }
  termToId(t) {
    var _a;
    if (t === void 0 || t === null) return 0n;
    if (typeof t === "bigint") return t;
    const term = t;
    if (term.termType === "NamedNode") return this.factory.namedNode(term.value);
    if (term.termType === "Literal") return this.factory.literal(term.value, (_a = term.datatype) == null ? void 0 : _a.value, term.language);
    if (term.termType === "BlankNode") return this.factory.blankNode(term.value);
    if (isTriple(t) || term.subject && term.predicate && term.object) {
      const tr = t;
      if (typeof this.factory.triple !== "function") {
        console.error("CRITICAL: factory.triple is missing!");
        throw new Error("IDFactory implementation mismatch: .triple() method is missing.");
      }
      const id = this.factory.triple(
        this.termToId(tr.subject),
        this.termToId(tr.predicate),
        this.termToId(tr.object)
      );
      return id;
    }
    if (term.value !== void 0) return this.factory.namedNode(term.value);
    throw new Error("Unknown term type for static bind: " + (term.termType || typeof t));
  }
}
const legacyParser = new sparqljs.Parser({ sparqlStar: true });
const traqulaParser = new parserSparql12.Parser();
function parseSparql(queryString) {
  const normalizedQuery = RDFSyntax.normalizeRdfStar(queryString);
  try {
    return legacyParser.parse(normalizedQuery);
  } catch (e) {
    try {
      return traqulaParser.parse(normalizedQuery, { rdfStar: true });
    } catch (e2) {
      console.error("[SPARQL 1.2 Parser] Syntax Error:", e2);
      throw e2;
    }
  }
}
class QueryParser {
  parse(query) {
    const parsed = parseSparql(query);
    if (parsed.type === "update") {
      return parsed;
    }
    const validQueryTypes = ["query", "project", "translate", "bgp", "join"];
    if (validQueryTypes.includes(parsed.type)) {
      return parsed;
    }
    if (parsed.type === "query") {
      if (["SELECT", "ASK", "CONSTRUCT", "DESCRIBE"].includes(parsed.queryType)) {
        return parsed;
      }
    }
    throw new Error(`Unsupported operation type/structure: ${parsed.type}`);
  }
}
function serializeStore(store2) {
  const size = store2.size;
  const buffer = new ArrayBuffer(size * 32);
  const view = new BigUint64Array(buffer);
  let i = 0;
  for (const [s, p, o, g] of store2.match(null, null, null, null)) {
    view[i++] = s;
    view[i++] = p;
    view[i++] = o;
    view[i++] = g;
  }
  return new Uint8Array(buffer);
}
function deserializeStore(buffer, store2) {
  let alignedBuffer = buffer;
  if (buffer.byteLength % 8 !== 0) {
    const alignedLength = buffer.byteLength - buffer.byteLength % 8;
    alignedBuffer = buffer.slice(0, alignedLength);
  }
  const view = new BigUint64Array(alignedBuffer);
  const quadCount = Math.floor(view.length / 4);
  const quads = [];
  for (let i = 0; i < quadCount; i++) {
    quads.push({
      subject: view[i * 4],
      predicate: view[i * 4 + 1],
      object: view[i * 4 + 2],
      graph: view[i * 4 + 3]
    });
  }
  if (quads.length > 0) {
    return store2.addQuads(quads, "system");
  }
  return 0;
}
const store = new QuadStore();
const factory = new IDFactory();
const searchEngine = new UnifiedSearch({ store, factory });
const inferenceEngine = new InferenceEngine(store);
const customDictionary = /* @__PURE__ */ new Map();
const originalDecode = factory.decode.bind(factory);
factory.decode = function(id) {
  const bigId = BigInt(id);
  if (customDictionary.has(bigId)) {
    return customDictionary.get(bigId);
  }
  return originalDecode(id);
};
const connections = /* @__PURE__ */ new Set();
store.on("data", (event) => {
  const payload = JSON.stringify({
    type: event.type,
    source: event.source,
    quads: event.quads.map((q) => ({
      subject: q.subject.toString(),
      predicate: q.predicate.toString(),
      object: q.object.toString(),
      graph: q.graph.toString()
    }))
  });
  for (const connection of connections) {
    try {
      connection.write(`data: ${payload}

`);
    } catch {
      connections.delete(connection);
    }
  }
});
const PORT = 3001;
const server = http__namespace.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || "", `http://localhost:${PORT}`);
  if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-format"
    });
    res.end();
    return;
  }
  if (parsedUrl.pathname === "/api/v1/store/dictionary") {
    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          const dict = JSON.parse(body);
          let count = 0;
          for (const [idStr, token] of Object.entries(dict)) {
            customDictionary.set(BigInt(idStr), token);
            count++;
          }
          searchEngine.invalidateIndex();
          searchEngine.buildIndex();
          res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
          res.end(JSON.stringify({ status: "success", count }));
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
          res.end(JSON.stringify({ status: "error", message: e.message }));
        }
      });
      return;
    }
    if (req.method === "GET") {
      const obj = {};
      for (const [id, token] of customDictionary.entries()) {
        obj[id.toString()] = token;
      }
      res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify(obj));
      return;
    }
  }
  if (parsedUrl.pathname === "/api/v1/store/binary") {
    if (req.method === "GET") {
      const binaryData = serializeStore(store);
      res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Access-Control-Allow-Origin": "*"
      });
      res.end(Buffer.from(binaryData.buffer));
      return;
    }
    if (req.method === "POST") {
      const chunks = [];
      req.on("data", (chunk) => {
        chunks.push(chunk);
      });
      req.on("end", () => {
        try {
          const buffer = Buffer.concat(chunks);
          const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
          const imported = deserializeStore(arrayBuffer, store);
          inferenceEngine.recompute();
          searchEngine.invalidateIndex();
          searchEngine.buildIndex();
          res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
          res.end(JSON.stringify({ status: "success", imported }));
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
          res.end(JSON.stringify({ status: "error", message: e.message }));
        }
      });
      return;
    }
  }
  if (parsedUrl.pathname === "/api/v1/sparql" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const { query } = JSON.parse(body);
        const parsed = new QueryParser().parse(query);
        const engine = new SPARQLEngine(store, factory);
        const execResult = await engine.execute(parsed);
        if (typeof execResult === "boolean") {
          res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
          res.end(JSON.stringify({ type: "ask", boolean: execResult }));
          return;
        }
        const varNames = engine.getVariableNames(parsed);
        const results = [];
        if (typeof execResult === "object" && execResult !== null && Symbol.asyncIterator in execResult) {
          for await (const row of execResult) {
            if (!Array.isArray(row)) continue;
            const r = {};
            varNames.forEach((v, idx) => {
              const val = row[idx];
              r[v] = val !== 0n ? factory.decode(val) : null;
            });
            results.push(r);
          }
        }
        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ type: "select", variables: varNames, results }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ status: "error", message: e.message }));
      }
    });
    return;
  }
  if (parsedUrl.pathname === "/api/v1/search" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const { query, preferredClass, language } = JSON.parse(body);
        searchEngine.buildIndex();
        const classNode = preferredClass ? factory.namedNode(preferredClass) : void 0;
        const results = await searchEngine.search(store, query, {
          preferredClass: classNode,
          strictTypes: !!preferredClass,
          language: language || "tr"
        });
        const serializedResults = results.map((r) => ({
          id: r.id.toString(),
          labels: r.labels,
          description: r.description,
          score: r.score,
          reason: r.debugReason
        }));
        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify(serializedResults));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ status: "error", message: e.message }));
      }
    });
    return;
  }
  if (parsedUrl.pathname === "/api/v1/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    connections.add(res);
    req.on("close", () => {
      connections.delete(res);
    });
    return;
  }
  if (!parsedUrl.pathname.startsWith("/api/")) {
    const relativePath = parsedUrl.pathname === "/" || parsedUrl.pathname === "" ? "/index.html" : parsedUrl.pathname;
    const cleanPath = path__namespace.normalize(relativePath).replace(/^(\.\.[\/\\])+/, "");
    const filePath = path__namespace.join(__dirname, "..", cleanPath);
    fs__namespace.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        const indexPath = path__namespace.join(__dirname, "..", "index.html");
        fs__namespace.readFile(indexPath, (errIndex, dataIndex) => {
          if (errIndex) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
          } else {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(dataIndex);
          }
        });
      } else {
        fs__namespace.readFile(filePath, (errFile, dataFile) => {
          if (errFile) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Internal Server Error");
          } else {
            let contentType = "text/plain";
            if (filePath.endsWith(".html")) contentType = "text/html";
            else if (filePath.endsWith(".js")) contentType = "application/javascript";
            else if (filePath.endsWith(".css")) contentType = "text/css";
            else if (filePath.endsWith(".json")) contentType = "application/json";
            else if (filePath.endsWith(".png")) contentType = "image/png";
            else if (filePath.endsWith(".jpg")) contentType = "image/jpeg";
            else if (filePath.endsWith(".svg")) contentType = "image/svg+xml";
            res.writeHead(200, { "Content-Type": contentType, "Access-Control-Allow-Origin": "*" });
            res.end(dataFile);
          }
        });
      }
    });
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});
server.listen(PORT, () => {
  console.log(`NektoGraph API Server running on http://localhost:${PORT}`);
});
