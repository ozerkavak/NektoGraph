/**
 * @license NektoGraph UnifiedSearch Beta v1.0 (Standardized)
 * Features: Beta v1.0 Sequence Boost, Turkish Beta v1.0 Normalization.
 * Source: /lib_sources/search/src/search.ts
 */
class UnifiedSearch {
  constructor(config) {
    this.index = /* @__PURE__ */ new Map();
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
    console.time("buildSearchIndex");
    this.index.clear();
    const addToIndex = (token, id) => {
      const key = this.normalize(token);
      if (key.length < 2) return;
      if (!this.index.has(key)) this.index.set(key, []);
      this.index.get(key).push(id);
    };
    for (const [s, _p, o] of this.mainStore.match(null, null, null, null)) {
      const oTerm = this.factory.decode(o);
      if (oTerm.termType === "Literal") {
        const words = oTerm.value.split(/[\s\-_]+/);
        words.forEach((w) => addToIndex(w, s));
      }
      if (oTerm.termType === "NamedNode") {
        const frag = oTerm.value.split("#").pop() || oTerm.value.split("/").pop();
        if (frag) addToIndex(frag, o);
      }
      const sTerm = this.factory.decode(s);
      if (sTerm.termType === "NamedNode") {
        const frag = sTerm.value.split("#").pop() || sTerm.value.split("/").pop();
        if (frag) {
          addToIndex(frag, s);
        }
      }
    }
    this.indexBuilt = true;
    console.timeEnd("buildSearchIndex");
    console.log(`Search Index Size: ${this.index.size} tokens`);
  }
  invalidateIndex() {
    this.indexBuilt = false;
    this.index.clear();
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
    const tStart = performance.now();
    console.log(`[UnifiedSearch] Query: '${query}' -> Norm: '${queryNorm}'`);
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
    const getBestLabel = (s, session2, store) => {
      if (labelCache.has(s)) return labelCache.get(s);
      let foundLabel = null;
      if (session2) {
        for (const raw of session2.match(null, null, null, null)) {
          if (raw[0] === s) {
            if (raw[1] === this.rdfsLabelID) {
              const obj = this.factory.decode(raw[2]);
              if (obj.termType === "Literal") {
                if (obj.language === language) {
                  foundLabel = obj.value;
                  break;
                }
              }
            }
          }
        }
      }
      if (!foundLabel) {
        for (const q of store.match(s, this.rdfsLabelID, null, null)) {
          const obj = this.factory.decode(q[2]);
          if (obj.termType === "Literal" && obj.language === language) {
            foundLabel = obj.value;
            break;
          }
        }
      }
      if (!foundLabel) {
        for (const q of store.match(s, this.rdfsLabelID, null, null)) {
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
      const tIndex = performance.now();
      const queryTerms2 = queryNorm.trim().split(/\s+/).filter((t) => t.length >= 1);
      const sortedTerms = [...queryTerms2].sort((a, b) => b.length - a.length);
      const lookupTerm = sortedTerms.length > 0 ? sortedTerms[0] : queryNorm;
      for (const [token, ids] of this.index) {
        if (token.includes(lookupTerm)) {
          ids.forEach((id) => candidates.add(id));
          if (candidates.size > 5e3) break;
        }
      }
      console.log(`[UnifiedSearch] Index Lookup: ${(performance.now() - tIndex).toFixed(2)}ms, Candidates: ${candidates.size}`);
      const tScan = performance.now();
      const MASK_TYPE = 0xF000000000000000n;
      const SHIFT_TYPE = 60n;
      const TYPE_URI = 0x1n;
      const TYPE_LITERAL = 0x3n;
      candidates.forEach((id) => {
        let bestLabel = null;
        let bestMatch = null;
        for (const [_, p, o] of this.mainStore.match(id, null, null, null)) {
          const type = (o & MASK_TYPE) >> SHIFT_TYPE;
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
      console.log(`[UnifiedSearch] Candidate Scan: ${(performance.now() - tScan).toFixed(2)}ms`);
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
    const tSort = performance.now();
    const resultsArray = Array.from(results.values()).filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 50);
    console.log(`[UnifiedSearch] Total: ${(performance.now() - tStart).toFixed(2)}ms (Sort: ${(performance.now() - tSort).toFixed(2)}ms) - Found: ${resultsArray.length}`);
    return resultsArray;
  }
}
if (typeof window !== "undefined") {
  window.SearchLib = { UnifiedSearch };
}
export {
  UnifiedSearch
};
