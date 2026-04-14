(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.QuadStoreLib = {}));
})(this, (function(exports2) {
  "use strict";
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
    strToId;
    idToStr;
    constructor() {
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
    map = /* @__PURE__ */ new Map();
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
    uriPool = new StringPool();
    bnodePool = new StringPool();
    literalMap = /* @__PURE__ */ new Map();
    literalArray = [];
    tripleMap = /* @__PURE__ */ new Map();
    tripleArray = [];
    // Star Inverted Indices (Constituent NodeID -> List of Triple NodeIDs)
    starIdxS = new StarInvertedIndex();
    starIdxP = new StarInvertedIndex();
    starIdxO = new StarInvertedIndex();
    constructor() {
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
  console.log("QuadStoreLib V6.1 - Triple Support Enabled");
  class Index {
    map = /* @__PURE__ */ new Map();
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
    capacity;
    _size;
    s;
    p;
    o;
    g;
    idxS;
    idxP;
    idxO;
    idxG;
    // 5th Column (Status): 0 = Active, 1 = Deleted
    status;
    listeners = [];
    constructor(initialCapacity = 1024) {
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
  exports2.DEFAULT_GRAPH = DEFAULT_GRAPH;
  exports2.IDFactory = IDFactory;
  exports2.MASK_TYPE = MASK_TYPE;
  exports2.NodeType = NodeType;
  exports2.QuadStore = QuadStore;
  exports2.SHIFT_TYPE = SHIFT_TYPE;
  exports2.StringPool = StringPool;
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
}));
