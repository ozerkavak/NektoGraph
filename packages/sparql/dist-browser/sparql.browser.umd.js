(function(global2, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports, require("@triplestore/core")) : typeof define === "function" && define.amd ? define(["exports", "@triplestore/core"], factory) : (global2 = typeof globalThis !== "undefined" ? globalThis : global2 || self, factory(global2.SparqlLib = {}, global2.window.QuadStoreLib));
})(this, function(exports2, core) {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

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
  function makeLiteral(factory, value, language, datatype2) {
    const dt = datatype2 ? datatype2.value : void 0;
    const id = factory.literal(value, dt, language);
    return factory.decode(id);
  }
  function evaluateFunction(op, args, factory) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    if (op === "isiri" || op === "isuri") {
      const b = ((_a = args[0]) == null ? void 0 : _a.termType) === "NamedNode";
      return makeLiteral(factory, b ? "true" : "false", void 0, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
    }
    if (op === "isblank") {
      const b = ((_b = args[0]) == null ? void 0 : _b.termType) === "BlankNode";
      return makeLiteral(factory, b ? "true" : "false", void 0, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
    }
    if (op === "isliteral") {
      const b = ((_c = args[0]) == null ? void 0 : _c.termType) === "Literal";
      return makeLiteral(factory, b ? "true" : "false", void 0, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
    }
    if (op === "istriple") {
      const arg = args[0];
      const b = (arg == null ? void 0 : arg.termType) === "Triple" || typeof arg === "bigint" && (arg & 0x3n << 60n) !== 0n;
      return makeLiteral(factory, b ? "true" : "false", void 0, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
    }
    const getResolvedTriple = (t) => {
      if (!t) return null;
      if (typeof t === "bigint") return factory.decode(t);
      return t;
    };
    const ensureDecoded = (t) => {
      if (typeof t === "bigint") return factory.decode(t);
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
        return factory.decode(factory.namedNode(dt));
      }
    }
    if (op === "lang") {
      if (((_e = args[0]) == null ? void 0 : _e.termType) === "Literal") {
        const lit = args[0];
        return makeLiteral(factory, lit.language || "");
      }
    }
    if (op === "ucase") {
      const arg = args[0];
      if ((arg == null ? void 0 : arg.termType) === "Literal") {
        return makeLiteral(factory, arg.value.toUpperCase(), arg.language, arg.datatype);
      }
    }
    if (op === "lcase") {
      const arg = args[0];
      if ((arg == null ? void 0 : arg.termType) === "Literal") {
        return makeLiteral(factory, arg.value.toLowerCase(), arg.language, arg.datatype);
      }
    }
    if (op === "concat") {
      let val = "";
      for (const arg of args) {
        if ((arg == null ? void 0 : arg.termType) === "Literal") val += arg.value;
      }
      return makeLiteral(factory, val);
    }
    if (op === "contains") {
      if (((_f = args[0]) == null ? void 0 : _f.termType) === "Literal" && ((_g = args[1]) == null ? void 0 : _g.termType) === "Literal") {
        const b = args[0].value.includes(args[1].value);
        return makeLiteral(factory, b ? "true" : "false", void 0, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
      }
    }
    if (op === "strstarts") {
      if (((_h = args[0]) == null ? void 0 : _h.termType) === "Literal" && ((_i = args[1]) == null ? void 0 : _i.termType) === "Literal") {
        const b = args[0].value.startsWith(args[1].value);
        return makeLiteral(factory, b ? "true" : "false", void 0, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
      }
    }
    if (op === "strends") {
      if (((_j = args[0]) == null ? void 0 : _j.termType) === "Literal" && ((_k = args[1]) == null ? void 0 : _k.termType) === "Literal") {
        const b = args[0].value.endsWith(args[1].value);
        return makeLiteral(factory, b ? "true" : "false", void 0, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
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
          return makeLiteral(factory, b ? "true" : "false", void 0, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
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
          return makeLiteral(factory, val, text.language, text.datatype);
        } catch (e) {
          return null;
        }
      }
    }
    if (op === "substr") {
      const str2 = args[0];
      const start = args[1];
      const len = args[2];
      if ((str2 == null ? void 0 : str2.termType) === "Literal" && (start == null ? void 0 : start.termType) === "Literal") {
        let s = parseInt(start.value) - 1;
        if (s < 0) s = 0;
        let l = (len == null ? void 0 : len.termType) === "Literal" ? parseInt(len.value) : void 0;
        let val = "";
        if (l !== void 0) val = str2.value.substr(s, l);
        else val = str2.value.substring(s);
        return makeLiteral(factory, val, str2.language, str2.datatype);
      }
    }
    if (op === "strlen") {
      const str2 = args[0];
      if ((str2 == null ? void 0 : str2.termType) === "Literal") {
        return makeLiteral(factory, str2.value.length.toString(), void 0, { value: "http://www.w3.org/2001/XMLSchema#integer" });
      }
    }
    if (op === "abs") {
      const val = getNumeric(args[0]);
      if (val !== null) return makeLiteral(factory, Math.abs(val).toString(), void 0, args[0].datatype);
    }
    if (op === "round") {
      const val = getNumeric(args[0]);
      if (val !== null) return makeLiteral(factory, Math.round(val).toString(), void 0, args[0].datatype);
    }
    if (op === "ceil") {
      const val = getNumeric(args[0]);
      if (val !== null) return makeLiteral(factory, Math.ceil(val).toString(), void 0, args[0].datatype);
    }
    if (op === "floor") {
      const val = getNumeric(args[0]);
      if (val !== null) return makeLiteral(factory, Math.floor(val).toString(), void 0, args[0].datatype);
    }
    if (op === "rand") {
      return makeLiteral(factory, Math.random().toString(), void 0, { value: "http://www.w3.org/2001/XMLSchema#double" });
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
    constructor(factory) {
      this.factory = factory;
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
          const exists2 = await existenceCheck(pattern, binding);
          return op === "exists" ? exists2 : !exists2;
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
    constructor(factory) {
      this.factory = factory;
    }
    computeAggregate(agg, bindings, varMap) {
      const op = agg.aggregation.toUpperCase();
      if (op === "COUNT") {
        if (agg.expression) {
          if ("termType" in agg.expression && agg.expression.termType === "Variable") {
            const idx = varMap.get(agg.expression.value);
            if (idx !== void 0) {
              let count2 = 0;
              for (const b of bindings) {
                if (b[idx] !== 0n) count2++;
              }
              return this.factory.literal(count2.toString(), "http://www.w3.org/2001/XMLSchema#integer");
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
      const values2 = [];
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
                if (!isNaN(n)) values2.push(n);
              }
            }
          }
        }
      }
      let resultNum = 0;
      if (op === "SUM") {
        resultNum = values2.reduce((a2, b) => a2 + b, 0);
      } else if (op === "AVG") {
        resultNum = values2.length > 0 ? values2.reduce((a2, b) => a2 + b, 0) / values2.length : 0;
      } else if (op === "MIN") {
        resultNum = values2.length > 0 ? Math.min(...values2) : 0;
      } else if (op === "MAX") {
        resultNum = values2.length > 0 ? Math.max(...values2) : 0;
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
    constructor(store, factory) {
      __publicField(this, "optimizer", new Optimizer());
      __publicField(this, "evaluator");
      __publicField(this, "aggregator");
      __publicField(this, "ignoredGraphs", /* @__PURE__ */ new Set());
      this.store = store;
      this.factory = factory;
      this.evaluator = new ExpressionEvaluator(factory);
      this.aggregator = new Aggregator(factory);
    }
    setIgnoredGraphs(graphIDs) {
      this.ignoredGraphs = new Set(graphIDs);
    }
    async execute(query2, baseGraph) {
      if (query2.type === "update") {
        return this.executeUpdate(query2, baseGraph);
      }
      const q = query2;
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
    async executeUpdate(update2, baseGraph) {
      for (const op of update2.updates) {
        const graph2 = op.graph ? this.factory.namedNode(op.graph) : baseGraph || void 0;
        if (op.updateType === "insert" || op.updateType === "insertdelete") {
          for (const bgp of op.insert || []) {
            for (const triple of bgp.triples) {
              const s = this.termToId(triple.subject);
              const p = this.termToId(triple.predicate);
              const o = this.termToId(triple.object);
              this.store.add(s, p, o, graph2);
            }
          }
        }
        if (op.updateType === "delete" || op.updateType === "insertdelete") {
          for (const bgp of op.delete || []) {
            for (const triple of bgp.triples) {
              const s = this.termToId(triple.subject);
              const p = this.termToId(triple.predicate);
              const o = this.termToId(triple.object);
              this.store.delete(s, p, o, graph2);
            }
          }
        }
      }
    }
    async executeInternal(query2, inputMap, inputStream) {
      if (query2.queryType !== "SELECT" && query2.queryType !== "ASK" && query2.queryType !== "CONSTRUCT" && query2.queryType !== "DESCRIBE") {
        throw new Error(`Only SELECT, ASK, CONSTRUCT and DESCRIBE queries are supported.Got: ${query2.queryType} `);
      }
      const varMap = inputMap ? new Map(inputMap) : /* @__PURE__ */ new Map();
      const varNames = this.getVariableNames(query2);
      varNames.forEach((name) => {
        if (!varMap.has(name)) varMap.set(name, varMap.size);
      });
      let stream = inputStream || this.initialStream(varMap.size);
      if (inputStream && varMap.size > inputMap.size) {
        stream = this.resizeBindings(stream, varMap.size);
      }
      if (query2.where && Array.isArray(query2.where)) {
        for (const pattern of query2.where) {
          stream = this.processPattern(stream, pattern, varMap);
        }
      } else if (query2.input) {
        stream = this.processPattern(stream, query2.input, varMap);
      }
      if (this.hasGroupingOrAggregation(query2)) {
        stream = this.processGrouping(stream, query2, varMap);
      }
      stream = this.processExtension(stream, query2, varMap);
      if (query2.distinct || query2.reduced) {
        stream = this.processDistinct(stream, query2, varMap);
      }
      if (query2.order && query2.order.length > 0) {
        stream = await this.processOrdering(stream, query2.order, varMap);
      }
      if (query2.offset || query2.limit) {
        stream = this.processSlicing(stream, query2.offset, query2.limit);
      }
      return { stream, varMap };
    }
    // Process CONSTRUCT
    async *processConstruct(query2) {
      const { stream, varMap } = await this.executeInternal(query2);
      const template = query2.template || [];
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
    async *processDescribe(query2) {
      const resources = /* @__PURE__ */ new Set();
      if (query2.where && query2.where.length > 0) {
        const { stream, varMap } = await this.executeInternal(query2);
        for await (const binding of stream) {
          if (this.isWildcard(query2.variables)) {
            for (const id of binding) {
              if (id !== 0n) resources.add(id);
            }
          } else {
            const vars = query2.variables;
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
      if (Array.isArray(query2.variables) && !this.isWildcard(query2.variables)) {
        const vars = query2.variables;
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
    async *processExtension(input, query2, varMap) {
      const extensions = [];
      if (query2.variables && !this.isWildcard(query2.variables)) {
        const vars = query2.variables;
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
      all.sort((a2, b) => {
        for (const order2 of orders) {
          const valA = this.evaluator.evaluateExpressionValueSync(order2.expression, a2, varMap);
          const valB = this.evaluator.evaluateExpressionValueSync(order2.expression, b, varMap);
          if (valA === valB) continue;
          if (valA == null) return 1;
          if (valB == null) return -1;
          let cmp = 0;
          if (valA < valB) cmp = -1;
          else if (valA > valB) cmp = 1;
          if (order2.descending) cmp *= -1;
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
      return async function* () {
        yield* all;
      }();
    }
    async *processDistinct(input, query2, varMap) {
      const seen = /* @__PURE__ */ new Set();
      let projectedIndices = null;
      if (query2.variables && !this.isWildcard(query2.variables)) {
        projectedIndices = [];
        for (const v of query2.variables) {
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
    async *processSlicing(input, offset2 = 0, limit2) {
      let count2 = 0;
      let yielded = 0;
      for await (const b of input) {
        if (count2 < offset2) {
          count2++;
          continue;
        }
        if (limit2 !== void 0 && yielded >= limit2) {
          break;
        }
        yield b;
        yielded++;
      }
    }
    getVariableNames(query2) {
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
      if (query2.where && Array.isArray(query2.where)) {
        traverse(query2.where);
      } else if (query2.input) {
        traverse([query2.input]);
      }
      if (query2.variables && !this.isWildcard(query2.variables)) {
        const selectVars = query2.variables;
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
    hasGroupingOrAggregation(query2) {
      if (query2.group && query2.group.length > 0) return true;
      if (query2.having && query2.having.length > 0) return true;
      if (query2.variables && !this.isWildcard(query2.variables)) {
        const selectVars = query2.variables;
        return selectVars.some((v) => "expression" in v && v.expression.type === "aggregate");
      }
      return false;
    }
    async *processGrouping(input, query2, varMap) {
      const groups = /* @__PURE__ */ new Map();
      const implicitGroup = !query2.group || query2.group.length === 0;
      const allBindings = [];
      for await (const b of input) allBindings.push(b);
      if (implicitGroup) {
        if (allBindings.length > 0 || this.hasAggregates(query2)) {
          if (query2.having && query2.having.length > 0) {
            let match = true;
            for (const h of query2.having) {
              if (!await this.evaluateGroupExpression(h, allBindings, varMap)) {
                match = false;
                break;
              }
            }
            if (!match) return;
          }
          yield this.aggregateGroup(allBindings, query2, varMap);
        }
        return;
      }
      for (const binding of allBindings) {
        let key = "";
        if (query2.group) {
          for (const g of query2.group) {
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
        if (query2.having && query2.having.length > 0) {
          let match = true;
          for (const h of query2.having) {
            if (!await this.evaluateGroupExpression(h, groupBindings, varMap)) {
              match = false;
              break;
            }
          }
          if (!match) continue;
        }
        yield this.aggregateGroup(groupBindings, query2, varMap);
      }
    }
    aggregateGroup(bindings, query2, varMap) {
      let result;
      if (bindings.length > 0) {
        result = [...bindings[0]];
      } else {
        result = new Array(varMap.size).fill(0n);
      }
      if (query2.variables && !this.isWildcard(query2.variables)) {
        const selectVars = query2.variables;
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
    hasAggregates(query2) {
      if (!query2.variables || this.isWildcard(query2.variables)) return false;
      const selectVars = query2.variables;
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
        if (isTriple(oTerm)) {
          for (const [mS, mP, mO, mG] of this.store.match(sReq, pReq, null, graphContext)) {
            if (graphContext === null && this.ignoredGraphs.has(mG)) continue;
            const subBinding = [...binding];
            if (this.matchesTriplePattern(mO, oTerm, subBinding, varMap)) {
              if (sIdx !== -1) subBinding[sIdx] = mS;
              if (pIdx !== -1) subBinding[pIdx] = mP;
              if (targetGraphVar !== void 0 && targetGraphVar !== -1) {
                subBinding[targetGraphVar] = mG;
              }
              yield subBinding;
            }
          }
          continue;
        }
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
        const patternId = this.termToId(partPattern);
        if (partId === patternId) return true;
        if (partPattern.termType !== "Variable") {
          try {
            const decoded = this.factory.decode(partId);
            return decoded.value === partPattern.value;
          } catch {
            return false;
          }
        }
        return false;
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
  var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
  var Wildcard$1 = {};
  class Wildcard {
    constructor() {
      return WILDCARD || this;
    }
    equals(other) {
      return other && this.termType === other.termType;
    }
  }
  Object.defineProperty(Wildcard.prototype, "value", {
    enumerable: true,
    value: "*"
  });
  Object.defineProperty(Wildcard.prototype, "termType", {
    enumerable: true,
    value: "Wildcard"
  });
  var WILDCARD = new Wildcard();
  Wildcard$1.Wildcard = Wildcard;
  var SparqlParser = function() {
    var o = function(k, v, o2, l) {
      for (o2 = o2 || {}, l = k.length; l--; o2[k[l]] = v) ;
      return o2;
    }, $V0 = [6, 12, 13, 15, 16, 24, 32, 36, 41, 45, 100, 110, 113, 115, 116, 123, 126, 131, 197, 224, 229, 308, 329, 330, 331, 332, 333], $V1 = [2, 247], $V2 = [100, 110, 113, 115, 116, 123, 126, 131, 329, 330, 331, 332, 333], $V3 = [2, 409], $V4 = [1, 18], $V5 = [1, 27], $V6 = [13, 16, 45, 197, 224, 229, 308], $V7 = [28, 29, 53], $V8 = [28, 53], $V9 = [1, 42], $Va = [1, 45], $Vb = [1, 41], $Vc = [1, 44], $Vd = [123, 126], $Ve = [1, 67], $Vf = [39, 45, 87], $Vg = [13, 16, 45, 197, 224, 308], $Vh = [1, 87], $Vi = [2, 281], $Vj = [1, 86], $Vk = [13, 16, 45, 82, 87, 89, 231, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312], $Vl = [6, 28, 29, 53, 63, 70, 73, 81, 83, 85], $Vm = [6, 13, 16, 28, 29, 53, 63, 70, 73, 81, 83, 85, 87, 308], $Vn = [6, 13, 16, 28, 29, 45, 53, 63, 70, 73, 81, 82, 83, 85, 87, 89, 197, 231, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 314], $Vo = [6, 13, 16, 28, 29, 31, 39, 45, 47, 48, 53, 63, 70, 73, 81, 82, 83, 85, 87, 89, 109, 112, 121, 123, 126, 128, 159, 160, 161, 163, 164, 174, 193, 197, 224, 229, 231, 232, 242, 246, 250, 263, 265, 272, 290, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 314, 317, 318, 335, 337, 338, 340, 341, 342, 343, 344, 345, 346], $Vp = [13, 16, 308], $Vq = [112, 132, 327, 334], $Vr = [13, 16, 112, 132, 308], $Vs = [1, 111], $Vt = [1, 117], $Vu = [112, 132, 327, 328, 334], $Vv = [13, 16, 112, 132, 308, 328], $Vw = [28, 29, 45, 53, 87], $Vx = [1, 138], $Vy = [1, 151], $Vz = [1, 128], $VA = [1, 127], $VB = [1, 129], $VC = [1, 140], $VD = [1, 141], $VE = [1, 142], $VF = [1, 143], $VG = [1, 144], $VH = [1, 145], $VI = [1, 147], $VJ = [1, 148], $VK = [2, 457], $VL = [1, 158], $VM = [1, 159], $VN = [1, 160], $VO = [1, 152], $VP = [1, 153], $VQ = [1, 156], $VR = [1, 171], $VS = [1, 172], $VT = [1, 173], $VU = [1, 174], $VV = [1, 175], $VW = [1, 176], $VX = [1, 167], $VY = [1, 168], $VZ = [1, 169], $V_ = [1, 170], $V$ = [1, 157], $V01 = [1, 166], $V11 = [1, 161], $V21 = [1, 162], $V31 = [1, 163], $V41 = [1, 164], $V51 = [1, 165], $V61 = [6, 13, 16, 29, 31, 45, 82, 85, 87, 89, 112, 159, 160, 161, 163, 164, 231, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 335], $V71 = [1, 195], $V81 = [6, 31, 73, 81, 83, 85], $V91 = [2, 285], $Va1 = [1, 199], $Vb1 = [1, 201], $Vc1 = [6, 31, 70, 73, 81, 83, 85], $Vd1 = [2, 283], $Ve1 = [1, 207], $Vf1 = [1, 218], $Vg1 = [1, 223], $Vh1 = [1, 219], $Vi1 = [1, 225], $Vj1 = [1, 226], $Vk1 = [1, 224], $Vl1 = [6, 63, 70, 73, 81, 83, 85], $Vm1 = [1, 236], $Vn1 = [2, 334], $Vo1 = [1, 243], $Vp1 = [1, 241], $Vq1 = [6, 193], $Vr1 = [2, 349], $Vs1 = [2, 339], $Vt1 = [28, 128], $Vu1 = [47, 48, 193, 272], $Vv1 = [47, 48, 193, 242, 272], $Vw1 = [47, 48, 193, 242, 246, 272], $Vx1 = [47, 48, 193, 242, 246, 250, 263, 265, 272, 290, 297, 298, 299, 300, 301, 302, 341, 342, 343, 344, 345, 346], $Vy1 = [39, 47, 48, 193, 242, 246, 250, 263, 265, 272, 290, 297, 298, 299, 300, 301, 302, 338, 341, 342, 343, 344, 345, 346], $Vz1 = [1, 271], $VA1 = [1, 270], $VB1 = [6, 13, 16, 29, 31, 39, 45, 47, 48, 70, 73, 76, 78, 81, 82, 83, 85, 87, 89, 112, 159, 160, 161, 163, 164, 193, 231, 242, 246, 250, 263, 265, 268, 269, 270, 271, 272, 273, 274, 276, 277, 279, 280, 283, 285, 290, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 335, 338, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351], $VC1 = [1, 281], $VD1 = [1, 280], $VE1 = [13, 16, 29, 31, 39, 45, 47, 48, 82, 85, 87, 89, 112, 159, 160, 161, 163, 164, 174, 193, 197, 224, 229, 231, 232, 242, 246, 250, 263, 265, 272, 290, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 314, 317, 318, 335, 338, 341, 342, 343, 344, 345, 346], $VF1 = [45, 89], $VG1 = [13, 16, 29, 31, 39, 45, 47, 48, 82, 85, 87, 89, 112, 159, 160, 161, 163, 164, 174, 193, 197, 224, 229, 231, 232, 242, 246, 250, 263, 265, 272, 290, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 314, 317, 318, 335, 338, 341, 342, 343, 344, 345, 346], $VH1 = [13, 16, 31, 82, 174, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 312], $VI1 = [31, 89], $VJ1 = [48, 87], $VK1 = [6, 13, 16, 45, 48, 82, 87, 89, 231, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 337, 338], $VL1 = [6, 13, 16, 39, 45, 48, 82, 87, 89, 231, 263, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 337, 338, 340], $VM1 = [1, 313], $VN1 = [6, 85], $VO1 = [6, 31, 81, 83, 85], $VP1 = [2, 361], $VQ1 = [2, 353], $VR1 = [1, 343], $VS1 = [31, 112, 335], $VT1 = [13, 16, 29, 31, 45, 48, 82, 85, 87, 89, 112, 159, 160, 161, 163, 164, 193, 197, 224, 229, 231, 232, 272, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 317, 318, 335], $VU1 = [13, 16, 29, 31, 45, 48, 82, 85, 87, 89, 112, 159, 160, 161, 163, 164, 193, 197, 224, 229, 231, 232, 272, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 314, 317, 318, 335], $VV1 = [6, 109, 193], $VW1 = [31, 112], $VX1 = [13, 16, 45, 82, 87, 224, 263, 265, 268, 269, 270, 271, 273, 274, 276, 277, 279, 280, 283, 285, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 312, 346, 347, 348, 349, 350, 351], $VY1 = [1, 390], $VZ1 = [1, 391], $V_1 = [13, 16, 87, 197, 308, 314], $V$1 = [13, 16, 39, 45, 82, 87, 224, 263, 265, 268, 269, 270, 271, 273, 274, 276, 277, 279, 280, 283, 285, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 312, 346, 347, 348, 349, 350, 351], $V02 = [1, 417], $V12 = [1, 418], $V22 = [13, 16, 48, 197, 229, 308], $V32 = [6, 31, 85], $V42 = [6, 13, 16, 31, 45, 73, 81, 83, 85, 268, 269, 270, 271, 273, 274, 276, 277, 279, 280, 283, 285, 308, 346, 347, 348, 349, 350, 351], $V52 = [6, 13, 16, 29, 31, 45, 73, 76, 78, 81, 82, 83, 85, 87, 89, 112, 159, 160, 161, 163, 164, 231, 268, 269, 270, 271, 273, 274, 276, 277, 279, 280, 283, 285, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 335, 346, 347, 348, 349, 350, 351], $V62 = [29, 31, 85, 112, 159, 160, 161, 163, 164], $V72 = [1, 443], $V82 = [1, 444], $V92 = [1, 449], $Va2 = [31, 112, 193, 232, 318, 335], $Vb2 = [13, 16, 45, 48, 82, 87, 89, 231, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312], $Vc2 = [13, 16, 31, 45, 48, 82, 87, 89, 112, 193, 231, 232, 272, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 317, 318, 335], $Vd2 = [13, 16, 29, 31, 45, 48, 82, 85, 87, 89, 112, 159, 160, 161, 163, 164, 193, 231, 232, 272, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 317, 318, 335], $Ve2 = [13, 16, 31, 48, 82, 174, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 312], $Vf2 = [31, 45], $Vg2 = [1, 507], $Vh2 = [1, 508], $Vi2 = [6, 13, 16, 29, 31, 39, 45, 47, 48, 63, 70, 73, 76, 78, 81, 82, 83, 85, 87, 89, 112, 159, 160, 161, 163, 164, 193, 231, 242, 246, 250, 263, 265, 268, 269, 270, 271, 272, 273, 274, 276, 277, 279, 280, 283, 285, 290, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 335, 336, 338, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351], $Vj2 = [29, 31, 85, 112, 159, 160, 161, 163, 164, 335], $Vk2 = [6, 13, 16, 31, 45, 70, 73, 81, 83, 85, 87, 268, 269, 270, 271, 273, 274, 276, 277, 279, 280, 283, 285, 308, 346, 347, 348, 349, 350, 351], $Vl2 = [13, 16, 31, 45, 48, 82, 87, 89, 112, 193, 197, 231, 232, 272, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 317, 318, 335], $Vm2 = [2, 352], $Vn2 = [13, 16, 197, 308, 314], $Vo2 = [1, 565], $Vp2 = [6, 13, 16, 31, 45, 76, 78, 81, 83, 85, 87, 268, 269, 270, 271, 273, 274, 276, 277, 279, 280, 283, 285, 308, 346, 347, 348, 349, 350, 351], $Vq2 = [13, 16, 29, 31, 45, 82, 85, 87, 89, 112, 159, 160, 161, 163, 164, 231, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312], $Vr2 = [13, 16, 29, 31, 45, 82, 85, 87, 89, 112, 159, 160, 161, 163, 164, 231, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 335], $Vs2 = [13, 16, 87, 308], $Vt2 = [2, 364], $Vu2 = [29, 31, 85, 112, 159, 160, 161, 163, 164, 193, 232, 318, 335], $Vv2 = [31, 112, 193, 232, 272, 318, 335], $Vw2 = [2, 359], $Vx2 = [13, 16, 48, 82, 174, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 312], $Vy2 = [29, 31, 85, 112, 159, 160, 161, 163, 164, 193, 232, 272, 318, 335], $Vz2 = [13, 16, 31, 45, 82, 87, 89, 112, 231, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312], $VA2 = [2, 347];
    var parser = {
      trace: function trace() {
      },
      yy: {},
      symbols_: { "error": 2, "QueryOrUpdate": 3, "Prologue": 4, "QueryOrUpdate_group0": 5, "EOF": 6, "Query": 7, "Qry": 8, "Query_option0": 9, "Prologue_repetition0": 10, "BaseDecl": 11, "BASE": 12, "IRIREF": 13, "PrefixDecl": 14, "PREFIX": 15, "PNAME_NS": 16, "SelectClauseWildcard": 17, "Qry_repetition0": 18, "WhereClause": 19, "SolutionModifierNoGroup": 20, "SelectClauseVars": 21, "Qry_repetition1": 22, "SolutionModifier": 23, "CONSTRUCT": 24, "ConstructTemplate": 25, "Qry_repetition2": 26, "Qry_repetition3": 27, "WHERE": 28, "{": 29, "Qry_option0": 30, "}": 31, "DESCRIBE": 32, "Qry_group0": 33, "Qry_repetition4": 34, "Qry_option1": 35, "ASK": 36, "Qry_repetition5": 37, "SelectClauseBase": 38, "*": 39, "SelectClauseVars_repetition_plus0": 40, "SELECT": 41, "SelectClauseBase_option0": 42, "SelectClauseItem": 43, "Var": 44, "(": 45, "Expression": 46, "AS": 47, ")": 48, "SubSelect": 49, "SubSelect_option0": 50, "SubSelect_option1": 51, "DatasetClause": 52, "FROM": 53, "DatasetClause_option0": 54, "iri": 55, "WhereClause_option0": 56, "GroupGraphPattern": 57, "SolutionModifier_option0": 58, "SolutionModifierNoGroup_option0": 59, "SolutionModifierNoGroup_option1": 60, "SolutionModifierNoGroup_option2": 61, "GroupClause": 62, "GROUP": 63, "BY": 64, "GroupClause_repetition_plus0": 65, "GroupCondition": 66, "BuiltInCall": 67, "FunctionCall": 68, "HavingClause": 69, "HAVING": 70, "HavingClause_repetition_plus0": 71, "OrderClause": 72, "ORDER": 73, "OrderClause_repetition_plus0": 74, "OrderCondition": 75, "ASC": 76, "BrackettedExpression": 77, "DESC": 78, "Constraint": 79, "LimitOffsetClauses": 80, "LIMIT": 81, "INTEGER": 82, "OFFSET": 83, "ValuesClause": 84, "VALUES": 85, "InlineData": 86, "VAR": 87, "InlineData_repetition0": 88, "NIL": 89, "InlineData_repetition1": 90, "InlineData_repetition_plus2": 91, "InlineData_repetition3": 92, "DataBlock": 93, "DataBlockValueList": 94, "DataBlockValueList_repetition_plus0": 95, "Update": 96, "Update_repetition0": 97, "Update1": 98, "Update_option0": 99, "LOAD": 100, "Update1_option0": 101, "Update1_option1": 102, "Update1_group0": 103, "Update1_option2": 104, "GraphRefAll": 105, "Update1_group1": 106, "Update1_option3": 107, "GraphOrDefault": 108, "TO": 109, "CREATE": 110, "Update1_option4": 111, "GRAPH": 112, "INSERTDATA": 113, "QuadPattern": 114, "DELETEDATA": 115, "DELETEWHERE": 116, "Update1_option5": 117, "InsertDeleteClause": 118, "Update1_repetition0": 119, "IntoGraphClause": 120, "INTO": 121, "GraphRef": 122, "DELETE": 123, "InsertDeleteClause_option0": 124, "InsertClause": 125, "INSERT": 126, "UsingClause": 127, "USING": 128, "UsingClause_option0": 129, "WithClause": 130, "WITH": 131, "DEFAULT": 132, "GraphOrDefault_option0": 133, "GraphRefAll_group0": 134, "Quads": 135, "Quads_option0": 136, "Quads_repetition0": 137, "QuadsNotTriples": 138, "VarOrIri": 139, "QuadsNotTriples_option0": 140, "QuadsNotTriples_option1": 141, "QuadsNotTriples_option2": 142, "TriplesTemplate": 143, "TriplesTemplate_repetition0": 144, "TriplesSameSubject": 145, "TriplesTemplate_option0": 146, "GroupGraphPatternSub": 147, "GroupGraphPatternSub_option0": 148, "GroupGraphPatternSub_repetition0": 149, "GroupGraphPatternSubTail": 150, "GraphPatternNotTriples": 151, "GroupGraphPatternSubTail_option0": 152, "GroupGraphPatternSubTail_option1": 153, "TriplesBlock": 154, "TriplesBlock_repetition0": 155, "TriplesSameSubjectPath": 156, "TriplesBlock_option0": 157, "GroupOrUnionGraphPattern": 158, "OPTIONAL": 159, "MINUS": 160, "SERVICE": 161, "GraphPatternNotTriples_option0": 162, "FILTER": 163, "BIND": 164, "InlineDataOneVar": 165, "InlineDataFull": 166, "InlineDataOneVar_repetition0": 167, "InlineDataFull_repetition0": 168, "InlineDataFull_repetition_plus1": 169, "InlineDataFull_repetition2": 170, "DataBlockValue": 171, "Literal": 172, "QuotedTriple": 173, "UNDEF": 174, "GroupOrUnionGraphPattern_repetition0": 175, "ArgList": 176, "ArgList_option0": 177, "ArgList_repetition0": 178, "ExpressionList": 179, "ExpressionList_repetition0": 180, "ConstructTemplate_option0": 181, "ConstructTriples": 182, "ConstructTriples_repetition0": 183, "ConstructTriples_option0": 184, "VarOrTermOrQuotedTP": 185, "PropertyListNotEmpty": 186, "TriplesNode": 187, "PropertyList": 188, "PropertyList_option0": 189, "VerbObjectList": 190, "PropertyListNotEmpty_repetition0": 191, "SemiOptionalVerbObjectList": 192, ";": 193, "SemiOptionalVerbObjectList_option0": 194, "Verb": 195, "ObjectList": 196, "a": 197, "ObjectList_repetition0": 198, "Object": 199, "GraphNode": 200, "Object_option0": 201, "PropertyListPathNotEmpty": 202, "TriplesNodePath": 203, "TriplesSameSubjectPath_option0": 204, "O": 205, "PropertyListPathNotEmpty_repetition0": 206, "PropertyListPathNotEmptyTail": 207, "O_group0": 208, "ObjectListPath": 209, "ObjectListPath_repetition0": 210, "ObjectPath": 211, "GraphNodePath": 212, "ObjectPath_option0": 213, "Path": 214, "Path_repetition0": 215, "PathSequence": 216, "PathSequence_repetition0": 217, "PathEltOrInverse": 218, "PathElt": 219, "PathPrimary": 220, "PathElt_option0": 221, "PathEltOrInverse_option0": 222, "IriOrA": 223, "!": 224, "PathNegatedPropertySet": 225, "PathOneInPropertySet": 226, "PathNegatedPropertySet_repetition0": 227, "PathNegatedPropertySet_option0": 228, "^": 229, "TriplesNode_repetition_plus0": 230, "[": 231, "]": 232, "TriplesNodePath_repetition_plus0": 233, "VarOrTermOrQuotedTPExpr": 234, "VarOrTerm": 235, "GraphTerm": 236, "BlankNode": 237, "ConditionalOrExpression": 238, "ConditionalAndExpression": 239, "ConditionalOrExpression_repetition0": 240, "ConditionalOrExpressionTail": 241, "||": 242, "RelationalExpression": 243, "ConditionalAndExpression_repetition0": 244, "ConditionalAndExpressionTail": 245, "&&": 246, "NumericExpression": 247, "RelationalExpression_group0": 248, "RelationalExpression_option0": 249, "IN": 250, "MultiplicativeExpression": 251, "NumericExpression_repetition0": 252, "AdditiveExpressionTail": 253, "AdditiveExpressionTail_group0": 254, "NumericLiteralPositive": 255, "AdditiveExpressionTail_repetition0": 256, "NumericLiteralNegative": 257, "AdditiveExpressionTail_repetition1": 258, "UnaryExpression": 259, "MultiplicativeExpression_repetition0": 260, "MultiplicativeExpressionTail": 261, "MultiplicativeExpressionTail_group0": 262, "+": 263, "PrimaryExpression": 264, "-": 265, "ExprQuotedTP": 266, "Aggregate": 267, "FUNC_ARITY0": 268, "FUNC_ARITY1": 269, "FUNC_ARITY1_SPARQL_STAR": 270, "FUNC_ARITY2": 271, ",": 272, "FUNC_ARITY3": 273, "FUNC_ARITY3_SPARQL_STAR": 274, "BuiltInCall_group0": 275, "BOUND": 276, "BNODE": 277, "BuiltInCall_option0": 278, "EXISTS": 279, "COUNT": 280, "Aggregate_option0": 281, "Aggregate_group0": 282, "FUNC_AGGREGATE": 283, "Aggregate_option1": 284, "GROUP_CONCAT": 285, "Aggregate_option2": 286, "Aggregate_option3": 287, "GroupConcatSeparator": 288, "SEPARATOR": 289, "=": 290, "String": 291, "LANGTAG": 292, "^^": 293, "DECIMAL": 294, "DOUBLE": 295, "BOOLEAN": 296, "INTEGER_POSITIVE": 297, "DECIMAL_POSITIVE": 298, "DOUBLE_POSITIVE": 299, "INTEGER_NEGATIVE": 300, "DECIMAL_NEGATIVE": 301, "DOUBLE_NEGATIVE": 302, "STRING_LITERAL1": 303, "STRING_LITERAL2": 304, "STRING_LITERAL_LONG1": 305, "STRING_LITERAL_LONG2": 306, "PrefixedName": 307, "PNAME_LN": 308, "BLANK_NODE_LABEL": 309, "ANON": 310, "QuotedTP": 311, "<<": 312, "qtSubjectOrObject": 313, ">>": 314, "DataValueTerm": 315, "AnnotationPattern": 316, "{|": 317, "|}": 318, "AnnotationPatternPath": 319, "ExprVarOrTerm": 320, "QueryOrUpdate_group0_option0": 321, "Prologue_repetition0_group0": 322, "Qry_group0_repetition_plus0": 323, "SelectClauseBase_option0_group0": 324, "DISTINCT": 325, "REDUCED": 326, "NAMED": 327, "SILENT": 328, "CLEAR": 329, "DROP": 330, "ADD": 331, "MOVE": 332, "COPY": 333, "ALL": 334, ".": 335, "UNION": 336, "|": 337, "/": 338, "PathElt_option0_group0": 339, "?": 340, "!=": 341, "<": 342, ">": 343, "<=": 344, ">=": 345, "NOT": 346, "CONCAT": 347, "COALESCE": 348, "SUBSTR": 349, "REGEX": 350, "REPLACE": 351, "$accept": 0, "$end": 1 },
      terminals_: { 2: "error", 6: "EOF", 12: "BASE", 13: "IRIREF", 15: "PREFIX", 16: "PNAME_NS", 24: "CONSTRUCT", 28: "WHERE", 29: "{", 31: "}", 32: "DESCRIBE", 36: "ASK", 39: "*", 41: "SELECT", 45: "(", 47: "AS", 48: ")", 53: "FROM", 63: "GROUP", 64: "BY", 70: "HAVING", 73: "ORDER", 76: "ASC", 78: "DESC", 81: "LIMIT", 82: "INTEGER", 83: "OFFSET", 85: "VALUES", 87: "VAR", 89: "NIL", 100: "LOAD", 109: "TO", 110: "CREATE", 112: "GRAPH", 113: "INSERTDATA", 115: "DELETEDATA", 116: "DELETEWHERE", 121: "INTO", 123: "DELETE", 126: "INSERT", 128: "USING", 131: "WITH", 132: "DEFAULT", 159: "OPTIONAL", 160: "MINUS", 161: "SERVICE", 163: "FILTER", 164: "BIND", 174: "UNDEF", 193: ";", 197: "a", 224: "!", 229: "^", 231: "[", 232: "]", 242: "||", 246: "&&", 250: "IN", 263: "+", 265: "-", 268: "FUNC_ARITY0", 269: "FUNC_ARITY1", 270: "FUNC_ARITY1_SPARQL_STAR", 271: "FUNC_ARITY2", 272: ",", 273: "FUNC_ARITY3", 274: "FUNC_ARITY3_SPARQL_STAR", 276: "BOUND", 277: "BNODE", 279: "EXISTS", 280: "COUNT", 283: "FUNC_AGGREGATE", 285: "GROUP_CONCAT", 289: "SEPARATOR", 290: "=", 292: "LANGTAG", 293: "^^", 294: "DECIMAL", 295: "DOUBLE", 296: "BOOLEAN", 297: "INTEGER_POSITIVE", 298: "DECIMAL_POSITIVE", 299: "DOUBLE_POSITIVE", 300: "INTEGER_NEGATIVE", 301: "DECIMAL_NEGATIVE", 302: "DOUBLE_NEGATIVE", 303: "STRING_LITERAL1", 304: "STRING_LITERAL2", 305: "STRING_LITERAL_LONG1", 306: "STRING_LITERAL_LONG2", 308: "PNAME_LN", 309: "BLANK_NODE_LABEL", 310: "ANON", 312: "<<", 314: ">>", 317: "{|", 318: "|}", 325: "DISTINCT", 326: "REDUCED", 327: "NAMED", 328: "SILENT", 329: "CLEAR", 330: "DROP", 331: "ADD", 332: "MOVE", 333: "COPY", 334: "ALL", 335: ".", 336: "UNION", 337: "|", 338: "/", 340: "?", 341: "!=", 342: "<", 343: ">", 344: "<=", 345: ">=", 346: "NOT", 347: "CONCAT", 348: "COALESCE", 349: "SUBSTR", 350: "REGEX", 351: "REPLACE" },
      productions_: [0, [3, 3], [7, 2], [4, 1], [11, 2], [14, 3], [8, 4], [8, 4], [8, 5], [8, 7], [8, 5], [8, 4], [17, 2], [21, 2], [38, 2], [43, 1], [43, 5], [49, 4], [49, 4], [52, 3], [19, 2], [23, 2], [20, 3], [62, 3], [66, 1], [66, 1], [66, 3], [66, 5], [66, 1], [69, 2], [72, 3], [75, 2], [75, 2], [75, 1], [75, 1], [80, 2], [80, 2], [80, 4], [80, 4], [84, 2], [86, 4], [86, 4], [86, 6], [86, 2], [94, 3], [96, 3], [98, 4], [98, 3], [98, 5], [98, 4], [98, 2], [98, 2], [98, 2], [98, 5], [120, 2], [118, 3], [118, 1], [125, 2], [127, 3], [130, 2], [108, 1], [108, 2], [122, 2], [105, 1], [105, 1], [114, 3], [135, 2], [138, 7], [143, 3], [57, 3], [57, 3], [147, 2], [150, 3], [154, 3], [151, 1], [151, 2], [151, 2], [151, 3], [151, 4], [151, 2], [151, 6], [151, 1], [93, 1], [93, 1], [165, 4], [166, 4], [166, 6], [171, 1], [171, 1], [171, 1], [171, 1], [158, 2], [79, 1], [79, 1], [79, 1], [68, 2], [176, 1], [176, 5], [179, 1], [179, 4], [25, 3], [182, 3], [145, 2], [145, 2], [188, 1], [186, 2], [192, 2], [190, 2], [195, 1], [195, 1], [196, 2], [199, 2], [156, 2], [156, 2], [202, 2], [207, 1], [207, 2], [205, 2], [209, 2], [211, 2], [214, 2], [216, 2], [219, 2], [218, 2], [220, 1], [220, 2], [220, 3], [225, 1], [225, 1], [225, 4], [226, 1], [226, 2], [187, 3], [187, 3], [203, 3], [203, 3], [200, 1], [200, 1], [212, 1], [212, 1], [234, 1], [235, 1], [235, 1], [139, 1], [139, 1], [44, 1], [236, 1], [236, 1], [236, 1], [236, 1], [46, 1], [238, 2], [241, 2], [239, 2], [245, 2], [243, 1], [243, 3], [243, 4], [247, 2], [253, 2], [253, 2], [253, 2], [251, 2], [261, 2], [259, 2], [259, 2], [259, 2], [259, 1], [264, 1], [264, 1], [264, 1], [264, 1], [264, 1], [264, 1], [264, 1], [77, 3], [67, 1], [67, 2], [67, 4], [67, 4], [67, 6], [67, 8], [67, 8], [67, 2], [67, 4], [67, 2], [67, 4], [67, 3], [267, 5], [267, 5], [267, 6], [288, 4], [172, 1], [172, 2], [172, 3], [172, 1], [172, 1], [172, 1], [172, 1], [172, 1], [172, 1], [255, 1], [255, 1], [255, 1], [257, 1], [257, 1], [257, 1], [291, 1], [291, 1], [291, 1], [291, 1], [55, 1], [55, 1], [307, 1], [307, 1], [237, 1], [237, 1], [311, 5], [173, 5], [313, 1], [313, 1], [313, 1], [313, 1], [313, 1], [315, 1], [315, 1], [315, 1], [185, 1], [185, 1], [185, 1], [316, 3], [319, 3], [266, 5], [320, 1], [320, 1], [320, 1], [223, 1], [223, 1], [321, 0], [321, 1], [5, 1], [5, 1], [5, 1], [9, 0], [9, 1], [322, 1], [322, 1], [10, 0], [10, 2], [18, 0], [18, 2], [22, 0], [22, 2], [26, 0], [26, 2], [27, 0], [27, 2], [30, 0], [30, 1], [323, 1], [323, 2], [33, 1], [33, 1], [34, 0], [34, 2], [35, 0], [35, 1], [37, 0], [37, 2], [40, 1], [40, 2], [324, 1], [324, 1], [42, 0], [42, 1], [50, 0], [50, 1], [51, 0], [51, 1], [54, 0], [54, 1], [56, 0], [56, 1], [58, 0], [58, 1], [59, 0], [59, 1], [60, 0], [60, 1], [61, 0], [61, 1], [65, 1], [65, 2], [71, 1], [71, 2], [74, 1], [74, 2], [88, 0], [88, 2], [90, 0], [90, 2], [91, 1], [91, 2], [92, 0], [92, 2], [95, 1], [95, 2], [97, 0], [97, 4], [99, 0], [99, 2], [101, 0], [101, 1], [102, 0], [102, 1], [103, 1], [103, 1], [104, 0], [104, 1], [106, 1], [106, 1], [106, 1], [107, 0], [107, 1], [111, 0], [111, 1], [117, 0], [117, 1], [119, 0], [119, 2], [124, 0], [124, 1], [129, 0], [129, 1], [133, 0], [133, 1], [134, 1], [134, 1], [134, 1], [136, 0], [136, 1], [137, 0], [137, 2], [140, 0], [140, 1], [141, 0], [141, 1], [142, 0], [142, 1], [144, 0], [144, 3], [146, 0], [146, 1], [148, 0], [148, 1], [149, 0], [149, 2], [152, 0], [152, 1], [153, 0], [153, 1], [155, 0], [155, 3], [157, 0], [157, 1], [162, 0], [162, 1], [167, 0], [167, 2], [168, 0], [168, 2], [169, 1], [169, 2], [170, 0], [170, 2], [175, 0], [175, 3], [177, 0], [177, 1], [178, 0], [178, 3], [180, 0], [180, 3], [181, 0], [181, 1], [183, 0], [183, 3], [184, 0], [184, 1], [189, 0], [189, 1], [191, 0], [191, 2], [194, 0], [194, 1], [198, 0], [198, 3], [201, 0], [201, 1], [204, 0], [204, 1], [206, 0], [206, 2], [208, 1], [208, 1], [210, 0], [210, 3], [213, 0], [213, 1], [215, 0], [215, 3], [217, 0], [217, 3], [339, 1], [339, 1], [339, 1], [221, 0], [221, 1], [222, 0], [222, 1], [227, 0], [227, 3], [228, 0], [228, 1], [230, 1], [230, 2], [233, 1], [233, 2], [240, 0], [240, 2], [244, 0], [244, 2], [248, 1], [248, 1], [248, 1], [248, 1], [248, 1], [248, 1], [249, 0], [249, 1], [252, 0], [252, 2], [254, 1], [254, 1], [256, 0], [256, 2], [258, 0], [258, 2], [260, 0], [260, 2], [262, 1], [262, 1], [275, 1], [275, 1], [275, 1], [275, 1], [275, 1], [278, 0], [278, 1], [281, 0], [281, 1], [282, 1], [282, 1], [284, 0], [284, 1], [286, 0], [286, 1], [287, 0], [287, 1]],
      performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$) {
        var $0 = $$.length - 1;
        switch (yystate) {
          case 1:
            $$[$0 - 1] = $$[$0 - 1] || {};
            if (Parser2.base)
              $$[$0 - 1].base = Parser2.base;
            Parser2.base = "";
            $$[$0 - 1].prefixes = Parser2.prefixes;
            Parser2.prefixes = null;
            if (Parser2.pathOnly) {
              if ($$[$0 - 1].type === "path" || "termType" in $$[$0 - 1]) {
                return $$[$0 - 1];
              }
              throw new Error("Received full SPARQL query in path only mode");
            } else if ($$[$0 - 1].type === "path" || "termType" in $$[$0 - 1]) {
              throw new Error("Received only path in full SPARQL mode");
            }
            if ($$[$0 - 1].type === "update") {
              const insertBnodesAll = {};
              for (const update2 of $$[$0 - 1].updates) {
                if (update2.updateType === "insert") {
                  const insertBnodes = {};
                  for (const operation2 of update2.insert) {
                    if (operation2.type === "bgp" || operation2.type === "graph") {
                      for (const triple2 of operation2.triples) {
                        if (triple2.subject.termType === "BlankNode")
                          insertBnodes[triple2.subject.value] = true;
                        if (triple2.predicate.termType === "BlankNode")
                          insertBnodes[triple2.predicate.value] = true;
                        if (triple2.object.termType === "BlankNode")
                          insertBnodes[triple2.object.value] = true;
                      }
                    }
                  }
                  for (const bnode2 of Object.keys(insertBnodes)) {
                    if (insertBnodesAll[bnode2]) {
                      throw new Error("Detected reuse blank node across different INSERT DATA clauses");
                    }
                    insertBnodesAll[bnode2] = true;
                  }
                }
              }
            }
            return $$[$0 - 1];
          case 2:
            this.$ = { ...$$[$0 - 1], ...$$[$0], type: "query" };
            break;
          case 4:
            Parser2.base = resolveIRI($$[$0]);
            break;
          case 5:
            if (!Parser2.prefixes) Parser2.prefixes = {};
            $$[$0 - 1] = $$[$0 - 1].substr(0, $$[$0 - 1].length - 1);
            $$[$0] = resolveIRI($$[$0]);
            Parser2.prefixes[$$[$0 - 1]] = $$[$0];
            break;
          case 6:
            this.$ = { ...$$[$0 - 3], ...groupDatasets($$[$0 - 2]), ...$$[$0 - 1], ...$$[$0] };
            break;
          case 7:
            if (!Parser2.skipValidation) {
              const counts = flatten2($$[$0 - 3].variables.map((vars) => getAggregatesOfExpression2(vars.expression))).some((agg) => agg.aggregation === "count" && !(agg.expression instanceof Wildcard2));
              if (counts || $$[$0].group) {
                for (const selectVar of $$[$0 - 3].variables) {
                  if (selectVar.termType === "Variable") {
                    if (!$$[$0].group || !$$[$0].group.map((groupVar) => getExpressionId2(groupVar)).includes(getExpressionId2(selectVar))) {
                      throw Error("Projection of ungrouped variable (?" + getExpressionId2(selectVar) + ")");
                    }
                  } else if (getAggregatesOfExpression2(selectVar.expression).length === 0) {
                    const usedVars = getVariablesFromExpression2(selectVar.expression);
                    for (const usedVar of usedVars) {
                      if (!$$[$0].group || !$$[$0].group.map || !$$[$0].group.map((groupVar) => getExpressionId2(groupVar)).includes(getExpressionId2(usedVar))) {
                        throw Error("Use of ungrouped variable in projection of operation (?" + getExpressionId2(usedVar) + ")");
                      }
                    }
                  }
                }
              }
            }
            const subqueries = $$[$0 - 1].where.filter((w) => w.type === "query");
            if (subqueries.length > 0) {
              const selectedVarIds2 = $$[$0 - 3].variables.filter((v) => v.variable && v.variable.value).map((v) => v.variable.value);
              const subqueryIds = flatten2(subqueries.map((sub) => sub.variables)).map((v) => v.value || v.variable.value);
              for (const selectedVarId of selectedVarIds2) {
                if (subqueryIds.indexOf(selectedVarId) >= 0) {
                  throw Error("Target id of 'AS' (?" + selectedVarId + ") already used in subquery");
                }
              }
            }
            this.$ = extend($$[$0 - 3], groupDatasets($$[$0 - 2]), $$[$0 - 1], $$[$0]);
            break;
          case 8:
            this.$ = extend({ queryType: "CONSTRUCT", template: $$[$0 - 3] }, groupDatasets($$[$0 - 2]), $$[$0 - 1], $$[$0]);
            break;
          case 9:
            this.$ = extend({ queryType: "CONSTRUCT", template: $$[$0 - 2] = $$[$0 - 2] ? $$[$0 - 2].triples : [] }, groupDatasets($$[$0 - 5]), { where: [{ type: "bgp", triples: appendAllTo([], $$[$0 - 2]) }] }, $$[$0]);
            break;
          case 10:
            this.$ = extend({ queryType: "DESCRIBE", variables: $$[$0 - 3] === "*" ? [new Wildcard2()] : $$[$0 - 3] }, groupDatasets($$[$0 - 2]), $$[$0 - 1], $$[$0]);
            break;
          case 11:
            this.$ = extend({ queryType: "ASK" }, groupDatasets($$[$0 - 2]), $$[$0 - 1], $$[$0]);
            break;
          case 12:
            this.$ = extend($$[$0 - 1], { variables: [new Wildcard2()] });
            break;
          case 13:
            const selectedVarIds = $$[$0].map((v) => v.value || v.variable.value);
            const duplicates = getDuplicatesInArray(selectedVarIds);
            if (duplicates.length > 0) {
              throw Error("Two or more of the resulting columns have the same name (?" + duplicates[0] + ")");
            }
            this.$ = extend($$[$0 - 1], { variables: $$[$0] });
            break;
          case 14:
            this.$ = extend({ queryType: "SELECT" }, $$[$0] && ($$[$0 - 1] = lowercase($$[$0]), $$[$0] = {}, $$[$0][$$[$0 - 1]] = true, $$[$0]));
            break;
          case 16:
          case 27:
            this.$ = expression2($$[$0 - 3], { variable: $$[$0 - 1] });
            break;
          case 17:
          case 18:
            this.$ = extend($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], { type: "query" });
            break;
          case 19:
          case 58:
            this.$ = { iri: $$[$0], named: !!$$[$0 - 1] };
            break;
          case 20:
            this.$ = { where: $$[$0].patterns };
            break;
          case 21:
            this.$ = extend($$[$0 - 1], $$[$0]);
            break;
          case 22:
            this.$ = extend($$[$0 - 2], $$[$0 - 1], $$[$0]);
            break;
          case 23:
            this.$ = { group: $$[$0] };
            break;
          case 24:
          case 25:
          case 28:
          case 31:
          case 33:
          case 34:
            this.$ = expression2($$[$0]);
            break;
          case 26:
            this.$ = expression2($$[$0 - 1]);
            break;
          case 29:
            this.$ = { having: $$[$0] };
            break;
          case 30:
            this.$ = { order: $$[$0] };
            break;
          case 32:
            this.$ = expression2($$[$0], { descending: true });
            break;
          case 35:
            this.$ = { limit: toInt($$[$0]) };
            break;
          case 36:
            this.$ = { offset: toInt($$[$0]) };
            break;
          case 37:
            this.$ = { limit: toInt($$[$0 - 2]), offset: toInt($$[$0]) };
            break;
          case 38:
            this.$ = { limit: toInt($$[$0]), offset: toInt($$[$0 - 2]) };
            break;
          case 39:
          case 43:
            this.$ = { type: "values", values: $$[$0] };
            break;
          case 40:
          case 84:
            this.$ = $$[$0 - 1].map((v) => ({ [$$[$0 - 3]]: v }));
            break;
          case 41:
          case 85:
            this.$ = $$[$0 - 1].map(() => ({}));
            break;
          case 42:
          case 86:
            var length = $$[$0 - 4].length;
            $$[$0 - 4] = $$[$0 - 4].map(toVar);
            this.$ = $$[$0 - 1].map(function(values2) {
              if (values2.length !== length)
                throw Error("Inconsistent VALUES length");
              var valuesObject = {};
              for (var i = 0; i < length; i++)
                valuesObject["?" + $$[$0 - 4][i].value] = values2[i];
              return valuesObject;
            });
            break;
          case 44:
          case 65:
          case 100:
          case 126:
          case 175:
            this.$ = $$[$0 - 1];
            break;
          case 45:
            this.$ = { type: "update", updates: appendTo($$[$0 - 2], $$[$0 - 1]) };
            break;
          case 46:
            this.$ = extend({ type: "load", silent: !!$$[$0 - 2], source: $$[$0 - 1] }, $$[$0] && { destination: $$[$0] });
            break;
          case 47:
            this.$ = { type: lowercase($$[$0 - 2]), silent: !!$$[$0 - 1], graph: $$[$0] };
            break;
          case 48:
            this.$ = { type: lowercase($$[$0 - 4]), silent: !!$$[$0 - 3], source: $$[$0 - 2], destination: $$[$0] };
            break;
          case 49:
            this.$ = { type: "create", silent: !!$$[$0 - 2], graph: { type: "graph", name: $$[$0] } };
            break;
          case 50:
            this.$ = { updateType: "insert", insert: ensureNoVariables($$[$0]) };
            break;
          case 51:
            this.$ = { updateType: "delete", delete: ensureNoBnodes(ensureNoVariables($$[$0])) };
            break;
          case 52:
            this.$ = { updateType: "deletewhere", delete: ensureNoBnodes($$[$0]) };
            break;
          case 53:
            this.$ = { updateType: "insertdelete", ...$$[$0 - 4], ...$$[$0 - 3], ...groupDatasets($$[$0 - 2], "using"), where: $$[$0].patterns };
            break;
          case 54:
          case 57:
          case 62:
          case 167:
          case 191:
          case 236:
            this.$ = $$[$0];
            break;
          case 55:
            this.$ = { delete: ensureNoBnodes($$[$0 - 1]), insert: $$[$0] || [] };
            break;
          case 56:
            this.$ = { delete: [], insert: $$[$0] };
            break;
          case 59:
            this.$ = { graph: $$[$0] };
            break;
          case 60:
            this.$ = { type: "graph", default: true };
            break;
          case 61:
          case 63:
            this.$ = { type: "graph", name: $$[$0] };
            break;
          case 64:
            this.$ = { [lowercase($$[$0])]: true };
            break;
          case 66:
            this.$ = $$[$0 - 1] ? unionAll($$[$0], [$$[$0 - 1]]) : unionAll($$[$0]);
            break;
          case 67:
            var graph2 = extend($$[$0 - 3] || { triples: [] }, { type: "graph", name: $$[$0 - 5] });
            this.$ = $$[$0] ? [graph2, $$[$0]] : [graph2];
            break;
          case 68:
          case 73:
            this.$ = { type: "bgp", triples: unionAll($$[$0 - 2], [$$[$0 - 1]]) };
            break;
          case 69:
            this.$ = { type: "group", patterns: [$$[$0 - 1]] };
            break;
          case 70:
            for (const binding of $$[$0 - 1].filter((el) => el.type === "bind")) {
              const index = $$[$0 - 1].indexOf(binding);
              const boundVars = /* @__PURE__ */ new Set();
              for (const el of $$[$0 - 1].slice(0, index)) {
                if (el.type === "group" || el.type === "bgp") {
                  getBoundVarsFromGroupGraphPattern(el).forEach((boundVar) => boundVars.add(boundVar));
                }
              }
              if (boundVars.has(binding.variable.value)) {
                throw Error("Variable used to bind is already bound (?" + binding.variable.value + ")");
              }
            }
            this.$ = { type: "group", patterns: $$[$0 - 1] };
            break;
          case 71:
            this.$ = $$[$0 - 1] ? unionAll([$$[$0 - 1]], $$[$0]) : unionAll($$[$0]);
            break;
          case 72:
            this.$ = $$[$0] ? [$$[$0 - 2], $$[$0]] : $$[$0 - 2];
            break;
          case 75:
            this.$ = extend($$[$0], { type: "optional" });
            break;
          case 76:
            this.$ = extend($$[$0], { type: "minus" });
            break;
          case 77:
            this.$ = extend($$[$0], { type: "graph", name: $$[$0 - 1] });
            break;
          case 78:
            this.$ = extend($$[$0], { type: "service", name: $$[$0 - 1], silent: !!$$[$0 - 2] });
            break;
          case 79:
            this.$ = { type: "filter", expression: $$[$0] };
            break;
          case 80:
            this.$ = { type: "bind", variable: $$[$0 - 1], expression: $$[$0 - 3] };
            break;
          case 89:
            this.$ = ensureSparqlStar($$[$0]);
            break;
          case 90:
            this.$ = void 0;
            break;
          case 91:
            this.$ = $$[$0 - 1].length ? { type: "union", patterns: unionAll($$[$0 - 1].map(degroupSingle), [degroupSingle($$[$0])]) } : $$[$0];
            break;
          case 95:
            this.$ = { ...$$[$0], function: $$[$0 - 1] };
            break;
          case 96:
            this.$ = { type: "functionCall", args: [] };
            break;
          case 97:
            this.$ = { type: "functionCall", args: appendTo($$[$0 - 2], $$[$0 - 1]), distinct: !!$$[$0 - 3] };
            break;
          case 98:
          case 115:
          case 128:
          case 247:
          case 249:
          case 251:
          case 253:
          case 255:
          case 263:
          case 267:
          case 297:
          case 299:
          case 303:
          case 307:
          case 328:
          case 341:
          case 349:
          case 355:
          case 361:
          case 367:
          case 369:
          case 373:
          case 375:
          case 379:
          case 381:
          case 385:
          case 391:
          case 395:
          case 401:
          case 405:
          case 409:
          case 411:
          case 420:
          case 428:
          case 430:
          case 440:
          case 444:
          case 446:
          case 448:
            this.$ = [];
            break;
          case 99:
            this.$ = appendTo($$[$0 - 2], $$[$0 - 1]);
            break;
          case 101:
            this.$ = unionAll($$[$0 - 2], [$$[$0 - 1]]);
            break;
          case 102:
          case 112:
            this.$ = applyAnnotations($$[$0].map((t) => extend(triple($$[$0 - 1]), t)));
            break;
          case 103:
            this.$ = applyAnnotations(appendAllTo($$[$0].map((t) => extend(triple($$[$0 - 1].entity), t)), $$[$0 - 1].triples));
            break;
          case 105:
            this.$ = unionAll([$$[$0 - 1]], $$[$0]);
            break;
          case 106:
            this.$ = unionAll($$[$0]);
            break;
          case 107:
            this.$ = objectListToTriples($$[$0 - 1], $$[$0]);
            break;
          case 109:
          case 237:
            this.$ = Parser2.factory.namedNode(RDF_TYPE);
            break;
          case 110:
          case 118:
            this.$ = appendTo($$[$0 - 1], $$[$0]);
            break;
          case 111:
            this.$ = $$[$0] ? { annotation: $$[$0], object: $$[$0 - 1] } : $$[$0 - 1];
            break;
          case 113:
            this.$ = !$$[$0] ? $$[$0 - 1].triples : applyAnnotations(appendAllTo($$[$0].map((t) => extend(triple($$[$0 - 1].entity), t)), $$[$0 - 1].triples));
            break;
          case 114:
            this.$ = objectListToTriples(...$$[$0 - 1], $$[$0]);
            break;
          case 116:
            this.$ = objectListToTriples(...$$[$0]);
            break;
          case 117:
          case 159:
          case 163:
            this.$ = [$$[$0 - 1], $$[$0]];
            break;
          case 119:
            this.$ = $$[$0] ? { object: $$[$0 - 1], annotation: $$[$0] } : $$[$0 - 1];
            break;
          case 120:
            this.$ = $$[$0 - 1].length ? path2("|", appendTo($$[$0 - 1], $$[$0])) : $$[$0];
            break;
          case 121:
            this.$ = $$[$0 - 1].length ? path2("/", appendTo($$[$0 - 1], $$[$0])) : $$[$0];
            break;
          case 122:
            this.$ = $$[$0] ? path2($$[$0], [$$[$0 - 1]]) : $$[$0 - 1];
            break;
          case 123:
            this.$ = $$[$0 - 1] ? path2($$[$0 - 1], [$$[$0]]) : $$[$0];
            break;
          case 125:
          case 131:
            this.$ = path2($$[$0 - 1], [$$[$0]]);
            break;
          case 129:
            this.$ = path2("|", appendTo($$[$0 - 2], $$[$0 - 1]));
            break;
          case 132:
          case 134:
            this.$ = createList($$[$0 - 1]);
            break;
          case 133:
          case 135:
            this.$ = createAnonymousObject($$[$0 - 1]);
            break;
          case 140:
            this.$ = { entity: $$[$0], triples: [] };
            break;
          case 145:
            this.$ = toVar($$[$0]);
            break;
          case 149:
            this.$ = Parser2.factory.namedNode(RDF_NIL);
            break;
          case 151:
          case 153:
          case 158:
          case 162:
            this.$ = createOperationTree($$[$0 - 1], $$[$0]);
            break;
          case 152:
            this.$ = ["||", $$[$0]];
            break;
          case 154:
            this.$ = ["&&", $$[$0]];
            break;
          case 156:
            this.$ = operation($$[$0 - 1], [$$[$0 - 2], $$[$0]]);
            break;
          case 157:
            this.$ = operation($$[$0 - 2] ? "notin" : "in", [$$[$0 - 3], $$[$0]]);
            break;
          case 160:
            this.$ = ["+", createOperationTree($$[$0 - 1], $$[$0])];
            break;
          case 161:
            var negatedLiteral = createTypedLiteral($$[$0 - 1].value.replace("-", ""), $$[$0 - 1].datatype);
            this.$ = ["-", createOperationTree(negatedLiteral, $$[$0])];
            break;
          case 164:
            this.$ = operation("UPLUS", [$$[$0]]);
            break;
          case 165:
            this.$ = operation($$[$0 - 1], [$$[$0]]);
            break;
          case 166:
            this.$ = operation("UMINUS", [$$[$0]]);
            break;
          case 177:
            this.$ = operation(lowercase($$[$0 - 1]));
            break;
          case 178:
            this.$ = operation(lowercase($$[$0 - 3]), [$$[$0 - 1]]);
            break;
          case 179:
            this.$ = ensureSparqlStar(operation(lowercase($$[$0 - 3]), [$$[$0 - 1]]));
            break;
          case 180:
            this.$ = operation(lowercase($$[$0 - 5]), [$$[$0 - 3], $$[$0 - 1]]);
            break;
          case 181:
            this.$ = operation(lowercase($$[$0 - 7]), [$$[$0 - 5], $$[$0 - 3], $$[$0 - 1]]);
            break;
          case 182:
            this.$ = ensureSparqlStar(operation(lowercase($$[$0 - 7]), [$$[$0 - 5], $$[$0 - 3], $$[$0 - 1]]));
            break;
          case 183:
            this.$ = operation(lowercase($$[$0 - 1]), $$[$0]);
            break;
          case 184:
            this.$ = operation("bound", [toVar($$[$0 - 1])]);
            break;
          case 185:
            this.$ = operation($$[$0 - 1], []);
            break;
          case 186:
            this.$ = operation($$[$0 - 3], [$$[$0 - 1]]);
            break;
          case 187:
            this.$ = operation($$[$0 - 2] ? "notexists" : "exists", [degroupSingle($$[$0])]);
            break;
          case 188:
          case 189:
            this.$ = expression2($$[$0 - 1], { type: "aggregate", aggregation: lowercase($$[$0 - 4]), distinct: !!$$[$0 - 2] });
            break;
          case 190:
            this.$ = expression2($$[$0 - 2], { type: "aggregate", aggregation: lowercase($$[$0 - 5]), distinct: !!$$[$0 - 3], separator: typeof $$[$0 - 1] === "string" ? $$[$0 - 1] : " " });
            break;
          case 192:
            this.$ = createTypedLiteral($$[$0]);
            break;
          case 193:
            this.$ = createLangLiteral($$[$0 - 1], lowercase($$[$0].substr(1)));
            break;
          case 194:
            this.$ = createTypedLiteral($$[$0 - 2], $$[$0]);
            break;
          case 195:
          case 204:
            this.$ = createTypedLiteral($$[$0], XSD_INTEGER);
            break;
          case 196:
          case 205:
            this.$ = createTypedLiteral($$[$0], XSD_DECIMAL);
            break;
          case 197:
          case 206:
            this.$ = createTypedLiteral(lowercase($$[$0]), XSD_DOUBLE);
            break;
          case 200:
            this.$ = createTypedLiteral($$[$0].toLowerCase(), XSD_BOOLEAN);
            break;
          case 201:
            this.$ = createTypedLiteral($$[$0].substr(1), XSD_INTEGER);
            break;
          case 202:
            this.$ = createTypedLiteral($$[$0].substr(1), XSD_DECIMAL);
            break;
          case 203:
            this.$ = createTypedLiteral($$[$0].substr(1).toLowerCase(), XSD_DOUBLE);
            break;
          case 207:
          case 208:
            this.$ = unescapeString($$[$0], 1);
            break;
          case 209:
          case 210:
            this.$ = unescapeString($$[$0], 3);
            break;
          case 211:
            this.$ = Parser2.factory.namedNode(resolveIRI($$[$0]));
            break;
          case 213:
            var namePos = $$[$0].indexOf(":"), prefix = $$[$0].substr(0, namePos), expansion = Parser2.prefixes[prefix];
            if (!expansion) throw new Error("Unknown prefix: " + prefix);
            var uriString = resolveIRI(expansion + $$[$0].substr(namePos + 1));
            this.$ = Parser2.factory.namedNode(uriString);
            break;
          case 214:
            $$[$0] = $$[$0].substr(0, $$[$0].length - 1);
            if (!($$[$0] in Parser2.prefixes)) throw new Error("Unknown prefix: " + $$[$0]);
            var uriString = resolveIRI(Parser2.prefixes[$$[$0]]);
            this.$ = Parser2.factory.namedNode(uriString);
            break;
          case 215:
            this.$ = blank($$[$0].replace(/^(_:)/, ""));
            break;
          case 216:
            this.$ = blank();
            break;
          case 217:
          case 218:
          case 232:
            this.$ = ensureSparqlStar(nestedTriple($$[$0 - 3], $$[$0 - 2], $$[$0 - 1]));
            break;
          case 230:
          case 231:
            this.$ = ensureSparqlStar($$[$0 - 1]);
            break;
          case 248:
          case 250:
          case 252:
          case 254:
          case 256:
          case 260:
          case 264:
          case 268:
          case 270:
          case 292:
          case 294:
          case 296:
          case 298:
          case 300:
          case 302:
          case 304:
          case 306:
          case 329:
          case 342:
          case 356:
          case 368:
          case 370:
          case 372:
          case 374:
          case 392:
          case 402:
          case 425:
          case 427:
          case 429:
          case 431:
          case 441:
          case 445:
          case 447:
          case 449:
            $$[$0 - 1].push($$[$0]);
            break;
          case 259:
          case 269:
          case 291:
          case 293:
          case 295:
          case 301:
          case 305:
          case 371:
          case 424:
          case 426:
            this.$ = [$$[$0]];
            break;
          case 308:
            $$[$0 - 3].push($$[$0 - 2]);
            break;
          case 350:
          case 362:
          case 376:
          case 380:
          case 382:
          case 386:
          case 396:
          case 406:
          case 410:
          case 412:
          case 421:
            $$[$0 - 2].push($$[$0 - 1]);
            break;
        }
      },
      table: [o($V0, $V1, { 3: 1, 4: 2, 10: 3 }), { 1: [3] }, o($V2, [2, 307], { 5: 4, 7: 5, 321: 6, 214: 7, 8: 8, 96: 9, 215: 10, 17: 11, 21: 12, 97: 16, 38: 17, 6: [2, 238], 13: $V3, 16: $V3, 45: $V3, 197: $V3, 224: $V3, 229: $V3, 308: $V3, 24: [1, 13], 32: [1, 14], 36: [1, 15], 41: $V4 }), o([6, 13, 16, 24, 32, 36, 41, 45, 100, 110, 113, 115, 116, 123, 126, 131, 197, 224, 229, 308, 329, 330, 331, 332, 333], [2, 3], { 322: 19, 11: 20, 14: 21, 12: [1, 22], 15: [1, 23] }), { 6: [1, 24] }, { 6: [2, 240] }, { 6: [2, 241] }, { 6: [2, 242] }, { 6: [2, 243], 9: 25, 84: 26, 85: $V5 }, { 6: [2, 239] }, o($V6, [2, 411], { 216: 28, 217: 29 }), o($V7, [2, 249], { 18: 30 }), o($V7, [2, 251], { 22: 31 }), o($V8, [2, 255], { 25: 32, 27: 33, 29: [1, 34] }), { 13: $V9, 16: $Va, 33: 35, 39: [1, 37], 44: 39, 55: 40, 87: $Vb, 139: 38, 307: 43, 308: $Vc, 323: 36 }, o($V7, [2, 267], { 37: 46 }), o($Vd, [2, 326], { 98: 47, 103: 49, 106: 50, 117: 55, 130: 61, 100: [1, 48], 110: [1, 51], 113: [1, 52], 115: [1, 53], 116: [1, 54], 131: [1, 62], 329: [1, 56], 330: [1, 57], 331: [1, 58], 332: [1, 59], 333: [1, 60] }), { 39: [1, 63], 40: 64, 43: 65, 44: 66, 45: $Ve, 87: $Vb }, o($Vf, [2, 273], { 42: 68, 324: 69, 325: [1, 70], 326: [1, 71] }), o($V0, [2, 248]), o($V0, [2, 245]), o($V0, [2, 246]), { 13: [1, 72] }, { 16: [1, 73] }, { 1: [2, 1] }, { 6: [2, 2] }, { 6: [2, 244] }, { 45: [1, 77], 85: [1, 78], 86: 74, 87: [1, 75], 89: [1, 76] }, o([6, 13, 16, 45, 48, 82, 87, 89, 231, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312], [2, 120], { 337: [1, 79] }), o($Vg, [2, 418], { 218: 80, 222: 81, 229: [1, 82] }), { 19: 83, 28: $Vh, 29: $Vi, 52: 84, 53: $Vj, 56: 85 }, { 19: 88, 28: $Vh, 29: $Vi, 52: 89, 53: $Vj, 56: 85 }, o($V7, [2, 253], { 26: 90 }), { 28: [1, 91], 52: 92, 53: $Vj }, o($Vk, [2, 385], { 181: 93, 182: 94, 183: 95, 31: [2, 383] }), o($Vl, [2, 263], { 34: 96 }), o($Vl, [2, 261], { 44: 39, 55: 40, 307: 43, 139: 97, 13: $V9, 16: $Va, 87: $Vb, 308: $Vc }), o($Vl, [2, 262]), o($Vm, [2, 259]), o($Vn, [2, 143]), o($Vn, [2, 144]), o([6, 13, 16, 28, 29, 31, 39, 45, 47, 48, 53, 63, 70, 73, 76, 78, 81, 82, 83, 85, 87, 89, 112, 159, 160, 161, 163, 164, 193, 197, 224, 229, 231, 232, 242, 246, 250, 263, 265, 268, 269, 270, 271, 272, 273, 274, 276, 277, 279, 280, 283, 285, 290, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 314, 317, 318, 335, 338, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351], [2, 145]), o($Vo, [2, 211]), o($Vo, [2, 212]), o($Vo, [2, 213]), o($Vo, [2, 214]), { 19: 98, 28: $Vh, 29: $Vi, 52: 99, 53: $Vj, 56: 85 }, { 6: [2, 309], 99: 100, 193: [1, 101] }, o($Vp, [2, 311], { 101: 102, 328: [1, 103] }), o($Vq, [2, 317], { 104: 104, 328: [1, 105] }), o($Vr, [2, 322], { 107: 106, 328: [1, 107] }), { 111: 108, 112: [2, 324], 328: [1, 109] }, { 29: $Vs, 114: 110 }, { 29: $Vs, 114: 112 }, { 29: $Vs, 114: 113 }, { 118: 114, 123: [1, 115], 125: 116, 126: $Vt }, o($Vu, [2, 315]), o($Vu, [2, 316]), o($Vv, [2, 319]), o($Vv, [2, 320]), o($Vv, [2, 321]), o($Vd, [2, 327]), { 13: $V9, 16: $Va, 55: 118, 307: 43, 308: $Vc }, o($V7, [2, 12]), o($V7, [2, 13], { 44: 66, 43: 119, 45: $Ve, 87: $Vb }), o($Vw, [2, 269]), o($Vw, [2, 15]), { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 120, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o($Vf, [2, 14]), o($Vf, [2, 274]), o($Vf, [2, 271]), o($Vf, [2, 272]), o($V0, [2, 4]), { 13: [1, 177] }, o($V61, [2, 39]), { 29: [1, 178] }, { 29: [1, 179] }, { 87: [1, 181], 91: 180 }, { 45: [1, 187], 87: [1, 185], 89: [1, 186], 93: 182, 165: 183, 166: 184 }, o($V6, [2, 410]), o([6, 13, 16, 45, 48, 82, 87, 89, 231, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 337], [2, 121], { 338: [1, 188] }), { 13: $V9, 16: $Va, 45: [1, 193], 55: 194, 197: $V71, 219: 189, 220: 190, 223: 191, 224: [1, 192], 307: 43, 308: $Vc }, o($Vg, [2, 419]), o($V81, $V91, { 20: 196, 59: 197, 69: 198, 70: $Va1 }), o($V7, [2, 250]), { 29: $Vb1, 57: 200 }, o($Vp, [2, 279], { 54: 202, 327: [1, 203] }), { 29: [2, 282] }, o($Vc1, $Vd1, { 23: 204, 58: 205, 62: 206, 63: $Ve1 }), o($V7, [2, 252]), { 19: 208, 28: $Vh, 29: $Vi, 52: 209, 53: $Vj, 56: 85 }, { 29: [1, 210] }, o($V8, [2, 256]), { 31: [1, 211] }, { 31: [2, 384] }, { 13: $V9, 16: $Va, 44: 215, 45: $Vf1, 55: 220, 82: $Vy, 87: $Vb, 89: $Vg1, 145: 212, 172: 221, 185: 213, 187: 214, 231: $Vh1, 236: 216, 237: 222, 255: 154, 257: 155, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 309: $Vi1, 310: $Vj1, 311: 217, 312: $Vk1 }, o($Vl1, [2, 265], { 56: 85, 35: 227, 52: 228, 19: 229, 28: $Vh, 29: $Vi, 53: $Vj }), o($Vm, [2, 260]), o($Vc1, $Vd1, { 58: 205, 62: 206, 23: 230, 63: $Ve1 }), o($V7, [2, 268]), { 6: [2, 45] }, o($V0, $V1, { 10: 3, 4: 231 }), { 13: $V9, 16: $Va, 55: 232, 307: 43, 308: $Vc }, o($Vp, [2, 312]), { 105: 233, 112: $Vm1, 122: 234, 132: [1, 237], 134: 235, 327: [1, 238], 334: [1, 239] }, o($Vq, [2, 318]), o($Vp, $Vn1, { 108: 240, 133: 242, 112: $Vo1, 132: $Vp1 }), o($Vr, [2, 323]), { 112: [1, 244] }, { 112: [2, 325] }, o($Vq1, [2, 50]), o($Vk, $Vr1, { 135: 245, 136: 246, 143: 247, 144: 248, 31: $Vs1, 112: $Vs1 }), o($Vq1, [2, 51]), o($Vq1, [2, 52]), o($Vt1, [2, 328], { 119: 249 }), { 29: $Vs, 114: 250 }, o($Vt1, [2, 56]), { 29: $Vs, 114: 251 }, o($Vd, [2, 59]), o($Vw, [2, 270]), { 47: [1, 252] }, o($Vu1, [2, 150]), o($Vv1, [2, 428], { 240: 253 }), o($Vw1, [2, 430], { 244: 254 }), o($Vw1, [2, 155], { 248: 255, 249: 256, 250: [2, 438], 290: [1, 257], 341: [1, 258], 342: [1, 259], 343: [1, 260], 344: [1, 261], 345: [1, 262], 346: [1, 263] }), o($Vx1, [2, 440], { 252: 264 }), o($Vy1, [2, 448], { 260: 265 }), { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 255: 154, 257: 155, 264: 266, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 255: 154, 257: 155, 264: 267, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 255: 154, 257: 155, 264: 268, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o($Vy1, [2, 167]), o($Vy1, [2, 168]), o($Vy1, [2, 169]), o($Vy1, [2, 170], { 176: 269, 45: $Vz1, 89: $VA1 }), o($Vy1, [2, 171]), o($Vy1, [2, 172]), o($Vy1, [2, 173]), o($Vy1, [2, 174]), { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 272, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o($VB1, [2, 176]), { 89: [1, 273] }, { 45: [1, 274] }, { 45: [1, 275] }, { 45: [1, 276] }, { 45: [1, 277] }, { 45: [1, 278] }, { 45: $VC1, 89: $VD1, 179: 279 }, { 45: [1, 282] }, { 45: [1, 284], 89: [1, 283] }, { 279: [1, 285] }, o($VE1, [2, 192], { 292: [1, 286], 293: [1, 287] }), o($VE1, [2, 195]), o($VE1, [2, 196]), o($VE1, [2, 197]), o($VE1, [2, 198]), o($VE1, [2, 199]), o($VE1, [2, 200]), { 13: $V9, 16: $Va, 44: 39, 55: 40, 82: $Vy, 87: $Vb, 139: 289, 172: 291, 255: 154, 257: 155, 266: 290, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 320: 288 }, { 45: [1, 292] }, { 45: [1, 293] }, { 45: [1, 294] }, o($VF1, [2, 452]), o($VF1, [2, 453]), o($VF1, [2, 454]), o($VF1, [2, 455]), o($VF1, [2, 456]), { 279: [2, 458] }, o($VG1, [2, 207]), o($VG1, [2, 208]), o($VG1, [2, 209]), o($VG1, [2, 210]), o($VE1, [2, 201]), o($VE1, [2, 202]), o($VE1, [2, 203]), o($VE1, [2, 204]), o($VE1, [2, 205]), o($VE1, [2, 206]), o($V0, [2, 5]), o($VH1, [2, 297], { 88: 295 }), o($VI1, [2, 299], { 90: 296 }), { 48: [1, 297], 87: [1, 298] }, o($VJ1, [2, 301]), o($V61, [2, 43]), o($V61, [2, 82]), o($V61, [2, 83]), { 29: [1, 299] }, { 29: [1, 300] }, { 87: [1, 302], 169: 301 }, o($V6, [2, 412]), o($VK1, [2, 123]), o($VK1, [2, 416], { 221: 303, 339: 304, 39: [1, 306], 263: [1, 307], 340: [1, 305] }), o($VL1, [2, 124]), { 13: $V9, 16: $Va, 45: [1, 311], 55: 194, 89: [1, 310], 197: $V71, 223: 312, 225: 308, 226: 309, 229: $VM1, 307: 43, 308: $Vc }, o($V6, $V3, { 215: 10, 214: 314 }), o($VL1, [2, 236]), o($VL1, [2, 237]), o($VN1, [2, 6]), o($VO1, [2, 287], { 60: 315, 72: 316, 73: [1, 317] }), o($V81, [2, 286]), { 13: $V9, 16: $Va, 45: $Vx, 55: 323, 67: 321, 68: 322, 71: 318, 77: 320, 79: 319, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 307: 43, 308: $Vc, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o([6, 31, 63, 70, 73, 81, 83, 85], [2, 20]), o($Vk, $VP1, { 38: 17, 49: 324, 147: 325, 17: 326, 21: 327, 148: 328, 154: 329, 155: 330, 29: $VQ1, 31: $VQ1, 85: $VQ1, 112: $VQ1, 159: $VQ1, 160: $VQ1, 161: $VQ1, 163: $VQ1, 164: $VQ1, 41: $V4 }), { 13: $V9, 16: $Va, 55: 331, 307: 43, 308: $Vc }, o($Vp, [2, 280]), o($VN1, [2, 7]), o($V81, $V91, { 59: 197, 69: 198, 20: 332, 70: $Va1 }), o($Vc1, [2, 284]), { 64: [1, 333] }, o($Vc1, $Vd1, { 58: 205, 62: 206, 23: 334, 63: $Ve1 }), o($V7, [2, 254]), o($Vk, $Vr1, { 144: 248, 30: 335, 143: 336, 31: [2, 257] }), o($V7, [2, 100]), { 31: [2, 387], 184: 337, 335: [1, 338] }, { 13: $V9, 16: $Va, 44: 39, 55: 40, 87: $Vb, 139: 342, 186: 339, 190: 340, 195: 341, 197: $VR1, 307: 43, 308: $Vc }, o($VS1, [2, 389], { 44: 39, 55: 40, 307: 43, 190: 340, 195: 341, 139: 342, 188: 344, 189: 345, 186: 346, 13: $V9, 16: $Va, 87: $Vb, 197: $VR1, 308: $Vc }), o($VT1, [2, 227]), o($VT1, [2, 228]), o($VT1, [2, 229]), { 13: $V9, 16: $Va, 44: 215, 45: $Vf1, 55: 220, 82: $Vy, 87: $Vb, 89: $Vg1, 172: 221, 185: 351, 187: 350, 200: 348, 230: 347, 231: $Vh1, 234: 349, 236: 216, 237: 222, 255: 154, 257: 155, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 309: $Vi1, 310: $Vj1, 311: 217, 312: $Vk1 }, { 13: $V9, 16: $Va, 44: 39, 55: 40, 87: $Vb, 139: 342, 186: 352, 190: 340, 195: 341, 197: $VR1, 307: 43, 308: $Vc }, o($VT1, [2, 146]), o($VT1, [2, 147]), o($VT1, [2, 148]), o($VT1, [2, 149]), { 13: $V9, 16: $Va, 44: 354, 55: 355, 82: $Vy, 87: $Vb, 172: 357, 237: 356, 255: 154, 257: 155, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 309: $Vi1, 310: $Vj1, 311: 358, 312: $Vk1, 313: 353 }, o($VU1, [2, 215]), o($VU1, [2, 216]), o($Vc1, $Vd1, { 58: 205, 62: 206, 23: 359, 63: $Ve1 }), o($Vl, [2, 264]), o($Vl1, [2, 266]), o($VN1, [2, 11]), o($V2, [2, 308], { 6: [2, 310] }), o($Vq1, [2, 313], { 102: 360, 120: 361, 121: [1, 362] }), o($Vq1, [2, 47]), o($Vq1, [2, 63]), o($Vq1, [2, 64]), { 13: $V9, 16: $Va, 55: 363, 307: 43, 308: $Vc }, o($Vq1, [2, 336]), o($Vq1, [2, 337]), o($Vq1, [2, 338]), { 109: [1, 364] }, o($VV1, [2, 60]), { 13: $V9, 16: $Va, 55: 365, 307: 43, 308: $Vc }, o($Vp, [2, 335]), { 13: $V9, 16: $Va, 55: 366, 307: 43, 308: $Vc }, { 31: [1, 367] }, o($VW1, [2, 341], { 137: 368 }), o($VW1, [2, 340]), { 13: $V9, 16: $Va, 44: 215, 45: $Vf1, 55: 220, 82: $Vy, 87: $Vb, 89: $Vg1, 145: 369, 172: 221, 185: 213, 187: 214, 231: $Vh1, 236: 216, 237: 222, 255: 154, 257: 155, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 309: $Vi1, 310: $Vj1, 311: 217, 312: $Vk1 }, { 28: [1, 370], 127: 371, 128: [1, 372] }, o($Vt1, [2, 330], { 124: 373, 125: 374, 126: $Vt }), o($Vt1, [2, 57]), { 44: 375, 87: $Vb }, o($Vu1, [2, 151], { 241: 376, 242: [1, 377] }), o($Vv1, [2, 153], { 245: 378, 246: [1, 379] }), { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 247: 380, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, { 250: [1, 381] }, o($VX1, [2, 432]), o($VX1, [2, 433]), o($VX1, [2, 434]), o($VX1, [2, 435]), o($VX1, [2, 436]), o($VX1, [2, 437]), { 250: [2, 439] }, o([47, 48, 193, 242, 246, 250, 272, 290, 341, 342, 343, 344, 345, 346], [2, 158], { 253: 382, 254: 383, 255: 384, 257: 385, 263: [1, 386], 265: [1, 387], 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW }), o($Vx1, [2, 162], { 261: 388, 262: 389, 39: $VY1, 338: $VZ1 }), o($Vy1, [2, 164]), o($Vy1, [2, 165]), o($Vy1, [2, 166]), o($VB1, [2, 95]), o($VB1, [2, 96]), o($VX1, [2, 377], { 177: 392, 325: [1, 393] }), { 48: [1, 394] }, o($VB1, [2, 177]), { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 395, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 396, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 397, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 398, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 399, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o($VB1, [2, 183]), o($VB1, [2, 98]), o($VX1, [2, 381], { 180: 400 }), { 87: [1, 401] }, o($VB1, [2, 185]), { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 402, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, { 29: $Vb1, 57: 403 }, o($VE1, [2, 193]), { 13: $V9, 16: $Va, 55: 404, 307: 43, 308: $Vc }, { 13: $V9, 16: $Va, 44: 39, 55: 40, 87: $Vb, 139: 342, 195: 405, 197: $VR1, 307: 43, 308: $Vc }, o($V_1, [2, 233]), o($V_1, [2, 234]), o($V_1, [2, 235]), o($V$1, [2, 459], { 281: 406, 325: [1, 407] }), o($VX1, [2, 463], { 284: 408, 325: [1, 409] }), o($VX1, [2, 465], { 286: 410, 325: [1, 411] }), { 13: $V9, 16: $Va, 31: [1, 412], 55: 414, 82: $Vy, 171: 413, 172: 415, 173: 416, 174: $V02, 255: 154, 257: 155, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V12 }, { 31: [1, 419], 89: [1, 420] }, { 29: [1, 421] }, o($VJ1, [2, 302]), o($VH1, [2, 367], { 167: 422 }), o($VI1, [2, 369], { 168: 423 }), { 48: [1, 424], 87: [1, 425] }, o($VJ1, [2, 371]), o($VK1, [2, 122]), o($VK1, [2, 417]), o($VK1, [2, 413]), o($VK1, [2, 414]), o($VK1, [2, 415]), o($VL1, [2, 125]), o($VL1, [2, 127]), o($VL1, [2, 128]), o($V22, [2, 420], { 227: 426 }), o($VL1, [2, 130]), { 13: $V9, 16: $Va, 55: 194, 197: $V71, 223: 427, 307: 43, 308: $Vc }, { 48: [1, 428] }, o($V32, [2, 289], { 61: 429, 80: 430, 81: [1, 431], 83: [1, 432] }), o($VO1, [2, 288]), { 64: [1, 433] }, o($V81, [2, 29], { 307: 43, 267: 139, 275: 146, 278: 149, 77: 320, 67: 321, 68: 322, 55: 323, 79: 434, 13: $V9, 16: $Va, 45: $Vx, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 276: $VI, 277: $VJ, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 308: $Vc, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }), o($V42, [2, 293]), o($V52, [2, 92]), o($V52, [2, 93]), o($V52, [2, 94]), { 45: $Vz1, 89: $VA1, 176: 269 }, { 31: [1, 435] }, { 31: [1, 436] }, { 19: 437, 28: $Vh, 29: $Vi, 56: 85 }, { 19: 438, 28: $Vh, 29: $Vi, 56: 85 }, o($V62, [2, 355], { 149: 439 }), o($V62, [2, 354]), { 13: $V9, 16: $Va, 44: 215, 45: $V72, 55: 220, 82: $Vy, 87: $Vb, 89: $Vg1, 156: 440, 172: 221, 185: 441, 203: 442, 231: $V82, 236: 216, 237: 222, 255: 154, 257: 155, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 309: $Vi1, 310: $Vj1, 311: 217, 312: $Vk1 }, o($Vl, [2, 19]), o($V32, [2, 21]), { 13: $V9, 16: $Va, 44: 450, 45: $V92, 55: 323, 65: 445, 66: 446, 67: 447, 68: 448, 87: $Vb, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 307: 43, 308: $Vc, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o($VN1, [2, 8]), { 31: [1, 451] }, { 31: [2, 258] }, { 31: [2, 101] }, o($Vk, [2, 386], { 31: [2, 388] }), o($VS1, [2, 102]), o($Va2, [2, 391], { 191: 452 }), o($Vk, [2, 395], { 196: 453, 198: 454 }), o($Vk, [2, 108]), o($Vk, [2, 109]), o($VS1, [2, 103]), o($VS1, [2, 104]), o($VS1, [2, 390]), { 13: $V9, 16: $Va, 44: 215, 45: $Vf1, 48: [1, 455], 55: 220, 82: $Vy, 87: $Vb, 89: $Vg1, 172: 221, 185: 351, 187: 350, 200: 456, 231: $Vh1, 234: 349, 236: 216, 237: 222, 255: 154, 257: 155, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 309: $Vi1, 310: $Vj1, 311: 217, 312: $Vk1 }, o($Vb2, [2, 424]), o($Vc2, [2, 136]), o($Vc2, [2, 137]), o($Vd2, [2, 140]), { 232: [1, 457] }, { 13: $V9, 16: $Va, 44: 39, 55: 40, 87: $Vb, 139: 342, 195: 458, 197: $VR1, 307: 43, 308: $Vc }, o($V_1, [2, 219]), o($V_1, [2, 220]), o($V_1, [2, 221]), o($V_1, [2, 222]), o($V_1, [2, 223]), o($VN1, [2, 10]), o($Vq1, [2, 46]), o($Vq1, [2, 314]), { 112: $Vm1, 122: 459 }, o($Vq1, [2, 62]), o($Vp, $Vn1, { 133: 242, 108: 460, 112: $Vo1, 132: $Vp1 }), o($VV1, [2, 61]), o($Vq1, [2, 49]), o([6, 28, 126, 128, 193], [2, 65]), { 31: [2, 66], 112: [1, 462], 138: 461 }, o($VW1, [2, 351], { 146: 463, 335: [1, 464] }), { 29: $Vb1, 57: 465 }, o($Vt1, [2, 329]), o($Vp, [2, 332], { 129: 466, 327: [1, 467] }), o($Vt1, [2, 55]), o($Vt1, [2, 331]), { 48: [1, 468] }, o($Vv1, [2, 429]), { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 239: 469, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o($Vw1, [2, 431]), { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 243: 470, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o($Vw1, [2, 156]), { 45: $VC1, 89: $VD1, 179: 471 }, o($Vx1, [2, 441]), { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 251: 472, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o($Vy1, [2, 444], { 256: 473 }), o($Vy1, [2, 446], { 258: 474 }), o($VX1, [2, 442]), o($VX1, [2, 443]), o($Vy1, [2, 449]), { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 255: 154, 257: 155, 259: 475, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o($VX1, [2, 450]), o($VX1, [2, 451]), o($VX1, [2, 379], { 178: 476 }), o($VX1, [2, 378]), o([6, 13, 16, 29, 31, 39, 45, 47, 48, 73, 76, 78, 81, 82, 83, 85, 87, 89, 112, 159, 160, 161, 163, 164, 193, 231, 242, 246, 250, 263, 265, 268, 269, 270, 271, 272, 273, 274, 276, 277, 279, 280, 283, 285, 290, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 309, 310, 312, 335, 338, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351], [2, 175]), { 48: [1, 477] }, { 48: [1, 478] }, { 272: [1, 479] }, { 272: [1, 480] }, { 272: [1, 481] }, { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 482, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, { 48: [1, 483] }, { 48: [1, 484] }, o($VB1, [2, 187]), o($VE1, [2, 194]), { 13: $V9, 16: $Va, 44: 39, 55: 40, 82: $Vy, 87: $Vb, 139: 289, 172: 291, 255: 154, 257: 155, 266: 290, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 320: 485 }, { 13: $V9, 16: $Va, 39: [1, 487], 44: 136, 45: $Vx, 46: 488, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 282: 486, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o($V$1, [2, 460]), { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 489, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o($VX1, [2, 464]), { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 490, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o($VX1, [2, 466]), o($V61, [2, 40]), o($VH1, [2, 298]), o($Ve2, [2, 87]), o($Ve2, [2, 88]), o($Ve2, [2, 89]), o($Ve2, [2, 90]), { 13: $V9, 16: $Va, 55: 492, 82: $Vy, 172: 493, 255: 154, 257: 155, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 311: 494, 312: $Vk1, 315: 491 }, o($V61, [2, 41]), o($VI1, [2, 300]), o($Vf2, [2, 303], { 92: 495 }), { 13: $V9, 16: $Va, 31: [1, 496], 55: 414, 82: $Vy, 171: 497, 172: 415, 173: 416, 174: $V02, 255: 154, 257: 155, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V12 }, { 31: [1, 498], 89: [1, 499] }, { 29: [1, 500] }, o($VJ1, [2, 372]), { 13: $V9, 16: $Va, 48: [2, 422], 55: 194, 197: $V71, 223: 312, 226: 502, 228: 501, 229: $VM1, 307: 43, 308: $Vc }, o($VL1, [2, 131]), o($VL1, [2, 126]), o($V32, [2, 22]), o($V32, [2, 290]), { 82: [1, 503] }, { 82: [1, 504] }, { 13: $V9, 16: $Va, 44: 510, 45: $Vx, 55: 323, 67: 321, 68: 322, 74: 505, 75: 506, 76: $Vg2, 77: 320, 78: $Vh2, 79: 509, 87: $Vb, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 307: 43, 308: $Vc, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o($V42, [2, 294]), o($Vi2, [2, 69]), o($Vi2, [2, 70]), o($V81, $V91, { 59: 197, 69: 198, 20: 511, 70: $Va1 }), o($Vc1, $Vd1, { 58: 205, 62: 206, 23: 512, 63: $Ve1 }), { 29: [2, 375], 31: [2, 71], 84: 522, 85: $V5, 112: [1, 518], 150: 513, 151: 514, 158: 515, 159: [1, 516], 160: [1, 517], 161: [1, 519], 163: [1, 520], 164: [1, 521], 175: 523 }, o($V62, [2, 363], { 157: 524, 335: [1, 525] }), o($V6, $V3, { 215: 10, 202: 526, 205: 527, 208: 528, 214: 529, 44: 530, 87: $Vb }), o($Vj2, [2, 399], { 215: 10, 205: 527, 208: 528, 214: 529, 44: 530, 204: 531, 202: 532, 13: $V3, 16: $V3, 45: $V3, 197: $V3, 224: $V3, 229: $V3, 308: $V3, 87: $Vb }), { 13: $V9, 16: $Va, 44: 215, 45: $V72, 55: 220, 82: $Vy, 87: $Vb, 89: $Vg1, 172: 221, 185: 351, 203: 536, 212: 534, 231: $V82, 233: 533, 234: 535, 236: 216, 237: 222, 255: 154, 257: 155, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 309: $Vi1, 310: $Vj1, 311: 217, 312: $Vk1 }, o($V6, $V3, { 215: 10, 205: 527, 208: 528, 214: 529, 44: 530, 202: 537, 87: $Vb }), o($Vc1, [2, 23], { 307: 43, 267: 139, 275: 146, 278: 149, 55: 323, 67: 447, 68: 448, 44: 450, 66: 538, 13: $V9, 16: $Va, 45: $V92, 87: $Vb, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 276: $VI, 277: $VJ, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 308: $Vc, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }), o($Vk2, [2, 291]), o($Vk2, [2, 24]), o($Vk2, [2, 25]), { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 539, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o($Vk2, [2, 28]), o($Vc1, $Vd1, { 58: 205, 62: 206, 23: 540, 63: $Ve1 }), o([31, 112, 232, 318, 335], [2, 105], { 192: 541, 193: [1, 542] }), o($Va2, [2, 107]), { 13: $V9, 16: $Va, 44: 215, 45: $Vf1, 55: 220, 82: $Vy, 87: $Vb, 89: $Vg1, 172: 221, 185: 351, 187: 350, 199: 543, 200: 544, 231: $Vh1, 234: 349, 236: 216, 237: 222, 255: 154, 257: 155, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 309: $Vi1, 310: $Vj1, 311: 217, 312: $Vk1 }, o($Vl2, [2, 132]), o($Vb2, [2, 425]), o($Vl2, [2, 133]), { 13: $V9, 16: $Va, 44: 354, 55: 355, 82: $Vy, 87: $Vb, 172: 357, 237: 356, 255: 154, 257: 155, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 309: $Vi1, 310: $Vj1, 311: 358, 312: $Vk1, 313: 545 }, o($Vq1, [2, 54]), o($Vq1, [2, 48]), o($VW1, [2, 342]), { 13: $V9, 16: $Va, 44: 39, 55: 40, 87: $Vb, 139: 546, 307: 43, 308: $Vc }, o($VW1, [2, 68]), o($Vk, [2, 350], { 31: $Vm2, 112: $Vm2 }), o($Vq1, [2, 53]), { 13: $V9, 16: $Va, 55: 547, 307: 43, 308: $Vc }, o($Vp, [2, 333]), o($Vw, [2, 16]), o($Vv1, [2, 152]), o($Vw1, [2, 154]), o($Vw1, [2, 157]), o($Vx1, [2, 159]), o($Vx1, [2, 160], { 262: 389, 261: 548, 39: $VY1, 338: $VZ1 }), o($Vx1, [2, 161], { 262: 389, 261: 549, 39: $VY1, 338: $VZ1 }), o($Vy1, [2, 163]), { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 550, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o($VB1, [2, 178]), o($VB1, [2, 179]), { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 551, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 552, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 553, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, { 48: [1, 554], 272: [1, 555] }, o($VB1, [2, 184]), o($VB1, [2, 186]), { 314: [1, 556] }, { 48: [1, 557] }, { 48: [2, 461] }, { 48: [2, 462] }, { 48: [1, 558] }, { 48: [2, 467], 193: [1, 561], 287: 559, 288: 560 }, { 13: $V9, 16: $Va, 55: 194, 197: $V71, 223: 562, 307: 43, 308: $Vc }, o($Vn2, [2, 224]), o($Vn2, [2, 225]), o($Vn2, [2, 226]), { 31: [1, 563], 45: $Vo2, 94: 564 }, o($V61, [2, 84]), o($VH1, [2, 368]), o($V61, [2, 85]), o($VI1, [2, 370]), o($Vf2, [2, 373], { 170: 566 }), { 48: [1, 567] }, { 48: [2, 423], 337: [1, 568] }, o($V32, [2, 35], { 83: [1, 569] }), o($V32, [2, 36], { 81: [1, 570] }), o($VO1, [2, 30], { 307: 43, 267: 139, 275: 146, 278: 149, 77: 320, 67: 321, 68: 322, 55: 323, 79: 509, 44: 510, 75: 571, 13: $V9, 16: $Va, 45: $Vx, 76: $Vg2, 78: $Vh2, 87: $Vb, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 276: $VI, 277: $VJ, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 308: $Vc, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }), o($Vp2, [2, 295]), { 45: $Vx, 77: 572 }, { 45: $Vx, 77: 573 }, o($Vp2, [2, 33]), o($Vp2, [2, 34]), { 31: [2, 275], 50: 574, 84: 575, 85: $V5 }, { 31: [2, 277], 51: 576, 84: 577, 85: $V5 }, o($V62, [2, 356]), o($Vq2, [2, 357], { 152: 578, 335: [1, 579] }), o($Vr2, [2, 74]), { 29: $Vb1, 57: 580 }, { 29: $Vb1, 57: 581 }, { 13: $V9, 16: $Va, 44: 39, 55: 40, 87: $Vb, 139: 582, 307: 43, 308: $Vc }, o($Vs2, [2, 365], { 162: 583, 328: [1, 584] }), { 13: $V9, 16: $Va, 45: $Vx, 55: 323, 67: 321, 68: 322, 77: 320, 79: 585, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 307: 43, 308: $Vc, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, { 45: [1, 586] }, o($Vr2, [2, 81]), { 29: $Vb1, 57: 587 }, o($V62, [2, 73]), o($Vk, [2, 362], { 29: $Vt2, 31: $Vt2, 85: $Vt2, 112: $Vt2, 159: $Vt2, 160: $Vt2, 161: $Vt2, 163: $Vt2, 164: $Vt2 }), o($Vj2, [2, 112]), o($Vu2, [2, 401], { 206: 588 }), o($Vk, [2, 405], { 209: 589, 210: 590 }), o($Vk, [2, 403]), o($Vk, [2, 404]), o($Vj2, [2, 113]), o($Vj2, [2, 400]), { 13: $V9, 16: $Va, 44: 215, 45: $V72, 48: [1, 591], 55: 220, 82: $Vy, 87: $Vb, 89: $Vg1, 172: 221, 185: 351, 203: 536, 212: 592, 231: $V82, 234: 535, 236: 216, 237: 222, 255: 154, 257: 155, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 309: $Vi1, 310: $Vj1, 311: 217, 312: $Vk1 }, o($Vb2, [2, 426]), o($Vd2, [2, 138]), o($Vd2, [2, 139]), { 232: [1, 593] }, o($Vk2, [2, 292]), { 47: [1, 595], 48: [1, 594] }, o($VN1, [2, 9]), o($Va2, [2, 392]), o($Va2, [2, 393], { 44: 39, 55: 40, 307: 43, 195: 341, 139: 342, 194: 596, 190: 597, 13: $V9, 16: $Va, 87: $Vb, 197: $VR1, 308: $Vc }), o($Va2, [2, 110], { 272: [1, 598] }), o($Vv2, [2, 397], { 201: 599, 316: 600, 317: [1, 601] }), { 314: [1, 602] }, { 29: [1, 603] }, o($Vt1, [2, 58]), o($Vy1, [2, 445]), o($Vy1, [2, 447]), { 48: [1, 604], 272: [1, 605] }, { 48: [1, 606] }, { 272: [1, 607] }, { 272: [1, 608] }, o($VB1, [2, 99]), o($VX1, [2, 382]), o([13, 16, 39, 47, 48, 87, 193, 197, 242, 246, 250, 263, 265, 272, 290, 297, 298, 299, 300, 301, 302, 308, 314, 338, 341, 342, 343, 344, 345, 346], [2, 232]), o($VB1, [2, 188]), o($VB1, [2, 189]), { 48: [1, 609] }, { 48: [2, 468] }, { 289: [1, 610] }, { 13: $V9, 16: $Va, 55: 492, 82: $Vy, 172: 493, 255: 154, 257: 155, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 311: 494, 312: $Vk1, 315: 611 }, o($V61, [2, 42]), o($Vf2, [2, 304]), { 13: $V9, 16: $Va, 55: 414, 82: $Vy, 95: 612, 171: 613, 172: 415, 173: 416, 174: $V02, 255: 154, 257: 155, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V12 }, { 31: [1, 614], 45: $Vo2, 94: 615 }, o($VL1, [2, 129]), o($V22, [2, 421]), { 82: [1, 616] }, { 82: [1, 617] }, o($Vp2, [2, 296]), o($Vp2, [2, 31]), o($Vp2, [2, 32]), { 31: [2, 17] }, { 31: [2, 276] }, { 31: [2, 18] }, { 31: [2, 278] }, o($Vk, $VP1, { 155: 330, 153: 618, 154: 619, 29: $Vw2, 31: $Vw2, 85: $Vw2, 112: $Vw2, 159: $Vw2, 160: $Vw2, 161: $Vw2, 163: $Vw2, 164: $Vw2 }), o($Vq2, [2, 358]), o($Vr2, [2, 75]), o($Vr2, [2, 76]), { 29: $Vb1, 57: 620 }, { 13: $V9, 16: $Va, 44: 39, 55: 40, 87: $Vb, 139: 621, 307: 43, 308: $Vc }, o($Vs2, [2, 366]), o($Vr2, [2, 79]), { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 622, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o($Vr2, [2, 91], { 336: [1, 623] }), o([29, 31, 85, 112, 159, 160, 161, 163, 164, 232, 318, 335], [2, 114], { 207: 624, 193: [1, 625] }), o($Vu2, [2, 117]), { 13: $V9, 16: $Va, 44: 215, 45: $V72, 55: 220, 82: $Vy, 87: $Vb, 89: $Vg1, 172: 221, 185: 351, 203: 536, 211: 626, 212: 627, 231: $V82, 234: 535, 236: 216, 237: 222, 255: 154, 257: 155, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 309: $Vi1, 310: $Vj1, 311: 217, 312: $Vk1 }, o($VT1, [2, 134]), o($Vb2, [2, 427]), o($VT1, [2, 135]), o($Vk2, [2, 26]), { 44: 628, 87: $Vb }, o($Va2, [2, 106]), o($Va2, [2, 394]), o($Vk, [2, 396]), o($Vv2, [2, 111]), o($Vv2, [2, 398]), { 13: $V9, 16: $Va, 44: 39, 55: 40, 87: $Vb, 139: 342, 186: 629, 190: 340, 195: 341, 197: $VR1, 307: 43, 308: $Vc }, o($VU1, [2, 217]), o($Vk, $Vr1, { 144: 248, 140: 630, 143: 631, 31: [2, 343] }), o($VB1, [2, 97]), o($VX1, [2, 380]), o($VB1, [2, 180]), { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 632, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, { 13: $V9, 16: $Va, 44: 136, 45: $Vx, 46: 633, 55: 133, 67: 132, 68: 134, 77: 131, 82: $Vy, 87: $Vb, 172: 135, 224: $Vz, 238: 121, 239: 122, 243: 123, 247: 124, 251: 125, 255: 154, 257: 155, 259: 126, 263: $VA, 264: 130, 265: $VB, 266: 137, 267: 139, 268: $VC, 269: $VD, 270: $VE, 271: $VF, 273: $VG, 274: $VH, 275: 146, 276: $VI, 277: $VJ, 278: 149, 279: $VK, 280: $VL, 283: $VM, 285: $VN, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V$, 346: $V01, 347: $V11, 348: $V21, 349: $V31, 350: $V41, 351: $V51 }, o($VB1, [2, 190]), { 290: [1, 634] }, { 314: [1, 635] }, { 13: $V9, 16: $Va, 48: [1, 636], 55: 414, 82: $Vy, 171: 637, 172: 415, 173: 416, 174: $V02, 255: 154, 257: 155, 291: 150, 294: $VO, 295: $VP, 296: $VQ, 297: $VR, 298: $VS, 299: $VT, 300: $VU, 301: $VV, 302: $VW, 303: $VX, 304: $VY, 305: $VZ, 306: $V_, 307: 43, 308: $Vc, 312: $V12 }, o($Vx2, [2, 305]), o($V61, [2, 86]), o($Vf2, [2, 374]), o($V32, [2, 37]), o($V32, [2, 38]), o($V62, [2, 72]), o($V62, [2, 360]), o($Vr2, [2, 77]), { 29: $Vb1, 57: 638 }, { 47: [1, 639] }, { 29: [2, 376] }, o($Vu2, [2, 402]), o($Vu2, [2, 115], { 215: 10, 208: 528, 214: 529, 44: 530, 205: 640, 13: $V3, 16: $V3, 45: $V3, 197: $V3, 224: $V3, 229: $V3, 308: $V3, 87: $Vb }), o($Vu2, [2, 118], { 272: [1, 641] }), o($Vy2, [2, 407], { 213: 642, 319: 643, 317: [1, 644] }), { 48: [1, 645] }, { 318: [1, 646] }, { 31: [1, 647] }, { 31: [2, 344] }, { 48: [1, 648] }, { 48: [1, 649] }, { 291: 650, 303: $VX, 304: $VY, 305: $VZ, 306: $V_ }, o($Ve2, [2, 218]), o($Vf2, [2, 44]), o($Vx2, [2, 306]), o($Vr2, [2, 78]), { 44: 651, 87: $Vb }, o($Vu2, [2, 116]), o($Vk, [2, 406]), o($Vy2, [2, 119]), o($Vy2, [2, 408]), o($V6, $V3, { 215: 10, 205: 527, 208: 528, 214: 529, 44: 530, 202: 652, 87: $Vb }), o($Vk2, [2, 27]), o($Vv2, [2, 230]), o($Vz2, [2, 345], { 141: 653, 335: [1, 654] }), o($VB1, [2, 181]), o($VB1, [2, 182]), { 48: [2, 191] }, { 48: [1, 655] }, { 318: [1, 656] }, o($Vk, $Vr1, { 144: 248, 142: 657, 143: 658, 31: $VA2, 112: $VA2 }), o($Vz2, [2, 346]), o($Vr2, [2, 80]), o($Vy2, [2, 231]), o($VW1, [2, 67]), o($VW1, [2, 348])],
      defaultActions: { 5: [2, 240], 6: [2, 241], 7: [2, 242], 9: [2, 239], 24: [2, 1], 25: [2, 2], 26: [2, 244], 87: [2, 282], 94: [2, 384], 100: [2, 45], 109: [2, 325], 166: [2, 458], 263: [2, 439], 336: [2, 258], 337: [2, 101], 487: [2, 461], 488: [2, 462], 560: [2, 468], 574: [2, 17], 575: [2, 276], 576: [2, 18], 577: [2, 278], 623: [2, 376], 631: [2, 344], 650: [2, 191] },
      parseError: function parseError(str2, hash) {
        if (hash.recoverable) {
          this.trace(str2);
        } else {
          var error = new Error(str2);
          error.hash = hash;
          throw error;
        }
      },
      parse: function parse(input) {
        var self2 = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, TERROR = 2, EOF2 = 1;
        var args = lstack.slice.call(arguments, 1);
        var lexer2 = Object.create(this.lexer);
        var sharedState = { yy: {} };
        for (var k in this.yy) {
          if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
          }
        }
        lexer2.setInput(input, sharedState.yy);
        sharedState.yy.lexer = lexer2;
        sharedState.yy.parser = this;
        if (typeof lexer2.yylloc == "undefined") {
          lexer2.yylloc = {};
        }
        var yyloc = lexer2.yylloc;
        lstack.push(yyloc);
        var ranges = lexer2.options && lexer2.options.ranges;
        if (typeof sharedState.yy.parseError === "function") {
          this.parseError = sharedState.yy.parseError;
        } else {
          this.parseError = Object.getPrototypeOf(this).parseError;
        }
        var lex = function() {
          var token;
          token = lexer2.lex() || EOF2;
          if (typeof token !== "number") {
            token = self2.symbols_[token] || token;
          }
          return token;
        };
        var symbol, state, action, r, yyval = {}, p, len, newState, expected;
        while (true) {
          state = stack[stack.length - 1];
          if (this.defaultActions[state]) {
            action = this.defaultActions[state];
          } else {
            if (symbol === null || typeof symbol == "undefined") {
              symbol = lex();
            }
            action = table[state] && table[state][symbol];
          }
          if (typeof action === "undefined" || !action.length || !action[0]) {
            var errStr = "";
            expected = [];
            for (p in table[state]) {
              if (this.terminals_[p] && p > TERROR) {
                expected.push("'" + this.terminals_[p] + "'");
              }
            }
            if (lexer2.showPosition) {
              errStr = "Parse error on line " + (yylineno + 1) + ":\n" + lexer2.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
            } else {
              errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == EOF2 ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
            }
            this.parseError(errStr, {
              text: lexer2.match,
              token: this.terminals_[symbol] || symbol,
              line: lexer2.yylineno,
              loc: yyloc,
              expected
            });
          }
          if (action[0] instanceof Array && action.length > 1) {
            throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
          }
          switch (action[0]) {
            case 1:
              stack.push(symbol);
              vstack.push(lexer2.yytext);
              lstack.push(lexer2.yylloc);
              stack.push(action[1]);
              symbol = null;
              {
                yyleng = lexer2.yyleng;
                yytext = lexer2.yytext;
                yylineno = lexer2.yylineno;
                yyloc = lexer2.yylloc;
              }
              break;
            case 2:
              len = this.productions_[action[1]][1];
              yyval.$ = vstack[vstack.length - len];
              yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
              };
              if (ranges) {
                yyval._$.range = [
                  lstack[lstack.length - (len || 1)].range[0],
                  lstack[lstack.length - 1].range[1]
                ];
              }
              r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
              ].concat(args));
              if (typeof r !== "undefined") {
                return r;
              }
              if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
              }
              stack.push(this.productions_[action[1]][0]);
              vstack.push(yyval.$);
              lstack.push(yyval._$);
              newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
              stack.push(newState);
              break;
            case 3:
              return true;
          }
        }
        return true;
      }
    };
    var Wildcard2 = Wildcard$1.Wildcard;
    var RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#", RDF_TYPE = RDF + "type", RDF_FIRST = RDF + "first", RDF_REST = RDF + "rest", RDF_NIL = RDF + "nil", XSD = "http://www.w3.org/2001/XMLSchema#", XSD_INTEGER = XSD + "integer", XSD_DECIMAL = XSD + "decimal", XSD_DOUBLE = XSD + "double", XSD_BOOLEAN = XSD + "boolean";
    var base = "", basePath = "", baseRoot = "";
    function lowercase(string2) {
      return string2.toLowerCase();
    }
    function appendTo(array, item) {
      return array.push(item), array;
    }
    function appendAllTo(array, items) {
      return array.push.apply(array, items), array;
    }
    function extend(base2) {
      if (!base2) base2 = {};
      for (var i = 1, l = arguments.length, arg; i < l && (arg = arguments[i] || {}); i++)
        for (var name in arg)
          base2[name] = arg[name];
      return base2;
    }
    function unionAll() {
      var union2 = [];
      for (var i = 0, l = arguments.length; i < l; i++)
        union2 = union2.concat.apply(union2, arguments[i]);
      return union2;
    }
    function resolveIRI(iri2) {
      if (iri2[0] === "<")
        iri2 = iri2.substring(1, iri2.length - 1);
      if (/^[a-z][a-z0-9.+-]*:/i.test(iri2))
        return iri2;
      if (!Parser2.base)
        throw new Error("Cannot resolve relative IRI " + iri2 + " because no base IRI was set.");
      if (base !== Parser2.base) {
        base = Parser2.base;
        basePath = base.replace(/[^\/:]*$/, "");
        baseRoot = base.match(/^(?:[a-z]+:\/*)?[^\/]*/)[0];
      }
      switch (iri2[0]) {
        case void 0:
          return base;
        case "#":
          return base + iri2;
        case "?":
          return base.replace(/(?:\?.*)?$/, iri2);
        case "/":
          return baseRoot + iri2;
        default:
          return basePath + iri2;
      }
    }
    function toVar(variable) {
      if (variable) {
        var first2 = variable[0];
        if (first2 === "?" || first2 === "$") return Parser2.factory.variable(variable.substr(1));
      }
      return variable;
    }
    function operation(operatorName, args) {
      return { type: "operation", operator: operatorName, args: args || [] };
    }
    function expression2(expr, attr) {
      var expression3 = { expression: expr === "*" ? new Wildcard2() : expr };
      if (attr)
        for (var a2 in attr)
          expression3[a2] = attr[a2];
      return expression3;
    }
    function path2(type, items) {
      return { type: "path", pathType: type, items };
    }
    function createOperationTree(initialExpression, operationList) {
      for (var i = 0, l = operationList.length, item; i < l && (item = operationList[i]); i++)
        initialExpression = operation(item[0], [initialExpression, item[1]]);
      return initialExpression;
    }
    function groupDatasets(fromClauses, groupName) {
      var defaults2 = [], named2 = [], l = fromClauses.length, fromClause, group = {};
      if (!l)
        return null;
      for (var i = 0; i < l && (fromClause = fromClauses[i]); i++)
        (fromClause.named ? named2 : defaults2).push(fromClause.iri);
      group[groupName || "from"] = { default: defaults2, named: named2 };
      return group;
    }
    function toInt(string2) {
      return parseInt(string2, 10);
    }
    function degroupSingle(group) {
      return group.type === "group" && group.patterns.length === 1 ? group.patterns[0] : group;
    }
    function createTypedLiteral(value, type) {
      if (type && type.termType !== "NamedNode") {
        type = Parser2.factory.namedNode(type);
      }
      return Parser2.factory.literal(value, type);
    }
    function createLangLiteral(value, lang2) {
      return Parser2.factory.literal(value, lang2);
    }
    function nestedTriple(subject, predicate, object2) {
      if (!("termType" in predicate)) {
        throw new Error("Nested triples cannot contain paths");
      }
      return Parser2.factory.quad(subject, predicate, object2);
    }
    function triple(subject, predicate, object2, annotations) {
      var triple2 = {};
      if (subject != null) triple2.subject = subject;
      if (predicate != null) triple2.predicate = predicate;
      if (object2 != null) triple2.object = object2;
      if (annotations != null) triple2.annotations = annotations;
      return triple2;
    }
    function blank(name) {
      if (typeof name === "string") {
        if (name.startsWith("e_")) return Parser2.factory.blankNode(name);
        return Parser2.factory.blankNode("e_" + name);
      }
      return Parser2.factory.blankNode("g_" + blankId++);
    }
    var blankId = 0;
    Parser2._resetBlanks = function() {
      blankId = 0;
    };
    var escapeSequence = /\\u([a-fA-F0-9]{4})|\\U([a-fA-F0-9]{8})|\\(.)/g, escapeReplacements = {
      "\\": "\\",
      "'": "'",
      '"': '"',
      "t": "	",
      "b": "\b",
      "n": "\n",
      "r": "\r",
      "f": "\f"
    }, partialSurrogatesWithoutEndpoint = /[\uD800-\uDBFF]([^\uDC00-\uDFFF]|$)/, fromCharCode = String.fromCharCode;
    function unescapeString(string2, trimLength) {
      string2 = string2.substring(trimLength, string2.length - trimLength);
      try {
        string2 = string2.replace(escapeSequence, function(sequence, unicode4, unicode8, escapedChar) {
          var charCode;
          if (unicode4) {
            charCode = parseInt(unicode4, 16);
            if (isNaN(charCode)) throw new Error();
            return fromCharCode(charCode);
          } else if (unicode8) {
            charCode = parseInt(unicode8, 16);
            if (isNaN(charCode)) throw new Error();
            if (charCode < 65535) return fromCharCode(charCode);
            return fromCharCode(55296 + ((charCode -= 65536) >> 10), 56320 + (charCode & 1023));
          } else {
            var replacement = escapeReplacements[escapedChar];
            if (!replacement) throw new Error();
            return replacement;
          }
        });
      } catch (error) {
        return "";
      }
      if (partialSurrogatesWithoutEndpoint.exec(string2)) {
        throw new Error("Invalid unicode codepoint of surrogate pair without corresponding codepoint in " + string2);
      }
      return string2;
    }
    function createList(objects) {
      var list = blank(), head2 = list, listItems = [], listTriples, triples = [];
      objects.forEach(function(o2) {
        listItems.push(o2.entity);
        appendAllTo(triples, o2.triples);
      });
      for (var i = 0, j = 0, l = listItems.length, listTriples = Array(l * 2); i < l; )
        listTriples[j++] = triple(head2, Parser2.factory.namedNode(RDF_FIRST), listItems[i]), listTriples[j++] = triple(head2, Parser2.factory.namedNode(RDF_REST), head2 = ++i < l ? blank() : Parser2.factory.namedNode(RDF_NIL));
      return { entity: list, triples: appendAllTo(listTriples, triples) };
    }
    function createAnonymousObject(propertyList2) {
      var entity = blank();
      return {
        entity,
        triples: propertyList2.map(function(t) {
          return extend(triple(entity), t);
        })
      };
    }
    function objectListToTriples(predicate, objectList2, otherTriples) {
      var objects = [], triples = [];
      objectList2.forEach(function(l) {
        let annotation2 = null;
        if (l.annotation) {
          annotation2 = l.annotation;
          l = l.object;
        }
        objects.push(triple(null, predicate, l.entity, annotation2));
        appendAllTo(triples, l.triples);
      });
      return unionAll(objects, otherTriples || [], triples);
    }
    function getExpressionId2(expression3) {
      return expression3.variable ? expression3.variable.value : expression3.value || expression3.expression.value;
    }
    function getAggregatesOfExpression2(expression3) {
      if (!expression3) {
        return [];
      }
      if (expression3.type === "aggregate") {
        return [expression3];
      } else if (expression3.type === "operation") {
        const aggregates = [];
        for (const arg of expression3.args) {
          aggregates.push(...getAggregatesOfExpression2(arg));
        }
        return aggregates;
      }
      return [];
    }
    function getVariablesFromExpression2(expression3) {
      const variables = /* @__PURE__ */ new Set();
      const visitExpression = function(expr) {
        if (!expr) {
          return;
        }
        if (expr.termType === "Variable") {
          variables.add(expr);
        } else if (expr.type === "operation") {
          expr.args.forEach(visitExpression);
        }
      };
      visitExpression(expression3);
      return variables;
    }
    function flatten2(input, depth = 1, stack = []) {
      for (const item of input) {
        if (depth > 0 && item instanceof Array) {
          flatten2(item, depth - 1, stack);
        } else {
          stack.push(item);
        }
      }
      return stack;
    }
    function isVariable(term) {
      return term.termType === "Variable";
    }
    function getBoundVarsFromGroupGraphPattern(pattern) {
      if (pattern.triples) {
        const boundVars = [];
        for (const triple2 of pattern.triples) {
          if (isVariable(triple2.subject)) boundVars.push(triple2.subject.value);
          if (isVariable(triple2.predicate)) boundVars.push(triple2.predicate.value);
          if (isVariable(triple2.object)) boundVars.push(triple2.object.value);
        }
        return boundVars;
      } else if (pattern.patterns) {
        const boundVars = [];
        for (const pat of pattern.patterns) {
          boundVars.push(...getBoundVarsFromGroupGraphPattern(pat));
        }
        return boundVars;
      }
      return [];
    }
    function getDuplicatesInArray(array) {
      const sortedArray = array.slice().sort();
      const duplicates = [];
      for (let i = 0; i < sortedArray.length - 1; i++) {
        if (sortedArray[i + 1] == sortedArray[i]) {
          duplicates.push(sortedArray[i]);
        }
      }
      return duplicates;
    }
    function ensureSparqlStar(value) {
      if (!Parser2.sparqlStar) {
        throw new Error("SPARQL-star support is not enabled");
      }
      return value;
    }
    function _applyAnnotations(subject, annotations, arr) {
      for (const annotation2 of annotations) {
        const t = triple(
          // If the annotation already has a subject then just push the
          // annotation to the upper scope as it is a blank node introduced
          // from a pattern like :s :p :o {| :p1 [ :p2 :o2; :p3 :o3 ] |}
          "subject" in annotation2 ? annotation2.subject : subject,
          annotation2.predicate,
          annotation2.object
        );
        arr.push(t);
        if (annotation2.annotations) {
          _applyAnnotations(nestedTriple(
            subject,
            annotation2.predicate,
            annotation2.object
          ), annotation2.annotations, arr);
        }
      }
    }
    function applyAnnotations(triples) {
      if (Parser2.sparqlStar) {
        const newTriples = [];
        triples.forEach((t) => {
          const s = triple(t.subject, t.predicate, t.object);
          newTriples.push(s);
          if (t.annotations) {
            _applyAnnotations(nestedTriple(t.subject, t.predicate, t.object), t.annotations, newTriples);
          }
        });
        return newTriples;
      }
      return triples;
    }
    function ensureNoVariables(operations) {
      for (const operation2 of operations) {
        if (operation2.type === "graph" && operation2.name.termType === "Variable") {
          throw new Error("Detected illegal variable in GRAPH");
        }
        if (operation2.type === "bgp" || operation2.type === "graph") {
          for (const triple2 of operation2.triples) {
            if (triple2.subject.termType === "Variable" || triple2.predicate.termType === "Variable" || triple2.object.termType === "Variable") {
              throw new Error("Detected illegal variable in BGP");
            }
          }
        }
      }
      return operations;
    }
    function ensureNoBnodes(operations) {
      for (const operation2 of operations) {
        if (operation2.type === "bgp") {
          for (const triple2 of operation2.triples) {
            if (triple2.subject.termType === "BlankNode" || triple2.predicate.termType === "BlankNode" || triple2.object.termType === "BlankNode") {
              throw new Error("Detected illegal blank node in BGP");
            }
          }
        }
      }
      return operations;
    }
    var lexer = /* @__PURE__ */ function() {
      var lexer2 = {
        EOF: 1,
        parseError: function parseError(str2, hash) {
          if (this.yy.parser) {
            this.yy.parser.parseError(str2, hash);
          } else {
            throw new Error(str2);
          }
        },
        // resets the lexer, sets new input
        setInput: function(input, yy) {
          this.yy = yy || this.yy || {};
          this._input = input;
          this._more = this._backtrack = this.done = false;
          this.yylineno = this.yyleng = 0;
          this.yytext = this.matched = this.match = "";
          this.conditionStack = ["INITIAL"];
          this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
          };
          if (this.options.ranges) {
            this.yylloc.range = [0, 0];
          }
          this.offset = 0;
          return this;
        },
        // consumes and returns one char from the input
        input: function() {
          var ch = this._input[0];
          this.yytext += ch;
          this.yyleng++;
          this.offset++;
          this.match += ch;
          this.matched += ch;
          var lines = ch.match(/(?:\r\n?|\n).*/g);
          if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
          } else {
            this.yylloc.last_column++;
          }
          if (this.options.ranges) {
            this.yylloc.range[1]++;
          }
          this._input = this._input.slice(1);
          return ch;
        },
        // unshifts one char (or a string) into the input
        unput: function(ch) {
          var len = ch.length;
          var lines = ch.split(/(?:\r\n?|\n)/g);
          this._input = ch + this._input;
          this.yytext = this.yytext.substr(0, this.yytext.length - len);
          this.offset -= len;
          var oldLines = this.match.split(/(?:\r\n?|\n)/g);
          this.match = this.match.substr(0, this.match.length - 1);
          this.matched = this.matched.substr(0, this.matched.length - 1);
          if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
          }
          var r = this.yylloc.range;
          this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len
          };
          if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
          }
          this.yyleng = this.yytext.length;
          return this;
        },
        // When called from action, caches matched text and appends it on next action
        more: function() {
          this._more = true;
          return this;
        },
        // When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
        reject: function() {
          if (this.options.backtrack_lexer) {
            this._backtrack = true;
          } else {
            return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n" + this.showPosition(), {
              text: "",
              token: null,
              line: this.yylineno
            });
          }
          return this;
        },
        // retain first n characters of the match
        less: function(n) {
          this.unput(this.match.slice(n));
        },
        // displays already matched input, i.e. for error messages
        pastInput: function() {
          var past = this.matched.substr(0, this.matched.length - this.match.length);
          return (past.length > 20 ? "..." : "") + past.substr(-20).replace(/\n/g, "");
        },
        // displays upcoming input, i.e. for error messages
        upcomingInput: function() {
          var next = this.match;
          if (next.length < 20) {
            next += this._input.substr(0, 20 - next.length);
          }
          return (next.substr(0, 20) + (next.length > 20 ? "..." : "")).replace(/\n/g, "");
        },
        // displays the character position where the lexing error occurred, i.e. for error messages
        showPosition: function() {
          var pre = this.pastInput();
          var c = new Array(pre.length + 1).join("-");
          return pre + this.upcomingInput() + "\n" + c + "^";
        },
        // test the lexed token: return FALSE when not a match, otherwise return token
        test_match: function(match, indexed_rule) {
          var token, lines, backup;
          if (this.options.backtrack_lexer) {
            backup = {
              yylineno: this.yylineno,
              yylloc: {
                first_line: this.yylloc.first_line,
                last_line: this.last_line,
                first_column: this.yylloc.first_column,
                last_column: this.yylloc.last_column
              },
              yytext: this.yytext,
              match: this.match,
              matches: this.matches,
              matched: this.matched,
              yyleng: this.yyleng,
              offset: this.offset,
              _more: this._more,
              _input: this._input,
              yy: this.yy,
              conditionStack: this.conditionStack.slice(0),
              done: this.done
            };
            if (this.options.ranges) {
              backup.yylloc.range = this.yylloc.range.slice(0);
            }
          }
          lines = match[0].match(/(?:\r\n?|\n).*/g);
          if (lines) {
            this.yylineno += lines.length;
          }
          this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length
          };
          this.yytext += match[0];
          this.match += match[0];
          this.matches = match;
          this.yyleng = this.yytext.length;
          if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
          }
          this._more = false;
          this._backtrack = false;
          this._input = this._input.slice(match[0].length);
          this.matched += match[0];
          token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
          if (this.done && this._input) {
            this.done = false;
          }
          if (token) {
            return token;
          } else if (this._backtrack) {
            for (var k in backup) {
              this[k] = backup[k];
            }
            return false;
          }
          return false;
        },
        // return next match in input
        next: function() {
          if (this.done) {
            return this.EOF;
          }
          if (!this._input) {
            this.done = true;
          }
          var token, match, tempMatch, index;
          if (!this._more) {
            this.yytext = "";
            this.match = "";
          }
          var rules2 = this._currentRules();
          for (var i = 0; i < rules2.length; i++) {
            tempMatch = this._input.match(this.rules[rules2[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
              match = tempMatch;
              index = i;
              if (this.options.backtrack_lexer) {
                token = this.test_match(tempMatch, rules2[i]);
                if (token !== false) {
                  return token;
                } else if (this._backtrack) {
                  match = false;
                  continue;
                } else {
                  return false;
                }
              } else if (!this.options.flex) {
                break;
              }
            }
          }
          if (match) {
            token = this.test_match(match, rules2[index]);
            if (token !== false) {
              return token;
            }
            return false;
          }
          if (this._input === "") {
            return this.EOF;
          } else {
            return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". Unrecognized text.\n" + this.showPosition(), {
              text: "",
              token: null,
              line: this.yylineno
            });
          }
        },
        // return next match that has a token
        lex: function lex() {
          var r = this.next();
          if (r) {
            return r;
          } else {
            return this.lex();
          }
        },
        // activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
        begin: function begin(condition) {
          this.conditionStack.push(condition);
        },
        // pop the previously active lexer condition state off the condition stack
        popState: function popState() {
          var n = this.conditionStack.length - 1;
          if (n > 0) {
            return this.conditionStack.pop();
          } else {
            return this.conditionStack[0];
          }
        },
        // produce the lexer rule set which is active for the currently active lexer condition state
        _currentRules: function _currentRules() {
          if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
          } else {
            return this.conditions["INITIAL"].rules;
          }
        },
        // return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
        topState: function topState(n) {
          n = this.conditionStack.length - 1 - Math.abs(n || 0);
          if (n >= 0) {
            return this.conditionStack[n];
          } else {
            return "INITIAL";
          }
        },
        // alias for begin(condition)
        pushState: function pushState(condition) {
          this.begin(condition);
        },
        // return the number of states currently on the stack
        stateStackSize: function stateStackSize() {
          return this.conditionStack.length;
        },
        options: { "flex": true, "case-insensitive": true },
        performAction: function anonymous(yy, yy_, $avoiding_name_collisions, YY_START) {
          switch ($avoiding_name_collisions) {
            case 0:
              break;
            case 1:
              return 12;
            case 2:
              return 15;
            case 3:
              return 41;
            case 4:
              return 325;
            case 5:
              return 326;
            case 6:
              return 45;
            case 7:
              return 47;
            case 8:
              return 48;
            case 9:
              return 39;
            case 10:
              return 24;
            case 11:
              return 28;
            case 12:
              return 29;
            case 13:
              return 31;
            case 14:
              return 32;
            case 15:
              return 36;
            case 16:
              return 53;
            case 17:
              return 327;
            case 18:
              return 63;
            case 19:
              return 64;
            case 20:
              return 70;
            case 21:
              return 73;
            case 22:
              return 76;
            case 23:
              return 78;
            case 24:
              return 81;
            case 25:
              return 83;
            case 26:
              return 85;
            case 27:
              return 193;
            case 28:
              return 100;
            case 29:
              return 328;
            case 30:
              return 121;
            case 31:
              return 329;
            case 32:
              return 330;
            case 33:
              return 110;
            case 34:
              return 331;
            case 35:
              return 109;
            case 36:
              return 332;
            case 37:
              return 333;
            case 38:
              return 113;
            case 39:
              return 115;
            case 40:
              return 116;
            case 41:
              return 131;
            case 42:
              return 123;
            case 43:
              return 126;
            case 44:
              return 128;
            case 45:
              return 132;
            case 46:
              return 112;
            case 47:
              return 334;
            case 48:
              return 335;
            case 49:
              return 159;
            case 50:
              return 161;
            case 51:
              return 164;
            case 52:
              return 174;
            case 53:
              return 160;
            case 54:
              return 336;
            case 55:
              return 163;
            case 56:
              return 312;
            case 57:
              return 314;
            case 58:
              return 317;
            case 59:
              return 318;
            case 60:
              return 272;
            case 61:
              return 197;
            case 62:
              return 337;
            case 63:
              return 338;
            case 64:
              return 229;
            case 65:
              return 340;
            case 66:
              return 263;
            case 67:
              return 224;
            case 68:
              return 231;
            case 69:
              return 232;
            case 70:
              return 242;
            case 71:
              return 246;
            case 72:
              return 290;
            case 73:
              return 341;
            case 74:
              return 342;
            case 75:
              return 343;
            case 76:
              return 344;
            case 77:
              return 345;
            case 78:
              return 250;
            case 79:
              return 346;
            case 80:
              return 265;
            case 81:
              return 276;
            case 82:
              return 277;
            case 83:
              return 268;
            case 84:
              return 269;
            case 85:
              return 270;
            case 86:
              return 271;
            case 87:
              return 347;
            case 88:
              return 348;
            case 89:
              return 273;
            case 90:
              return 274;
            case 91:
              return 350;
            case 92:
              return 349;
            case 93:
              return 351;
            case 94:
              return 279;
            case 95:
              return 280;
            case 96:
              return 283;
            case 97:
              return 285;
            case 98:
              return 289;
            case 99:
              return 293;
            case 100:
              return 296;
            case 101:
              return 13;
            case 102:
              return 16;
            case 103:
              return 308;
            case 104:
              return 309;
            case 105:
              return 87;
            case 106:
              return 292;
            case 107:
              return 82;
            case 108:
              return 294;
            case 109:
              return 295;
            case 110:
              return 297;
            case 111:
              return 298;
            case 112:
              return 299;
            case 113:
              return 300;
            case 114:
              return 301;
            case 115:
              return 302;
            case 116:
              return "EXPONENT";
            case 117:
              return 303;
            case 118:
              return 304;
            case 119:
              return 305;
            case 120:
              return 306;
            case 121:
              return 89;
            case 122:
              return 310;
            case 123:
              return 6;
            case 124:
              return "INVALID";
            case 125:
              console.log(yy_.yytext);
              break;
          }
        },
        rules: [/^(?:\s+|(#[^\n\r]*))/i, /^(?:BASE)/i, /^(?:PREFIX)/i, /^(?:SELECT)/i, /^(?:DISTINCT)/i, /^(?:REDUCED)/i, /^(?:\()/i, /^(?:AS)/i, /^(?:\))/i, /^(?:\*)/i, /^(?:CONSTRUCT)/i, /^(?:WHERE)/i, /^(?:\{)/i, /^(?:\})/i, /^(?:DESCRIBE)/i, /^(?:ASK)/i, /^(?:FROM)/i, /^(?:NAMED)/i, /^(?:GROUP)/i, /^(?:BY)/i, /^(?:HAVING)/i, /^(?:ORDER)/i, /^(?:ASC)/i, /^(?:DESC)/i, /^(?:LIMIT)/i, /^(?:OFFSET)/i, /^(?:VALUES)/i, /^(?:;)/i, /^(?:LOAD)/i, /^(?:SILENT)/i, /^(?:INTO)/i, /^(?:CLEAR)/i, /^(?:DROP)/i, /^(?:CREATE)/i, /^(?:ADD)/i, /^(?:TO)/i, /^(?:MOVE)/i, /^(?:COPY)/i, /^(?:INSERT((\s+|(#[^\n\r]*)\n\r?)+)DATA)/i, /^(?:DELETE((\s+|(#[^\n\r]*)\n\r?)+)DATA)/i, /^(?:DELETE((\s+|(#[^\n\r]*)\n\r?)+)WHERE)/i, /^(?:WITH)/i, /^(?:DELETE)/i, /^(?:INSERT)/i, /^(?:USING)/i, /^(?:DEFAULT)/i, /^(?:GRAPH)/i, /^(?:ALL)/i, /^(?:\.)/i, /^(?:OPTIONAL)/i, /^(?:SERVICE)/i, /^(?:BIND)/i, /^(?:UNDEF)/i, /^(?:MINUS)/i, /^(?:UNION)/i, /^(?:FILTER)/i, /^(?:<<)/i, /^(?:>>)/i, /^(?:\{\|)/i, /^(?:\|\})/i, /^(?:,)/i, /^(?:a)/i, /^(?:\|)/i, /^(?:\/)/i, /^(?:\^)/i, /^(?:\?)/i, /^(?:\+)/i, /^(?:!)/i, /^(?:\[)/i, /^(?:\])/i, /^(?:\|\|)/i, /^(?:&&)/i, /^(?:=)/i, /^(?:!=)/i, /^(?:<)/i, /^(?:>)/i, /^(?:<=)/i, /^(?:>=)/i, /^(?:IN)/i, /^(?:NOT)/i, /^(?:-)/i, /^(?:BOUND)/i, /^(?:BNODE)/i, /^(?:(RAND|NOW|UUID|STRUUID))/i, /^(?:(LANG|DATATYPE|IRI|URI|ABS|CEIL|FLOOR|ROUND|STRLEN|STR|UCASE|LCASE|ENCODE_FOR_URI|YEAR|MONTH|DAY|HOURS|MINUTES|SECONDS|TIMEZONE|TZ|MD5|SHA1|SHA256|SHA384|SHA512|isIRI|isURI|isBLANK|isLITERAL|isNUMERIC))/i, /^(?:(SUBJECT|PREDICATE|OBJECT|isTRIPLE))/i, /^(?:(LANGMATCHES|CONTAINS|STRSTARTS|STRENDS|STRBEFORE|STRAFTER|STRLANG|STRDT|sameTerm))/i, /^(?:CONCAT)/i, /^(?:COALESCE)/i, /^(?:IF)/i, /^(?:TRIPLE)/i, /^(?:REGEX)/i, /^(?:SUBSTR)/i, /^(?:REPLACE)/i, /^(?:EXISTS)/i, /^(?:COUNT)/i, /^(?:SUM|MIN|MAX|AVG|SAMPLE)/i, /^(?:GROUP_CONCAT)/i, /^(?:SEPARATOR)/i, /^(?:\^\^)/i, /^(?:true|false)/i, /^(?:(<(?:[^<>\"\{\}\|\^`\\\u0000-\u0020])*>))/i, /^(?:((([A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])(?:(?:(((?:([A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])|_))|-|[0-9]|\u00B7|[\u0300-\u036F\u203F-\u2040])|\.)*(((?:([A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])|_))|-|[0-9]|\u00B7|[\u0300-\u036F\u203F-\u2040]))?)?:))/i, /^(?:(((([A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])(?:(?:(((?:([A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])|_))|-|[0-9]|\u00B7|[\u0300-\u036F\u203F-\u2040])|\.)*(((?:([A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])|_))|-|[0-9]|\u00B7|[\u0300-\u036F\u203F-\u2040]))?)?:)((?:((?:([A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])|_))|:|[0-9]|((%([0-9A-Fa-f])([0-9A-Fa-f]))|(\\(_|~|\.|-|!|\$|&|'|\(|\)|\*|\+|,|;|=|\/|\?|#|@|%))))(?:(?:(((?:([A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])|_))|-|[0-9]|\u00B7|[\u0300-\u036F\u203F-\u2040])|\.|:|((%([0-9A-Fa-f])([0-9A-Fa-f]))|(\\(_|~|\.|-|!|\$|&|'|\(|\)|\*|\+|,|;|=|\/|\?|#|@|%))))*(?:(((?:([A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])|_))|-|[0-9]|\u00B7|[\u0300-\u036F\u203F-\u2040])|:|((%([0-9A-Fa-f])([0-9A-Fa-f]))|(\\(_|~|\.|-|!|\$|&|'|\(|\)|\*|\+|,|;|=|\/|\?|#|@|%)))))?)))/i, /^(?:(_:(?:((?:([A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])|_))|[0-9])(?:(?:(((?:([A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])|_))|-|[0-9]|\u00B7|[\u0300-\u036F\u203F-\u2040])|\.)*(((?:([A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])|_))|-|[0-9]|\u00B7|[\u0300-\u036F\u203F-\u2040]))?))/i, /^(?:([\?\$]((?:((?:([A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])|_))|[0-9])(?:((?:([A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])|_))|[0-9]|\u00B7|[\u0300-\u036F\u203F-\u2040])*)))/i, /^(?:(@[a-zA-Z]+(?:-[a-zA-Z0-9]+)*))/i, /^(?:([0-9]+))/i, /^(?:([0-9]*\.[0-9]+))/i, /^(?:([0-9]+\.[0-9]*([eE][+-]?[0-9]+)|\.([0-9])+([eE][+-]?[0-9]+)|([0-9])+([eE][+-]?[0-9]+)))/i, /^(?:(\+([0-9]+)))/i, /^(?:(\+([0-9]*\.[0-9]+)))/i, /^(?:(\+([0-9]+\.[0-9]*([eE][+-]?[0-9]+)|\.([0-9])+([eE][+-]?[0-9]+)|([0-9])+([eE][+-]?[0-9]+))))/i, /^(?:(-([0-9]+)))/i, /^(?:(-([0-9]*\.[0-9]+)))/i, /^(?:(-([0-9]+\.[0-9]*([eE][+-]?[0-9]+)|\.([0-9])+([eE][+-]?[0-9]+)|([0-9])+([eE][+-]?[0-9]+))))/i, /^(?:([eE][+-]?[0-9]+))/i, /^(?:('(?:(?:[^\u0027\u005C\u000A\u000D])|(\\[tbnrf\\\"']|\\u([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])|\\U([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])))*'))/i, /^(?:("(?:(?:[^\u0022\u005C\u000A\u000D])|(\\[tbnrf\\\"']|\\u([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])|\\U([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])))*"))/i, /^(?:('''(?:(?:'|'')?(?:[^'\\]|(\\[tbnrf\\\"']|\\u([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])|\\U([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f]))))*'''))/i, /^(?:("""(?:(?:"|"")?(?:[^\"\\]|(\\[tbnrf\\\"']|\\u([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])|\\U([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f]))))*"""))/i, /^(?:(\((\u0020|\u0009|\u000D|\u000A)*\)))/i, /^(?:(\[(\u0020|\u0009|\u000D|\u000A)*\]))/i, /^(?:$)/i, /^(?:.)/i, /^(?:.)/i],
        conditions: { "INITIAL": { "rules": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125], "inclusive": true } }
      };
      return lexer2;
    }();
    parser.lexer = lexer;
    function Parser2() {
      this.yy = {};
    }
    Parser2.prototype = parser;
    parser.Parser = Parser2;
    return new Parser2();
  }();
  var SparqlParser_1 = SparqlParser;
  var rdfDataFactory = {};
  var BlankNode$1 = {};
  Object.defineProperty(BlankNode$1, "__esModule", { value: true });
  BlankNode$1.BlankNode = void 0;
  class BlankNode {
    constructor(value) {
      this.termType = "BlankNode";
      this.value = value;
    }
    equals(other) {
      return !!other && other.termType === "BlankNode" && other.value === this.value;
    }
  }
  BlankNode$1.BlankNode = BlankNode;
  var DataFactory$2 = {};
  var DefaultGraph$1 = {};
  Object.defineProperty(DefaultGraph$1, "__esModule", { value: true });
  DefaultGraph$1.DefaultGraph = void 0;
  class DefaultGraph {
    constructor() {
      this.termType = "DefaultGraph";
      this.value = "";
    }
    equals(other) {
      return !!other && other.termType === "DefaultGraph";
    }
  }
  DefaultGraph$1.DefaultGraph = DefaultGraph;
  DefaultGraph.INSTANCE = new DefaultGraph();
  var Literal$1 = {};
  var NamedNode$1 = {};
  Object.defineProperty(NamedNode$1, "__esModule", { value: true });
  NamedNode$1.NamedNode = void 0;
  class NamedNode {
    constructor(value) {
      this.termType = "NamedNode";
      this.value = value;
    }
    equals(other) {
      return !!other && other.termType === "NamedNode" && other.value === this.value;
    }
  }
  NamedNode$1.NamedNode = NamedNode;
  Object.defineProperty(Literal$1, "__esModule", { value: true });
  Literal$1.Literal = void 0;
  const NamedNode_1$1 = NamedNode$1;
  class Literal {
    constructor(value, languageOrDatatype) {
      this.termType = "Literal";
      this.value = value;
      if (typeof languageOrDatatype === "string") {
        this.language = languageOrDatatype;
        this.datatype = Literal.RDF_LANGUAGE_STRING;
      } else if (languageOrDatatype) {
        this.language = "";
        this.datatype = languageOrDatatype;
      } else {
        this.language = "";
        this.datatype = Literal.XSD_STRING;
      }
    }
    equals(other) {
      return !!other && other.termType === "Literal" && other.value === this.value && other.language === this.language && this.datatype.equals(other.datatype);
    }
  }
  Literal$1.Literal = Literal;
  Literal.RDF_LANGUAGE_STRING = new NamedNode_1$1.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#langString");
  Literal.XSD_STRING = new NamedNode_1$1.NamedNode("http://www.w3.org/2001/XMLSchema#string");
  var Quad$1 = {};
  Object.defineProperty(Quad$1, "__esModule", { value: true });
  Quad$1.Quad = void 0;
  class Quad {
    constructor(subject, predicate, object2, graph2) {
      this.termType = "Quad";
      this.value = "";
      this.subject = subject;
      this.predicate = predicate;
      this.object = object2;
      this.graph = graph2;
    }
    equals(other) {
      return !!other && (other.termType === "Quad" || !other.termType) && this.subject.equals(other.subject) && this.predicate.equals(other.predicate) && this.object.equals(other.object) && this.graph.equals(other.graph);
    }
  }
  Quad$1.Quad = Quad;
  var Variable$1 = {};
  Object.defineProperty(Variable$1, "__esModule", { value: true });
  Variable$1.Variable = void 0;
  class Variable {
    constructor(value) {
      this.termType = "Variable";
      this.value = value;
    }
    equals(other) {
      return !!other && other.termType === "Variable" && other.value === this.value;
    }
  }
  Variable$1.Variable = Variable;
  Object.defineProperty(DataFactory$2, "__esModule", { value: true });
  DataFactory$2.DataFactory = void 0;
  const BlankNode_1 = BlankNode$1;
  const DefaultGraph_1 = DefaultGraph$1;
  const Literal_1 = Literal$1;
  const NamedNode_1 = NamedNode$1;
  const Quad_1 = Quad$1;
  const Variable_1 = Variable$1;
  let dataFactoryCounter = 0;
  let DataFactory$1 = class DataFactory {
    constructor(options) {
      this.blankNodeCounter = 0;
      options = options || {};
      this.blankNodePrefix = options.blankNodePrefix || `df_${dataFactoryCounter++}_`;
    }
    /**
     * @param value The IRI for the named node.
     * @return A new instance of NamedNode.
     * @see NamedNode
     */
    namedNode(value) {
      return new NamedNode_1.NamedNode(value);
    }
    /**
     * @param value The optional blank node identifier.
     * @return A new instance of BlankNode.
     *         If the `value` parameter is undefined a new identifier
     *         for the blank node is generated for each call.
     * @see BlankNode
     */
    blankNode(value) {
      return new BlankNode_1.BlankNode(value || `${this.blankNodePrefix}${this.blankNodeCounter++}`);
    }
    /**
     * @param value              The literal value.
     * @param languageOrDatatype The optional language or datatype.
     *                           If `languageOrDatatype` is a NamedNode,
     *                           then it is used for the value of `NamedNode.datatype`.
     *                           Otherwise `languageOrDatatype` is used for the value
     *                           of `NamedNode.language`.
     * @return A new instance of Literal.
     * @see Literal
     */
    literal(value, languageOrDatatype) {
      return new Literal_1.Literal(value, languageOrDatatype);
    }
    /**
     * This method is optional.
     * @param value The variable name
     * @return A new instance of Variable.
     * @see Variable
     */
    variable(value) {
      return new Variable_1.Variable(value);
    }
    /**
     * @return An instance of DefaultGraph.
     */
    defaultGraph() {
      return DefaultGraph_1.DefaultGraph.INSTANCE;
    }
    /**
     * @param subject   The quad subject term.
     * @param predicate The quad predicate term.
     * @param object    The quad object term.
     * @param graph     The quad graph term.
     * @return A new instance of Quad.
     * @see Quad
     */
    quad(subject, predicate, object2, graph2) {
      return new Quad_1.Quad(subject, predicate, object2, graph2 || this.defaultGraph());
    }
    /**
     * Create a deep copy of the given term using this data factory.
     * @param original An RDF term.
     * @return A deep copy of the given term.
     */
    fromTerm(original) {
      switch (original.termType) {
        case "NamedNode":
          return this.namedNode(original.value);
        case "BlankNode":
          return this.blankNode(original.value);
        case "Literal":
          if (original.language) {
            return this.literal(original.value, original.language);
          }
          if (!original.datatype.equals(Literal_1.Literal.XSD_STRING)) {
            return this.literal(original.value, this.fromTerm(original.datatype));
          }
          return this.literal(original.value);
        case "Variable":
          return this.variable(original.value);
        case "DefaultGraph":
          return this.defaultGraph();
        case "Quad":
          return this.quad(this.fromTerm(original.subject), this.fromTerm(original.predicate), this.fromTerm(original.object), this.fromTerm(original.graph));
      }
    }
    /**
     * Create a deep copy of the given quad using this data factory.
     * @param original An RDF quad.
     * @return A deep copy of the given quad.
     */
    fromQuad(original) {
      return this.fromTerm(original);
    }
    /**
     * Reset the internal blank node counter.
     */
    resetBlankNodeCounter() {
      this.blankNodeCounter = 0;
    }
  };
  DataFactory$2.DataFactory = DataFactory$1;
  (function(exports$1) {
    var __createBinding = commonjsGlobal && commonjsGlobal.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = commonjsGlobal && commonjsGlobal.__exportStar || function(m, exports$12) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$12, p)) __createBinding(exports$12, m, p);
    };
    Object.defineProperty(exports$1, "__esModule", { value: true });
    __exportStar(BlankNode$1, exports$1);
    __exportStar(DataFactory$2, exports$1);
    __exportStar(DefaultGraph$1, exports$1);
    __exportStar(Literal$1, exports$1);
    __exportStar(NamedNode$1, exports$1);
    __exportStar(Quad$1, exports$1);
    __exportStar(Variable$1, exports$1);
  })(rdfDataFactory);
  const { Parser: Parser$2 } = SparqlParser_1;
  const { DataFactory } = rdfDataFactory;
  function _Parser({
    prefixes,
    baseIRI,
    factory,
    pathOnly,
    sparqlStar,
    skipValidation,
    skipUngroupedVariableCheck
  } = {}) {
    const prefixesCopy = {};
    for (const prefix in prefixes ?? {})
      prefixesCopy[prefix] = prefixes[prefix];
    const parser = new Parser$2();
    parser.parse = function() {
      Parser$2.base = baseIRI || "";
      Parser$2.prefixes = Object.create(prefixesCopy);
      Parser$2.factory = factory || new DataFactory();
      Parser$2.sparqlStar = Boolean(sparqlStar);
      Parser$2.pathOnly = Boolean(pathOnly);
      Parser$2.skipValidation = Boolean(skipValidation) || Boolean(skipUngroupedVariableCheck);
      return Parser$2.prototype.parse.apply(parser, arguments);
    };
    parser._resetBlanks = Parser$2._resetBlanks;
    return parser;
  }
  var sparql = {
    Parser: _Parser
  };
  class AstCoreFactory {
    constructor(args = {}) {
      /**
       * Whether this AstFactory will track source location. Default: true.
       * In case source location is not tracked,
       * each generated node using this factory will be {@link SourceLocationNodeAutoGenerate}
       */
      __publicField(this, "tracksSourceLocation");
      this.tracksSourceLocation = args.tracksSourceLocation ?? true;
    }
    /**
     * Wrap any type into an object that tracks the source location of tha value.
     * @param val the value to wrap
     * @param loc the source location for that value
     */
    wrap(val, loc) {
      return { val, loc };
    }
    /**
     * Whether the provided value is an object that tracks source location.
     * @param obj
     */
    isLocalized(obj) {
      return typeof obj === "object" && obj !== null && "loc" in obj && typeof obj.loc === "object" && obj.loc !== null && "sourceLocationType" in obj.loc;
    }
    /**
     * Compute the source location of an element based on the elements it contains.
     * The provided arguments should be in order of occurrence in the string.
     */
    sourceLocation(...elements) {
      if (!this.tracksSourceLocation) {
        return this.gen();
      }
      const pureElements = elements.filter((x) => x !== void 0);
      if (pureElements.length === 0) {
        return this.sourceLocationNoMaterialize();
      }
      const filtered = pureElements.filter((element) => !this.isLocalized(element) || this.isSourceLocationSource(element.loc) || this.isSourceLocationStringReplace(element.loc) || this.isSourceLocationNodeReplace(element.loc));
      if (filtered.length === 0) {
        return this.gen();
      }
      const first2 = filtered.at(0);
      const last2 = filtered.at(-1);
      return {
        sourceLocationType: "source",
        start: this.isLocalized(first2) ? first2.loc.start : first2.startOffset,
        end: this.isLocalized(last2) ? last2.loc.end : last2.endOffset + 1
      };
    }
    /**
     * Generate a source location indicating the no materialization.
     */
    sourceLocationNoMaterialize() {
      if (!this.tracksSourceLocation) {
        return this.gen();
      }
      return { sourceLocationType: "noMaterialize" };
    }
    /**
     * Returns a copy of the argument that is not materialized
     */
    dematerialized(arg) {
      return { ...arg, loc: this.sourceLocationNoMaterialize() };
    }
    /**
     * Given a value and some mapper from objects to objects,
     * map all containing items in case it is an array,
     * otherwise map the provided value in case it is an object, finally, do nothing.
     * @param value the value to map
     * @param mapper the function mapping an object to another object.
     */
    safeObjectTransform(value, mapper) {
      if (value && typeof value === "object") {
        if (Array.isArray(value)) {
          return value.map((x) => this.safeObjectTransform(x, mapper));
        }
        return mapper(value);
      }
      return value;
    }
    /**
     * Given a (AST) tree, return a copy of that tree where it and it's
     * descendents all have a {@link SourceLocationNodeAutoGenerate} localization.
     */
    forcedAutoGenTree(obj) {
      const copy2 = { ...obj };
      for (const [key, value] of Object.entries(copy2)) {
        copy2[key] = this.safeObjectTransform(value, (obj2) => this.forcedAutoGenTree(obj2));
      }
      if (this.isLocalized(copy2)) {
        copy2.loc = this.gen();
      }
      return copy2;
    }
    /**
     * In case the provided Node is not yet materialized, force it to be autoGenerated.
     */
    forceMaterialized(arg) {
      if (this.isSourceLocationNoMaterialize(arg.loc)) {
        return this.forcedAutoGenTree(arg);
      }
      return { ...arg };
    }
    /**
     * Check whether an object is in fact a {@link SourceLocation}.
     * @param loc
     */
    isSourceLocation(loc) {
      return "sourceLocationType" in loc;
    }
    /**
     * Create a {@link SourceLocation} that indicates what range of characters this node represents in the source string.
     */
    sourceLocationSource(start, end) {
      return {
        sourceLocationType: "source",
        start,
        end
      };
    }
    /**
     * Create a {@link SourceLocation} that indicates a given range of the current range should be replaced by
     * a new source.
     */
    sourceLocationInlinedSource(newSource, subLoc, start, end, startOnNew = 0, endOnNew = newSource.length) {
      if (!this.tracksSourceLocation) {
        return this.gen();
      }
      if (this.isSourceLocationSource(subLoc)) {
        startOnNew = subLoc.start;
        endOnNew = subLoc.end;
      }
      return {
        sourceLocationType: "inlinedSource",
        newSource,
        start,
        end,
        loc: subLoc,
        startOnNew,
        endOnNew
      };
    }
    /**
     * Guard to check if an object is a {@link SourceLocation} of type {@link SourceLocationInlinedSource}.
     */
    isSourceLocationInlinedSource(loc) {
      return this.isSourceLocation(loc) && loc.sourceLocationType === "inlinedSource";
    }
    /**
     * Create a {@link SourceLocation} indicating the node should be autoGenerated by a generator.
     */
    gen() {
      return { sourceLocationType: "autoGenerate" };
    }
    /**
     * Guard to check if an object is a {@link SourceLocation} of type {@link SourceLocationSource}.
     */
    isSourceLocationSource(loc) {
      return this.isSourceLocation(loc) && loc.sourceLocationType === "source";
    }
    /**
     * Create a {@link SourceLocation} that indicates this node,
     * representing a range of characters in the original string, should be replaced by some string during generation.
     */
    sourceLocationStringReplace(newSource, start, end) {
      if (!this.tracksSourceLocation) {
        return this.gen();
      }
      return { sourceLocationType: "stringReplace", newSource, start, end };
    }
    /**
     * Guard to check if an object is a {@link SourceLocation} of type {@link SourceLocationStringReplace}.
     * @param loc
     */
    isSourceLocationStringReplace(loc) {
      return this.isSourceLocation(loc) && loc.sourceLocationType === "stringReplace";
    }
    /**
     * Given a sourceLocation, generate a new {@link SourceLocation}
     * that indicates the range of the given location should now be autoGenerated
     */
    sourceLocationNodeReplaceUnsafe(loc) {
      if (this.isSourceLocationSource(loc)) {
        return this.sourceLocationNodeReplace(loc);
      }
      if (this.isSourceLocationInlinedSource(loc)) {
        return this.sourceLocationNodeReplaceUnsafe(loc.loc);
      }
      throw new Error(`Cannot convert SourceLocation of type ${loc.sourceLocationType} to SourceLocationNodeReplace`);
    }
    sourceLocationNodeReplace(startOrLoc, end) {
      let starting;
      let ending;
      if (typeof startOrLoc === "number") {
        starting = startOrLoc;
        ending = end;
      } else {
        starting = startOrLoc.start;
        ending = startOrLoc.end;
      }
      return {
        sourceLocationType: "nodeReplace",
        start: starting,
        end: ending
      };
    }
    /**
     * Guard to check if an object is a {@link SourceLocation} of type {@link SourceLocationNodeReplace}.
     */
    isSourceLocationNodeReplace(loc) {
      return this.isSourceLocation(loc) && loc.sourceLocationType === "nodeReplace";
    }
    /**
     * Guard to check if an object is a {@link SourceLocation} of type {@link SourceLocationNodeAutoGenerate}.
     */
    isSourceLocationNodeAutoGenerate(loc) {
      return this.isSourceLocation(loc) && loc.sourceLocationType === "autoGenerate";
    }
    /**
     * Check whether the provided {@link SourceLocation} expects the generator to autoGenerate.
     */
    isPrintingLoc(loc) {
      return this.isSourceLocationNodeReplace(loc) || this.isSourceLocationNodeAutoGenerate(loc) || this.isSourceLocationInlinedSource(loc) && this.isPrintingLoc(loc.loc);
    }
    /**
     * A simple filter that will only execute the provided callback when the provided {@link SourceLocation}
     * expects the generator steps to autoGenerate.
     */
    printFilter(node, callback) {
      if (this.isPrintingLoc(node.loc)) {
        callback();
      }
    }
    /**
     * Guard to check if an object is a {@link SourceLocation} of type {@link SourceLocationNoMaterialize}.
     */
    isSourceLocationNoMaterialize(loc) {
      return this.isSourceLocation(loc) && loc.sourceLocationType === "noMaterialize";
    }
    /**
     * Guard to check if an object is the specified Type: {@link Typed}.
     */
    isOfType(obj, type) {
      const casted = obj;
      return casted.type === type;
    }
    /**
     * Guard to check if an object is the specified Type: {@link SubTyped}.
     */
    isOfSubType(obj, type, subType) {
      const temp = obj;
      return temp.type === type && temp.subType === subType;
    }
  }
  var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
  var freeSelf = typeof self == "object" && self && self.Object === Object && self;
  var root = freeGlobal || freeSelf || Function("return this")();
  var Symbol$1 = root.Symbol;
  var objectProto$j = Object.prototype;
  var hasOwnProperty$g = objectProto$j.hasOwnProperty;
  var nativeObjectToString$1 = objectProto$j.toString;
  var symToStringTag$1 = Symbol$1 ? Symbol$1.toStringTag : void 0;
  function getRawTag(value) {
    var isOwn = hasOwnProperty$g.call(value, symToStringTag$1), tag = value[symToStringTag$1];
    try {
      value[symToStringTag$1] = void 0;
      var unmasked = true;
    } catch (e) {
    }
    var result = nativeObjectToString$1.call(value);
    if (unmasked) {
      if (isOwn) {
        value[symToStringTag$1] = tag;
      } else {
        delete value[symToStringTag$1];
      }
    }
    return result;
  }
  var objectProto$i = Object.prototype;
  var nativeObjectToString = objectProto$i.toString;
  function objectToString(value) {
    return nativeObjectToString.call(value);
  }
  var nullTag = "[object Null]", undefinedTag = "[object Undefined]";
  var symToStringTag = Symbol$1 ? Symbol$1.toStringTag : void 0;
  function baseGetTag(value) {
    if (value == null) {
      return value === void 0 ? undefinedTag : nullTag;
    }
    return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
  }
  function isObjectLike(value) {
    return value != null && typeof value == "object";
  }
  var symbolTag$3 = "[object Symbol]";
  function isSymbol(value) {
    return typeof value == "symbol" || isObjectLike(value) && baseGetTag(value) == symbolTag$3;
  }
  function arrayMap(array, iteratee) {
    var index = -1, length = array == null ? 0 : array.length, result = Array(length);
    while (++index < length) {
      result[index] = iteratee(array[index], index, array);
    }
    return result;
  }
  var isArray = Array.isArray;
  var symbolProto$2 = Symbol$1 ? Symbol$1.prototype : void 0, symbolToString = symbolProto$2 ? symbolProto$2.toString : void 0;
  function baseToString(value) {
    if (typeof value == "string") {
      return value;
    }
    if (isArray(value)) {
      return arrayMap(value, baseToString) + "";
    }
    if (isSymbol(value)) {
      return symbolToString ? symbolToString.call(value) : "";
    }
    var result = value + "";
    return result == "0" && 1 / value == -Infinity ? "-0" : result;
  }
  var reWhitespace = /\s/;
  function trimmedEndIndex(string2) {
    var index = string2.length;
    while (index-- && reWhitespace.test(string2.charAt(index))) {
    }
    return index;
  }
  var reTrimStart = /^\s+/;
  function baseTrim(string2) {
    return string2 ? string2.slice(0, trimmedEndIndex(string2) + 1).replace(reTrimStart, "") : string2;
  }
  function isObject(value) {
    var type = typeof value;
    return value != null && (type == "object" || type == "function");
  }
  var NAN = 0 / 0;
  var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
  var reIsBinary = /^0b[01]+$/i;
  var reIsOctal = /^0o[0-7]+$/i;
  var freeParseInt = parseInt;
  function toNumber(value) {
    if (typeof value == "number") {
      return value;
    }
    if (isSymbol(value)) {
      return NAN;
    }
    if (isObject(value)) {
      var other = typeof value.valueOf == "function" ? value.valueOf() : value;
      value = isObject(other) ? other + "" : other;
    }
    if (typeof value != "string") {
      return value === 0 ? value : +value;
    }
    value = baseTrim(value);
    var isBinary = reIsBinary.test(value);
    return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
  }
  var INFINITY$1 = 1 / 0, MAX_INTEGER = 17976931348623157e292;
  function toFinite(value) {
    if (!value) {
      return value === 0 ? value : 0;
    }
    value = toNumber(value);
    if (value === INFINITY$1 || value === -INFINITY$1) {
      var sign = value < 0 ? -1 : 1;
      return sign * MAX_INTEGER;
    }
    return value === value ? value : 0;
  }
  function toInteger(value) {
    var result = toFinite(value), remainder = result % 1;
    return result === result ? remainder ? result - remainder : result : 0;
  }
  function identity(value) {
    return value;
  }
  var asyncTag = "[object AsyncFunction]", funcTag$2 = "[object Function]", genTag$1 = "[object GeneratorFunction]", proxyTag = "[object Proxy]";
  function isFunction(value) {
    if (!isObject(value)) {
      return false;
    }
    var tag = baseGetTag(value);
    return tag == funcTag$2 || tag == genTag$1 || tag == asyncTag || tag == proxyTag;
  }
  var coreJsData = root["__core-js_shared__"];
  var maskSrcKey = function() {
    var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
    return uid ? "Symbol(src)_1." + uid : "";
  }();
  function isMasked(func) {
    return !!maskSrcKey && maskSrcKey in func;
  }
  var funcProto$1 = Function.prototype;
  var funcToString$1 = funcProto$1.toString;
  function toSource(func) {
    if (func != null) {
      try {
        return funcToString$1.call(func);
      } catch (e) {
      }
      try {
        return func + "";
      } catch (e) {
      }
    }
    return "";
  }
  var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
  var reIsHostCtor = /^\[object .+?Constructor\]$/;
  var funcProto = Function.prototype, objectProto$h = Object.prototype;
  var funcToString = funcProto.toString;
  var hasOwnProperty$f = objectProto$h.hasOwnProperty;
  var reIsNative = RegExp(
    "^" + funcToString.call(hasOwnProperty$f).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
  );
  function baseIsNative(value) {
    if (!isObject(value) || isMasked(value)) {
      return false;
    }
    var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
    return pattern.test(toSource(value));
  }
  function getValue(object2, key) {
    return object2 == null ? void 0 : object2[key];
  }
  function getNative(object2, key) {
    var value = getValue(object2, key);
    return baseIsNative(value) ? value : void 0;
  }
  var WeakMap$1 = getNative(root, "WeakMap");
  var objectCreate = Object.create;
  var baseCreate = /* @__PURE__ */ function() {
    function object2() {
    }
    return function(proto) {
      if (!isObject(proto)) {
        return {};
      }
      if (objectCreate) {
        return objectCreate(proto);
      }
      object2.prototype = proto;
      var result = new object2();
      object2.prototype = void 0;
      return result;
    };
  }();
  function apply(func, thisArg, args) {
    switch (args.length) {
      case 0:
        return func.call(thisArg);
      case 1:
        return func.call(thisArg, args[0]);
      case 2:
        return func.call(thisArg, args[0], args[1]);
      case 3:
        return func.call(thisArg, args[0], args[1], args[2]);
    }
    return func.apply(thisArg, args);
  }
  function noop() {
  }
  function copyArray(source, array) {
    var index = -1, length = source.length;
    array || (array = Array(length));
    while (++index < length) {
      array[index] = source[index];
    }
    return array;
  }
  var HOT_COUNT = 800, HOT_SPAN = 16;
  var nativeNow = Date.now;
  function shortOut(func) {
    var count2 = 0, lastCalled = 0;
    return function() {
      var stamp = nativeNow(), remaining = HOT_SPAN - (stamp - lastCalled);
      lastCalled = stamp;
      if (remaining > 0) {
        if (++count2 >= HOT_COUNT) {
          return arguments[0];
        }
      } else {
        count2 = 0;
      }
      return func.apply(void 0, arguments);
    };
  }
  function constant(value) {
    return function() {
      return value;
    };
  }
  var defineProperty = function() {
    try {
      var func = getNative(Object, "defineProperty");
      func({}, "", {});
      return func;
    } catch (e) {
    }
  }();
  var baseSetToString = !defineProperty ? identity : function(func, string2) {
    return defineProperty(func, "toString", {
      "configurable": true,
      "enumerable": false,
      "value": constant(string2),
      "writable": true
    });
  };
  var setToString = shortOut(baseSetToString);
  function arrayEach(array, iteratee) {
    var index = -1, length = array == null ? 0 : array.length;
    while (++index < length) {
      if (iteratee(array[index], index, array) === false) {
        break;
      }
    }
    return array;
  }
  function baseFindIndex(array, predicate, fromIndex, fromRight) {
    var length = array.length, index = fromIndex + -1;
    while (++index < length) {
      if (predicate(array[index], index, array)) {
        return index;
      }
    }
    return -1;
  }
  function baseIsNaN(value) {
    return value !== value;
  }
  function strictIndexOf(array, value, fromIndex) {
    var index = fromIndex - 1, length = array.length;
    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }
  function baseIndexOf(array, value, fromIndex) {
    return value === value ? strictIndexOf(array, value, fromIndex) : baseFindIndex(array, baseIsNaN, fromIndex);
  }
  function arrayIncludes(array, value) {
    var length = array == null ? 0 : array.length;
    return !!length && baseIndexOf(array, value, 0) > -1;
  }
  var MAX_SAFE_INTEGER$1 = 9007199254740991;
  var reIsUint = /^(?:0|[1-9]\d*)$/;
  function isIndex(value, length) {
    var type = typeof value;
    length = length == null ? MAX_SAFE_INTEGER$1 : length;
    return !!length && (type == "number" || type != "symbol" && reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
  }
  function baseAssignValue(object2, key, value) {
    if (key == "__proto__" && defineProperty) {
      defineProperty(object2, key, {
        "configurable": true,
        "enumerable": true,
        "value": value,
        "writable": true
      });
    } else {
      object2[key] = value;
    }
  }
  function eq(value, other) {
    return value === other || value !== value && other !== other;
  }
  var objectProto$g = Object.prototype;
  var hasOwnProperty$e = objectProto$g.hasOwnProperty;
  function assignValue(object2, key, value) {
    var objValue = object2[key];
    if (!(hasOwnProperty$e.call(object2, key) && eq(objValue, value)) || value === void 0 && !(key in object2)) {
      baseAssignValue(object2, key, value);
    }
  }
  function copyObject(source, props, object2, customizer) {
    var isNew = !object2;
    object2 || (object2 = {});
    var index = -1, length = props.length;
    while (++index < length) {
      var key = props[index];
      var newValue = void 0;
      if (newValue === void 0) {
        newValue = source[key];
      }
      if (isNew) {
        baseAssignValue(object2, key, newValue);
      } else {
        assignValue(object2, key, newValue);
      }
    }
    return object2;
  }
  var nativeMax$2 = Math.max;
  function overRest(func, start, transform) {
    start = nativeMax$2(start === void 0 ? func.length - 1 : start, 0);
    return function() {
      var args = arguments, index = -1, length = nativeMax$2(args.length - start, 0), array = Array(length);
      while (++index < length) {
        array[index] = args[start + index];
      }
      index = -1;
      var otherArgs = Array(start + 1);
      while (++index < start) {
        otherArgs[index] = args[index];
      }
      otherArgs[start] = transform(array);
      return apply(func, this, otherArgs);
    };
  }
  function baseRest(func, start) {
    return setToString(overRest(func, start, identity), func + "");
  }
  var MAX_SAFE_INTEGER = 9007199254740991;
  function isLength(value) {
    return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
  }
  function isArrayLike(value) {
    return value != null && isLength(value.length) && !isFunction(value);
  }
  function isIterateeCall(value, index, object2) {
    if (!isObject(object2)) {
      return false;
    }
    var type = typeof index;
    if (type == "number" ? isArrayLike(object2) && isIndex(index, object2.length) : type == "string" && index in object2) {
      return eq(object2[index], value);
    }
    return false;
  }
  function createAssigner(assigner) {
    return baseRest(function(object2, sources) {
      var index = -1, length = sources.length, customizer = length > 1 ? sources[length - 1] : void 0, guard = length > 2 ? sources[2] : void 0;
      customizer = assigner.length > 3 && typeof customizer == "function" ? (length--, customizer) : void 0;
      if (guard && isIterateeCall(sources[0], sources[1], guard)) {
        customizer = length < 3 ? void 0 : customizer;
        length = 1;
      }
      object2 = Object(object2);
      while (++index < length) {
        var source = sources[index];
        if (source) {
          assigner(object2, source, index, customizer);
        }
      }
      return object2;
    });
  }
  var objectProto$f = Object.prototype;
  function isPrototype(value) {
    var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto$f;
    return value === proto;
  }
  function baseTimes(n, iteratee) {
    var index = -1, result = Array(n);
    while (++index < n) {
      result[index] = iteratee(index);
    }
    return result;
  }
  var argsTag$3 = "[object Arguments]";
  function baseIsArguments(value) {
    return isObjectLike(value) && baseGetTag(value) == argsTag$3;
  }
  var objectProto$e = Object.prototype;
  var hasOwnProperty$d = objectProto$e.hasOwnProperty;
  var propertyIsEnumerable$1 = objectProto$e.propertyIsEnumerable;
  var isArguments = baseIsArguments(/* @__PURE__ */ function() {
    return arguments;
  }()) ? baseIsArguments : function(value) {
    return isObjectLike(value) && hasOwnProperty$d.call(value, "callee") && !propertyIsEnumerable$1.call(value, "callee");
  };
  function stubFalse() {
    return false;
  }
  var freeExports$2 = typeof exports2 == "object" && exports2 && !exports2.nodeType && exports2;
  var freeModule$2 = freeExports$2 && typeof module == "object" && module && !module.nodeType && module;
  var moduleExports$2 = freeModule$2 && freeModule$2.exports === freeExports$2;
  var Buffer$1 = moduleExports$2 ? root.Buffer : void 0;
  var nativeIsBuffer = Buffer$1 ? Buffer$1.isBuffer : void 0;
  var isBuffer = nativeIsBuffer || stubFalse;
  var argsTag$2 = "[object Arguments]", arrayTag$2 = "[object Array]", boolTag$3 = "[object Boolean]", dateTag$3 = "[object Date]", errorTag$2 = "[object Error]", funcTag$1 = "[object Function]", mapTag$6 = "[object Map]", numberTag$3 = "[object Number]", objectTag$3 = "[object Object]", regexpTag$4 = "[object RegExp]", setTag$6 = "[object Set]", stringTag$4 = "[object String]", weakMapTag$2 = "[object WeakMap]";
  var arrayBufferTag$3 = "[object ArrayBuffer]", dataViewTag$4 = "[object DataView]", float32Tag$2 = "[object Float32Array]", float64Tag$2 = "[object Float64Array]", int8Tag$2 = "[object Int8Array]", int16Tag$2 = "[object Int16Array]", int32Tag$2 = "[object Int32Array]", uint8Tag$2 = "[object Uint8Array]", uint8ClampedTag$2 = "[object Uint8ClampedArray]", uint16Tag$2 = "[object Uint16Array]", uint32Tag$2 = "[object Uint32Array]";
  var typedArrayTags = {};
  typedArrayTags[float32Tag$2] = typedArrayTags[float64Tag$2] = typedArrayTags[int8Tag$2] = typedArrayTags[int16Tag$2] = typedArrayTags[int32Tag$2] = typedArrayTags[uint8Tag$2] = typedArrayTags[uint8ClampedTag$2] = typedArrayTags[uint16Tag$2] = typedArrayTags[uint32Tag$2] = true;
  typedArrayTags[argsTag$2] = typedArrayTags[arrayTag$2] = typedArrayTags[arrayBufferTag$3] = typedArrayTags[boolTag$3] = typedArrayTags[dataViewTag$4] = typedArrayTags[dateTag$3] = typedArrayTags[errorTag$2] = typedArrayTags[funcTag$1] = typedArrayTags[mapTag$6] = typedArrayTags[numberTag$3] = typedArrayTags[objectTag$3] = typedArrayTags[regexpTag$4] = typedArrayTags[setTag$6] = typedArrayTags[stringTag$4] = typedArrayTags[weakMapTag$2] = false;
  function baseIsTypedArray(value) {
    return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
  }
  function baseUnary(func) {
    return function(value) {
      return func(value);
    };
  }
  var freeExports$1 = typeof exports2 == "object" && exports2 && !exports2.nodeType && exports2;
  var freeModule$1 = freeExports$1 && typeof module == "object" && module && !module.nodeType && module;
  var moduleExports$1 = freeModule$1 && freeModule$1.exports === freeExports$1;
  var freeProcess = moduleExports$1 && freeGlobal.process;
  var nodeUtil = function() {
    try {
      var types = freeModule$1 && freeModule$1.require && freeModule$1.require("util").types;
      if (types) {
        return types;
      }
      return freeProcess && freeProcess.binding && freeProcess.binding("util");
    } catch (e) {
    }
  }();
  var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
  var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
  var objectProto$d = Object.prototype;
  var hasOwnProperty$c = objectProto$d.hasOwnProperty;
  function arrayLikeKeys(value, inherited) {
    var isArr = isArray(value), isArg = !isArr && isArguments(value), isBuff = !isArr && !isArg && isBuffer(value), isType = !isArr && !isArg && !isBuff && isTypedArray(value), skipIndexes = isArr || isArg || isBuff || isType, result = skipIndexes ? baseTimes(value.length, String) : [], length = result.length;
    for (var key in value) {
      if ((inherited || hasOwnProperty$c.call(value, key)) && !(skipIndexes && // Safari 9 has enumerable `arguments.length` in strict mode.
      (key == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
      isBuff && (key == "offset" || key == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
      isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || // Skip index properties.
      isIndex(key, length)))) {
        result.push(key);
      }
    }
    return result;
  }
  function overArg(func, transform) {
    return function(arg) {
      return func(transform(arg));
    };
  }
  var nativeKeys = overArg(Object.keys, Object);
  var objectProto$c = Object.prototype;
  var hasOwnProperty$b = objectProto$c.hasOwnProperty;
  function baseKeys(object2) {
    if (!isPrototype(object2)) {
      return nativeKeys(object2);
    }
    var result = [];
    for (var key in Object(object2)) {
      if (hasOwnProperty$b.call(object2, key) && key != "constructor") {
        result.push(key);
      }
    }
    return result;
  }
  function keys(object2) {
    return isArrayLike(object2) ? arrayLikeKeys(object2) : baseKeys(object2);
  }
  var objectProto$b = Object.prototype;
  var hasOwnProperty$a = objectProto$b.hasOwnProperty;
  var assign = createAssigner(function(object2, source) {
    if (isPrototype(source) || isArrayLike(source)) {
      copyObject(source, keys(source), object2);
      return;
    }
    for (var key in source) {
      if (hasOwnProperty$a.call(source, key)) {
        assignValue(object2, key, source[key]);
      }
    }
  });
  function nativeKeysIn(object2) {
    var result = [];
    if (object2 != null) {
      for (var key in Object(object2)) {
        result.push(key);
      }
    }
    return result;
  }
  var objectProto$a = Object.prototype;
  var hasOwnProperty$9 = objectProto$a.hasOwnProperty;
  function baseKeysIn(object2) {
    if (!isObject(object2)) {
      return nativeKeysIn(object2);
    }
    var isProto = isPrototype(object2), result = [];
    for (var key in object2) {
      if (!(key == "constructor" && (isProto || !hasOwnProperty$9.call(object2, key)))) {
        result.push(key);
      }
    }
    return result;
  }
  function keysIn(object2) {
    return isArrayLike(object2) ? arrayLikeKeys(object2, true) : baseKeysIn(object2);
  }
  var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, reIsPlainProp = /^\w*$/;
  function isKey(value, object2) {
    if (isArray(value)) {
      return false;
    }
    var type = typeof value;
    if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol(value)) {
      return true;
    }
    return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object2 != null && value in Object(object2);
  }
  var nativeCreate = getNative(Object, "create");
  function hashClear() {
    this.__data__ = nativeCreate ? nativeCreate(null) : {};
    this.size = 0;
  }
  function hashDelete(key) {
    var result = this.has(key) && delete this.__data__[key];
    this.size -= result ? 1 : 0;
    return result;
  }
  var HASH_UNDEFINED$2 = "__lodash_hash_undefined__";
  var objectProto$9 = Object.prototype;
  var hasOwnProperty$8 = objectProto$9.hasOwnProperty;
  function hashGet(key) {
    var data = this.__data__;
    if (nativeCreate) {
      var result = data[key];
      return result === HASH_UNDEFINED$2 ? void 0 : result;
    }
    return hasOwnProperty$8.call(data, key) ? data[key] : void 0;
  }
  var objectProto$8 = Object.prototype;
  var hasOwnProperty$7 = objectProto$8.hasOwnProperty;
  function hashHas(key) {
    var data = this.__data__;
    return nativeCreate ? data[key] !== void 0 : hasOwnProperty$7.call(data, key);
  }
  var HASH_UNDEFINED$1 = "__lodash_hash_undefined__";
  function hashSet(key, value) {
    var data = this.__data__;
    this.size += this.has(key) ? 0 : 1;
    data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED$1 : value;
    return this;
  }
  function Hash(entries) {
    var index = -1, length = entries == null ? 0 : entries.length;
    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }
  Hash.prototype.clear = hashClear;
  Hash.prototype["delete"] = hashDelete;
  Hash.prototype.get = hashGet;
  Hash.prototype.has = hashHas;
  Hash.prototype.set = hashSet;
  function listCacheClear() {
    this.__data__ = [];
    this.size = 0;
  }
  function assocIndexOf(array, key) {
    var length = array.length;
    while (length--) {
      if (eq(array[length][0], key)) {
        return length;
      }
    }
    return -1;
  }
  var arrayProto = Array.prototype;
  var splice = arrayProto.splice;
  function listCacheDelete(key) {
    var data = this.__data__, index = assocIndexOf(data, key);
    if (index < 0) {
      return false;
    }
    var lastIndex = data.length - 1;
    if (index == lastIndex) {
      data.pop();
    } else {
      splice.call(data, index, 1);
    }
    --this.size;
    return true;
  }
  function listCacheGet(key) {
    var data = this.__data__, index = assocIndexOf(data, key);
    return index < 0 ? void 0 : data[index][1];
  }
  function listCacheHas(key) {
    return assocIndexOf(this.__data__, key) > -1;
  }
  function listCacheSet(key, value) {
    var data = this.__data__, index = assocIndexOf(data, key);
    if (index < 0) {
      ++this.size;
      data.push([key, value]);
    } else {
      data[index][1] = value;
    }
    return this;
  }
  function ListCache(entries) {
    var index = -1, length = entries == null ? 0 : entries.length;
    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }
  ListCache.prototype.clear = listCacheClear;
  ListCache.prototype["delete"] = listCacheDelete;
  ListCache.prototype.get = listCacheGet;
  ListCache.prototype.has = listCacheHas;
  ListCache.prototype.set = listCacheSet;
  var Map$1 = getNative(root, "Map");
  function mapCacheClear() {
    this.size = 0;
    this.__data__ = {
      "hash": new Hash(),
      "map": new (Map$1 || ListCache)(),
      "string": new Hash()
    };
  }
  function isKeyable(value) {
    var type = typeof value;
    return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
  }
  function getMapData(map2, key) {
    var data = map2.__data__;
    return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
  }
  function mapCacheDelete(key) {
    var result = getMapData(this, key)["delete"](key);
    this.size -= result ? 1 : 0;
    return result;
  }
  function mapCacheGet(key) {
    return getMapData(this, key).get(key);
  }
  function mapCacheHas(key) {
    return getMapData(this, key).has(key);
  }
  function mapCacheSet(key, value) {
    var data = getMapData(this, key), size = data.size;
    data.set(key, value);
    this.size += data.size == size ? 0 : 1;
    return this;
  }
  function MapCache(entries) {
    var index = -1, length = entries == null ? 0 : entries.length;
    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }
  MapCache.prototype.clear = mapCacheClear;
  MapCache.prototype["delete"] = mapCacheDelete;
  MapCache.prototype.get = mapCacheGet;
  MapCache.prototype.has = mapCacheHas;
  MapCache.prototype.set = mapCacheSet;
  var FUNC_ERROR_TEXT$1 = "Expected a function";
  function memoize(func, resolver) {
    if (typeof func != "function" || resolver != null && typeof resolver != "function") {
      throw new TypeError(FUNC_ERROR_TEXT$1);
    }
    var memoized = function() {
      var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
      if (cache.has(key)) {
        return cache.get(key);
      }
      var result = func.apply(this, args);
      memoized.cache = cache.set(key, result) || cache;
      return result;
    };
    memoized.cache = new (memoize.Cache || MapCache)();
    return memoized;
  }
  memoize.Cache = MapCache;
  var MAX_MEMOIZE_SIZE = 500;
  function memoizeCapped(func) {
    var result = memoize(func, function(key) {
      if (cache.size === MAX_MEMOIZE_SIZE) {
        cache.clear();
      }
      return key;
    });
    var cache = result.cache;
    return result;
  }
  var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
  var reEscapeChar = /\\(\\)?/g;
  var stringToPath = memoizeCapped(function(string2) {
    var result = [];
    if (string2.charCodeAt(0) === 46) {
      result.push("");
    }
    string2.replace(rePropName, function(match, number, quote, subString) {
      result.push(quote ? subString.replace(reEscapeChar, "$1") : number || match);
    });
    return result;
  });
  function toString(value) {
    return value == null ? "" : baseToString(value);
  }
  function castPath(value, object2) {
    if (isArray(value)) {
      return value;
    }
    return isKey(value, object2) ? [value] : stringToPath(toString(value));
  }
  function toKey(value) {
    if (typeof value == "string" || isSymbol(value)) {
      return value;
    }
    var result = value + "";
    return result == "0" && 1 / value == -Infinity ? "-0" : result;
  }
  function baseGet(object2, path2) {
    path2 = castPath(path2, object2);
    var index = 0, length = path2.length;
    while (object2 != null && index < length) {
      object2 = object2[toKey(path2[index++])];
    }
    return index && index == length ? object2 : void 0;
  }
  function get(object2, path2, defaultValue) {
    var result = object2 == null ? void 0 : baseGet(object2, path2);
    return result === void 0 ? defaultValue : result;
  }
  function arrayPush(array, values2) {
    var index = -1, length = values2.length, offset2 = array.length;
    while (++index < length) {
      array[offset2 + index] = values2[index];
    }
    return array;
  }
  var spreadableSymbol = Symbol$1 ? Symbol$1.isConcatSpreadable : void 0;
  function isFlattenable(value) {
    return isArray(value) || isArguments(value) || !!(spreadableSymbol && value && value[spreadableSymbol]);
  }
  function baseFlatten(array, depth, predicate, isStrict, result) {
    var index = -1, length = array.length;
    predicate || (predicate = isFlattenable);
    result || (result = []);
    while (++index < length) {
      var value = array[index];
      if (predicate(value)) {
        {
          arrayPush(result, value);
        }
      } else if (!isStrict) {
        result[result.length] = value;
      }
    }
    return result;
  }
  function flatten(array) {
    var length = array == null ? 0 : array.length;
    return length ? baseFlatten(array) : [];
  }
  var getPrototype = overArg(Object.getPrototypeOf, Object);
  function baseSlice(array, start, end) {
    var index = -1, length = array.length;
    if (start < 0) {
      start = -start > length ? 0 : length + start;
    }
    end = end > length ? length : end;
    if (end < 0) {
      end += length;
    }
    length = start > end ? 0 : end - start >>> 0;
    start >>>= 0;
    var result = Array(length);
    while (++index < length) {
      result[index] = array[index + start];
    }
    return result;
  }
  function arrayReduce(array, iteratee, accumulator, initAccum) {
    var index = -1, length = array == null ? 0 : array.length;
    if (initAccum && length) {
      accumulator = array[++index];
    }
    while (++index < length) {
      accumulator = iteratee(accumulator, array[index], index, array);
    }
    return accumulator;
  }
  function stackClear() {
    this.__data__ = new ListCache();
    this.size = 0;
  }
  function stackDelete(key) {
    var data = this.__data__, result = data["delete"](key);
    this.size = data.size;
    return result;
  }
  function stackGet(key) {
    return this.__data__.get(key);
  }
  function stackHas(key) {
    return this.__data__.has(key);
  }
  var LARGE_ARRAY_SIZE$2 = 200;
  function stackSet(key, value) {
    var data = this.__data__;
    if (data instanceof ListCache) {
      var pairs = data.__data__;
      if (!Map$1 || pairs.length < LARGE_ARRAY_SIZE$2 - 1) {
        pairs.push([key, value]);
        this.size = ++data.size;
        return this;
      }
      data = this.__data__ = new MapCache(pairs);
    }
    data.set(key, value);
    this.size = data.size;
    return this;
  }
  function Stack(entries) {
    var data = this.__data__ = new ListCache(entries);
    this.size = data.size;
  }
  Stack.prototype.clear = stackClear;
  Stack.prototype["delete"] = stackDelete;
  Stack.prototype.get = stackGet;
  Stack.prototype.has = stackHas;
  Stack.prototype.set = stackSet;
  function baseAssign(object2, source) {
    return object2 && copyObject(source, keys(source), object2);
  }
  function baseAssignIn(object2, source) {
    return object2 && copyObject(source, keysIn(source), object2);
  }
  var freeExports = typeof exports2 == "object" && exports2 && !exports2.nodeType && exports2;
  var freeModule = freeExports && typeof module == "object" && module && !module.nodeType && module;
  var moduleExports = freeModule && freeModule.exports === freeExports;
  var Buffer2 = moduleExports ? root.Buffer : void 0, allocUnsafe = Buffer2 ? Buffer2.allocUnsafe : void 0;
  function cloneBuffer(buffer, isDeep) {
    var length = buffer.length, result = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);
    buffer.copy(result);
    return result;
  }
  function arrayFilter(array, predicate) {
    var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result = [];
    while (++index < length) {
      var value = array[index];
      if (predicate(value, index, array)) {
        result[resIndex++] = value;
      }
    }
    return result;
  }
  function stubArray() {
    return [];
  }
  var objectProto$7 = Object.prototype;
  var propertyIsEnumerable = objectProto$7.propertyIsEnumerable;
  var nativeGetSymbols$1 = Object.getOwnPropertySymbols;
  var getSymbols = !nativeGetSymbols$1 ? stubArray : function(object2) {
    if (object2 == null) {
      return [];
    }
    object2 = Object(object2);
    return arrayFilter(nativeGetSymbols$1(object2), function(symbol) {
      return propertyIsEnumerable.call(object2, symbol);
    });
  };
  function copySymbols(source, object2) {
    return copyObject(source, getSymbols(source), object2);
  }
  var nativeGetSymbols = Object.getOwnPropertySymbols;
  var getSymbolsIn = !nativeGetSymbols ? stubArray : function(object2) {
    var result = [];
    while (object2) {
      arrayPush(result, getSymbols(object2));
      object2 = getPrototype(object2);
    }
    return result;
  };
  function copySymbolsIn(source, object2) {
    return copyObject(source, getSymbolsIn(source), object2);
  }
  function baseGetAllKeys(object2, keysFunc, symbolsFunc) {
    var result = keysFunc(object2);
    return isArray(object2) ? result : arrayPush(result, symbolsFunc(object2));
  }
  function getAllKeys(object2) {
    return baseGetAllKeys(object2, keys, getSymbols);
  }
  function getAllKeysIn(object2) {
    return baseGetAllKeys(object2, keysIn, getSymbolsIn);
  }
  var DataView = getNative(root, "DataView");
  var Promise$1 = getNative(root, "Promise");
  var Set$1 = getNative(root, "Set");
  var mapTag$5 = "[object Map]", objectTag$2 = "[object Object]", promiseTag = "[object Promise]", setTag$5 = "[object Set]", weakMapTag$1 = "[object WeakMap]";
  var dataViewTag$3 = "[object DataView]";
  var dataViewCtorString = toSource(DataView), mapCtorString = toSource(Map$1), promiseCtorString = toSource(Promise$1), setCtorString = toSource(Set$1), weakMapCtorString = toSource(WeakMap$1);
  var getTag = baseGetTag;
  if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag$3 || Map$1 && getTag(new Map$1()) != mapTag$5 || Promise$1 && getTag(Promise$1.resolve()) != promiseTag || Set$1 && getTag(new Set$1()) != setTag$5 || WeakMap$1 && getTag(new WeakMap$1()) != weakMapTag$1) {
    getTag = function(value) {
      var result = baseGetTag(value), Ctor = result == objectTag$2 ? value.constructor : void 0, ctorString = Ctor ? toSource(Ctor) : "";
      if (ctorString) {
        switch (ctorString) {
          case dataViewCtorString:
            return dataViewTag$3;
          case mapCtorString:
            return mapTag$5;
          case promiseCtorString:
            return promiseTag;
          case setCtorString:
            return setTag$5;
          case weakMapCtorString:
            return weakMapTag$1;
        }
      }
      return result;
    };
  }
  var objectProto$6 = Object.prototype;
  var hasOwnProperty$6 = objectProto$6.hasOwnProperty;
  function initCloneArray(array) {
    var length = array.length, result = new array.constructor(length);
    if (length && typeof array[0] == "string" && hasOwnProperty$6.call(array, "index")) {
      result.index = array.index;
      result.input = array.input;
    }
    return result;
  }
  var Uint8Array2 = root.Uint8Array;
  function cloneArrayBuffer(arrayBuffer) {
    var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
    new Uint8Array2(result).set(new Uint8Array2(arrayBuffer));
    return result;
  }
  function cloneDataView(dataView, isDeep) {
    var buffer = dataView.buffer;
    return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
  }
  var reFlags = /\w*$/;
  function cloneRegExp(regexp) {
    var result = new regexp.constructor(regexp.source, reFlags.exec(regexp));
    result.lastIndex = regexp.lastIndex;
    return result;
  }
  var symbolProto$1 = Symbol$1 ? Symbol$1.prototype : void 0, symbolValueOf$1 = symbolProto$1 ? symbolProto$1.valueOf : void 0;
  function cloneSymbol(symbol) {
    return symbolValueOf$1 ? Object(symbolValueOf$1.call(symbol)) : {};
  }
  function cloneTypedArray(typedArray, isDeep) {
    var buffer = typedArray.buffer;
    return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
  }
  var boolTag$2 = "[object Boolean]", dateTag$2 = "[object Date]", mapTag$4 = "[object Map]", numberTag$2 = "[object Number]", regexpTag$3 = "[object RegExp]", setTag$4 = "[object Set]", stringTag$3 = "[object String]", symbolTag$2 = "[object Symbol]";
  var arrayBufferTag$2 = "[object ArrayBuffer]", dataViewTag$2 = "[object DataView]", float32Tag$1 = "[object Float32Array]", float64Tag$1 = "[object Float64Array]", int8Tag$1 = "[object Int8Array]", int16Tag$1 = "[object Int16Array]", int32Tag$1 = "[object Int32Array]", uint8Tag$1 = "[object Uint8Array]", uint8ClampedTag$1 = "[object Uint8ClampedArray]", uint16Tag$1 = "[object Uint16Array]", uint32Tag$1 = "[object Uint32Array]";
  function initCloneByTag(object2, tag, isDeep) {
    var Ctor = object2.constructor;
    switch (tag) {
      case arrayBufferTag$2:
        return cloneArrayBuffer(object2);
      case boolTag$2:
      case dateTag$2:
        return new Ctor(+object2);
      case dataViewTag$2:
        return cloneDataView(object2);
      case float32Tag$1:
      case float64Tag$1:
      case int8Tag$1:
      case int16Tag$1:
      case int32Tag$1:
      case uint8Tag$1:
      case uint8ClampedTag$1:
      case uint16Tag$1:
      case uint32Tag$1:
        return cloneTypedArray(object2);
      case mapTag$4:
        return new Ctor();
      case numberTag$2:
      case stringTag$3:
        return new Ctor(object2);
      case regexpTag$3:
        return cloneRegExp(object2);
      case setTag$4:
        return new Ctor();
      case symbolTag$2:
        return cloneSymbol(object2);
    }
  }
  function initCloneObject(object2) {
    return typeof object2.constructor == "function" && !isPrototype(object2) ? baseCreate(getPrototype(object2)) : {};
  }
  var mapTag$3 = "[object Map]";
  function baseIsMap(value) {
    return isObjectLike(value) && getTag(value) == mapTag$3;
  }
  var nodeIsMap = nodeUtil && nodeUtil.isMap;
  var isMap = nodeIsMap ? baseUnary(nodeIsMap) : baseIsMap;
  var setTag$3 = "[object Set]";
  function baseIsSet(value) {
    return isObjectLike(value) && getTag(value) == setTag$3;
  }
  var nodeIsSet = nodeUtil && nodeUtil.isSet;
  var isSet = nodeIsSet ? baseUnary(nodeIsSet) : baseIsSet;
  var CLONE_FLAT_FLAG = 2;
  var argsTag$1 = "[object Arguments]", arrayTag$1 = "[object Array]", boolTag$1 = "[object Boolean]", dateTag$1 = "[object Date]", errorTag$1 = "[object Error]", funcTag = "[object Function]", genTag = "[object GeneratorFunction]", mapTag$2 = "[object Map]", numberTag$1 = "[object Number]", objectTag$1 = "[object Object]", regexpTag$2 = "[object RegExp]", setTag$2 = "[object Set]", stringTag$2 = "[object String]", symbolTag$1 = "[object Symbol]", weakMapTag = "[object WeakMap]";
  var arrayBufferTag$1 = "[object ArrayBuffer]", dataViewTag$1 = "[object DataView]", float32Tag = "[object Float32Array]", float64Tag = "[object Float64Array]", int8Tag = "[object Int8Array]", int16Tag = "[object Int16Array]", int32Tag = "[object Int32Array]", uint8Tag = "[object Uint8Array]", uint8ClampedTag = "[object Uint8ClampedArray]", uint16Tag = "[object Uint16Array]", uint32Tag = "[object Uint32Array]";
  var cloneableTags = {};
  cloneableTags[argsTag$1] = cloneableTags[arrayTag$1] = cloneableTags[arrayBufferTag$1] = cloneableTags[dataViewTag$1] = cloneableTags[boolTag$1] = cloneableTags[dateTag$1] = cloneableTags[float32Tag] = cloneableTags[float64Tag] = cloneableTags[int8Tag] = cloneableTags[int16Tag] = cloneableTags[int32Tag] = cloneableTags[mapTag$2] = cloneableTags[numberTag$1] = cloneableTags[objectTag$1] = cloneableTags[regexpTag$2] = cloneableTags[setTag$2] = cloneableTags[stringTag$2] = cloneableTags[symbolTag$1] = cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] = cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
  cloneableTags[errorTag$1] = cloneableTags[funcTag] = cloneableTags[weakMapTag] = false;
  function baseClone(value, bitmask, customizer, key, object2, stack) {
    var result, isFlat = bitmask & CLONE_FLAT_FLAG;
    if (result !== void 0) {
      return result;
    }
    if (!isObject(value)) {
      return value;
    }
    var isArr = isArray(value);
    if (isArr) {
      result = initCloneArray(value);
      {
        return copyArray(value, result);
      }
    } else {
      var tag = getTag(value), isFunc = tag == funcTag || tag == genTag;
      if (isBuffer(value)) {
        return cloneBuffer(value);
      }
      if (tag == objectTag$1 || tag == argsTag$1 || isFunc && !object2) {
        result = isFunc ? {} : initCloneObject(value);
        {
          return isFlat ? copySymbolsIn(value, baseAssignIn(result, value)) : copySymbols(value, baseAssign(result, value));
        }
      } else {
        if (!cloneableTags[tag]) {
          return object2 ? value : {};
        }
        result = initCloneByTag(value, tag);
      }
    }
    stack || (stack = new Stack());
    var stacked = stack.get(value);
    if (stacked) {
      return stacked;
    }
    stack.set(value, result);
    if (isSet(value)) {
      value.forEach(function(subValue) {
        result.add(baseClone(subValue, bitmask, customizer, subValue, value, stack));
      });
    } else if (isMap(value)) {
      value.forEach(function(subValue, key2) {
        result.set(key2, baseClone(subValue, bitmask, customizer, key2, value, stack));
      });
    }
    var keysFunc = getAllKeys;
    var props = isArr ? void 0 : keysFunc(value);
    arrayEach(props || value, function(subValue, key2) {
      if (props) {
        key2 = subValue;
        subValue = value[key2];
      }
      assignValue(result, key2, baseClone(subValue, bitmask, customizer, key2, value, stack));
    });
    return result;
  }
  var CLONE_SYMBOLS_FLAG = 4;
  function clone(value) {
    return baseClone(value, CLONE_SYMBOLS_FLAG);
  }
  function compact(array) {
    var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result = [];
    while (++index < length) {
      var value = array[index];
      if (value) {
        result[resIndex++] = value;
      }
    }
    return result;
  }
  var HASH_UNDEFINED = "__lodash_hash_undefined__";
  function setCacheAdd(value) {
    this.__data__.set(value, HASH_UNDEFINED);
    return this;
  }
  function setCacheHas(value) {
    return this.__data__.has(value);
  }
  function SetCache(values2) {
    var index = -1, length = values2 == null ? 0 : values2.length;
    this.__data__ = new MapCache();
    while (++index < length) {
      this.add(values2[index]);
    }
  }
  SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
  SetCache.prototype.has = setCacheHas;
  function arraySome(array, predicate) {
    var index = -1, length = array == null ? 0 : array.length;
    while (++index < length) {
      if (predicate(array[index], index, array)) {
        return true;
      }
    }
    return false;
  }
  function cacheHas(cache, key) {
    return cache.has(key);
  }
  var COMPARE_PARTIAL_FLAG$5 = 1, COMPARE_UNORDERED_FLAG$3 = 2;
  function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
    var isPartial = bitmask & COMPARE_PARTIAL_FLAG$5, arrLength = array.length, othLength = other.length;
    if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
      return false;
    }
    var arrStacked = stack.get(array);
    var othStacked = stack.get(other);
    if (arrStacked && othStacked) {
      return arrStacked == other && othStacked == array;
    }
    var index = -1, result = true, seen = bitmask & COMPARE_UNORDERED_FLAG$3 ? new SetCache() : void 0;
    stack.set(array, other);
    stack.set(other, array);
    while (++index < arrLength) {
      var arrValue = array[index], othValue = other[index];
      if (customizer) {
        var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
      }
      if (compared !== void 0) {
        if (compared) {
          continue;
        }
        result = false;
        break;
      }
      if (seen) {
        if (!arraySome(other, function(othValue2, othIndex) {
          if (!cacheHas(seen, othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, bitmask, customizer, stack))) {
            return seen.push(othIndex);
          }
        })) {
          result = false;
          break;
        }
      } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
        result = false;
        break;
      }
    }
    stack["delete"](array);
    stack["delete"](other);
    return result;
  }
  function mapToArray(map2) {
    var index = -1, result = Array(map2.size);
    map2.forEach(function(value, key) {
      result[++index] = [key, value];
    });
    return result;
  }
  function setToArray(set) {
    var index = -1, result = Array(set.size);
    set.forEach(function(value) {
      result[++index] = value;
    });
    return result;
  }
  var COMPARE_PARTIAL_FLAG$4 = 1, COMPARE_UNORDERED_FLAG$2 = 2;
  var boolTag = "[object Boolean]", dateTag = "[object Date]", errorTag = "[object Error]", mapTag$1 = "[object Map]", numberTag = "[object Number]", regexpTag$1 = "[object RegExp]", setTag$1 = "[object Set]", stringTag$1 = "[object String]", symbolTag = "[object Symbol]";
  var arrayBufferTag = "[object ArrayBuffer]", dataViewTag = "[object DataView]";
  var symbolProto = Symbol$1 ? Symbol$1.prototype : void 0, symbolValueOf = symbolProto ? symbolProto.valueOf : void 0;
  function equalByTag(object2, other, tag, bitmask, customizer, equalFunc, stack) {
    switch (tag) {
      case dataViewTag:
        if (object2.byteLength != other.byteLength || object2.byteOffset != other.byteOffset) {
          return false;
        }
        object2 = object2.buffer;
        other = other.buffer;
      case arrayBufferTag:
        if (object2.byteLength != other.byteLength || !equalFunc(new Uint8Array2(object2), new Uint8Array2(other))) {
          return false;
        }
        return true;
      case boolTag:
      case dateTag:
      case numberTag:
        return eq(+object2, +other);
      case errorTag:
        return object2.name == other.name && object2.message == other.message;
      case regexpTag$1:
      case stringTag$1:
        return object2 == other + "";
      case mapTag$1:
        var convert = mapToArray;
      case setTag$1:
        var isPartial = bitmask & COMPARE_PARTIAL_FLAG$4;
        convert || (convert = setToArray);
        if (object2.size != other.size && !isPartial) {
          return false;
        }
        var stacked = stack.get(object2);
        if (stacked) {
          return stacked == other;
        }
        bitmask |= COMPARE_UNORDERED_FLAG$2;
        stack.set(object2, other);
        var result = equalArrays(convert(object2), convert(other), bitmask, customizer, equalFunc, stack);
        stack["delete"](object2);
        return result;
      case symbolTag:
        if (symbolValueOf) {
          return symbolValueOf.call(object2) == symbolValueOf.call(other);
        }
    }
    return false;
  }
  var COMPARE_PARTIAL_FLAG$3 = 1;
  var objectProto$5 = Object.prototype;
  var hasOwnProperty$5 = objectProto$5.hasOwnProperty;
  function equalObjects(object2, other, bitmask, customizer, equalFunc, stack) {
    var isPartial = bitmask & COMPARE_PARTIAL_FLAG$3, objProps = getAllKeys(object2), objLength = objProps.length, othProps = getAllKeys(other), othLength = othProps.length;
    if (objLength != othLength && !isPartial) {
      return false;
    }
    var index = objLength;
    while (index--) {
      var key = objProps[index];
      if (!(isPartial ? key in other : hasOwnProperty$5.call(other, key))) {
        return false;
      }
    }
    var objStacked = stack.get(object2);
    var othStacked = stack.get(other);
    if (objStacked && othStacked) {
      return objStacked == other && othStacked == object2;
    }
    var result = true;
    stack.set(object2, other);
    stack.set(other, object2);
    var skipCtor = isPartial;
    while (++index < objLength) {
      key = objProps[index];
      var objValue = object2[key], othValue = other[key];
      if (customizer) {
        var compared = isPartial ? customizer(othValue, objValue, key, other, object2, stack) : customizer(objValue, othValue, key, object2, other, stack);
      }
      if (!(compared === void 0 ? objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack) : compared)) {
        result = false;
        break;
      }
      skipCtor || (skipCtor = key == "constructor");
    }
    if (result && !skipCtor) {
      var objCtor = object2.constructor, othCtor = other.constructor;
      if (objCtor != othCtor && ("constructor" in object2 && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
        result = false;
      }
    }
    stack["delete"](object2);
    stack["delete"](other);
    return result;
  }
  var COMPARE_PARTIAL_FLAG$2 = 1;
  var argsTag = "[object Arguments]", arrayTag = "[object Array]", objectTag = "[object Object]";
  var objectProto$4 = Object.prototype;
  var hasOwnProperty$4 = objectProto$4.hasOwnProperty;
  function baseIsEqualDeep(object2, other, bitmask, customizer, equalFunc, stack) {
    var objIsArr = isArray(object2), othIsArr = isArray(other), objTag = objIsArr ? arrayTag : getTag(object2), othTag = othIsArr ? arrayTag : getTag(other);
    objTag = objTag == argsTag ? objectTag : objTag;
    othTag = othTag == argsTag ? objectTag : othTag;
    var objIsObj = objTag == objectTag, othIsObj = othTag == objectTag, isSameTag = objTag == othTag;
    if (isSameTag && isBuffer(object2)) {
      if (!isBuffer(other)) {
        return false;
      }
      objIsArr = true;
      objIsObj = false;
    }
    if (isSameTag && !objIsObj) {
      stack || (stack = new Stack());
      return objIsArr || isTypedArray(object2) ? equalArrays(object2, other, bitmask, customizer, equalFunc, stack) : equalByTag(object2, other, objTag, bitmask, customizer, equalFunc, stack);
    }
    if (!(bitmask & COMPARE_PARTIAL_FLAG$2)) {
      var objIsWrapped = objIsObj && hasOwnProperty$4.call(object2, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty$4.call(other, "__wrapped__");
      if (objIsWrapped || othIsWrapped) {
        var objUnwrapped = objIsWrapped ? object2.value() : object2, othUnwrapped = othIsWrapped ? other.value() : other;
        stack || (stack = new Stack());
        return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
      }
    }
    if (!isSameTag) {
      return false;
    }
    stack || (stack = new Stack());
    return equalObjects(object2, other, bitmask, customizer, equalFunc, stack);
  }
  function baseIsEqual(value, other, bitmask, customizer, stack) {
    if (value === other) {
      return true;
    }
    if (value == null || other == null || !isObjectLike(value) && !isObjectLike(other)) {
      return value !== value && other !== other;
    }
    return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
  }
  var COMPARE_PARTIAL_FLAG$1 = 1, COMPARE_UNORDERED_FLAG$1 = 2;
  function baseIsMatch(object2, source, matchData, customizer) {
    var index = matchData.length, length = index;
    if (object2 == null) {
      return !length;
    }
    object2 = Object(object2);
    while (index--) {
      var data = matchData[index];
      if (data[2] ? data[1] !== object2[data[0]] : !(data[0] in object2)) {
        return false;
      }
    }
    while (++index < length) {
      data = matchData[index];
      var key = data[0], objValue = object2[key], srcValue = data[1];
      if (data[2]) {
        if (objValue === void 0 && !(key in object2)) {
          return false;
        }
      } else {
        var stack = new Stack();
        var result;
        if (!(result === void 0 ? baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG$1 | COMPARE_UNORDERED_FLAG$1, customizer, stack) : result)) {
          return false;
        }
      }
    }
    return true;
  }
  function isStrictComparable(value) {
    return value === value && !isObject(value);
  }
  function getMatchData(object2) {
    var result = keys(object2), length = result.length;
    while (length--) {
      var key = result[length], value = object2[key];
      result[length] = [key, value, isStrictComparable(value)];
    }
    return result;
  }
  function matchesStrictComparable(key, srcValue) {
    return function(object2) {
      if (object2 == null) {
        return false;
      }
      return object2[key] === srcValue && (srcValue !== void 0 || key in Object(object2));
    };
  }
  function baseMatches(source) {
    var matchData = getMatchData(source);
    if (matchData.length == 1 && matchData[0][2]) {
      return matchesStrictComparable(matchData[0][0], matchData[0][1]);
    }
    return function(object2) {
      return object2 === source || baseIsMatch(object2, source, matchData);
    };
  }
  function baseHasIn(object2, key) {
    return object2 != null && key in Object(object2);
  }
  function hasPath(object2, path2, hasFunc) {
    path2 = castPath(path2, object2);
    var index = -1, length = path2.length, result = false;
    while (++index < length) {
      var key = toKey(path2[index]);
      if (!(result = object2 != null && hasFunc(object2, key))) {
        break;
      }
      object2 = object2[key];
    }
    if (result || ++index != length) {
      return result;
    }
    length = object2 == null ? 0 : object2.length;
    return !!length && isLength(length) && isIndex(key, length) && (isArray(object2) || isArguments(object2));
  }
  function hasIn(object2, path2) {
    return object2 != null && hasPath(object2, path2, baseHasIn);
  }
  var COMPARE_PARTIAL_FLAG = 1, COMPARE_UNORDERED_FLAG = 2;
  function baseMatchesProperty(path2, srcValue) {
    if (isKey(path2) && isStrictComparable(srcValue)) {
      return matchesStrictComparable(toKey(path2), srcValue);
    }
    return function(object2) {
      var objValue = get(object2, path2);
      return objValue === void 0 && objValue === srcValue ? hasIn(object2, path2) : baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
    };
  }
  function baseProperty(key) {
    return function(object2) {
      return object2 == null ? void 0 : object2[key];
    };
  }
  function basePropertyDeep(path2) {
    return function(object2) {
      return baseGet(object2, path2);
    };
  }
  function property(path2) {
    return isKey(path2) ? baseProperty(toKey(path2)) : basePropertyDeep(path2);
  }
  function baseIteratee(value) {
    if (typeof value == "function") {
      return value;
    }
    if (value == null) {
      return identity;
    }
    if (typeof value == "object") {
      return isArray(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
    }
    return property(value);
  }
  function arrayAggregator(array, setter, iteratee, accumulator) {
    var index = -1, length = array == null ? 0 : array.length;
    while (++index < length) {
      var value = array[index];
      setter(accumulator, value, iteratee(value), array);
    }
    return accumulator;
  }
  function createBaseFor(fromRight) {
    return function(object2, iteratee, keysFunc) {
      var index = -1, iterable = Object(object2), props = keysFunc(object2), length = props.length;
      while (length--) {
        var key = props[++index];
        if (iteratee(iterable[key], key, iterable) === false) {
          break;
        }
      }
      return object2;
    };
  }
  var baseFor = createBaseFor();
  function baseForOwn(object2, iteratee) {
    return object2 && baseFor(object2, iteratee, keys);
  }
  function createBaseEach(eachFunc, fromRight) {
    return function(collection2, iteratee) {
      if (collection2 == null) {
        return collection2;
      }
      if (!isArrayLike(collection2)) {
        return eachFunc(collection2, iteratee);
      }
      var length = collection2.length, index = -1, iterable = Object(collection2);
      while (++index < length) {
        if (iteratee(iterable[index], index, iterable) === false) {
          break;
        }
      }
      return collection2;
    };
  }
  var baseEach = createBaseEach(baseForOwn);
  function baseAggregator(collection2, setter, iteratee, accumulator) {
    baseEach(collection2, function(value, key, collection3) {
      setter(accumulator, value, iteratee(value), collection3);
    });
    return accumulator;
  }
  function createAggregator(setter, initializer) {
    return function(collection2, iteratee) {
      var func = isArray(collection2) ? arrayAggregator : baseAggregator, accumulator = initializer ? initializer() : {};
      return func(collection2, setter, baseIteratee(iteratee), accumulator);
    };
  }
  var objectProto$3 = Object.prototype;
  var hasOwnProperty$3 = objectProto$3.hasOwnProperty;
  var defaults = baseRest(function(object2, sources) {
    object2 = Object(object2);
    var index = -1;
    var length = sources.length;
    var guard = length > 2 ? sources[2] : void 0;
    if (guard && isIterateeCall(sources[0], sources[1], guard)) {
      length = 1;
    }
    while (++index < length) {
      var source = sources[index];
      var props = keysIn(source);
      var propsIndex = -1;
      var propsLength = props.length;
      while (++propsIndex < propsLength) {
        var key = props[propsIndex];
        var value = object2[key];
        if (value === void 0 || eq(value, objectProto$3[key]) && !hasOwnProperty$3.call(object2, key)) {
          object2[key] = source[key];
        }
      }
    }
    return object2;
  });
  function isArrayLikeObject(value) {
    return isObjectLike(value) && isArrayLike(value);
  }
  var LARGE_ARRAY_SIZE$1 = 200;
  function baseDifference(array, values2, iteratee, comparator) {
    var index = -1, includes2 = arrayIncludes, isCommon = true, length = array.length, result = [], valuesLength = values2.length;
    if (!length) {
      return result;
    }
    if (values2.length >= LARGE_ARRAY_SIZE$1) {
      includes2 = cacheHas;
      isCommon = false;
      values2 = new SetCache(values2);
    }
    outer:
      while (++index < length) {
        var value = array[index], computed = value;
        value = value !== 0 ? value : 0;
        if (isCommon && computed === computed) {
          var valuesIndex = valuesLength;
          while (valuesIndex--) {
            if (values2[valuesIndex] === computed) {
              continue outer;
            }
          }
          result.push(value);
        } else if (!includes2(values2, computed, comparator)) {
          result.push(value);
        }
      }
    return result;
  }
  var difference = baseRest(function(array, values2) {
    return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values2, 1, isArrayLikeObject, true)) : [];
  });
  function last(array) {
    var length = array == null ? 0 : array.length;
    return length ? array[length - 1] : void 0;
  }
  function drop$2(array, n, guard) {
    var length = array == null ? 0 : array.length;
    if (!length) {
      return [];
    }
    n = n === void 0 ? 1 : toInteger(n);
    return baseSlice(array, n < 0 ? 0 : n, length);
  }
  function dropRight(array, n, guard) {
    var length = array == null ? 0 : array.length;
    if (!length) {
      return [];
    }
    n = n === void 0 ? 1 : toInteger(n);
    n = length - n;
    return baseSlice(array, 0, n < 0 ? 0 : n);
  }
  function castFunction(value) {
    return typeof value == "function" ? value : identity;
  }
  function forEach(collection2, iteratee) {
    var func = isArray(collection2) ? arrayEach : baseEach;
    return func(collection2, castFunction(iteratee));
  }
  function arrayEvery(array, predicate) {
    var index = -1, length = array == null ? 0 : array.length;
    while (++index < length) {
      if (!predicate(array[index], index, array)) {
        return false;
      }
    }
    return true;
  }
  function baseEvery(collection2, predicate) {
    var result = true;
    baseEach(collection2, function(value, index, collection3) {
      result = !!predicate(value, index, collection3);
      return result;
    });
    return result;
  }
  function every(collection2, predicate, guard) {
    var func = isArray(collection2) ? arrayEvery : baseEvery;
    return func(collection2, baseIteratee(predicate));
  }
  function baseFilter(collection2, predicate) {
    var result = [];
    baseEach(collection2, function(value, index, collection3) {
      if (predicate(value, index, collection3)) {
        result.push(value);
      }
    });
    return result;
  }
  function filter$2(collection2, predicate) {
    var func = isArray(collection2) ? arrayFilter : baseFilter;
    return func(collection2, baseIteratee(predicate));
  }
  function createFind(findIndexFunc) {
    return function(collection2, predicate, fromIndex) {
      var iterable = Object(collection2);
      if (!isArrayLike(collection2)) {
        var iteratee = baseIteratee(predicate);
        collection2 = keys(collection2);
        predicate = function(key) {
          return iteratee(iterable[key], key, iterable);
        };
      }
      var index = findIndexFunc(collection2, predicate, fromIndex);
      return index > -1 ? iterable[iteratee ? collection2[index] : index] : void 0;
    };
  }
  var nativeMax$1 = Math.max;
  function findIndex(array, predicate, fromIndex) {
    var length = array == null ? 0 : array.length;
    if (!length) {
      return -1;
    }
    var index = fromIndex == null ? 0 : toInteger(fromIndex);
    if (index < 0) {
      index = nativeMax$1(length + index, 0);
    }
    return baseFindIndex(array, baseIteratee(predicate), index);
  }
  var find = createFind(findIndex);
  function head(array) {
    return array && array.length ? array[0] : void 0;
  }
  function baseMap(collection2, iteratee) {
    var index = -1, result = isArrayLike(collection2) ? Array(collection2.length) : [];
    baseEach(collection2, function(value, key, collection3) {
      result[++index] = iteratee(value, key, collection3);
    });
    return result;
  }
  function map(collection2, iteratee) {
    var func = isArray(collection2) ? arrayMap : baseMap;
    return func(collection2, baseIteratee(iteratee));
  }
  function flatMap(collection2, iteratee) {
    return baseFlatten(map(collection2, iteratee));
  }
  var objectProto$2 = Object.prototype;
  var hasOwnProperty$2 = objectProto$2.hasOwnProperty;
  var groupBy = createAggregator(function(result, value, key) {
    if (hasOwnProperty$2.call(result, key)) {
      result[key].push(value);
    } else {
      baseAssignValue(result, key, [value]);
    }
  });
  var objectProto$1 = Object.prototype;
  var hasOwnProperty$1 = objectProto$1.hasOwnProperty;
  function baseHas(object2, key) {
    return object2 != null && hasOwnProperty$1.call(object2, key);
  }
  function has(object2, path2) {
    return object2 != null && hasPath(object2, path2, baseHas);
  }
  var stringTag = "[object String]";
  function isString(value) {
    return typeof value == "string" || !isArray(value) && isObjectLike(value) && baseGetTag(value) == stringTag;
  }
  function baseValues(object2, props) {
    return arrayMap(props, function(key) {
      return object2[key];
    });
  }
  function values$1(object2) {
    return object2 == null ? [] : baseValues(object2, keys(object2));
  }
  var nativeMax = Math.max;
  function includes(collection2, value, fromIndex, guard) {
    collection2 = isArrayLike(collection2) ? collection2 : values$1(collection2);
    fromIndex = fromIndex && true ? toInteger(fromIndex) : 0;
    var length = collection2.length;
    if (fromIndex < 0) {
      fromIndex = nativeMax(length + fromIndex, 0);
    }
    return isString(collection2) ? fromIndex <= length && collection2.indexOf(value, fromIndex) > -1 : !!length && baseIndexOf(collection2, value, fromIndex) > -1;
  }
  function indexOf(array, value, fromIndex) {
    var length = array == null ? 0 : array.length;
    if (!length) {
      return -1;
    }
    var index = 0;
    return baseIndexOf(array, value, index);
  }
  var mapTag = "[object Map]", setTag = "[object Set]";
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  function isEmpty(value) {
    if (value == null) {
      return true;
    }
    if (isArrayLike(value) && (isArray(value) || typeof value == "string" || typeof value.splice == "function" || isBuffer(value) || isTypedArray(value) || isArguments(value))) {
      return !value.length;
    }
    var tag = getTag(value);
    if (tag == mapTag || tag == setTag) {
      return !value.size;
    }
    if (isPrototype(value)) {
      return !baseKeys(value).length;
    }
    for (var key in value) {
      if (hasOwnProperty.call(value, key)) {
        return false;
      }
    }
    return true;
  }
  var regexpTag = "[object RegExp]";
  function baseIsRegExp(value) {
    return isObjectLike(value) && baseGetTag(value) == regexpTag;
  }
  var nodeIsRegExp = nodeUtil && nodeUtil.isRegExp;
  var isRegExp = nodeIsRegExp ? baseUnary(nodeIsRegExp) : baseIsRegExp;
  function isUndefined(value) {
    return value === void 0;
  }
  var FUNC_ERROR_TEXT = "Expected a function";
  function negate(predicate) {
    if (typeof predicate != "function") {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    return function() {
      var args = arguments;
      switch (args.length) {
        case 0:
          return !predicate.call(this);
        case 1:
          return !predicate.call(this, args[0]);
        case 2:
          return !predicate.call(this, args[0], args[1]);
        case 3:
          return !predicate.call(this, args[0], args[1], args[2]);
      }
      return !predicate.apply(this, args);
    };
  }
  function baseSet(object2, path2, value, customizer) {
    if (!isObject(object2)) {
      return object2;
    }
    path2 = castPath(path2, object2);
    var index = -1, length = path2.length, lastIndex = length - 1, nested = object2;
    while (nested != null && ++index < length) {
      var key = toKey(path2[index]), newValue = value;
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        return object2;
      }
      if (index != lastIndex) {
        var objValue = nested[key];
        newValue = void 0;
        if (newValue === void 0) {
          newValue = isObject(objValue) ? objValue : isIndex(path2[index + 1]) ? [] : {};
        }
      }
      assignValue(nested, key, newValue);
      nested = nested[key];
    }
    return object2;
  }
  function basePickBy(object2, paths, predicate) {
    var index = -1, length = paths.length, result = {};
    while (++index < length) {
      var path2 = paths[index], value = baseGet(object2, path2);
      if (predicate(value, path2)) {
        baseSet(result, castPath(path2, object2), value);
      }
    }
    return result;
  }
  function pickBy(object2, predicate) {
    if (object2 == null) {
      return {};
    }
    var props = arrayMap(getAllKeysIn(object2), function(prop) {
      return [prop];
    });
    predicate = baseIteratee(predicate);
    return basePickBy(object2, props, function(value, path2) {
      return predicate(value, path2[0]);
    });
  }
  function baseReduce(collection2, iteratee, accumulator, initAccum, eachFunc) {
    eachFunc(collection2, function(value, index, collection3) {
      accumulator = initAccum ? (initAccum = false, value) : iteratee(accumulator, value, index, collection3);
    });
    return accumulator;
  }
  function reduce(collection2, iteratee, accumulator) {
    var func = isArray(collection2) ? arrayReduce : baseReduce, initAccum = arguments.length < 3;
    return func(collection2, baseIteratee(iteratee), accumulator, initAccum, baseEach);
  }
  function reject(collection2, predicate) {
    var func = isArray(collection2) ? arrayFilter : baseFilter;
    return func(collection2, negate(baseIteratee(predicate)));
  }
  function baseSome(collection2, predicate) {
    var result;
    baseEach(collection2, function(value, index, collection3) {
      result = predicate(value, index, collection3);
      return !result;
    });
    return !!result;
  }
  function some(collection2, predicate, guard) {
    var func = isArray(collection2) ? arraySome : baseSome;
    return func(collection2, baseIteratee(predicate));
  }
  var INFINITY = 1 / 0;
  var createSet = !(Set$1 && 1 / setToArray(new Set$1([, -0]))[1] == INFINITY) ? noop : function(values2) {
    return new Set$1(values2);
  };
  var LARGE_ARRAY_SIZE = 200;
  function baseUniq(array, iteratee, comparator) {
    var index = -1, includes2 = arrayIncludes, length = array.length, isCommon = true, result = [], seen = result;
    if (length >= LARGE_ARRAY_SIZE) {
      var set = createSet(array);
      if (set) {
        return setToArray(set);
      }
      isCommon = false;
      includes2 = cacheHas;
      seen = new SetCache();
    } else {
      seen = result;
    }
    outer:
      while (++index < length) {
        var value = array[index], computed = value;
        value = value !== 0 ? value : 0;
        if (isCommon && computed === computed) {
          var seenIndex = seen.length;
          while (seenIndex--) {
            if (seen[seenIndex] === computed) {
              continue outer;
            }
          }
          result.push(value);
        } else if (!includes2(seen, computed, comparator)) {
          if (seen !== result) {
            seen.push(computed);
          }
          result.push(value);
        }
      }
    return result;
  }
  function uniq(array) {
    return array && array.length ? baseUniq(array) : [];
  }
  function PRINT_ERROR(msg) {
    if (console && console.error) {
      console.error(`Error: ${msg}`);
    }
  }
  function PRINT_WARNING(msg) {
    if (console && console.warn) {
      console.warn(`Warning: ${msg}`);
    }
  }
  function timer(func) {
    const start = (/* @__PURE__ */ new Date()).getTime();
    const val = func();
    const end = (/* @__PURE__ */ new Date()).getTime();
    const total = end - start;
    return { time: total, value: val };
  }
  function toFastProperties(toBecomeFast) {
    function FakeConstructor() {
    }
    FakeConstructor.prototype = toBecomeFast;
    const fakeInstance = new FakeConstructor();
    function fakeAccess() {
      return typeof fakeInstance.bar;
    }
    fakeAccess();
    fakeAccess();
    return toBecomeFast;
  }
  function tokenLabel$1(tokType) {
    if (hasTokenLabel$1(tokType)) {
      return tokType.LABEL;
    } else {
      return tokType.name;
    }
  }
  function hasTokenLabel$1(obj) {
    return isString(obj.LABEL) && obj.LABEL !== "";
  }
  class AbstractProduction {
    get definition() {
      return this._definition;
    }
    set definition(value) {
      this._definition = value;
    }
    constructor(_definition) {
      this._definition = _definition;
    }
    accept(visitor) {
      visitor.visit(this);
      forEach(this.definition, (prod) => {
        prod.accept(visitor);
      });
    }
  }
  class NonTerminal extends AbstractProduction {
    constructor(options) {
      super([]);
      this.idx = 1;
      assign(this, pickBy(options, (v) => v !== void 0));
    }
    set definition(definition) {
    }
    get definition() {
      if (this.referencedRule !== void 0) {
        return this.referencedRule.definition;
      }
      return [];
    }
    accept(visitor) {
      visitor.visit(this);
    }
  }
  class Rule extends AbstractProduction {
    constructor(options) {
      super(options.definition);
      this.orgText = "";
      assign(this, pickBy(options, (v) => v !== void 0));
    }
  }
  class Alternative extends AbstractProduction {
    constructor(options) {
      super(options.definition);
      this.ignoreAmbiguities = false;
      assign(this, pickBy(options, (v) => v !== void 0));
    }
  }
  class Option extends AbstractProduction {
    constructor(options) {
      super(options.definition);
      this.idx = 1;
      assign(this, pickBy(options, (v) => v !== void 0));
    }
  }
  class RepetitionMandatory extends AbstractProduction {
    constructor(options) {
      super(options.definition);
      this.idx = 1;
      assign(this, pickBy(options, (v) => v !== void 0));
    }
  }
  class RepetitionMandatoryWithSeparator extends AbstractProduction {
    constructor(options) {
      super(options.definition);
      this.idx = 1;
      assign(this, pickBy(options, (v) => v !== void 0));
    }
  }
  class Repetition extends AbstractProduction {
    constructor(options) {
      super(options.definition);
      this.idx = 1;
      assign(this, pickBy(options, (v) => v !== void 0));
    }
  }
  class RepetitionWithSeparator extends AbstractProduction {
    constructor(options) {
      super(options.definition);
      this.idx = 1;
      assign(this, pickBy(options, (v) => v !== void 0));
    }
  }
  class Alternation extends AbstractProduction {
    get definition() {
      return this._definition;
    }
    set definition(value) {
      this._definition = value;
    }
    constructor(options) {
      super(options.definition);
      this.idx = 1;
      this.ignoreAmbiguities = false;
      this.hasPredicates = false;
      assign(this, pickBy(options, (v) => v !== void 0));
    }
  }
  class Terminal {
    constructor(options) {
      this.idx = 1;
      assign(this, pickBy(options, (v) => v !== void 0));
    }
    accept(visitor) {
      visitor.visit(this);
    }
  }
  function serializeGrammar(topRules) {
    return map(topRules, serializeProduction);
  }
  function serializeProduction(node) {
    function convertDefinition(definition) {
      return map(definition, serializeProduction);
    }
    if (node instanceof NonTerminal) {
      const serializedNonTerminal = {
        type: "NonTerminal",
        name: node.nonTerminalName,
        idx: node.idx
      };
      if (isString(node.label)) {
        serializedNonTerminal.label = node.label;
      }
      return serializedNonTerminal;
    } else if (node instanceof Alternative) {
      return {
        type: "Alternative",
        definition: convertDefinition(node.definition)
      };
    } else if (node instanceof Option) {
      return {
        type: "Option",
        idx: node.idx,
        definition: convertDefinition(node.definition)
      };
    } else if (node instanceof RepetitionMandatory) {
      return {
        type: "RepetitionMandatory",
        idx: node.idx,
        definition: convertDefinition(node.definition)
      };
    } else if (node instanceof RepetitionMandatoryWithSeparator) {
      return {
        type: "RepetitionMandatoryWithSeparator",
        idx: node.idx,
        separator: serializeProduction(new Terminal({ terminalType: node.separator })),
        definition: convertDefinition(node.definition)
      };
    } else if (node instanceof RepetitionWithSeparator) {
      return {
        type: "RepetitionWithSeparator",
        idx: node.idx,
        separator: serializeProduction(new Terminal({ terminalType: node.separator })),
        definition: convertDefinition(node.definition)
      };
    } else if (node instanceof Repetition) {
      return {
        type: "Repetition",
        idx: node.idx,
        definition: convertDefinition(node.definition)
      };
    } else if (node instanceof Alternation) {
      return {
        type: "Alternation",
        idx: node.idx,
        definition: convertDefinition(node.definition)
      };
    } else if (node instanceof Terminal) {
      const serializedTerminal = {
        type: "Terminal",
        name: node.terminalType.name,
        label: tokenLabel$1(node.terminalType),
        idx: node.idx
      };
      if (isString(node.label)) {
        serializedTerminal.terminalLabel = node.label;
      }
      const pattern = node.terminalType.PATTERN;
      if (node.terminalType.PATTERN) {
        serializedTerminal.pattern = isRegExp(pattern) ? pattern.source : pattern;
      }
      return serializedTerminal;
    } else if (node instanceof Rule) {
      return {
        type: "Rule",
        name: node.name,
        orgText: node.orgText,
        definition: convertDefinition(node.definition)
      };
    } else {
      throw Error("non exhaustive match");
    }
  }
  class GAstVisitor {
    visit(node) {
      const nodeAny = node;
      switch (nodeAny.constructor) {
        case NonTerminal:
          return this.visitNonTerminal(nodeAny);
        case Alternative:
          return this.visitAlternative(nodeAny);
        case Option:
          return this.visitOption(nodeAny);
        case RepetitionMandatory:
          return this.visitRepetitionMandatory(nodeAny);
        case RepetitionMandatoryWithSeparator:
          return this.visitRepetitionMandatoryWithSeparator(nodeAny);
        case RepetitionWithSeparator:
          return this.visitRepetitionWithSeparator(nodeAny);
        case Repetition:
          return this.visitRepetition(nodeAny);
        case Alternation:
          return this.visitAlternation(nodeAny);
        case Terminal:
          return this.visitTerminal(nodeAny);
        case Rule:
          return this.visitRule(nodeAny);
        default:
          throw Error("non exhaustive match");
      }
    }
    /* c8 ignore next */
    visitNonTerminal(node) {
    }
    /* c8 ignore next */
    visitAlternative(node) {
    }
    /* c8 ignore next */
    visitOption(node) {
    }
    /* c8 ignore next */
    visitRepetition(node) {
    }
    /* c8 ignore next */
    visitRepetitionMandatory(node) {
    }
    /* c8 ignore next 3 */
    visitRepetitionMandatoryWithSeparator(node) {
    }
    /* c8 ignore next */
    visitRepetitionWithSeparator(node) {
    }
    /* c8 ignore next */
    visitAlternation(node) {
    }
    /* c8 ignore next */
    visitTerminal(node) {
    }
    /* c8 ignore next */
    visitRule(node) {
    }
  }
  function isSequenceProd(prod) {
    return prod instanceof Alternative || prod instanceof Option || prod instanceof Repetition || prod instanceof RepetitionMandatory || prod instanceof RepetitionMandatoryWithSeparator || prod instanceof RepetitionWithSeparator || prod instanceof Terminal || prod instanceof Rule;
  }
  function isOptionalProd(prod, alreadyVisited = []) {
    const isDirectlyOptional = prod instanceof Option || prod instanceof Repetition || prod instanceof RepetitionWithSeparator;
    if (isDirectlyOptional) {
      return true;
    }
    if (prod instanceof Alternation) {
      return some(prod.definition, (subProd) => {
        return isOptionalProd(subProd, alreadyVisited);
      });
    } else if (prod instanceof NonTerminal && includes(alreadyVisited, prod)) {
      return false;
    } else if (prod instanceof AbstractProduction) {
      if (prod instanceof NonTerminal) {
        alreadyVisited.push(prod);
      }
      return every(prod.definition, (subProd) => {
        return isOptionalProd(subProd, alreadyVisited);
      });
    } else {
      return false;
    }
  }
  function isBranchingProd(prod) {
    return prod instanceof Alternation;
  }
  function getProductionDslName(prod) {
    if (prod instanceof NonTerminal) {
      return "SUBRULE";
    } else if (prod instanceof Option) {
      return "OPTION";
    } else if (prod instanceof Alternation) {
      return "OR";
    } else if (prod instanceof RepetitionMandatory) {
      return "AT_LEAST_ONE";
    } else if (prod instanceof RepetitionMandatoryWithSeparator) {
      return "AT_LEAST_ONE_SEP";
    } else if (prod instanceof RepetitionWithSeparator) {
      return "MANY_SEP";
    } else if (prod instanceof Repetition) {
      return "MANY";
    } else if (prod instanceof Terminal) {
      return "CONSUME";
    } else {
      throw Error("non exhaustive match");
    }
  }
  class RestWalker {
    walk(prod, prevRest = []) {
      forEach(prod.definition, (subProd, index) => {
        const currRest = drop$2(prod.definition, index + 1);
        if (subProd instanceof NonTerminal) {
          this.walkProdRef(subProd, currRest, prevRest);
        } else if (subProd instanceof Terminal) {
          this.walkTerminal(subProd, currRest, prevRest);
        } else if (subProd instanceof Alternative) {
          this.walkFlat(subProd, currRest, prevRest);
        } else if (subProd instanceof Option) {
          this.walkOption(subProd, currRest, prevRest);
        } else if (subProd instanceof RepetitionMandatory) {
          this.walkAtLeastOne(subProd, currRest, prevRest);
        } else if (subProd instanceof RepetitionMandatoryWithSeparator) {
          this.walkAtLeastOneSep(subProd, currRest, prevRest);
        } else if (subProd instanceof RepetitionWithSeparator) {
          this.walkManySep(subProd, currRest, prevRest);
        } else if (subProd instanceof Repetition) {
          this.walkMany(subProd, currRest, prevRest);
        } else if (subProd instanceof Alternation) {
          this.walkOr(subProd, currRest, prevRest);
        } else {
          throw Error("non exhaustive match");
        }
      });
    }
    walkTerminal(terminal, currRest, prevRest) {
    }
    walkProdRef(refProd, currRest, prevRest) {
    }
    walkFlat(flatProd, currRest, prevRest) {
      const fullOrRest = currRest.concat(prevRest);
      this.walk(flatProd, fullOrRest);
    }
    walkOption(optionProd, currRest, prevRest) {
      const fullOrRest = currRest.concat(prevRest);
      this.walk(optionProd, fullOrRest);
    }
    walkAtLeastOne(atLeastOneProd, currRest, prevRest) {
      const fullAtLeastOneRest = [
        new Option({ definition: atLeastOneProd.definition })
      ].concat(currRest, prevRest);
      this.walk(atLeastOneProd, fullAtLeastOneRest);
    }
    walkAtLeastOneSep(atLeastOneSepProd, currRest, prevRest) {
      const fullAtLeastOneSepRest = restForRepetitionWithSeparator(atLeastOneSepProd, currRest, prevRest);
      this.walk(atLeastOneSepProd, fullAtLeastOneSepRest);
    }
    walkMany(manyProd, currRest, prevRest) {
      const fullManyRest = [
        new Option({ definition: manyProd.definition })
      ].concat(currRest, prevRest);
      this.walk(manyProd, fullManyRest);
    }
    walkManySep(manySepProd, currRest, prevRest) {
      const fullManySepRest = restForRepetitionWithSeparator(manySepProd, currRest, prevRest);
      this.walk(manySepProd, fullManySepRest);
    }
    walkOr(orProd, currRest, prevRest) {
      const fullOrRest = currRest.concat(prevRest);
      forEach(orProd.definition, (alt) => {
        const prodWrapper = new Alternative({ definition: [alt] });
        this.walk(prodWrapper, fullOrRest);
      });
    }
  }
  function restForRepetitionWithSeparator(repSepProd, currRest, prevRest) {
    const repSepRest = [
      new Option({
        definition: [
          new Terminal({ terminalType: repSepProd.separator })
        ].concat(repSepProd.definition)
      })
    ];
    const fullRepSepRest = repSepRest.concat(currRest, prevRest);
    return fullRepSepRest;
  }
  function first(prod) {
    if (prod instanceof NonTerminal) {
      return first(prod.referencedRule);
    } else if (prod instanceof Terminal) {
      return firstForTerminal(prod);
    } else if (isSequenceProd(prod)) {
      return firstForSequence(prod);
    } else if (isBranchingProd(prod)) {
      return firstForBranching(prod);
    } else {
      throw Error("non exhaustive match");
    }
  }
  function firstForSequence(prod) {
    let firstSet = [];
    const seq = prod.definition;
    let nextSubProdIdx = 0;
    let hasInnerProdsRemaining = seq.length > nextSubProdIdx;
    let currSubProd;
    let isLastInnerProdOptional = true;
    while (hasInnerProdsRemaining && isLastInnerProdOptional) {
      currSubProd = seq[nextSubProdIdx];
      isLastInnerProdOptional = isOptionalProd(currSubProd);
      firstSet = firstSet.concat(first(currSubProd));
      nextSubProdIdx = nextSubProdIdx + 1;
      hasInnerProdsRemaining = seq.length > nextSubProdIdx;
    }
    return uniq(firstSet);
  }
  function firstForBranching(prod) {
    const allAlternativesFirsts = map(prod.definition, (innerProd) => {
      return first(innerProd);
    });
    return uniq(flatten(allAlternativesFirsts));
  }
  function firstForTerminal(terminal) {
    return [terminal.terminalType];
  }
  const IN = "_~IN~_";
  class ResyncFollowsWalker extends RestWalker {
    constructor(topProd) {
      super();
      this.topProd = topProd;
      this.follows = {};
    }
    startWalking() {
      this.walk(this.topProd);
      return this.follows;
    }
    walkTerminal(terminal, currRest, prevRest) {
    }
    walkProdRef(refProd, currRest, prevRest) {
      const followName = buildBetweenProdsFollowPrefix(refProd.referencedRule, refProd.idx) + this.topProd.name;
      const fullRest = currRest.concat(prevRest);
      const restProd = new Alternative({ definition: fullRest });
      const t_in_topProd_follows = first(restProd);
      this.follows[followName] = t_in_topProd_follows;
    }
  }
  function computeAllProdsFollows(topProductions) {
    const reSyncFollows = {};
    forEach(topProductions, (topProd) => {
      const currRefsFollow = new ResyncFollowsWalker(topProd).startWalking();
      assign(reSyncFollows, currRefsFollow);
    });
    return reSyncFollows;
  }
  function buildBetweenProdsFollowPrefix(inner, occurenceInParent) {
    return inner.name + occurenceInParent + IN;
  }
  function cc(char) {
    return char.charCodeAt(0);
  }
  function insertToSet(item, set) {
    if (Array.isArray(item)) {
      item.forEach(function(subItem) {
        set.push(subItem);
      });
    } else {
      set.push(item);
    }
  }
  function addFlag(flagObj, flagKey) {
    if (flagObj[flagKey] === true) {
      throw "duplicate flag " + flagKey;
    }
    flagObj[flagKey];
    flagObj[flagKey] = true;
  }
  function ASSERT_EXISTS(obj) {
    if (obj === void 0) {
      throw Error("Internal Error - Should never get here!");
    }
    return true;
  }
  function ASSERT_NEVER_REACH_HERE() {
    throw Error("Internal Error - Should never get here!");
  }
  function isCharacter(obj) {
    return obj["type"] === "Character";
  }
  const digitsCharCodes = [];
  for (let i = cc("0"); i <= cc("9"); i++) {
    digitsCharCodes.push(i);
  }
  const wordCharCodes = [cc("_")].concat(digitsCharCodes);
  for (let i = cc("a"); i <= cc("z"); i++) {
    wordCharCodes.push(i);
  }
  for (let i = cc("A"); i <= cc("Z"); i++) {
    wordCharCodes.push(i);
  }
  const whitespaceCodes = [
    cc(" "),
    cc("\f"),
    cc("\n"),
    cc("\r"),
    cc("	"),
    cc("\v"),
    cc("	"),
    cc(" "),
    cc(" "),
    cc(" "),
    cc(" "),
    cc(" "),
    cc(" "),
    cc(" "),
    cc(" "),
    cc(" "),
    cc(" "),
    cc(" "),
    cc(" "),
    cc(" "),
    cc("\u2028"),
    cc("\u2029"),
    cc(" "),
    cc(" "),
    cc("　"),
    cc("\uFEFF")
  ];
  const hexDigitPattern = /[0-9a-fA-F]/;
  const decimalPattern$1 = /[0-9]/;
  const decimalPatternNoZero = /[1-9]/;
  class RegExpParser {
    constructor() {
      this.idx = 0;
      this.input = "";
      this.groupIdx = 0;
    }
    saveState() {
      return {
        idx: this.idx,
        input: this.input,
        groupIdx: this.groupIdx
      };
    }
    restoreState(newState) {
      this.idx = newState.idx;
      this.input = newState.input;
      this.groupIdx = newState.groupIdx;
    }
    pattern(input) {
      this.idx = 0;
      this.input = input;
      this.groupIdx = 0;
      this.consumeChar("/");
      const value = this.disjunction();
      this.consumeChar("/");
      const flags = {
        type: "Flags",
        loc: { begin: this.idx, end: input.length },
        global: false,
        ignoreCase: false,
        multiLine: false,
        unicode: false,
        sticky: false
      };
      while (this.isRegExpFlag()) {
        switch (this.popChar()) {
          case "g":
            addFlag(flags, "global");
            break;
          case "i":
            addFlag(flags, "ignoreCase");
            break;
          case "m":
            addFlag(flags, "multiLine");
            break;
          case "u":
            addFlag(flags, "unicode");
            break;
          case "y":
            addFlag(flags, "sticky");
            break;
        }
      }
      if (this.idx !== this.input.length) {
        throw Error("Redundant input: " + this.input.substring(this.idx));
      }
      return {
        type: "Pattern",
        flags,
        value,
        loc: this.loc(0)
      };
    }
    disjunction() {
      const alts = [];
      const begin = this.idx;
      alts.push(this.alternative());
      while (this.peekChar() === "|") {
        this.consumeChar("|");
        alts.push(this.alternative());
      }
      return { type: "Disjunction", value: alts, loc: this.loc(begin) };
    }
    alternative() {
      const terms = [];
      const begin = this.idx;
      while (this.isTerm()) {
        terms.push(this.term());
      }
      return { type: "Alternative", value: terms, loc: this.loc(begin) };
    }
    term() {
      if (this.isAssertion()) {
        return this.assertion();
      } else {
        return this.atom();
      }
    }
    assertion() {
      const begin = this.idx;
      switch (this.popChar()) {
        case "^":
          return {
            type: "StartAnchor",
            loc: this.loc(begin)
          };
        case "$":
          return { type: "EndAnchor", loc: this.loc(begin) };
        case "\\":
          switch (this.popChar()) {
            case "b":
              return {
                type: "WordBoundary",
                loc: this.loc(begin)
              };
            case "B":
              return {
                type: "NonWordBoundary",
                loc: this.loc(begin)
              };
          }
          throw Error("Invalid Assertion Escape");
        case "(":
          this.consumeChar("?");
          let type;
          switch (this.popChar()) {
            case "=":
              type = "Lookahead";
              break;
            case "!":
              type = "NegativeLookahead";
              break;
            case "<": {
              switch (this.popChar()) {
                case "=":
                  type = "Lookbehind";
                  break;
                case "!":
                  type = "NegativeLookbehind";
              }
              break;
            }
          }
          ASSERT_EXISTS(type);
          const disjunction = this.disjunction();
          this.consumeChar(")");
          return {
            type,
            value: disjunction,
            loc: this.loc(begin)
          };
      }
      return ASSERT_NEVER_REACH_HERE();
    }
    quantifier(isBacktracking = false) {
      let range = void 0;
      const begin = this.idx;
      switch (this.popChar()) {
        case "*":
          range = {
            atLeast: 0,
            atMost: Infinity
          };
          break;
        case "+":
          range = {
            atLeast: 1,
            atMost: Infinity
          };
          break;
        case "?":
          range = {
            atLeast: 0,
            atMost: 1
          };
          break;
        case "{":
          const atLeast = this.integerIncludingZero();
          switch (this.popChar()) {
            case "}":
              range = {
                atLeast,
                atMost: atLeast
              };
              break;
            case ",":
              let atMost;
              if (this.isDigit()) {
                atMost = this.integerIncludingZero();
                range = {
                  atLeast,
                  atMost
                };
              } else {
                range = {
                  atLeast,
                  atMost: Infinity
                };
              }
              this.consumeChar("}");
              break;
          }
          if (isBacktracking === true && range === void 0) {
            return void 0;
          }
          ASSERT_EXISTS(range);
          break;
      }
      if (isBacktracking === true && range === void 0) {
        return void 0;
      }
      if (ASSERT_EXISTS(range)) {
        if (this.peekChar(0) === "?") {
          this.consumeChar("?");
          range.greedy = false;
        } else {
          range.greedy = true;
        }
        range.type = "Quantifier";
        range.loc = this.loc(begin);
        return range;
      }
    }
    atom() {
      let atom;
      const begin = this.idx;
      switch (this.peekChar()) {
        case ".":
          atom = this.dotAll();
          break;
        case "\\":
          atom = this.atomEscape();
          break;
        case "[":
          atom = this.characterClass();
          break;
        case "(":
          atom = this.group();
          break;
      }
      if (atom === void 0 && this.isPatternCharacter()) {
        atom = this.patternCharacter();
      }
      if (ASSERT_EXISTS(atom)) {
        atom.loc = this.loc(begin);
        if (this.isQuantifier()) {
          atom.quantifier = this.quantifier();
        }
        return atom;
      }
    }
    dotAll() {
      this.consumeChar(".");
      return {
        type: "Set",
        complement: true,
        value: [cc("\n"), cc("\r"), cc("\u2028"), cc("\u2029")]
      };
    }
    atomEscape() {
      this.consumeChar("\\");
      switch (this.peekChar()) {
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          return this.decimalEscapeAtom();
        case "d":
        case "D":
        case "s":
        case "S":
        case "w":
        case "W":
          return this.characterClassEscape();
        case "f":
        case "n":
        case "r":
        case "t":
        case "v":
          return this.controlEscapeAtom();
        case "c":
          return this.controlLetterEscapeAtom();
        case "0":
          return this.nulCharacterAtom();
        case "x":
          return this.hexEscapeSequenceAtom();
        case "u":
          return this.regExpUnicodeEscapeSequenceAtom();
        default:
          return this.identityEscapeAtom();
      }
    }
    decimalEscapeAtom() {
      const value = this.positiveInteger();
      return { type: "GroupBackReference", value };
    }
    characterClassEscape() {
      let set;
      let complement = false;
      switch (this.popChar()) {
        case "d":
          set = digitsCharCodes;
          break;
        case "D":
          set = digitsCharCodes;
          complement = true;
          break;
        case "s":
          set = whitespaceCodes;
          break;
        case "S":
          set = whitespaceCodes;
          complement = true;
          break;
        case "w":
          set = wordCharCodes;
          break;
        case "W":
          set = wordCharCodes;
          complement = true;
          break;
      }
      if (ASSERT_EXISTS(set)) {
        return { type: "Set", value: set, complement };
      }
    }
    controlEscapeAtom() {
      let escapeCode;
      switch (this.popChar()) {
        case "f":
          escapeCode = cc("\f");
          break;
        case "n":
          escapeCode = cc("\n");
          break;
        case "r":
          escapeCode = cc("\r");
          break;
        case "t":
          escapeCode = cc("	");
          break;
        case "v":
          escapeCode = cc("\v");
          break;
      }
      if (ASSERT_EXISTS(escapeCode)) {
        return { type: "Character", value: escapeCode };
      }
    }
    controlLetterEscapeAtom() {
      this.consumeChar("c");
      const letter = this.popChar();
      if (/[a-zA-Z]/.test(letter) === false) {
        throw Error("Invalid ");
      }
      const letterCode = letter.toUpperCase().charCodeAt(0) - 64;
      return { type: "Character", value: letterCode };
    }
    nulCharacterAtom() {
      this.consumeChar("0");
      return { type: "Character", value: cc("\0") };
    }
    hexEscapeSequenceAtom() {
      this.consumeChar("x");
      return this.parseHexDigits(2);
    }
    regExpUnicodeEscapeSequenceAtom() {
      this.consumeChar("u");
      return this.parseHexDigits(4);
    }
    identityEscapeAtom() {
      const escapedChar = this.popChar();
      return { type: "Character", value: cc(escapedChar) };
    }
    classPatternCharacterAtom() {
      switch (this.peekChar()) {
        case "\n":
        case "\r":
        case "\u2028":
        case "\u2029":
        case "\\":
        case "]":
          throw Error("TBD");
        default:
          const nextChar = this.popChar();
          return { type: "Character", value: cc(nextChar) };
      }
    }
    characterClass() {
      const set = [];
      let complement = false;
      this.consumeChar("[");
      if (this.peekChar(0) === "^") {
        this.consumeChar("^");
        complement = true;
      }
      while (this.isClassAtom()) {
        const from2 = this.classAtom();
        from2.type === "Character";
        if (isCharacter(from2) && this.isRangeDash()) {
          this.consumeChar("-");
          const to2 = this.classAtom();
          to2.type === "Character";
          if (isCharacter(to2)) {
            if (to2.value < from2.value) {
              throw Error("Range out of order in character class");
            }
            set.push({ from: from2.value, to: to2.value });
          } else {
            insertToSet(from2.value, set);
            set.push(cc("-"));
            insertToSet(to2.value, set);
          }
        } else {
          insertToSet(from2.value, set);
        }
      }
      this.consumeChar("]");
      return { type: "Set", complement, value: set };
    }
    classAtom() {
      switch (this.peekChar()) {
        case "]":
        case "\n":
        case "\r":
        case "\u2028":
        case "\u2029":
          throw Error("TBD");
        case "\\":
          return this.classEscape();
        default:
          return this.classPatternCharacterAtom();
      }
    }
    classEscape() {
      this.consumeChar("\\");
      switch (this.peekChar()) {
        case "b":
          this.consumeChar("b");
          return { type: "Character", value: cc("\b") };
        case "d":
        case "D":
        case "s":
        case "S":
        case "w":
        case "W":
          return this.characterClassEscape();
        case "f":
        case "n":
        case "r":
        case "t":
        case "v":
          return this.controlEscapeAtom();
        case "c":
          return this.controlLetterEscapeAtom();
        case "0":
          return this.nulCharacterAtom();
        case "x":
          return this.hexEscapeSequenceAtom();
        case "u":
          return this.regExpUnicodeEscapeSequenceAtom();
        default:
          return this.identityEscapeAtom();
      }
    }
    group() {
      let capturing = true;
      this.consumeChar("(");
      switch (this.peekChar(0)) {
        case "?":
          this.consumeChar("?");
          this.consumeChar(":");
          capturing = false;
          break;
        default:
          this.groupIdx++;
          break;
      }
      const value = this.disjunction();
      this.consumeChar(")");
      const groupAst = {
        type: "Group",
        capturing,
        value
      };
      if (capturing) {
        groupAst["idx"] = this.groupIdx;
      }
      return groupAst;
    }
    positiveInteger() {
      let number = this.popChar();
      if (decimalPatternNoZero.test(number) === false) {
        throw Error("Expecting a positive integer");
      }
      while (decimalPattern$1.test(this.peekChar(0))) {
        number += this.popChar();
      }
      return parseInt(number, 10);
    }
    integerIncludingZero() {
      let number = this.popChar();
      if (decimalPattern$1.test(number) === false) {
        throw Error("Expecting an integer");
      }
      while (decimalPattern$1.test(this.peekChar(0))) {
        number += this.popChar();
      }
      return parseInt(number, 10);
    }
    patternCharacter() {
      const nextChar = this.popChar();
      switch (nextChar) {
        case "\n":
        case "\r":
        case "\u2028":
        case "\u2029":
        case "^":
        case "$":
        case "\\":
        case ".":
        case "*":
        case "+":
        case "?":
        case "(":
        case ")":
        case "[":
        case "|":
          throw Error("TBD");
        default:
          return { type: "Character", value: cc(nextChar) };
      }
    }
    isRegExpFlag() {
      switch (this.peekChar(0)) {
        case "g":
        case "i":
        case "m":
        case "u":
        case "y":
          return true;
        default:
          return false;
      }
    }
    isRangeDash() {
      return this.peekChar() === "-" && this.isClassAtom(1);
    }
    isDigit() {
      return decimalPattern$1.test(this.peekChar(0));
    }
    isClassAtom(howMuch = 0) {
      switch (this.peekChar(howMuch)) {
        case "]":
        case "\n":
        case "\r":
        case "\u2028":
        case "\u2029":
          return false;
        default:
          return true;
      }
    }
    isTerm() {
      return this.isAtom() || this.isAssertion();
    }
    isAtom() {
      if (this.isPatternCharacter()) {
        return true;
      }
      switch (this.peekChar(0)) {
        case ".":
        case "\\":
        case "[":
        case "(":
          return true;
        default:
          return false;
      }
    }
    isAssertion() {
      switch (this.peekChar(0)) {
        case "^":
        case "$":
          return true;
        case "\\":
          switch (this.peekChar(1)) {
            case "b":
            case "B":
              return true;
            default:
              return false;
          }
        case "(":
          return this.peekChar(1) === "?" && (this.peekChar(2) === "=" || this.peekChar(2) === "!" || this.peekChar(2) === "<" && (this.peekChar(3) === "=" || this.peekChar(3) === "!"));
        default:
          return false;
      }
    }
    isQuantifier() {
      const prevState = this.saveState();
      try {
        return this.quantifier(true) !== void 0;
      } catch (e) {
        return false;
      } finally {
        this.restoreState(prevState);
      }
    }
    isPatternCharacter() {
      switch (this.peekChar()) {
        case "^":
        case "$":
        case "\\":
        case ".":
        case "*":
        case "+":
        case "?":
        case "(":
        case ")":
        case "[":
        case "|":
        case "/":
        case "\n":
        case "\r":
        case "\u2028":
        case "\u2029":
          return false;
        default:
          return true;
      }
    }
    parseHexDigits(howMany) {
      let hexString = "";
      for (let i = 0; i < howMany; i++) {
        const hexChar = this.popChar();
        if (hexDigitPattern.test(hexChar) === false) {
          throw Error("Expecting a HexDecimal digits");
        }
        hexString += hexChar;
      }
      const charCode = parseInt(hexString, 16);
      return { type: "Character", value: charCode };
    }
    peekChar(howMuch = 0) {
      return this.input[this.idx + howMuch];
    }
    popChar() {
      const nextChar = this.peekChar(0);
      this.consumeChar(void 0);
      return nextChar;
    }
    consumeChar(char) {
      if (char !== void 0 && this.input[this.idx] !== char) {
        throw Error("Expected: '" + char + "' but found: '" + this.input[this.idx] + "' at offset: " + this.idx);
      }
      if (this.idx >= this.input.length) {
        throw Error("Unexpected end of input");
      }
      this.idx++;
    }
    loc(begin) {
      return { begin, end: this.idx };
    }
  }
  class BaseRegExpVisitor {
    visitChildren(node) {
      for (const key in node) {
        const child = node[key];
        if (node.hasOwnProperty(key)) {
          if (child.type !== void 0) {
            this.visit(child);
          } else if (Array.isArray(child)) {
            child.forEach((subChild) => {
              this.visit(subChild);
            }, this);
          }
        }
      }
    }
    visit(node) {
      switch (node.type) {
        case "Pattern":
          this.visitPattern(node);
          break;
        case "Flags":
          this.visitFlags(node);
          break;
        case "Disjunction":
          this.visitDisjunction(node);
          break;
        case "Alternative":
          this.visitAlternative(node);
          break;
        case "StartAnchor":
          this.visitStartAnchor(node);
          break;
        case "EndAnchor":
          this.visitEndAnchor(node);
          break;
        case "WordBoundary":
          this.visitWordBoundary(node);
          break;
        case "NonWordBoundary":
          this.visitNonWordBoundary(node);
          break;
        case "Lookahead":
          this.visitLookahead(node);
          break;
        case "NegativeLookahead":
          this.visitNegativeLookahead(node);
          break;
        case "Lookbehind":
          this.visitLookbehind(node);
          break;
        case "NegativeLookbehind":
          this.visitNegativeLookbehind(node);
          break;
        case "Character":
          this.visitCharacter(node);
          break;
        case "Set":
          this.visitSet(node);
          break;
        case "Group":
          this.visitGroup(node);
          break;
        case "GroupBackReference":
          this.visitGroupBackReference(node);
          break;
        case "Quantifier":
          this.visitQuantifier(node);
          break;
      }
      this.visitChildren(node);
    }
    visitPattern(node) {
    }
    visitFlags(node) {
    }
    visitDisjunction(node) {
    }
    visitAlternative(node) {
    }
    // Assertion
    visitStartAnchor(node) {
    }
    visitEndAnchor(node) {
    }
    visitWordBoundary(node) {
    }
    visitNonWordBoundary(node) {
    }
    visitLookahead(node) {
    }
    visitNegativeLookahead(node) {
    }
    visitLookbehind(node) {
    }
    visitNegativeLookbehind(node) {
    }
    // atoms
    visitCharacter(node) {
    }
    visitSet(node) {
    }
    visitGroup(node) {
    }
    visitGroupBackReference(node) {
    }
    visitQuantifier(node) {
    }
  }
  let regExpAstCache = {};
  const regExpParser = new RegExpParser();
  function getRegExpAst(regExp) {
    const regExpStr = regExp.toString();
    if (regExpAstCache.hasOwnProperty(regExpStr)) {
      return regExpAstCache[regExpStr];
    } else {
      const regExpAst = regExpParser.pattern(regExpStr);
      regExpAstCache[regExpStr] = regExpAst;
      return regExpAst;
    }
  }
  function clearRegExpParserCache() {
    regExpAstCache = {};
  }
  const complementErrorMessage = "Complement Sets are not supported for first char optimization";
  const failedOptimizationPrefixMsg = 'Unable to use "first char" lexer optimizations:\n';
  function getOptimizedStartCodesIndices(regExp, ensureOptimizations = false) {
    try {
      const ast = getRegExpAst(regExp);
      const firstChars = firstCharOptimizedIndices(ast.value, {}, ast.flags.ignoreCase);
      return firstChars;
    } catch (e) {
      if (e.message === complementErrorMessage) {
        if (ensureOptimizations) {
          PRINT_WARNING(`${failedOptimizationPrefixMsg}	Unable to optimize: < ${regExp.toString()} >
	Complement Sets cannot be automatically optimized.
	This will disable the lexer's first char optimizations.
	See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#COMPLEMENT for details.`);
        }
      } else {
        let msgSuffix = "";
        if (ensureOptimizations) {
          msgSuffix = "\n	This will disable the lexer's first char optimizations.\n	See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#REGEXP_PARSING for details.";
        }
        PRINT_ERROR(`${failedOptimizationPrefixMsg}
	Failed parsing: < ${regExp.toString()} >
	Using the @chevrotain/regexp-to-ast library
	Please open an issue at: https://github.com/chevrotain/chevrotain/issues` + msgSuffix);
      }
    }
    return [];
  }
  function firstCharOptimizedIndices(ast, result, ignoreCase) {
    switch (ast.type) {
      case "Disjunction":
        for (let i = 0; i < ast.value.length; i++) {
          firstCharOptimizedIndices(ast.value[i], result, ignoreCase);
        }
        break;
      case "Alternative":
        const terms = ast.value;
        for (let i = 0; i < terms.length; i++) {
          const term = terms[i];
          switch (term.type) {
            case "EndAnchor":
            case "GroupBackReference":
            case "Lookahead":
            case "NegativeLookahead":
            case "Lookbehind":
            case "NegativeLookbehind":
            case "StartAnchor":
            case "WordBoundary":
            case "NonWordBoundary":
              continue;
          }
          const atom = term;
          switch (atom.type) {
            case "Character":
              addOptimizedIdxToResult(atom.value, result, ignoreCase);
              break;
            case "Set":
              if (atom.complement === true) {
                throw Error(complementErrorMessage);
              }
              forEach(atom.value, (code) => {
                if (typeof code === "number") {
                  addOptimizedIdxToResult(code, result, ignoreCase);
                } else {
                  const range = code;
                  if (ignoreCase === true) {
                    for (let rangeCode = range.from; rangeCode <= range.to; rangeCode++) {
                      addOptimizedIdxToResult(rangeCode, result, ignoreCase);
                    }
                  } else {
                    for (let rangeCode = range.from; rangeCode <= range.to && rangeCode < minOptimizationVal; rangeCode++) {
                      addOptimizedIdxToResult(rangeCode, result, ignoreCase);
                    }
                    if (range.to >= minOptimizationVal) {
                      const minUnOptVal = range.from >= minOptimizationVal ? range.from : minOptimizationVal;
                      const maxUnOptVal = range.to;
                      const minOptIdx = charCodeToOptimizedIndex(minUnOptVal);
                      const maxOptIdx = charCodeToOptimizedIndex(maxUnOptVal);
                      for (let currOptIdx = minOptIdx; currOptIdx <= maxOptIdx; currOptIdx++) {
                        result[currOptIdx] = currOptIdx;
                      }
                    }
                  }
                }
              });
              break;
            case "Group":
              firstCharOptimizedIndices(atom.value, result, ignoreCase);
              break;
            default:
              throw Error("Non Exhaustive Match");
          }
          const isOptionalQuantifier = atom.quantifier !== void 0 && atom.quantifier.atLeast === 0;
          if (
            // A group may be optional due to empty contents /(?:)/
            // or if everything inside it is optional /((a)?)/
            atom.type === "Group" && isWholeOptional(atom) === false || // If this term is not a group it may only be optional if it has an optional quantifier
            atom.type !== "Group" && isOptionalQuantifier === false
          ) {
            break;
          }
        }
        break;
      default:
        throw Error("non exhaustive match!");
    }
    return values$1(result);
  }
  function addOptimizedIdxToResult(code, result, ignoreCase) {
    const optimizedCharIdx = charCodeToOptimizedIndex(code);
    result[optimizedCharIdx] = optimizedCharIdx;
    if (ignoreCase === true) {
      handleIgnoreCase(code, result);
    }
  }
  function handleIgnoreCase(code, result) {
    const char = String.fromCharCode(code);
    const upperChar = char.toUpperCase();
    if (upperChar !== char) {
      const optimizedCharIdx = charCodeToOptimizedIndex(upperChar.charCodeAt(0));
      result[optimizedCharIdx] = optimizedCharIdx;
    } else {
      const lowerChar = char.toLowerCase();
      if (lowerChar !== char) {
        const optimizedCharIdx = charCodeToOptimizedIndex(lowerChar.charCodeAt(0));
        result[optimizedCharIdx] = optimizedCharIdx;
      }
    }
  }
  function findCode(setNode, targetCharCodes) {
    return find(setNode.value, (codeOrRange) => {
      if (typeof codeOrRange === "number") {
        return includes(targetCharCodes, codeOrRange);
      } else {
        const range = codeOrRange;
        return find(targetCharCodes, (targetCode) => range.from <= targetCode && targetCode <= range.to) !== void 0;
      }
    });
  }
  function isWholeOptional(ast) {
    const quantifier = ast.quantifier;
    if (quantifier && quantifier.atLeast === 0) {
      return true;
    }
    if (!ast.value) {
      return false;
    }
    return isArray(ast.value) ? every(ast.value, isWholeOptional) : isWholeOptional(ast.value);
  }
  class CharCodeFinder extends BaseRegExpVisitor {
    constructor(targetCharCodes) {
      super();
      this.targetCharCodes = targetCharCodes;
      this.found = false;
    }
    visitChildren(node) {
      if (this.found === true) {
        return;
      }
      switch (node.type) {
        case "Lookahead":
          this.visitLookahead(node);
          return;
        case "NegativeLookahead":
          this.visitNegativeLookahead(node);
          return;
        case "Lookbehind":
          this.visitLookbehind(node);
          return;
        case "NegativeLookbehind":
          this.visitNegativeLookbehind(node);
          return;
      }
      super.visitChildren(node);
    }
    visitCharacter(node) {
      if (includes(this.targetCharCodes, node.value)) {
        this.found = true;
      }
    }
    visitSet(node) {
      if (node.complement) {
        if (findCode(node, this.targetCharCodes) === void 0) {
          this.found = true;
        }
      } else {
        if (findCode(node, this.targetCharCodes) !== void 0) {
          this.found = true;
        }
      }
    }
  }
  function canMatchCharCode(charCodes, pattern) {
    if (pattern instanceof RegExp) {
      const ast = getRegExpAst(pattern);
      const charCodeFinder = new CharCodeFinder(charCodes);
      charCodeFinder.visit(ast);
      return charCodeFinder.found;
    } else {
      return find(pattern, (char) => {
        return includes(charCodes, char.charCodeAt(0));
      }) !== void 0;
    }
  }
  const PATTERN = "PATTERN";
  const DEFAULT_MODE = "defaultMode";
  const MODES = "modes";
  function analyzeTokenTypes(tokenTypes, options) {
    options = defaults(options, {
      debug: false,
      safeMode: false,
      positionTracking: "full",
      lineTerminatorCharacters: ["\r", "\n"],
      tracer: (msg, action) => action()
    });
    const tracer = options.tracer;
    tracer("initCharCodeToOptimizedIndexMap", () => {
      initCharCodeToOptimizedIndexMap();
    });
    let onlyRelevantTypes;
    tracer("Reject Lexer.NA", () => {
      onlyRelevantTypes = reject(tokenTypes, (currType) => {
        return currType[PATTERN] === Lexer.NA;
      });
    });
    let hasCustom = false;
    let allTransformedPatterns;
    tracer("Transform Patterns", () => {
      hasCustom = false;
      allTransformedPatterns = map(onlyRelevantTypes, (currType) => {
        const currPattern = currType[PATTERN];
        if (isRegExp(currPattern)) {
          const regExpSource = currPattern.source;
          if (regExpSource.length === 1 && // only these regExp meta characters which can appear in a length one regExp
          regExpSource !== "^" && regExpSource !== "$" && regExpSource !== "." && !currPattern.ignoreCase) {
            return regExpSource;
          } else if (regExpSource.length === 2 && regExpSource[0] === "\\" && // not a meta character
          !includes([
            "d",
            "D",
            "s",
            "S",
            "t",
            "r",
            "n",
            "t",
            "0",
            "c",
            "b",
            "B",
            "f",
            "v",
            "w",
            "W"
          ], regExpSource[1])) {
            return regExpSource[1];
          } else {
            return addStickyFlag(currPattern);
          }
        } else if (isFunction(currPattern)) {
          hasCustom = true;
          return { exec: currPattern };
        } else if (typeof currPattern === "object") {
          hasCustom = true;
          return currPattern;
        } else if (typeof currPattern === "string") {
          if (currPattern.length === 1) {
            return currPattern;
          } else {
            const escapedRegExpString = currPattern.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
            const wrappedRegExp = new RegExp(escapedRegExpString);
            return addStickyFlag(wrappedRegExp);
          }
        } else {
          throw Error("non exhaustive match");
        }
      });
    });
    let patternIdxToType;
    let patternIdxToGroup;
    let patternIdxToLongerAltIdxArr;
    let patternIdxToPushMode;
    let patternIdxToPopMode;
    tracer("misc mapping", () => {
      patternIdxToType = map(onlyRelevantTypes, (currType) => currType.tokenTypeIdx);
      patternIdxToGroup = map(onlyRelevantTypes, (clazz) => {
        const groupName = clazz.GROUP;
        if (groupName === Lexer.SKIPPED) {
          return void 0;
        } else if (isString(groupName)) {
          return groupName;
        } else if (isUndefined(groupName)) {
          return false;
        } else {
          throw Error("non exhaustive match");
        }
      });
      patternIdxToLongerAltIdxArr = map(onlyRelevantTypes, (clazz) => {
        const longerAltType = clazz.LONGER_ALT;
        if (longerAltType) {
          const longerAltIdxArr = isArray(longerAltType) ? map(longerAltType, (type) => indexOf(onlyRelevantTypes, type)) : [indexOf(onlyRelevantTypes, longerAltType)];
          return longerAltIdxArr;
        }
      });
      patternIdxToPushMode = map(onlyRelevantTypes, (clazz) => clazz.PUSH_MODE);
      patternIdxToPopMode = map(onlyRelevantTypes, (clazz) => has(clazz, "POP_MODE"));
    });
    let patternIdxToCanLineTerminator;
    tracer("Line Terminator Handling", () => {
      const lineTerminatorCharCodes = getCharCodes(options.lineTerminatorCharacters);
      patternIdxToCanLineTerminator = map(onlyRelevantTypes, (tokType) => false);
      if (options.positionTracking !== "onlyOffset") {
        patternIdxToCanLineTerminator = map(onlyRelevantTypes, (tokType) => {
          if (has(tokType, "LINE_BREAKS")) {
            return !!tokType.LINE_BREAKS;
          } else {
            return checkLineBreaksIssues(tokType, lineTerminatorCharCodes) === false && canMatchCharCode(lineTerminatorCharCodes, tokType.PATTERN);
          }
        });
      }
    });
    let patternIdxToIsCustom;
    let patternIdxToShort;
    let emptyGroups;
    let patternIdxToConfig;
    tracer("Misc Mapping #2", () => {
      patternIdxToIsCustom = map(onlyRelevantTypes, isCustomPattern);
      patternIdxToShort = map(allTransformedPatterns, isShortPattern);
      emptyGroups = reduce(onlyRelevantTypes, (acc, clazz) => {
        const groupName = clazz.GROUP;
        if (isString(groupName) && !(groupName === Lexer.SKIPPED)) {
          acc[groupName] = [];
        }
        return acc;
      }, {});
      patternIdxToConfig = map(allTransformedPatterns, (x, idx) => {
        return {
          pattern: allTransformedPatterns[idx],
          longerAlt: patternIdxToLongerAltIdxArr[idx],
          canLineTerminator: patternIdxToCanLineTerminator[idx],
          isCustom: patternIdxToIsCustom[idx],
          short: patternIdxToShort[idx],
          group: patternIdxToGroup[idx],
          push: patternIdxToPushMode[idx],
          pop: patternIdxToPopMode[idx],
          tokenTypeIdx: patternIdxToType[idx],
          tokenType: onlyRelevantTypes[idx]
        };
      });
    });
    let canBeOptimized = true;
    let charCodeToPatternIdxToConfig = [];
    if (!options.safeMode) {
      tracer("First Char Optimization", () => {
        charCodeToPatternIdxToConfig = reduce(onlyRelevantTypes, (result, currTokType, idx) => {
          if (typeof currTokType.PATTERN === "string") {
            const charCode = currTokType.PATTERN.charCodeAt(0);
            const optimizedIdx = charCodeToOptimizedIndex(charCode);
            addToMapOfArrays(result, optimizedIdx, patternIdxToConfig[idx]);
          } else if (isArray(currTokType.START_CHARS_HINT)) {
            let lastOptimizedIdx;
            forEach(currTokType.START_CHARS_HINT, (charOrInt) => {
              const charCode = typeof charOrInt === "string" ? charOrInt.charCodeAt(0) : charOrInt;
              const currOptimizedIdx = charCodeToOptimizedIndex(charCode);
              if (lastOptimizedIdx !== currOptimizedIdx) {
                lastOptimizedIdx = currOptimizedIdx;
                addToMapOfArrays(result, currOptimizedIdx, patternIdxToConfig[idx]);
              }
            });
          } else if (isRegExp(currTokType.PATTERN)) {
            if (currTokType.PATTERN.unicode) {
              canBeOptimized = false;
              if (options.ensureOptimizations) {
                PRINT_ERROR(`${failedOptimizationPrefixMsg}	Unable to analyze < ${currTokType.PATTERN.toString()} > pattern.
	The regexp unicode flag is not currently supported by the regexp-to-ast library.
	This will disable the lexer's first char optimizations.
	For details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#UNICODE_OPTIMIZE`);
              }
            } else {
              const optimizedCodes = getOptimizedStartCodesIndices(currTokType.PATTERN, options.ensureOptimizations);
              if (isEmpty(optimizedCodes)) {
                canBeOptimized = false;
              }
              forEach(optimizedCodes, (code) => {
                addToMapOfArrays(result, code, patternIdxToConfig[idx]);
              });
            }
          } else {
            if (options.ensureOptimizations) {
              PRINT_ERROR(`${failedOptimizationPrefixMsg}	TokenType: <${currTokType.name}> is using a custom token pattern without providing <start_chars_hint> parameter.
	This will disable the lexer's first char optimizations.
	For details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#CUSTOM_OPTIMIZE`);
            }
            canBeOptimized = false;
          }
          return result;
        }, []);
      });
    }
    return {
      emptyGroups,
      patternIdxToConfig,
      charCodeToPatternIdxToConfig,
      hasCustom,
      canBeOptimized
    };
  }
  function validatePatterns(tokenTypes, validModesNames) {
    let errors = [];
    const missingResult = findMissingPatterns(tokenTypes);
    errors = errors.concat(missingResult.errors);
    const invalidResult = findInvalidPatterns(missingResult.valid);
    const validTokenTypes = invalidResult.valid;
    errors = errors.concat(invalidResult.errors);
    errors = errors.concat(validateRegExpPattern(validTokenTypes));
    errors = errors.concat(findInvalidGroupType(validTokenTypes));
    errors = errors.concat(findModesThatDoNotExist(validTokenTypes, validModesNames));
    errors = errors.concat(findUnreachablePatterns(validTokenTypes));
    return errors;
  }
  function validateRegExpPattern(tokenTypes) {
    let errors = [];
    const withRegExpPatterns = filter$2(tokenTypes, (currTokType) => isRegExp(currTokType[PATTERN]));
    errors = errors.concat(findEndOfInputAnchor(withRegExpPatterns));
    errors = errors.concat(findStartOfInputAnchor(withRegExpPatterns));
    errors = errors.concat(findUnsupportedFlags(withRegExpPatterns));
    errors = errors.concat(findDuplicatePatterns(withRegExpPatterns));
    errors = errors.concat(findEmptyMatchRegExps(withRegExpPatterns));
    return errors;
  }
  function findMissingPatterns(tokenTypes) {
    const tokenTypesWithMissingPattern = filter$2(tokenTypes, (currType) => {
      return !has(currType, PATTERN);
    });
    const errors = map(tokenTypesWithMissingPattern, (currType) => {
      return {
        message: "Token Type: ->" + currType.name + "<- missing static 'PATTERN' property",
        type: LexerDefinitionErrorType.MISSING_PATTERN,
        tokenTypes: [currType]
      };
    });
    const valid = difference(tokenTypes, tokenTypesWithMissingPattern);
    return { errors, valid };
  }
  function findInvalidPatterns(tokenTypes) {
    const tokenTypesWithInvalidPattern = filter$2(tokenTypes, (currType) => {
      const pattern = currType[PATTERN];
      return !isRegExp(pattern) && !isFunction(pattern) && !has(pattern, "exec") && !isString(pattern);
    });
    const errors = map(tokenTypesWithInvalidPattern, (currType) => {
      return {
        message: "Token Type: ->" + currType.name + "<- static 'PATTERN' can only be a RegExp, a Function matching the {CustomPatternMatcherFunc} type or an Object matching the {ICustomPattern} interface.",
        type: LexerDefinitionErrorType.INVALID_PATTERN,
        tokenTypes: [currType]
      };
    });
    const valid = difference(tokenTypes, tokenTypesWithInvalidPattern);
    return { errors, valid };
  }
  const end_of_input = /[^\\][$]/;
  function findEndOfInputAnchor(tokenTypes) {
    class EndAnchorFinder extends BaseRegExpVisitor {
      constructor() {
        super(...arguments);
        this.found = false;
      }
      visitEndAnchor(node) {
        this.found = true;
      }
    }
    const invalidRegex = filter$2(tokenTypes, (currType) => {
      const pattern = currType.PATTERN;
      try {
        const regexpAst = getRegExpAst(pattern);
        const endAnchorVisitor = new EndAnchorFinder();
        endAnchorVisitor.visit(regexpAst);
        return endAnchorVisitor.found;
      } catch (e) {
        return end_of_input.test(pattern.source);
      }
    });
    const errors = map(invalidRegex, (currType) => {
      return {
        message: "Unexpected RegExp Anchor Error:\n	Token Type: ->" + currType.name + "<- static 'PATTERN' cannot contain end of input anchor '$'\n	See chevrotain.io/docs/guide/resolving_lexer_errors.html#ANCHORS	for details.",
        type: LexerDefinitionErrorType.EOI_ANCHOR_FOUND,
        tokenTypes: [currType]
      };
    });
    return errors;
  }
  function findEmptyMatchRegExps(tokenTypes) {
    const matchesEmptyString = filter$2(tokenTypes, (currType) => {
      const pattern = currType.PATTERN;
      return pattern.test("");
    });
    const errors = map(matchesEmptyString, (currType) => {
      return {
        message: "Token Type: ->" + currType.name + "<- static 'PATTERN' must not match an empty string",
        type: LexerDefinitionErrorType.EMPTY_MATCH_PATTERN,
        tokenTypes: [currType]
      };
    });
    return errors;
  }
  const start_of_input = /[^\\[][\^]|^\^/;
  function findStartOfInputAnchor(tokenTypes) {
    class StartAnchorFinder extends BaseRegExpVisitor {
      constructor() {
        super(...arguments);
        this.found = false;
      }
      visitStartAnchor(node) {
        this.found = true;
      }
    }
    const invalidRegex = filter$2(tokenTypes, (currType) => {
      const pattern = currType.PATTERN;
      try {
        const regexpAst = getRegExpAst(pattern);
        const startAnchorVisitor = new StartAnchorFinder();
        startAnchorVisitor.visit(regexpAst);
        return startAnchorVisitor.found;
      } catch (e) {
        return start_of_input.test(pattern.source);
      }
    });
    const errors = map(invalidRegex, (currType) => {
      return {
        message: "Unexpected RegExp Anchor Error:\n	Token Type: ->" + currType.name + "<- static 'PATTERN' cannot contain start of input anchor '^'\n	See https://chevrotain.io/docs/guide/resolving_lexer_errors.html#ANCHORS	for details.",
        type: LexerDefinitionErrorType.SOI_ANCHOR_FOUND,
        tokenTypes: [currType]
      };
    });
    return errors;
  }
  function findUnsupportedFlags(tokenTypes) {
    const invalidFlags = filter$2(tokenTypes, (currType) => {
      const pattern = currType[PATTERN];
      return pattern instanceof RegExp && (pattern.multiline || pattern.global);
    });
    const errors = map(invalidFlags, (currType) => {
      return {
        message: "Token Type: ->" + currType.name + "<- static 'PATTERN' may NOT contain global('g') or multiline('m')",
        type: LexerDefinitionErrorType.UNSUPPORTED_FLAGS_FOUND,
        tokenTypes: [currType]
      };
    });
    return errors;
  }
  function findDuplicatePatterns(tokenTypes) {
    const found = [];
    let identicalPatterns = map(tokenTypes, (outerType) => {
      return reduce(tokenTypes, (result, innerType) => {
        if (outerType.PATTERN.source === innerType.PATTERN.source && !includes(found, innerType) && innerType.PATTERN !== Lexer.NA) {
          found.push(innerType);
          result.push(innerType);
          return result;
        }
        return result;
      }, []);
    });
    identicalPatterns = compact(identicalPatterns);
    const duplicatePatterns = filter$2(identicalPatterns, (currIdenticalSet) => {
      return currIdenticalSet.length > 1;
    });
    const errors = map(duplicatePatterns, (setOfIdentical) => {
      const tokenTypeNames = map(setOfIdentical, (currType) => {
        return currType.name;
      });
      const dupPatternSrc = head(setOfIdentical).PATTERN;
      return {
        message: `The same RegExp pattern ->${dupPatternSrc}<-has been used in all of the following Token Types: ${tokenTypeNames.join(", ")} <-`,
        type: LexerDefinitionErrorType.DUPLICATE_PATTERNS_FOUND,
        tokenTypes: setOfIdentical
      };
    });
    return errors;
  }
  function findInvalidGroupType(tokenTypes) {
    const invalidTypes = filter$2(tokenTypes, (clazz) => {
      if (!has(clazz, "GROUP")) {
        return false;
      }
      const group = clazz.GROUP;
      return group !== Lexer.SKIPPED && group !== Lexer.NA && !isString(group);
    });
    const errors = map(invalidTypes, (currType) => {
      return {
        message: "Token Type: ->" + currType.name + "<- static 'GROUP' can only be Lexer.SKIPPED/Lexer.NA/A String",
        type: LexerDefinitionErrorType.INVALID_GROUP_TYPE_FOUND,
        tokenTypes: [currType]
      };
    });
    return errors;
  }
  function findModesThatDoNotExist(tokenTypes, validModes) {
    const invalidModes = filter$2(tokenTypes, (clazz) => {
      return clazz.PUSH_MODE !== void 0 && !includes(validModes, clazz.PUSH_MODE);
    });
    const errors = map(invalidModes, (tokType) => {
      const msg = `Token Type: ->${tokType.name}<- static 'PUSH_MODE' value cannot refer to a Lexer Mode ->${tokType.PUSH_MODE}<-which does not exist`;
      return {
        message: msg,
        type: LexerDefinitionErrorType.PUSH_MODE_DOES_NOT_EXIST,
        tokenTypes: [tokType]
      };
    });
    return errors;
  }
  function findUnreachablePatterns(tokenTypes) {
    const errors = [];
    const canBeTested = reduce(tokenTypes, (result, tokType, idx) => {
      const pattern = tokType.PATTERN;
      if (pattern === Lexer.NA) {
        return result;
      }
      if (isString(pattern)) {
        result.push({ str: pattern, idx, tokenType: tokType });
      } else if (isRegExp(pattern) && noMetaChar(pattern)) {
        result.push({ str: pattern.source, idx, tokenType: tokType });
      }
      return result;
    }, []);
    forEach(tokenTypes, (aTokType, aIdx) => {
      forEach(canBeTested, ({ str: bStr, idx: bIdx, tokenType: bTokType }) => {
        if (aIdx < bIdx && tryToMatchStrToPattern(bStr, aTokType.PATTERN)) {
          const msg = `Token: ->${bTokType.name}<- can never be matched.
Because it appears AFTER the Token Type ->${aTokType.name}<-in the lexer's definition.
See https://chevrotain.io/docs/guide/resolving_lexer_errors.html#UNREACHABLE`;
          errors.push({
            message: msg,
            type: LexerDefinitionErrorType.UNREACHABLE_PATTERN,
            tokenTypes: [aTokType, bTokType]
          });
        }
      });
    });
    return errors;
  }
  function tryToMatchStrToPattern(str2, pattern) {
    if (isRegExp(pattern)) {
      if (usesLookAheadOrBehind(pattern)) {
        return false;
      }
      const regExpArray = pattern.exec(str2);
      return regExpArray !== null && regExpArray.index === 0;
    } else if (isFunction(pattern)) {
      return pattern(str2, 0, [], {});
    } else if (has(pattern, "exec")) {
      return pattern.exec(str2, 0, [], {});
    } else if (typeof pattern === "string") {
      return pattern === str2;
    } else {
      throw Error("non exhaustive match");
    }
  }
  function noMetaChar(regExp) {
    const metaChars = [
      ".",
      "\\",
      "[",
      "]",
      "|",
      "^",
      "$",
      "(",
      ")",
      "?",
      "*",
      "+",
      "{"
    ];
    return find(metaChars, (char) => regExp.source.indexOf(char) !== -1) === void 0;
  }
  function usesLookAheadOrBehind(regExp) {
    return /(\(\?=)|(\(\?!)|(\(\?<=)|(\(\?<!)/.test(regExp.source);
  }
  function addStickyFlag(pattern) {
    const flags = pattern.ignoreCase ? "iy" : "y";
    return new RegExp(`${pattern.source}`, flags);
  }
  function performRuntimeChecks(lexerDefinition, trackLines, lineTerminatorCharacters) {
    const errors = [];
    if (!has(lexerDefinition, DEFAULT_MODE)) {
      errors.push({
        message: "A MultiMode Lexer cannot be initialized without a <" + DEFAULT_MODE + "> property in its definition\n",
        type: LexerDefinitionErrorType.MULTI_MODE_LEXER_WITHOUT_DEFAULT_MODE
      });
    }
    if (!has(lexerDefinition, MODES)) {
      errors.push({
        message: "A MultiMode Lexer cannot be initialized without a <" + MODES + "> property in its definition\n",
        type: LexerDefinitionErrorType.MULTI_MODE_LEXER_WITHOUT_MODES_PROPERTY
      });
    }
    if (has(lexerDefinition, MODES) && has(lexerDefinition, DEFAULT_MODE) && !has(lexerDefinition.modes, lexerDefinition.defaultMode)) {
      errors.push({
        message: `A MultiMode Lexer cannot be initialized with a ${DEFAULT_MODE}: <${lexerDefinition.defaultMode}>which does not exist
`,
        type: LexerDefinitionErrorType.MULTI_MODE_LEXER_DEFAULT_MODE_VALUE_DOES_NOT_EXIST
      });
    }
    if (has(lexerDefinition, MODES)) {
      forEach(lexerDefinition.modes, (currModeValue, currModeName) => {
        forEach(currModeValue, (currTokType, currIdx) => {
          if (isUndefined(currTokType)) {
            errors.push({
              message: `A Lexer cannot be initialized using an undefined Token Type. Mode:<${currModeName}> at index: <${currIdx}>
`,
              type: LexerDefinitionErrorType.LEXER_DEFINITION_CANNOT_CONTAIN_UNDEFINED
            });
          } else if (has(currTokType, "LONGER_ALT")) {
            const longerAlt = isArray(currTokType.LONGER_ALT) ? currTokType.LONGER_ALT : [currTokType.LONGER_ALT];
            forEach(longerAlt, (currLongerAlt) => {
              if (!isUndefined(currLongerAlt) && !includes(currModeValue, currLongerAlt)) {
                errors.push({
                  message: `A MultiMode Lexer cannot be initialized with a longer_alt <${currLongerAlt.name}> on token <${currTokType.name}> outside of mode <${currModeName}>
`,
                  type: LexerDefinitionErrorType.MULTI_MODE_LEXER_LONGER_ALT_NOT_IN_CURRENT_MODE
                });
              }
            });
          }
        });
      });
    }
    return errors;
  }
  function performWarningRuntimeChecks(lexerDefinition, trackLines, lineTerminatorCharacters) {
    const warnings = [];
    let hasAnyLineBreak = false;
    const allTokenTypes = compact(flatten(values$1(lexerDefinition.modes)));
    const concreteTokenTypes = reject(allTokenTypes, (currType) => currType[PATTERN] === Lexer.NA);
    const terminatorCharCodes = getCharCodes(lineTerminatorCharacters);
    if (trackLines) {
      forEach(concreteTokenTypes, (tokType) => {
        const currIssue = checkLineBreaksIssues(tokType, terminatorCharCodes);
        if (currIssue !== false) {
          const message = buildLineBreakIssueMessage(tokType, currIssue);
          const warningDescriptor = {
            message,
            type: currIssue.issue,
            tokenType: tokType
          };
          warnings.push(warningDescriptor);
        } else {
          if (has(tokType, "LINE_BREAKS")) {
            if (tokType.LINE_BREAKS === true) {
              hasAnyLineBreak = true;
            }
          } else {
            if (canMatchCharCode(terminatorCharCodes, tokType.PATTERN)) {
              hasAnyLineBreak = true;
            }
          }
        }
      });
    }
    if (trackLines && !hasAnyLineBreak) {
      warnings.push({
        message: "Warning: No LINE_BREAKS Found.\n	This Lexer has been defined to track line and column information,\n	But none of the Token Types can be identified as matching a line terminator.\n	See https://chevrotain.io/docs/guide/resolving_lexer_errors.html#LINE_BREAKS \n	for details.",
        type: LexerDefinitionErrorType.NO_LINE_BREAKS_FLAGS
      });
    }
    return warnings;
  }
  function cloneEmptyGroups(emptyGroups) {
    const clonedResult = {};
    const groupKeys = keys(emptyGroups);
    forEach(groupKeys, (currKey) => {
      const currGroupValue = emptyGroups[currKey];
      if (isArray(currGroupValue)) {
        clonedResult[currKey] = [];
      } else {
        throw Error("non exhaustive match");
      }
    });
    return clonedResult;
  }
  function isCustomPattern(tokenType) {
    const pattern = tokenType.PATTERN;
    if (isRegExp(pattern)) {
      return false;
    } else if (isFunction(pattern)) {
      return true;
    } else if (has(pattern, "exec")) {
      return true;
    } else if (isString(pattern)) {
      return false;
    } else {
      throw Error("non exhaustive match");
    }
  }
  function isShortPattern(pattern) {
    if (isString(pattern) && pattern.length === 1) {
      return pattern.charCodeAt(0);
    } else {
      return false;
    }
  }
  const LineTerminatorOptimizedTester = {
    // implements /\n|\r\n?/g.test
    test: function(text) {
      const len = text.length;
      for (let i = this.lastIndex; i < len; i++) {
        const c = text.charCodeAt(i);
        if (c === 10) {
          this.lastIndex = i + 1;
          return true;
        } else if (c === 13) {
          if (text.charCodeAt(i + 1) === 10) {
            this.lastIndex = i + 2;
          } else {
            this.lastIndex = i + 1;
          }
          return true;
        }
      }
      return false;
    },
    lastIndex: 0
  };
  function checkLineBreaksIssues(tokType, lineTerminatorCharCodes) {
    if (has(tokType, "LINE_BREAKS")) {
      return false;
    } else {
      if (isRegExp(tokType.PATTERN)) {
        try {
          canMatchCharCode(lineTerminatorCharCodes, tokType.PATTERN);
        } catch (e) {
          return {
            issue: LexerDefinitionErrorType.IDENTIFY_TERMINATOR,
            errMsg: e.message
          };
        }
        return false;
      } else if (isString(tokType.PATTERN)) {
        return false;
      } else if (isCustomPattern(tokType)) {
        return { issue: LexerDefinitionErrorType.CUSTOM_LINE_BREAK };
      } else {
        throw Error("non exhaustive match");
      }
    }
  }
  function buildLineBreakIssueMessage(tokType, details) {
    if (details.issue === LexerDefinitionErrorType.IDENTIFY_TERMINATOR) {
      return `Warning: unable to identify line terminator usage in pattern.
	The problem is in the <${tokType.name}> Token Type
	 Root cause: ${details.errMsg}.
	For details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#IDENTIFY_TERMINATOR`;
    } else if (details.issue === LexerDefinitionErrorType.CUSTOM_LINE_BREAK) {
      return `Warning: A Custom Token Pattern should specify the <line_breaks> option.
	The problem is in the <${tokType.name}> Token Type
	For details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#CUSTOM_LINE_BREAK`;
    } else {
      throw Error("non exhaustive match");
    }
  }
  function getCharCodes(charsOrCodes) {
    const charCodes = map(charsOrCodes, (numOrString) => {
      if (isString(numOrString)) {
        return numOrString.charCodeAt(0);
      } else {
        return numOrString;
      }
    });
    return charCodes;
  }
  function addToMapOfArrays(map2, key, value) {
    if (map2[key] === void 0) {
      map2[key] = [value];
    } else {
      map2[key].push(value);
    }
  }
  const minOptimizationVal = 256;
  let charCodeToOptimizedIdxMap = [];
  function charCodeToOptimizedIndex(charCode) {
    return charCode < minOptimizationVal ? charCode : charCodeToOptimizedIdxMap[charCode];
  }
  function initCharCodeToOptimizedIndexMap() {
    if (isEmpty(charCodeToOptimizedIdxMap)) {
      charCodeToOptimizedIdxMap = new Array(65536);
      for (let i = 0; i < 65536; i++) {
        charCodeToOptimizedIdxMap[i] = i > 255 ? 255 + ~~(i / 255) : i;
      }
    }
  }
  function tokenStructuredMatcher(tokInstance, tokConstructor) {
    const instanceType = tokInstance.tokenTypeIdx;
    if (instanceType === tokConstructor.tokenTypeIdx) {
      return true;
    } else {
      return tokConstructor.isParent === true && tokConstructor.categoryMatchesMap[instanceType] === true;
    }
  }
  function tokenStructuredMatcherNoCategories(token, tokType) {
    return token.tokenTypeIdx === tokType.tokenTypeIdx;
  }
  let tokenShortNameIdx = 1;
  const tokenIdxToClass = {};
  function augmentTokenTypes(tokenTypes) {
    const tokenTypesAndParents = expandCategories(tokenTypes);
    assignTokenDefaultProps(tokenTypesAndParents);
    assignCategoriesMapProp(tokenTypesAndParents);
    assignCategoriesTokensProp(tokenTypesAndParents);
    forEach(tokenTypesAndParents, (tokType) => {
      tokType.isParent = tokType.categoryMatches.length > 0;
    });
  }
  function expandCategories(tokenTypes) {
    let result = clone(tokenTypes);
    let categories = tokenTypes;
    let searching = true;
    while (searching) {
      categories = compact(flatten(map(categories, (currTokType) => currTokType.CATEGORIES)));
      const newCategories = difference(categories, result);
      result = result.concat(newCategories);
      if (isEmpty(newCategories)) {
        searching = false;
      } else {
        categories = newCategories;
      }
    }
    return result;
  }
  function assignTokenDefaultProps(tokenTypes) {
    forEach(tokenTypes, (currTokType) => {
      if (!hasShortKeyProperty(currTokType)) {
        tokenIdxToClass[tokenShortNameIdx] = currTokType;
        currTokType.tokenTypeIdx = tokenShortNameIdx++;
      }
      if (hasCategoriesProperty(currTokType) && !isArray(currTokType.CATEGORIES)) {
        currTokType.CATEGORIES = [currTokType.CATEGORIES];
      }
      if (!hasCategoriesProperty(currTokType)) {
        currTokType.CATEGORIES = [];
      }
      if (!hasExtendingTokensTypesProperty(currTokType)) {
        currTokType.categoryMatches = [];
      }
      if (!hasExtendingTokensTypesMapProperty(currTokType)) {
        currTokType.categoryMatchesMap = {};
      }
    });
  }
  function assignCategoriesTokensProp(tokenTypes) {
    forEach(tokenTypes, (currTokType) => {
      currTokType.categoryMatches = [];
      forEach(currTokType.categoryMatchesMap, (val, key) => {
        currTokType.categoryMatches.push(tokenIdxToClass[key].tokenTypeIdx);
      });
    });
  }
  function assignCategoriesMapProp(tokenTypes) {
    forEach(tokenTypes, (currTokType) => {
      singleAssignCategoriesToksMap([], currTokType);
    });
  }
  function singleAssignCategoriesToksMap(path2, nextNode) {
    forEach(path2, (pathNode) => {
      nextNode.categoryMatchesMap[pathNode.tokenTypeIdx] = true;
    });
    forEach(nextNode.CATEGORIES, (nextCategory) => {
      const newPath = path2.concat(nextNode);
      if (!includes(newPath, nextCategory)) {
        singleAssignCategoriesToksMap(newPath, nextCategory);
      }
    });
  }
  function hasShortKeyProperty(tokType) {
    return has(tokType, "tokenTypeIdx");
  }
  function hasCategoriesProperty(tokType) {
    return has(tokType, "CATEGORIES");
  }
  function hasExtendingTokensTypesProperty(tokType) {
    return has(tokType, "categoryMatches");
  }
  function hasExtendingTokensTypesMapProperty(tokType) {
    return has(tokType, "categoryMatchesMap");
  }
  function isTokenType(tokType) {
    return has(tokType, "tokenTypeIdx");
  }
  const defaultLexerErrorProvider = {
    buildUnableToPopLexerModeMessage(token) {
      return `Unable to pop Lexer Mode after encountering Token ->${token.image}<- The Mode Stack is empty`;
    },
    buildUnexpectedCharactersMessage(fullText, startOffset, length, line, column, mode) {
      return `unexpected character: ->${fullText.charAt(startOffset)}<- at offset: ${startOffset}, skipped ${length} characters.`;
    }
  };
  var LexerDefinitionErrorType;
  (function(LexerDefinitionErrorType2) {
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["MISSING_PATTERN"] = 0] = "MISSING_PATTERN";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["INVALID_PATTERN"] = 1] = "INVALID_PATTERN";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["EOI_ANCHOR_FOUND"] = 2] = "EOI_ANCHOR_FOUND";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["UNSUPPORTED_FLAGS_FOUND"] = 3] = "UNSUPPORTED_FLAGS_FOUND";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["DUPLICATE_PATTERNS_FOUND"] = 4] = "DUPLICATE_PATTERNS_FOUND";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["INVALID_GROUP_TYPE_FOUND"] = 5] = "INVALID_GROUP_TYPE_FOUND";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["PUSH_MODE_DOES_NOT_EXIST"] = 6] = "PUSH_MODE_DOES_NOT_EXIST";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["MULTI_MODE_LEXER_WITHOUT_DEFAULT_MODE"] = 7] = "MULTI_MODE_LEXER_WITHOUT_DEFAULT_MODE";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["MULTI_MODE_LEXER_WITHOUT_MODES_PROPERTY"] = 8] = "MULTI_MODE_LEXER_WITHOUT_MODES_PROPERTY";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["MULTI_MODE_LEXER_DEFAULT_MODE_VALUE_DOES_NOT_EXIST"] = 9] = "MULTI_MODE_LEXER_DEFAULT_MODE_VALUE_DOES_NOT_EXIST";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["LEXER_DEFINITION_CANNOT_CONTAIN_UNDEFINED"] = 10] = "LEXER_DEFINITION_CANNOT_CONTAIN_UNDEFINED";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["SOI_ANCHOR_FOUND"] = 11] = "SOI_ANCHOR_FOUND";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["EMPTY_MATCH_PATTERN"] = 12] = "EMPTY_MATCH_PATTERN";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["NO_LINE_BREAKS_FLAGS"] = 13] = "NO_LINE_BREAKS_FLAGS";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["UNREACHABLE_PATTERN"] = 14] = "UNREACHABLE_PATTERN";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["IDENTIFY_TERMINATOR"] = 15] = "IDENTIFY_TERMINATOR";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["CUSTOM_LINE_BREAK"] = 16] = "CUSTOM_LINE_BREAK";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["MULTI_MODE_LEXER_LONGER_ALT_NOT_IN_CURRENT_MODE"] = 17] = "MULTI_MODE_LEXER_LONGER_ALT_NOT_IN_CURRENT_MODE";
  })(LexerDefinitionErrorType || (LexerDefinitionErrorType = {}));
  const DEFAULT_LEXER_CONFIG = {
    deferDefinitionErrorsHandling: false,
    positionTracking: "full",
    lineTerminatorsPattern: /\n|\r\n?/g,
    lineTerminatorCharacters: ["\n", "\r"],
    ensureOptimizations: false,
    safeMode: false,
    errorMessageProvider: defaultLexerErrorProvider,
    traceInitPerf: false,
    skipValidations: false,
    recoveryEnabled: true
  };
  Object.freeze(DEFAULT_LEXER_CONFIG);
  class Lexer {
    constructor(lexerDefinition, config = DEFAULT_LEXER_CONFIG) {
      this.lexerDefinition = lexerDefinition;
      this.lexerDefinitionErrors = [];
      this.lexerDefinitionWarning = [];
      this.patternIdxToConfig = {};
      this.charCodeToPatternIdxToConfig = {};
      this.modes = [];
      this.emptyGroups = {};
      this.trackStartLines = true;
      this.trackEndLines = true;
      this.hasCustom = false;
      this.canModeBeOptimized = {};
      this.TRACE_INIT = (phaseDesc, phaseImpl) => {
        if (this.traceInitPerf === true) {
          this.traceInitIndent++;
          const indent = new Array(this.traceInitIndent + 1).join("	");
          if (this.traceInitIndent < this.traceInitMaxIdent) {
            console.log(`${indent}--> <${phaseDesc}>`);
          }
          const { time, value } = timer(phaseImpl);
          const traceMethod = time > 10 ? console.warn : console.log;
          if (this.traceInitIndent < this.traceInitMaxIdent) {
            traceMethod(`${indent}<-- <${phaseDesc}> time: ${time}ms`);
          }
          this.traceInitIndent--;
          return value;
        } else {
          return phaseImpl();
        }
      };
      if (typeof config === "boolean") {
        throw Error("The second argument to the Lexer constructor is now an ILexerConfig Object.\na boolean 2nd argument is no longer supported");
      }
      this.config = assign({}, DEFAULT_LEXER_CONFIG, config);
      const traceInitVal = this.config.traceInitPerf;
      if (traceInitVal === true) {
        this.traceInitMaxIdent = Infinity;
        this.traceInitPerf = true;
      } else if (typeof traceInitVal === "number") {
        this.traceInitMaxIdent = traceInitVal;
        this.traceInitPerf = true;
      }
      this.traceInitIndent = -1;
      this.TRACE_INIT("Lexer Constructor", () => {
        let actualDefinition;
        let hasOnlySingleMode = true;
        this.TRACE_INIT("Lexer Config handling", () => {
          if (this.config.lineTerminatorsPattern === DEFAULT_LEXER_CONFIG.lineTerminatorsPattern) {
            this.config.lineTerminatorsPattern = LineTerminatorOptimizedTester;
          } else {
            if (this.config.lineTerminatorCharacters === DEFAULT_LEXER_CONFIG.lineTerminatorCharacters) {
              throw Error("Error: Missing <lineTerminatorCharacters> property on the Lexer config.\n	For details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#MISSING_LINE_TERM_CHARS");
            }
          }
          if (config.safeMode && config.ensureOptimizations) {
            throw Error('"safeMode" and "ensureOptimizations" flags are mutually exclusive.');
          }
          this.trackStartLines = /full|onlyStart/i.test(this.config.positionTracking);
          this.trackEndLines = /full/i.test(this.config.positionTracking);
          if (isArray(lexerDefinition)) {
            actualDefinition = {
              modes: { defaultMode: clone(lexerDefinition) },
              defaultMode: DEFAULT_MODE
            };
          } else {
            hasOnlySingleMode = false;
            actualDefinition = clone(lexerDefinition);
          }
        });
        if (this.config.skipValidations === false) {
          this.TRACE_INIT("performRuntimeChecks", () => {
            this.lexerDefinitionErrors = this.lexerDefinitionErrors.concat(performRuntimeChecks(actualDefinition, this.trackStartLines, this.config.lineTerminatorCharacters));
          });
          this.TRACE_INIT("performWarningRuntimeChecks", () => {
            this.lexerDefinitionWarning = this.lexerDefinitionWarning.concat(performWarningRuntimeChecks(actualDefinition, this.trackStartLines, this.config.lineTerminatorCharacters));
          });
        }
        actualDefinition.modes = actualDefinition.modes ? actualDefinition.modes : {};
        forEach(actualDefinition.modes, (currModeValue, currModeName) => {
          actualDefinition.modes[currModeName] = reject(currModeValue, (currTokType) => isUndefined(currTokType));
        });
        const allModeNames = keys(actualDefinition.modes);
        forEach(actualDefinition.modes, (currModDef, currModName) => {
          this.TRACE_INIT(`Mode: <${currModName}> processing`, () => {
            this.modes.push(currModName);
            if (this.config.skipValidations === false) {
              this.TRACE_INIT(`validatePatterns`, () => {
                this.lexerDefinitionErrors = this.lexerDefinitionErrors.concat(validatePatterns(currModDef, allModeNames));
              });
            }
            if (isEmpty(this.lexerDefinitionErrors)) {
              augmentTokenTypes(currModDef);
              let currAnalyzeResult;
              this.TRACE_INIT(`analyzeTokenTypes`, () => {
                currAnalyzeResult = analyzeTokenTypes(currModDef, {
                  lineTerminatorCharacters: this.config.lineTerminatorCharacters,
                  positionTracking: config.positionTracking,
                  ensureOptimizations: config.ensureOptimizations,
                  safeMode: config.safeMode,
                  tracer: this.TRACE_INIT
                });
              });
              this.patternIdxToConfig[currModName] = currAnalyzeResult.patternIdxToConfig;
              this.charCodeToPatternIdxToConfig[currModName] = currAnalyzeResult.charCodeToPatternIdxToConfig;
              this.emptyGroups = assign({}, this.emptyGroups, currAnalyzeResult.emptyGroups);
              this.hasCustom = currAnalyzeResult.hasCustom || this.hasCustom;
              this.canModeBeOptimized[currModName] = currAnalyzeResult.canBeOptimized;
            }
          });
        });
        this.defaultMode = actualDefinition.defaultMode;
        if (!isEmpty(this.lexerDefinitionErrors) && !this.config.deferDefinitionErrorsHandling) {
          const allErrMessages = map(this.lexerDefinitionErrors, (error) => {
            return error.message;
          });
          const allErrMessagesString = allErrMessages.join("-----------------------\n");
          throw new Error("Errors detected in definition of Lexer:\n" + allErrMessagesString);
        }
        forEach(this.lexerDefinitionWarning, (warningDescriptor) => {
          PRINT_WARNING(warningDescriptor.message);
        });
        this.TRACE_INIT("Choosing sub-methods implementations", () => {
          if (hasOnlySingleMode) {
            this.handleModes = noop;
          }
          if (this.trackStartLines === false) {
            this.computeNewColumn = identity;
          }
          if (this.trackEndLines === false) {
            this.updateTokenEndLineColumnLocation = noop;
          }
          if (/full/i.test(this.config.positionTracking)) {
            this.createTokenInstance = this.createFullToken;
          } else if (/onlyStart/i.test(this.config.positionTracking)) {
            this.createTokenInstance = this.createStartOnlyToken;
          } else if (/onlyOffset/i.test(this.config.positionTracking)) {
            this.createTokenInstance = this.createOffsetOnlyToken;
          } else {
            throw Error(`Invalid <positionTracking> config option: "${this.config.positionTracking}"`);
          }
          if (this.hasCustom) {
            this.addToken = this.addTokenUsingPush;
            this.handlePayload = this.handlePayloadWithCustom;
          } else {
            this.addToken = this.addTokenUsingMemberAccess;
            this.handlePayload = this.handlePayloadNoCustom;
          }
        });
        this.TRACE_INIT("Failed Optimization Warnings", () => {
          const unOptimizedModes = reduce(this.canModeBeOptimized, (cannotBeOptimized, canBeOptimized, modeName) => {
            if (canBeOptimized === false) {
              cannotBeOptimized.push(modeName);
            }
            return cannotBeOptimized;
          }, []);
          if (config.ensureOptimizations && !isEmpty(unOptimizedModes)) {
            throw Error(`Lexer Modes: < ${unOptimizedModes.join(", ")} > cannot be optimized.
	 Disable the "ensureOptimizations" lexer config flag to silently ignore this and run the lexer in an un-optimized mode.
	 Or inspect the console log for details on how to resolve these issues.`);
          }
        });
        this.TRACE_INIT("clearRegExpParserCache", () => {
          clearRegExpParserCache();
        });
        this.TRACE_INIT("toFastProperties", () => {
          toFastProperties(this);
        });
      });
    }
    tokenize(text, initialMode = this.defaultMode) {
      if (!isEmpty(this.lexerDefinitionErrors)) {
        const allErrMessages = map(this.lexerDefinitionErrors, (error) => {
          return error.message;
        });
        const allErrMessagesString = allErrMessages.join("-----------------------\n");
        throw new Error("Unable to Tokenize because Errors detected in definition of Lexer:\n" + allErrMessagesString);
      }
      return this.tokenizeInternal(text, initialMode);
    }
    // There is quite a bit of duplication between this and "tokenizeInternalLazy"
    // This is intentional due to performance considerations.
    // this method also used quite a bit of `!` none null assertions because it is too optimized
    // for `tsc` to always understand it is "safe"
    tokenizeInternal(text, initialMode) {
      let i, j, k, matchAltImage, longerAlt, matchedImage, payload, altPayload, imageLength, group, tokType, newToken, errLength, msg, match;
      const orgText = text;
      const orgLength = orgText.length;
      let offset2 = 0;
      let matchedTokensIndex = 0;
      const guessedNumberOfTokens = this.hasCustom ? 0 : Math.floor(text.length / 10);
      const matchedTokens = new Array(guessedNumberOfTokens);
      const errors = [];
      let line = this.trackStartLines ? 1 : void 0;
      let column = this.trackStartLines ? 1 : void 0;
      const groups = cloneEmptyGroups(this.emptyGroups);
      const trackLines = this.trackStartLines;
      const lineTerminatorPattern = this.config.lineTerminatorsPattern;
      let currModePatternsLength = 0;
      let patternIdxToConfig = [];
      let currCharCodeToPatternIdxToConfig = [];
      const modeStack = [];
      const emptyArray = [];
      Object.freeze(emptyArray);
      let isOptimizedMode = false;
      const pop_mode = (popToken) => {
        if (modeStack.length === 1 && // if we have both a POP_MODE and a PUSH_MODE this is in-fact a "transition"
        // So no error should occur.
        popToken.tokenType.PUSH_MODE === void 0) {
          const msg2 = this.config.errorMessageProvider.buildUnableToPopLexerModeMessage(popToken);
          errors.push({
            offset: popToken.startOffset,
            line: popToken.startLine,
            column: popToken.startColumn,
            length: popToken.image.length,
            message: msg2
          });
        } else {
          modeStack.pop();
          const newMode = last(modeStack);
          patternIdxToConfig = this.patternIdxToConfig[newMode];
          currCharCodeToPatternIdxToConfig = this.charCodeToPatternIdxToConfig[newMode];
          currModePatternsLength = patternIdxToConfig.length;
          const modeCanBeOptimized = this.canModeBeOptimized[newMode] && this.config.safeMode === false;
          if (currCharCodeToPatternIdxToConfig && modeCanBeOptimized) {
            isOptimizedMode = true;
          } else {
            isOptimizedMode = false;
          }
        }
      };
      function push_mode(newMode) {
        modeStack.push(newMode);
        currCharCodeToPatternIdxToConfig = this.charCodeToPatternIdxToConfig[newMode];
        patternIdxToConfig = this.patternIdxToConfig[newMode];
        currModePatternsLength = patternIdxToConfig.length;
        currModePatternsLength = patternIdxToConfig.length;
        const modeCanBeOptimized = this.canModeBeOptimized[newMode] && this.config.safeMode === false;
        if (currCharCodeToPatternIdxToConfig && modeCanBeOptimized) {
          isOptimizedMode = true;
        } else {
          isOptimizedMode = false;
        }
      }
      push_mode.call(this, initialMode);
      let currConfig;
      const recoveryEnabled = this.config.recoveryEnabled;
      while (offset2 < orgLength) {
        matchedImage = null;
        imageLength = -1;
        const nextCharCode = orgText.charCodeAt(offset2);
        let chosenPatternIdxToConfig;
        if (isOptimizedMode) {
          const optimizedCharIdx = charCodeToOptimizedIndex(nextCharCode);
          const possiblePatterns = currCharCodeToPatternIdxToConfig[optimizedCharIdx];
          chosenPatternIdxToConfig = possiblePatterns !== void 0 ? possiblePatterns : emptyArray;
        } else {
          chosenPatternIdxToConfig = patternIdxToConfig;
        }
        const chosenPatternsLength = chosenPatternIdxToConfig.length;
        for (i = 0; i < chosenPatternsLength; i++) {
          currConfig = chosenPatternIdxToConfig[i];
          const currPattern = currConfig.pattern;
          payload = null;
          const singleCharCode = currConfig.short;
          if (singleCharCode !== false) {
            if (nextCharCode === singleCharCode) {
              imageLength = 1;
              matchedImage = currPattern;
            }
          } else if (currConfig.isCustom === true) {
            match = currPattern.exec(orgText, offset2, matchedTokens, groups);
            if (match !== null) {
              matchedImage = match[0];
              imageLength = matchedImage.length;
              if (match.payload !== void 0) {
                payload = match.payload;
              }
            } else {
              matchedImage = null;
            }
          } else {
            currPattern.lastIndex = offset2;
            imageLength = this.matchLength(currPattern, text, offset2);
          }
          if (imageLength !== -1) {
            longerAlt = currConfig.longerAlt;
            if (longerAlt !== void 0) {
              matchedImage = text.substring(offset2, offset2 + imageLength);
              const longerAltLength = longerAlt.length;
              for (k = 0; k < longerAltLength; k++) {
                const longerAltConfig = patternIdxToConfig[longerAlt[k]];
                const longerAltPattern = longerAltConfig.pattern;
                altPayload = null;
                if (longerAltConfig.isCustom === true) {
                  match = longerAltPattern.exec(orgText, offset2, matchedTokens, groups);
                  if (match !== null) {
                    matchAltImage = match[0];
                    if (match.payload !== void 0) {
                      altPayload = match.payload;
                    }
                  } else {
                    matchAltImage = null;
                  }
                } else {
                  longerAltPattern.lastIndex = offset2;
                  matchAltImage = this.match(longerAltPattern, text, offset2);
                }
                if (matchAltImage && matchAltImage.length > matchedImage.length) {
                  matchedImage = matchAltImage;
                  imageLength = matchAltImage.length;
                  payload = altPayload;
                  currConfig = longerAltConfig;
                  break;
                }
              }
            }
            break;
          }
        }
        if (imageLength !== -1) {
          group = currConfig.group;
          if (group !== void 0) {
            matchedImage = matchedImage !== null ? matchedImage : text.substring(offset2, offset2 + imageLength);
            tokType = currConfig.tokenTypeIdx;
            newToken = this.createTokenInstance(matchedImage, offset2, tokType, currConfig.tokenType, line, column, imageLength);
            this.handlePayload(newToken, payload);
            if (group === false) {
              matchedTokensIndex = this.addToken(matchedTokens, matchedTokensIndex, newToken);
            } else {
              groups[group].push(newToken);
            }
          }
          if (trackLines === true && currConfig.canLineTerminator === true) {
            let numOfLTsInMatch = 0;
            let foundTerminator;
            let lastLTEndOffset;
            lineTerminatorPattern.lastIndex = 0;
            do {
              matchedImage = matchedImage !== null ? matchedImage : text.substring(offset2, offset2 + imageLength);
              foundTerminator = lineTerminatorPattern.test(matchedImage);
              if (foundTerminator === true) {
                lastLTEndOffset = lineTerminatorPattern.lastIndex - 1;
                numOfLTsInMatch++;
              }
            } while (foundTerminator === true);
            if (numOfLTsInMatch !== 0) {
              line = line + numOfLTsInMatch;
              column = imageLength - lastLTEndOffset;
              this.updateTokenEndLineColumnLocation(newToken, group, lastLTEndOffset, numOfLTsInMatch, line, column, imageLength);
            } else {
              column = this.computeNewColumn(column, imageLength);
            }
          } else {
            column = this.computeNewColumn(column, imageLength);
          }
          offset2 = offset2 + imageLength;
          this.handleModes(currConfig, pop_mode, push_mode, newToken);
        } else {
          const errorStartOffset = offset2;
          const errorLine = line;
          const errorColumn = column;
          let foundResyncPoint = recoveryEnabled === false;
          while (foundResyncPoint === false && offset2 < orgLength) {
            offset2++;
            for (j = 0; j < currModePatternsLength; j++) {
              const currConfig2 = patternIdxToConfig[j];
              const currPattern = currConfig2.pattern;
              const singleCharCode = currConfig2.short;
              if (singleCharCode !== false) {
                if (orgText.charCodeAt(offset2) === singleCharCode) {
                  foundResyncPoint = true;
                }
              } else if (currConfig2.isCustom === true) {
                foundResyncPoint = currPattern.exec(orgText, offset2, matchedTokens, groups) !== null;
              } else {
                currPattern.lastIndex = offset2;
                foundResyncPoint = currPattern.exec(text) !== null;
              }
              if (foundResyncPoint === true) {
                break;
              }
            }
          }
          errLength = offset2 - errorStartOffset;
          column = this.computeNewColumn(column, errLength);
          msg = this.config.errorMessageProvider.buildUnexpectedCharactersMessage(orgText, errorStartOffset, errLength, errorLine, errorColumn, last(modeStack));
          errors.push({
            offset: errorStartOffset,
            line: errorLine,
            column: errorColumn,
            length: errLength,
            message: msg
          });
          if (recoveryEnabled === false) {
            break;
          }
        }
      }
      if (!this.hasCustom) {
        matchedTokens.length = matchedTokensIndex;
      }
      return {
        tokens: matchedTokens,
        groups,
        errors
      };
    }
    handleModes(config, pop_mode, push_mode, newToken) {
      if (config.pop === true) {
        const pushMode = config.push;
        pop_mode(newToken);
        if (pushMode !== void 0) {
          push_mode.call(this, pushMode);
        }
      } else if (config.push !== void 0) {
        push_mode.call(this, config.push);
      }
    }
    // TODO: decrease this under 600 characters? inspect stripping comments option in TSC compiler
    updateTokenEndLineColumnLocation(newToken, group, lastLTIdx, numOfLTsInMatch, line, column, imageLength) {
      let lastCharIsLT, fixForEndingInLT;
      if (group !== void 0) {
        lastCharIsLT = lastLTIdx === imageLength - 1;
        fixForEndingInLT = lastCharIsLT ? -1 : 0;
        if (!(numOfLTsInMatch === 1 && lastCharIsLT === true)) {
          newToken.endLine = line + fixForEndingInLT;
          newToken.endColumn = column - 1 + -fixForEndingInLT;
        }
      }
    }
    computeNewColumn(oldColumn, imageLength) {
      return oldColumn + imageLength;
    }
    createOffsetOnlyToken(image, startOffset, tokenTypeIdx, tokenType) {
      return {
        image,
        startOffset,
        tokenTypeIdx,
        tokenType
      };
    }
    createStartOnlyToken(image, startOffset, tokenTypeIdx, tokenType, startLine, startColumn) {
      return {
        image,
        startOffset,
        startLine,
        startColumn,
        tokenTypeIdx,
        tokenType
      };
    }
    createFullToken(image, startOffset, tokenTypeIdx, tokenType, startLine, startColumn, imageLength) {
      return {
        image,
        startOffset,
        endOffset: startOffset + imageLength - 1,
        startLine,
        endLine: startLine,
        startColumn,
        endColumn: startColumn + imageLength - 1,
        tokenTypeIdx,
        tokenType
      };
    }
    addTokenUsingPush(tokenVector, index, tokenToAdd) {
      tokenVector.push(tokenToAdd);
      return index;
    }
    addTokenUsingMemberAccess(tokenVector, index, tokenToAdd) {
      tokenVector[index] = tokenToAdd;
      index++;
      return index;
    }
    handlePayloadNoCustom(token, payload) {
    }
    handlePayloadWithCustom(token, payload) {
      if (payload !== null) {
        token.payload = payload;
      }
    }
    match(pattern, text, offset2) {
      const found = pattern.test(text);
      if (found === true) {
        return text.substring(offset2, pattern.lastIndex);
      }
      return null;
    }
    matchLength(pattern, text, offset2) {
      const found = pattern.test(text);
      if (found === true) {
        return pattern.lastIndex - offset2;
      }
      return -1;
    }
  }
  Lexer.SKIPPED = "This marks a skipped Token pattern, this means each token identified by it will be consumed and then thrown into oblivion, this can be used to for example to completely ignore whitespace.";
  Lexer.NA = /NOT_APPLICABLE/;
  function tokenLabel(tokType) {
    if (hasTokenLabel(tokType)) {
      return tokType.LABEL;
    } else {
      return tokType.name;
    }
  }
  function hasTokenLabel(obj) {
    return isString(obj.LABEL) && obj.LABEL !== "";
  }
  const PARENT = "parent";
  const CATEGORIES = "categories";
  const LABEL = "label";
  const GROUP = "group";
  const PUSH_MODE = "push_mode";
  const POP_MODE = "pop_mode";
  const LONGER_ALT = "longer_alt";
  const LINE_BREAKS = "line_breaks";
  const START_CHARS_HINT = "start_chars_hint";
  function createToken$1(config) {
    return createTokenInternal(config);
  }
  function createTokenInternal(config) {
    const pattern = config.pattern;
    const tokenType = {};
    tokenType.name = config.name;
    if (!isUndefined(pattern)) {
      tokenType.PATTERN = pattern;
    }
    if (has(config, PARENT)) {
      throw "The parent property is no longer supported.\nSee: https://github.com/chevrotain/chevrotain/issues/564#issuecomment-349062346 for details.";
    }
    if (has(config, CATEGORIES)) {
      tokenType.CATEGORIES = config[CATEGORIES];
    }
    augmentTokenTypes([tokenType]);
    if (has(config, LABEL)) {
      tokenType.LABEL = config[LABEL];
    }
    if (has(config, GROUP)) {
      tokenType.GROUP = config[GROUP];
    }
    if (has(config, POP_MODE)) {
      tokenType.POP_MODE = config[POP_MODE];
    }
    if (has(config, PUSH_MODE)) {
      tokenType.PUSH_MODE = config[PUSH_MODE];
    }
    if (has(config, LONGER_ALT)) {
      tokenType.LONGER_ALT = config[LONGER_ALT];
    }
    if (has(config, LINE_BREAKS)) {
      tokenType.LINE_BREAKS = config[LINE_BREAKS];
    }
    if (has(config, START_CHARS_HINT)) {
      tokenType.START_CHARS_HINT = config[START_CHARS_HINT];
    }
    return tokenType;
  }
  const EOF = createToken$1({ name: "EOF", pattern: Lexer.NA });
  augmentTokenTypes([EOF]);
  function createTokenInstance(tokType, image, startOffset, endOffset, startLine, endLine, startColumn, endColumn) {
    return {
      image,
      startOffset,
      endOffset,
      startLine,
      endLine,
      startColumn,
      endColumn,
      tokenTypeIdx: tokType.tokenTypeIdx,
      tokenType: tokType
    };
  }
  function tokenMatcher(token, tokType) {
    return tokenStructuredMatcher(token, tokType);
  }
  const defaultParserErrorProvider = {
    buildMismatchTokenMessage({ expected, actual, previous, ruleName }) {
      const hasLabel = hasTokenLabel(expected);
      const expectedMsg = hasLabel ? `--> ${tokenLabel(expected)} <--` : `token of type --> ${expected.name} <--`;
      const msg = `Expecting ${expectedMsg} but found --> '${actual.image}' <--`;
      return msg;
    },
    buildNotAllInputParsedMessage({ firstRedundant, ruleName }) {
      return "Redundant input, expecting EOF but found: " + firstRedundant.image;
    },
    buildNoViableAltMessage({ expectedPathsPerAlt, actual, previous, customUserDescription, ruleName }) {
      const errPrefix = "Expecting: ";
      const actualText = head(actual).image;
      const errSuffix = "\nbut found: '" + actualText + "'";
      if (customUserDescription) {
        return errPrefix + customUserDescription + errSuffix;
      } else {
        const allLookAheadPaths = reduce(expectedPathsPerAlt, (result, currAltPaths) => result.concat(currAltPaths), []);
        const nextValidTokenSequences = map(allLookAheadPaths, (currPath) => `[${map(currPath, (currTokenType) => tokenLabel(currTokenType)).join(", ")}]`);
        const nextValidSequenceItems = map(nextValidTokenSequences, (itemMsg, idx) => `  ${idx + 1}. ${itemMsg}`);
        const calculatedDescription = `one of these possible Token sequences:
${nextValidSequenceItems.join("\n")}`;
        return errPrefix + calculatedDescription + errSuffix;
      }
    },
    buildEarlyExitMessage({ expectedIterationPaths, actual, customUserDescription, ruleName }) {
      const errPrefix = "Expecting: ";
      const actualText = head(actual).image;
      const errSuffix = "\nbut found: '" + actualText + "'";
      if (customUserDescription) {
        return errPrefix + customUserDescription + errSuffix;
      } else {
        const nextValidTokenSequences = map(expectedIterationPaths, (currPath) => `[${map(currPath, (currTokenType) => tokenLabel(currTokenType)).join(",")}]`);
        const calculatedDescription = `expecting at least one iteration which starts with one of these possible Token sequences::
  <${nextValidTokenSequences.join(" ,")}>`;
        return errPrefix + calculatedDescription + errSuffix;
      }
    }
  };
  Object.freeze(defaultParserErrorProvider);
  const defaultGrammarResolverErrorProvider = {
    buildRuleNotFoundError(topLevelRule, undefinedRule) {
      const msg = "Invalid grammar, reference to a rule which is not defined: ->" + undefinedRule.nonTerminalName + "<-\ninside top level rule: ->" + topLevelRule.name + "<-";
      return msg;
    }
  };
  const defaultGrammarValidatorErrorProvider = {
    buildDuplicateFoundError(topLevelRule, duplicateProds) {
      function getExtraProductionArgument2(prod) {
        if (prod instanceof Terminal) {
          return prod.terminalType.name;
        } else if (prod instanceof NonTerminal) {
          return prod.nonTerminalName;
        } else {
          return "";
        }
      }
      const topLevelName = topLevelRule.name;
      const duplicateProd = head(duplicateProds);
      const index = duplicateProd.idx;
      const dslName = getProductionDslName(duplicateProd);
      const extraArgument = getExtraProductionArgument2(duplicateProd);
      const hasExplicitIndex = index > 0;
      let msg = `->${dslName}${hasExplicitIndex ? index : ""}<- ${extraArgument ? `with argument: ->${extraArgument}<-` : ""}
                  appears more than once (${duplicateProds.length} times) in the top level rule: ->${topLevelName}<-.                  
                  For further details see: https://chevrotain.io/docs/FAQ.html#NUMERICAL_SUFFIXES 
                  `;
      msg = msg.replace(/[ \t]+/g, " ");
      msg = msg.replace(/\s\s+/g, "\n");
      return msg;
    },
    buildNamespaceConflictError(rule) {
      const errMsg = `Namespace conflict found in grammar.
The grammar has both a Terminal(Token) and a Non-Terminal(Rule) named: <${rule.name}>.
To resolve this make sure each Terminal and Non-Terminal names are unique
This is easy to accomplish by using the convention that Terminal names start with an uppercase letter
and Non-Terminal names start with a lower case letter.`;
      return errMsg;
    },
    buildAlternationPrefixAmbiguityError(options) {
      const pathMsg = map(options.prefixPath, (currTok) => tokenLabel(currTok)).join(", ");
      const occurrence = options.alternation.idx === 0 ? "" : options.alternation.idx;
      const errMsg = `Ambiguous alternatives: <${options.ambiguityIndices.join(" ,")}> due to common lookahead prefix
in <OR${occurrence}> inside <${options.topLevelRule.name}> Rule,
<${pathMsg}> may appears as a prefix path in all these alternatives.
See: https://chevrotain.io/docs/guide/resolving_grammar_errors.html#COMMON_PREFIX
For Further details.`;
      return errMsg;
    },
    buildAlternationAmbiguityError(options) {
      const occurrence = options.alternation.idx === 0 ? "" : options.alternation.idx;
      const isEmptyPath = options.prefixPath.length === 0;
      let currMessage = `Ambiguous Alternatives Detected: <${options.ambiguityIndices.join(" ,")}> in <OR${occurrence}> inside <${options.topLevelRule.name}> Rule,
`;
      if (isEmptyPath) {
        currMessage += `These alternatives are all empty (match no tokens), making them indistinguishable.
Only the last alternative may be empty.
`;
      } else {
        const pathMsg = map(options.prefixPath, (currtok) => tokenLabel(currtok)).join(", ");
        currMessage += `<${pathMsg}> may appears as a prefix path in all these alternatives.
`;
      }
      currMessage += `See: https://chevrotain.io/docs/guide/resolving_grammar_errors.html#AMBIGUOUS_ALTERNATIVES
For Further details.`;
      return currMessage;
    },
    buildEmptyRepetitionError(options) {
      let dslName = getProductionDslName(options.repetition);
      if (options.repetition.idx !== 0) {
        dslName += options.repetition.idx;
      }
      const errMsg = `The repetition <${dslName}> within Rule <${options.topLevelRule.name}> can never consume any tokens.
This could lead to an infinite loop.`;
      return errMsg;
    },
    // TODO: remove - `errors_public` from nyc.config.js exclude
    //       once this method is fully removed from this file
    buildTokenNameError(options) {
      return "deprecated";
    },
    buildEmptyAlternationError(options) {
      const errMsg = `Ambiguous empty alternative: <${options.emptyChoiceIdx + 1}> in <OR${options.alternation.idx}> inside <${options.topLevelRule.name}> Rule.
Only the last alternative may be an empty alternative.`;
      return errMsg;
    },
    buildTooManyAlternativesError(options) {
      const errMsg = `An Alternation cannot have more than 256 alternatives:
<OR${options.alternation.idx}> inside <${options.topLevelRule.name}> Rule.
 has ${options.alternation.definition.length + 1} alternatives.`;
      return errMsg;
    },
    buildLeftRecursionError(options) {
      const ruleName = options.topLevelRule.name;
      const pathNames = map(options.leftRecursionPath, (currRule) => currRule.name);
      const leftRecursivePath = `${ruleName} --> ${pathNames.concat([ruleName]).join(" --> ")}`;
      const errMsg = `Left Recursion found in grammar.
rule: <${ruleName}> can be invoked from itself (directly or indirectly)
without consuming any Tokens. The grammar path that causes this is: 
 ${leftRecursivePath}
 To fix this refactor your grammar to remove the left recursion.
see: https://en.wikipedia.org/wiki/LL_parser#Left_factoring.`;
      return errMsg;
    },
    // TODO: remove - `errors_public` from nyc.config.js exclude
    //       once this method is fully removed from this file
    buildInvalidRuleNameError(options) {
      return "deprecated";
    },
    buildDuplicateRuleNameError(options) {
      let ruleName;
      if (options.topLevelRule instanceof Rule) {
        ruleName = options.topLevelRule.name;
      } else {
        ruleName = options.topLevelRule;
      }
      const errMsg = `Duplicate definition, rule: ->${ruleName}<- is already defined in the grammar: ->${options.grammarName}<-`;
      return errMsg;
    }
  };
  function resolveGrammar$1(topLevels, errMsgProvider) {
    const refResolver = new GastRefResolverVisitor(topLevels, errMsgProvider);
    refResolver.resolveRefs();
    return refResolver.errors;
  }
  class GastRefResolverVisitor extends GAstVisitor {
    constructor(nameToTopRule, errMsgProvider) {
      super();
      this.nameToTopRule = nameToTopRule;
      this.errMsgProvider = errMsgProvider;
      this.errors = [];
    }
    resolveRefs() {
      forEach(values$1(this.nameToTopRule), (prod) => {
        this.currTopLevel = prod;
        prod.accept(this);
      });
    }
    visitNonTerminal(node) {
      const ref = this.nameToTopRule[node.nonTerminalName];
      if (!ref) {
        const msg = this.errMsgProvider.buildRuleNotFoundError(this.currTopLevel, node);
        this.errors.push({
          message: msg,
          type: ParserDefinitionErrorType.UNRESOLVED_SUBRULE_REF,
          ruleName: this.currTopLevel.name,
          unresolvedRefName: node.nonTerminalName
        });
      } else {
        node.referencedRule = ref;
      }
    }
  }
  class AbstractNextPossibleTokensWalker extends RestWalker {
    constructor(topProd, path2) {
      super();
      this.topProd = topProd;
      this.path = path2;
      this.possibleTokTypes = [];
      this.nextProductionName = "";
      this.nextProductionOccurrence = 0;
      this.found = false;
      this.isAtEndOfPath = false;
    }
    startWalking() {
      this.found = false;
      if (this.path.ruleStack[0] !== this.topProd.name) {
        throw Error("The path does not start with the walker's top Rule!");
      }
      this.ruleStack = clone(this.path.ruleStack).reverse();
      this.occurrenceStack = clone(this.path.occurrenceStack).reverse();
      this.ruleStack.pop();
      this.occurrenceStack.pop();
      this.updateExpectedNext();
      this.walk(this.topProd);
      return this.possibleTokTypes;
    }
    walk(prod, prevRest = []) {
      if (!this.found) {
        super.walk(prod, prevRest);
      }
    }
    walkProdRef(refProd, currRest, prevRest) {
      if (refProd.referencedRule.name === this.nextProductionName && refProd.idx === this.nextProductionOccurrence) {
        const fullRest = currRest.concat(prevRest);
        this.updateExpectedNext();
        this.walk(refProd.referencedRule, fullRest);
      }
    }
    updateExpectedNext() {
      if (isEmpty(this.ruleStack)) {
        this.nextProductionName = "";
        this.nextProductionOccurrence = 0;
        this.isAtEndOfPath = true;
      } else {
        this.nextProductionName = this.ruleStack.pop();
        this.nextProductionOccurrence = this.occurrenceStack.pop();
      }
    }
  }
  class NextAfterTokenWalker extends AbstractNextPossibleTokensWalker {
    constructor(topProd, path2) {
      super(topProd, path2);
      this.path = path2;
      this.nextTerminalName = "";
      this.nextTerminalOccurrence = 0;
      this.nextTerminalName = this.path.lastTok.name;
      this.nextTerminalOccurrence = this.path.lastTokOccurrence;
    }
    walkTerminal(terminal, currRest, prevRest) {
      if (this.isAtEndOfPath && terminal.terminalType.name === this.nextTerminalName && terminal.idx === this.nextTerminalOccurrence && !this.found) {
        const fullRest = currRest.concat(prevRest);
        const restProd = new Alternative({ definition: fullRest });
        this.possibleTokTypes = first(restProd);
        this.found = true;
      }
    }
  }
  class AbstractNextTerminalAfterProductionWalker extends RestWalker {
    constructor(topRule, occurrence) {
      super();
      this.topRule = topRule;
      this.occurrence = occurrence;
      this.result = {
        token: void 0,
        occurrence: void 0,
        isEndOfRule: void 0
      };
    }
    startWalking() {
      this.walk(this.topRule);
      return this.result;
    }
  }
  class NextTerminalAfterManyWalker extends AbstractNextTerminalAfterProductionWalker {
    walkMany(manyProd, currRest, prevRest) {
      if (manyProd.idx === this.occurrence) {
        const firstAfterMany = head(currRest.concat(prevRest));
        this.result.isEndOfRule = firstAfterMany === void 0;
        if (firstAfterMany instanceof Terminal) {
          this.result.token = firstAfterMany.terminalType;
          this.result.occurrence = firstAfterMany.idx;
        }
      } else {
        super.walkMany(manyProd, currRest, prevRest);
      }
    }
  }
  class NextTerminalAfterManySepWalker extends AbstractNextTerminalAfterProductionWalker {
    walkManySep(manySepProd, currRest, prevRest) {
      if (manySepProd.idx === this.occurrence) {
        const firstAfterManySep = head(currRest.concat(prevRest));
        this.result.isEndOfRule = firstAfterManySep === void 0;
        if (firstAfterManySep instanceof Terminal) {
          this.result.token = firstAfterManySep.terminalType;
          this.result.occurrence = firstAfterManySep.idx;
        }
      } else {
        super.walkManySep(manySepProd, currRest, prevRest);
      }
    }
  }
  class NextTerminalAfterAtLeastOneWalker extends AbstractNextTerminalAfterProductionWalker {
    walkAtLeastOne(atLeastOneProd, currRest, prevRest) {
      if (atLeastOneProd.idx === this.occurrence) {
        const firstAfterAtLeastOne = head(currRest.concat(prevRest));
        this.result.isEndOfRule = firstAfterAtLeastOne === void 0;
        if (firstAfterAtLeastOne instanceof Terminal) {
          this.result.token = firstAfterAtLeastOne.terminalType;
          this.result.occurrence = firstAfterAtLeastOne.idx;
        }
      } else {
        super.walkAtLeastOne(atLeastOneProd, currRest, prevRest);
      }
    }
  }
  class NextTerminalAfterAtLeastOneSepWalker extends AbstractNextTerminalAfterProductionWalker {
    walkAtLeastOneSep(atleastOneSepProd, currRest, prevRest) {
      if (atleastOneSepProd.idx === this.occurrence) {
        const firstAfterfirstAfterAtLeastOneSep = head(currRest.concat(prevRest));
        this.result.isEndOfRule = firstAfterfirstAfterAtLeastOneSep === void 0;
        if (firstAfterfirstAfterAtLeastOneSep instanceof Terminal) {
          this.result.token = firstAfterfirstAfterAtLeastOneSep.terminalType;
          this.result.occurrence = firstAfterfirstAfterAtLeastOneSep.idx;
        }
      } else {
        super.walkAtLeastOneSep(atleastOneSepProd, currRest, prevRest);
      }
    }
  }
  function possiblePathsFrom(targetDef, maxLength, currPath = []) {
    currPath = clone(currPath);
    let result = [];
    let i = 0;
    function remainingPathWith(nextDef) {
      return nextDef.concat(drop$2(targetDef, i + 1));
    }
    function getAlternativesForProd(definition) {
      const alternatives = possiblePathsFrom(remainingPathWith(definition), maxLength, currPath);
      return result.concat(alternatives);
    }
    while (currPath.length < maxLength && i < targetDef.length) {
      const prod = targetDef[i];
      if (prod instanceof Alternative) {
        return getAlternativesForProd(prod.definition);
      } else if (prod instanceof NonTerminal) {
        return getAlternativesForProd(prod.definition);
      } else if (prod instanceof Option) {
        result = getAlternativesForProd(prod.definition);
      } else if (prod instanceof RepetitionMandatory) {
        const newDef = prod.definition.concat([
          new Repetition({
            definition: prod.definition
          })
        ]);
        return getAlternativesForProd(newDef);
      } else if (prod instanceof RepetitionMandatoryWithSeparator) {
        const newDef = [
          new Alternative({ definition: prod.definition }),
          new Repetition({
            definition: [new Terminal({ terminalType: prod.separator })].concat(prod.definition)
          })
        ];
        return getAlternativesForProd(newDef);
      } else if (prod instanceof RepetitionWithSeparator) {
        const newDef = prod.definition.concat([
          new Repetition({
            definition: [new Terminal({ terminalType: prod.separator })].concat(prod.definition)
          })
        ]);
        result = getAlternativesForProd(newDef);
      } else if (prod instanceof Repetition) {
        const newDef = prod.definition.concat([
          new Repetition({
            definition: prod.definition
          })
        ]);
        result = getAlternativesForProd(newDef);
      } else if (prod instanceof Alternation) {
        forEach(prod.definition, (currAlt) => {
          if (isEmpty(currAlt.definition) === false) {
            result = getAlternativesForProd(currAlt.definition);
          }
        });
        return result;
      } else if (prod instanceof Terminal) {
        currPath.push(prod.terminalType);
      } else {
        throw Error("non exhaustive match");
      }
      i++;
    }
    result.push({
      partialPath: currPath,
      suffixDef: drop$2(targetDef, i)
    });
    return result;
  }
  function nextPossibleTokensAfter(initialDef, tokenVector, tokMatcher, maxLookAhead) {
    const EXIT_NON_TERMINAL = "EXIT_NONE_TERMINAL";
    const EXIT_NON_TERMINAL_ARR = [EXIT_NON_TERMINAL];
    const EXIT_ALTERNATIVE = "EXIT_ALTERNATIVE";
    let foundCompletePath = false;
    const tokenVectorLength = tokenVector.length;
    const minimalAlternativesIndex = tokenVectorLength - maxLookAhead - 1;
    const result = [];
    const possiblePaths = [];
    possiblePaths.push({
      idx: -1,
      def: initialDef,
      ruleStack: [],
      occurrenceStack: []
    });
    while (!isEmpty(possiblePaths)) {
      const currPath = possiblePaths.pop();
      if (currPath === EXIT_ALTERNATIVE) {
        if (foundCompletePath && last(possiblePaths).idx <= minimalAlternativesIndex) {
          possiblePaths.pop();
        }
        continue;
      }
      const currDef = currPath.def;
      const currIdx = currPath.idx;
      const currRuleStack = currPath.ruleStack;
      const currOccurrenceStack = currPath.occurrenceStack;
      if (isEmpty(currDef)) {
        continue;
      }
      const prod = currDef[0];
      if (prod === EXIT_NON_TERMINAL) {
        const nextPath = {
          idx: currIdx,
          def: drop$2(currDef),
          ruleStack: dropRight(currRuleStack),
          occurrenceStack: dropRight(currOccurrenceStack)
        };
        possiblePaths.push(nextPath);
      } else if (prod instanceof Terminal) {
        if (currIdx < tokenVectorLength - 1) {
          const nextIdx = currIdx + 1;
          const actualToken = tokenVector[nextIdx];
          if (tokMatcher(actualToken, prod.terminalType)) {
            const nextPath = {
              idx: nextIdx,
              def: drop$2(currDef),
              ruleStack: currRuleStack,
              occurrenceStack: currOccurrenceStack
            };
            possiblePaths.push(nextPath);
          }
        } else if (currIdx === tokenVectorLength - 1) {
          result.push({
            nextTokenType: prod.terminalType,
            nextTokenOccurrence: prod.idx,
            ruleStack: currRuleStack,
            occurrenceStack: currOccurrenceStack
          });
          foundCompletePath = true;
        } else {
          throw Error("non exhaustive match");
        }
      } else if (prod instanceof NonTerminal) {
        const newRuleStack = clone(currRuleStack);
        newRuleStack.push(prod.nonTerminalName);
        const newOccurrenceStack = clone(currOccurrenceStack);
        newOccurrenceStack.push(prod.idx);
        const nextPath = {
          idx: currIdx,
          def: prod.definition.concat(EXIT_NON_TERMINAL_ARR, drop$2(currDef)),
          ruleStack: newRuleStack,
          occurrenceStack: newOccurrenceStack
        };
        possiblePaths.push(nextPath);
      } else if (prod instanceof Option) {
        const nextPathWithout = {
          idx: currIdx,
          def: drop$2(currDef),
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        };
        possiblePaths.push(nextPathWithout);
        possiblePaths.push(EXIT_ALTERNATIVE);
        const nextPathWith = {
          idx: currIdx,
          def: prod.definition.concat(drop$2(currDef)),
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        };
        possiblePaths.push(nextPathWith);
      } else if (prod instanceof RepetitionMandatory) {
        const secondIteration = new Repetition({
          definition: prod.definition,
          idx: prod.idx
        });
        const nextDef = prod.definition.concat([secondIteration], drop$2(currDef));
        const nextPath = {
          idx: currIdx,
          def: nextDef,
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        };
        possiblePaths.push(nextPath);
      } else if (prod instanceof RepetitionMandatoryWithSeparator) {
        const separatorGast = new Terminal({
          terminalType: prod.separator
        });
        const secondIteration = new Repetition({
          definition: [separatorGast].concat(prod.definition),
          idx: prod.idx
        });
        const nextDef = prod.definition.concat([secondIteration], drop$2(currDef));
        const nextPath = {
          idx: currIdx,
          def: nextDef,
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        };
        possiblePaths.push(nextPath);
      } else if (prod instanceof RepetitionWithSeparator) {
        const nextPathWithout = {
          idx: currIdx,
          def: drop$2(currDef),
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        };
        possiblePaths.push(nextPathWithout);
        possiblePaths.push(EXIT_ALTERNATIVE);
        const separatorGast = new Terminal({
          terminalType: prod.separator
        });
        const nthRepetition = new Repetition({
          definition: [separatorGast].concat(prod.definition),
          idx: prod.idx
        });
        const nextDef = prod.definition.concat([nthRepetition], drop$2(currDef));
        const nextPathWith = {
          idx: currIdx,
          def: nextDef,
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        };
        possiblePaths.push(nextPathWith);
      } else if (prod instanceof Repetition) {
        const nextPathWithout = {
          idx: currIdx,
          def: drop$2(currDef),
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        };
        possiblePaths.push(nextPathWithout);
        possiblePaths.push(EXIT_ALTERNATIVE);
        const nthRepetition = new Repetition({
          definition: prod.definition,
          idx: prod.idx
        });
        const nextDef = prod.definition.concat([nthRepetition], drop$2(currDef));
        const nextPathWith = {
          idx: currIdx,
          def: nextDef,
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        };
        possiblePaths.push(nextPathWith);
      } else if (prod instanceof Alternation) {
        for (let i = prod.definition.length - 1; i >= 0; i--) {
          const currAlt = prod.definition[i];
          const currAltPath = {
            idx: currIdx,
            def: currAlt.definition.concat(drop$2(currDef)),
            ruleStack: currRuleStack,
            occurrenceStack: currOccurrenceStack
          };
          possiblePaths.push(currAltPath);
          possiblePaths.push(EXIT_ALTERNATIVE);
        }
      } else if (prod instanceof Alternative) {
        possiblePaths.push({
          idx: currIdx,
          def: prod.definition.concat(drop$2(currDef)),
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        });
      } else if (prod instanceof Rule) {
        possiblePaths.push(expandTopLevelRule(prod, currIdx, currRuleStack, currOccurrenceStack));
      } else {
        throw Error("non exhaustive match");
      }
    }
    return result;
  }
  function expandTopLevelRule(topRule, currIdx, currRuleStack, currOccurrenceStack) {
    const newRuleStack = clone(currRuleStack);
    newRuleStack.push(topRule.name);
    const newCurrOccurrenceStack = clone(currOccurrenceStack);
    newCurrOccurrenceStack.push(1);
    return {
      idx: currIdx,
      def: topRule.definition,
      ruleStack: newRuleStack,
      occurrenceStack: newCurrOccurrenceStack
    };
  }
  var PROD_TYPE;
  (function(PROD_TYPE2) {
    PROD_TYPE2[PROD_TYPE2["OPTION"] = 0] = "OPTION";
    PROD_TYPE2[PROD_TYPE2["REPETITION"] = 1] = "REPETITION";
    PROD_TYPE2[PROD_TYPE2["REPETITION_MANDATORY"] = 2] = "REPETITION_MANDATORY";
    PROD_TYPE2[PROD_TYPE2["REPETITION_MANDATORY_WITH_SEPARATOR"] = 3] = "REPETITION_MANDATORY_WITH_SEPARATOR";
    PROD_TYPE2[PROD_TYPE2["REPETITION_WITH_SEPARATOR"] = 4] = "REPETITION_WITH_SEPARATOR";
    PROD_TYPE2[PROD_TYPE2["ALTERNATION"] = 5] = "ALTERNATION";
  })(PROD_TYPE || (PROD_TYPE = {}));
  function getProdType(prod) {
    if (prod instanceof Option || prod === "Option") {
      return PROD_TYPE.OPTION;
    } else if (prod instanceof Repetition || prod === "Repetition") {
      return PROD_TYPE.REPETITION;
    } else if (prod instanceof RepetitionMandatory || prod === "RepetitionMandatory") {
      return PROD_TYPE.REPETITION_MANDATORY;
    } else if (prod instanceof RepetitionMandatoryWithSeparator || prod === "RepetitionMandatoryWithSeparator") {
      return PROD_TYPE.REPETITION_MANDATORY_WITH_SEPARATOR;
    } else if (prod instanceof RepetitionWithSeparator || prod === "RepetitionWithSeparator") {
      return PROD_TYPE.REPETITION_WITH_SEPARATOR;
    } else if (prod instanceof Alternation || prod === "Alternation") {
      return PROD_TYPE.ALTERNATION;
    } else {
      throw Error("non exhaustive match");
    }
  }
  function buildLookaheadFuncForOr(occurrence, ruleGrammar, maxLookahead, hasPredicates, dynamicTokensEnabled, laFuncBuilder) {
    const lookAheadPaths = getLookaheadPathsForOr(occurrence, ruleGrammar, maxLookahead);
    const tokenMatcher2 = areTokenCategoriesNotUsed(lookAheadPaths) ? tokenStructuredMatcherNoCategories : tokenStructuredMatcher;
    return laFuncBuilder(lookAheadPaths, hasPredicates, tokenMatcher2, dynamicTokensEnabled);
  }
  function buildLookaheadFuncForOptionalProd(occurrence, ruleGrammar, k, dynamicTokensEnabled, prodType, lookaheadBuilder) {
    const lookAheadPaths = getLookaheadPathsForOptionalProd(occurrence, ruleGrammar, prodType, k);
    const tokenMatcher2 = areTokenCategoriesNotUsed(lookAheadPaths) ? tokenStructuredMatcherNoCategories : tokenStructuredMatcher;
    return lookaheadBuilder(lookAheadPaths[0], tokenMatcher2, dynamicTokensEnabled);
  }
  function buildAlternativesLookAheadFunc(alts, hasPredicates, tokenMatcher2, dynamicTokensEnabled) {
    const numOfAlts = alts.length;
    const areAllOneTokenLookahead = every(alts, (currAlt) => {
      return every(currAlt, (currPath) => {
        return currPath.length === 1;
      });
    });
    if (hasPredicates) {
      return function(orAlts) {
        const predicates = map(orAlts, (currAlt) => currAlt.GATE);
        for (let t = 0; t < numOfAlts; t++) {
          const currAlt = alts[t];
          const currNumOfPaths = currAlt.length;
          const currPredicate = predicates[t];
          if (currPredicate !== void 0 && currPredicate.call(this) === false) {
            continue;
          }
          nextPath: for (let j = 0; j < currNumOfPaths; j++) {
            const currPath = currAlt[j];
            const currPathLength = currPath.length;
            for (let i = 0; i < currPathLength; i++) {
              const nextToken = this.LA_FAST(i + 1);
              if (tokenMatcher2(nextToken, currPath[i]) === false) {
                continue nextPath;
              }
            }
            return t;
          }
        }
        return void 0;
      };
    } else if (areAllOneTokenLookahead && !dynamicTokensEnabled) {
      const singleTokenAlts = map(alts, (currAlt) => {
        return flatten(currAlt);
      });
      const choiceToAlt = reduce(singleTokenAlts, (result, currAlt, idx) => {
        forEach(currAlt, (currTokType) => {
          if (!has(result, currTokType.tokenTypeIdx)) {
            result[currTokType.tokenTypeIdx] = idx;
          }
          forEach(currTokType.categoryMatches, (currExtendingType) => {
            if (!has(result, currExtendingType)) {
              result[currExtendingType] = idx;
            }
          });
        });
        return result;
      }, {});
      return function() {
        const nextToken = this.LA_FAST(1);
        return choiceToAlt[nextToken.tokenTypeIdx];
      };
    } else {
      return function() {
        for (let t = 0; t < numOfAlts; t++) {
          const currAlt = alts[t];
          const currNumOfPaths = currAlt.length;
          nextPath: for (let j = 0; j < currNumOfPaths; j++) {
            const currPath = currAlt[j];
            const currPathLength = currPath.length;
            for (let i = 0; i < currPathLength; i++) {
              const nextToken = this.LA_FAST(i + 1);
              if (tokenMatcher2(nextToken, currPath[i]) === false) {
                continue nextPath;
              }
            }
            return t;
          }
        }
        return void 0;
      };
    }
  }
  function buildSingleAlternativeLookaheadFunction(alt, tokenMatcher2, dynamicTokensEnabled) {
    const areAllOneTokenLookahead = every(alt, (currPath) => {
      return currPath.length === 1;
    });
    const numOfPaths = alt.length;
    if (areAllOneTokenLookahead && !dynamicTokensEnabled) {
      const singleTokensTypes = flatten(alt);
      if (singleTokensTypes.length === 1 && isEmpty(singleTokensTypes[0].categoryMatches)) {
        const expectedTokenType = singleTokensTypes[0];
        const expectedTokenUniqueKey = expectedTokenType.tokenTypeIdx;
        return function() {
          return this.LA_FAST(1).tokenTypeIdx === expectedTokenUniqueKey;
        };
      } else {
        const choiceToAlt = reduce(singleTokensTypes, (result, currTokType, idx) => {
          result[currTokType.tokenTypeIdx] = true;
          forEach(currTokType.categoryMatches, (currExtendingType) => {
            result[currExtendingType] = true;
          });
          return result;
        }, []);
        return function() {
          const nextToken = this.LA_FAST(1);
          return choiceToAlt[nextToken.tokenTypeIdx] === true;
        };
      }
    } else {
      return function() {
        nextPath: for (let j = 0; j < numOfPaths; j++) {
          const currPath = alt[j];
          const currPathLength = currPath.length;
          for (let i = 0; i < currPathLength; i++) {
            const nextToken = this.LA_FAST(i + 1);
            if (tokenMatcher2(nextToken, currPath[i]) === false) {
              continue nextPath;
            }
          }
          return true;
        }
        return false;
      };
    }
  }
  class RestDefinitionFinderWalker extends RestWalker {
    constructor(topProd, targetOccurrence, targetProdType) {
      super();
      this.topProd = topProd;
      this.targetOccurrence = targetOccurrence;
      this.targetProdType = targetProdType;
    }
    startWalking() {
      this.walk(this.topProd);
      return this.restDef;
    }
    checkIsTarget(node, expectedProdType, currRest, prevRest) {
      if (node.idx === this.targetOccurrence && this.targetProdType === expectedProdType) {
        this.restDef = currRest.concat(prevRest);
        return true;
      }
      return false;
    }
    walkOption(optionProd, currRest, prevRest) {
      if (!this.checkIsTarget(optionProd, PROD_TYPE.OPTION, currRest, prevRest)) {
        super.walkOption(optionProd, currRest, prevRest);
      }
    }
    walkAtLeastOne(atLeastOneProd, currRest, prevRest) {
      if (!this.checkIsTarget(atLeastOneProd, PROD_TYPE.REPETITION_MANDATORY, currRest, prevRest)) {
        super.walkOption(atLeastOneProd, currRest, prevRest);
      }
    }
    walkAtLeastOneSep(atLeastOneSepProd, currRest, prevRest) {
      if (!this.checkIsTarget(atLeastOneSepProd, PROD_TYPE.REPETITION_MANDATORY_WITH_SEPARATOR, currRest, prevRest)) {
        super.walkOption(atLeastOneSepProd, currRest, prevRest);
      }
    }
    walkMany(manyProd, currRest, prevRest) {
      if (!this.checkIsTarget(manyProd, PROD_TYPE.REPETITION, currRest, prevRest)) {
        super.walkOption(manyProd, currRest, prevRest);
      }
    }
    walkManySep(manySepProd, currRest, prevRest) {
      if (!this.checkIsTarget(manySepProd, PROD_TYPE.REPETITION_WITH_SEPARATOR, currRest, prevRest)) {
        super.walkOption(manySepProd, currRest, prevRest);
      }
    }
  }
  class InsideDefinitionFinderVisitor extends GAstVisitor {
    constructor(targetOccurrence, targetProdType, targetRef) {
      super();
      this.targetOccurrence = targetOccurrence;
      this.targetProdType = targetProdType;
      this.targetRef = targetRef;
      this.result = [];
    }
    checkIsTarget(node, expectedProdName) {
      if (node.idx === this.targetOccurrence && this.targetProdType === expectedProdName && (this.targetRef === void 0 || node === this.targetRef)) {
        this.result = node.definition;
      }
    }
    visitOption(node) {
      this.checkIsTarget(node, PROD_TYPE.OPTION);
    }
    visitRepetition(node) {
      this.checkIsTarget(node, PROD_TYPE.REPETITION);
    }
    visitRepetitionMandatory(node) {
      this.checkIsTarget(node, PROD_TYPE.REPETITION_MANDATORY);
    }
    visitRepetitionMandatoryWithSeparator(node) {
      this.checkIsTarget(node, PROD_TYPE.REPETITION_MANDATORY_WITH_SEPARATOR);
    }
    visitRepetitionWithSeparator(node) {
      this.checkIsTarget(node, PROD_TYPE.REPETITION_WITH_SEPARATOR);
    }
    visitAlternation(node) {
      this.checkIsTarget(node, PROD_TYPE.ALTERNATION);
    }
  }
  function initializeArrayOfArrays(size) {
    const result = new Array(size);
    for (let i = 0; i < size; i++) {
      result[i] = [];
    }
    return result;
  }
  function pathToHashKeys(path2) {
    let keys2 = [""];
    for (let i = 0; i < path2.length; i++) {
      const tokType = path2[i];
      const longerKeys = [];
      for (let j = 0; j < keys2.length; j++) {
        const currShorterKey = keys2[j];
        longerKeys.push(currShorterKey + "_" + tokType.tokenTypeIdx);
        for (let t = 0; t < tokType.categoryMatches.length; t++) {
          const categoriesKeySuffix = "_" + tokType.categoryMatches[t];
          longerKeys.push(currShorterKey + categoriesKeySuffix);
        }
      }
      keys2 = longerKeys;
    }
    return keys2;
  }
  function isUniquePrefixHash(altKnownPathsKeys, searchPathKeys, idx) {
    for (let currAltIdx = 0; currAltIdx < altKnownPathsKeys.length; currAltIdx++) {
      if (currAltIdx === idx) {
        continue;
      }
      const otherAltKnownPathsKeys = altKnownPathsKeys[currAltIdx];
      for (let searchIdx = 0; searchIdx < searchPathKeys.length; searchIdx++) {
        const searchKey = searchPathKeys[searchIdx];
        if (otherAltKnownPathsKeys[searchKey] === true) {
          return false;
        }
      }
    }
    return true;
  }
  function lookAheadSequenceFromAlternatives(altsDefs, k) {
    const partialAlts = map(altsDefs, (currAlt) => possiblePathsFrom([currAlt], 1));
    const finalResult = initializeArrayOfArrays(partialAlts.length);
    const altsHashes = map(partialAlts, (currAltPaths) => {
      const dict = {};
      forEach(currAltPaths, (item) => {
        const keys2 = pathToHashKeys(item.partialPath);
        forEach(keys2, (currKey) => {
          dict[currKey] = true;
        });
      });
      return dict;
    });
    let newData = partialAlts;
    for (let pathLength = 1; pathLength <= k; pathLength++) {
      const currDataset = newData;
      newData = initializeArrayOfArrays(currDataset.length);
      for (let altIdx = 0; altIdx < currDataset.length; altIdx++) {
        const currAltPathsAndSuffixes = currDataset[altIdx];
        for (let currPathIdx = 0; currPathIdx < currAltPathsAndSuffixes.length; currPathIdx++) {
          const currPathPrefix = currAltPathsAndSuffixes[currPathIdx].partialPath;
          const suffixDef = currAltPathsAndSuffixes[currPathIdx].suffixDef;
          const prefixKeys = pathToHashKeys(currPathPrefix);
          const isUnique = isUniquePrefixHash(altsHashes, prefixKeys, altIdx);
          if (isUnique || isEmpty(suffixDef) || currPathPrefix.length === k) {
            const currAltResult = finalResult[altIdx];
            if (containsPath(currAltResult, currPathPrefix) === false) {
              currAltResult.push(currPathPrefix);
              for (let j = 0; j < prefixKeys.length; j++) {
                const currKey = prefixKeys[j];
                altsHashes[altIdx][currKey] = true;
              }
            }
          } else {
            const newPartialPathsAndSuffixes = possiblePathsFrom(suffixDef, pathLength + 1, currPathPrefix);
            newData[altIdx] = newData[altIdx].concat(newPartialPathsAndSuffixes);
            forEach(newPartialPathsAndSuffixes, (item) => {
              const prefixKeys2 = pathToHashKeys(item.partialPath);
              forEach(prefixKeys2, (key) => {
                altsHashes[altIdx][key] = true;
              });
            });
          }
        }
      }
    }
    return finalResult;
  }
  function getLookaheadPathsForOr(occurrence, ruleGrammar, k, orProd) {
    const visitor = new InsideDefinitionFinderVisitor(occurrence, PROD_TYPE.ALTERNATION, orProd);
    ruleGrammar.accept(visitor);
    return lookAheadSequenceFromAlternatives(visitor.result, k);
  }
  function getLookaheadPathsForOptionalProd(occurrence, ruleGrammar, prodType, k) {
    const insideDefVisitor = new InsideDefinitionFinderVisitor(occurrence, prodType);
    ruleGrammar.accept(insideDefVisitor);
    const insideDef = insideDefVisitor.result;
    const afterDefWalker = new RestDefinitionFinderWalker(ruleGrammar, occurrence, prodType);
    const afterDef = afterDefWalker.startWalking();
    const insideFlat = new Alternative({ definition: insideDef });
    const afterFlat = new Alternative({ definition: afterDef });
    return lookAheadSequenceFromAlternatives([insideFlat, afterFlat], k);
  }
  function containsPath(alternative, searchPath) {
    compareOtherPath: for (let i = 0; i < alternative.length; i++) {
      const otherPath = alternative[i];
      if (otherPath.length !== searchPath.length) {
        continue;
      }
      for (let j = 0; j < otherPath.length; j++) {
        const searchTok = searchPath[j];
        const otherTok = otherPath[j];
        const matchingTokens = searchTok === otherTok || otherTok.categoryMatchesMap[searchTok.tokenTypeIdx] !== void 0;
        if (matchingTokens === false) {
          continue compareOtherPath;
        }
      }
      return true;
    }
    return false;
  }
  function isStrictPrefixOfPath(prefix, other) {
    return prefix.length < other.length && every(prefix, (tokType, idx) => {
      const otherTokType = other[idx];
      return tokType === otherTokType || otherTokType.categoryMatchesMap[tokType.tokenTypeIdx];
    });
  }
  function areTokenCategoriesNotUsed(lookAheadPaths) {
    return every(lookAheadPaths, (singleAltPaths) => every(singleAltPaths, (singlePath) => every(singlePath, (token) => isEmpty(token.categoryMatches))));
  }
  function validateLookahead(options) {
    const lookaheadValidationErrorMessages = options.lookaheadStrategy.validate({
      rules: options.rules,
      tokenTypes: options.tokenTypes,
      grammarName: options.grammarName
    });
    return map(lookaheadValidationErrorMessages, (errorMessage) => Object.assign({ type: ParserDefinitionErrorType.CUSTOM_LOOKAHEAD_VALIDATION }, errorMessage));
  }
  function validateGrammar$1(topLevels, tokenTypes, errMsgProvider, grammarName) {
    const duplicateErrors = flatMap(topLevels, (currTopLevel) => validateDuplicateProductions(currTopLevel, errMsgProvider));
    const termsNamespaceConflictErrors = checkTerminalAndNoneTerminalsNameSpace(topLevels, tokenTypes, errMsgProvider);
    const tooManyAltsErrors = flatMap(topLevels, (curRule) => validateTooManyAlts(curRule, errMsgProvider));
    const duplicateRulesError = flatMap(topLevels, (curRule) => validateRuleDoesNotAlreadyExist(curRule, topLevels, grammarName, errMsgProvider));
    return duplicateErrors.concat(termsNamespaceConflictErrors, tooManyAltsErrors, duplicateRulesError);
  }
  function validateDuplicateProductions(topLevelRule, errMsgProvider) {
    const collectorVisitor2 = new OccurrenceValidationCollector();
    topLevelRule.accept(collectorVisitor2);
    const allRuleProductions = collectorVisitor2.allProductions;
    const productionGroups = groupBy(allRuleProductions, identifyProductionForDuplicates);
    const duplicates = pickBy(productionGroups, (currGroup) => {
      return currGroup.length > 1;
    });
    const errors = map(values$1(duplicates), (currDuplicates) => {
      const firstProd = head(currDuplicates);
      const msg = errMsgProvider.buildDuplicateFoundError(topLevelRule, currDuplicates);
      const dslName = getProductionDslName(firstProd);
      const defError = {
        message: msg,
        type: ParserDefinitionErrorType.DUPLICATE_PRODUCTIONS,
        ruleName: topLevelRule.name,
        dslName,
        occurrence: firstProd.idx
      };
      const param = getExtraProductionArgument(firstProd);
      if (param) {
        defError.parameter = param;
      }
      return defError;
    });
    return errors;
  }
  function identifyProductionForDuplicates(prod) {
    return `${getProductionDslName(prod)}_#_${prod.idx}_#_${getExtraProductionArgument(prod)}`;
  }
  function getExtraProductionArgument(prod) {
    if (prod instanceof Terminal) {
      return prod.terminalType.name;
    } else if (prod instanceof NonTerminal) {
      return prod.nonTerminalName;
    } else {
      return "";
    }
  }
  class OccurrenceValidationCollector extends GAstVisitor {
    constructor() {
      super(...arguments);
      this.allProductions = [];
    }
    visitNonTerminal(subrule) {
      this.allProductions.push(subrule);
    }
    visitOption(option) {
      this.allProductions.push(option);
    }
    visitRepetitionWithSeparator(manySep) {
      this.allProductions.push(manySep);
    }
    visitRepetitionMandatory(atLeastOne) {
      this.allProductions.push(atLeastOne);
    }
    visitRepetitionMandatoryWithSeparator(atLeastOneSep) {
      this.allProductions.push(atLeastOneSep);
    }
    visitRepetition(many) {
      this.allProductions.push(many);
    }
    visitAlternation(or) {
      this.allProductions.push(or);
    }
    visitTerminal(terminal) {
      this.allProductions.push(terminal);
    }
  }
  function validateRuleDoesNotAlreadyExist(rule, allRules, className, errMsgProvider) {
    const errors = [];
    const occurrences = reduce(allRules, (result, curRule) => {
      if (curRule.name === rule.name) {
        return result + 1;
      }
      return result;
    }, 0);
    if (occurrences > 1) {
      const errMsg = errMsgProvider.buildDuplicateRuleNameError({
        topLevelRule: rule,
        grammarName: className
      });
      errors.push({
        message: errMsg,
        type: ParserDefinitionErrorType.DUPLICATE_RULE_NAME,
        ruleName: rule.name
      });
    }
    return errors;
  }
  function validateRuleIsOverridden(ruleName, definedRulesNames, className) {
    const errors = [];
    let errMsg;
    if (!includes(definedRulesNames, ruleName)) {
      errMsg = `Invalid rule override, rule: ->${ruleName}<- cannot be overridden in the grammar: ->${className}<-as it is not defined in any of the super grammars `;
      errors.push({
        message: errMsg,
        type: ParserDefinitionErrorType.INVALID_RULE_OVERRIDE,
        ruleName
      });
    }
    return errors;
  }
  function validateNoLeftRecursion(topRule, currRule, errMsgProvider, path2 = []) {
    const errors = [];
    const nextNonTerminals = getFirstNoneTerminal(currRule.definition);
    if (isEmpty(nextNonTerminals)) {
      return [];
    } else {
      const ruleName = topRule.name;
      const foundLeftRecursion = includes(nextNonTerminals, topRule);
      if (foundLeftRecursion) {
        errors.push({
          message: errMsgProvider.buildLeftRecursionError({
            topLevelRule: topRule,
            leftRecursionPath: path2
          }),
          type: ParserDefinitionErrorType.LEFT_RECURSION,
          ruleName
        });
      }
      const validNextSteps = difference(nextNonTerminals, path2.concat([topRule]));
      const errorsFromNextSteps = flatMap(validNextSteps, (currRefRule) => {
        const newPath = clone(path2);
        newPath.push(currRefRule);
        return validateNoLeftRecursion(topRule, currRefRule, errMsgProvider, newPath);
      });
      return errors.concat(errorsFromNextSteps);
    }
  }
  function getFirstNoneTerminal(definition) {
    let result = [];
    if (isEmpty(definition)) {
      return result;
    }
    const firstProd = head(definition);
    if (firstProd instanceof NonTerminal) {
      result.push(firstProd.referencedRule);
    } else if (firstProd instanceof Alternative || firstProd instanceof Option || firstProd instanceof RepetitionMandatory || firstProd instanceof RepetitionMandatoryWithSeparator || firstProd instanceof RepetitionWithSeparator || firstProd instanceof Repetition) {
      result = result.concat(getFirstNoneTerminal(firstProd.definition));
    } else if (firstProd instanceof Alternation) {
      result = flatten(map(firstProd.definition, (currSubDef) => getFirstNoneTerminal(currSubDef.definition)));
    } else if (firstProd instanceof Terminal) ;
    else {
      throw Error("non exhaustive match");
    }
    const isFirstOptional = isOptionalProd(firstProd);
    const hasMore = definition.length > 1;
    if (isFirstOptional && hasMore) {
      const rest = drop$2(definition);
      return result.concat(getFirstNoneTerminal(rest));
    } else {
      return result;
    }
  }
  class OrCollector extends GAstVisitor {
    constructor() {
      super(...arguments);
      this.alternations = [];
    }
    visitAlternation(node) {
      this.alternations.push(node);
    }
  }
  function validateEmptyOrAlternative(topLevelRule, errMsgProvider) {
    const orCollector = new OrCollector();
    topLevelRule.accept(orCollector);
    const ors = orCollector.alternations;
    const errors = flatMap(ors, (currOr) => {
      const exceptLast = dropRight(currOr.definition);
      return flatMap(exceptLast, (currAlternative, currAltIdx) => {
        const possibleFirstInAlt = nextPossibleTokensAfter([currAlternative], [], tokenStructuredMatcher, 1);
        if (isEmpty(possibleFirstInAlt)) {
          return [
            {
              message: errMsgProvider.buildEmptyAlternationError({
                topLevelRule,
                alternation: currOr,
                emptyChoiceIdx: currAltIdx
              }),
              type: ParserDefinitionErrorType.NONE_LAST_EMPTY_ALT,
              ruleName: topLevelRule.name,
              occurrence: currOr.idx,
              alternative: currAltIdx + 1
            }
          ];
        } else {
          return [];
        }
      });
    });
    return errors;
  }
  function validateAmbiguousAlternationAlternatives(topLevelRule, globalMaxLookahead, errMsgProvider) {
    const orCollector = new OrCollector();
    topLevelRule.accept(orCollector);
    let ors = orCollector.alternations;
    ors = reject(ors, (currOr) => currOr.ignoreAmbiguities === true);
    const errors = flatMap(ors, (currOr) => {
      const currOccurrence = currOr.idx;
      const actualMaxLookahead = currOr.maxLookahead || globalMaxLookahead;
      const alternatives = getLookaheadPathsForOr(currOccurrence, topLevelRule, actualMaxLookahead, currOr);
      const altsAmbiguityErrors = checkAlternativesAmbiguities(alternatives, currOr, topLevelRule, errMsgProvider);
      const altsPrefixAmbiguityErrors = checkPrefixAlternativesAmbiguities(alternatives, currOr, topLevelRule, errMsgProvider);
      return altsAmbiguityErrors.concat(altsPrefixAmbiguityErrors);
    });
    return errors;
  }
  class RepetitionCollector extends GAstVisitor {
    constructor() {
      super(...arguments);
      this.allProductions = [];
    }
    visitRepetitionWithSeparator(manySep) {
      this.allProductions.push(manySep);
    }
    visitRepetitionMandatory(atLeastOne) {
      this.allProductions.push(atLeastOne);
    }
    visitRepetitionMandatoryWithSeparator(atLeastOneSep) {
      this.allProductions.push(atLeastOneSep);
    }
    visitRepetition(many) {
      this.allProductions.push(many);
    }
  }
  function validateTooManyAlts(topLevelRule, errMsgProvider) {
    const orCollector = new OrCollector();
    topLevelRule.accept(orCollector);
    const ors = orCollector.alternations;
    const errors = flatMap(ors, (currOr) => {
      if (currOr.definition.length > 255) {
        return [
          {
            message: errMsgProvider.buildTooManyAlternativesError({
              topLevelRule,
              alternation: currOr
            }),
            type: ParserDefinitionErrorType.TOO_MANY_ALTS,
            ruleName: topLevelRule.name,
            occurrence: currOr.idx
          }
        ];
      } else {
        return [];
      }
    });
    return errors;
  }
  function validateSomeNonEmptyLookaheadPath(topLevelRules, maxLookahead, errMsgProvider) {
    const errors = [];
    forEach(topLevelRules, (currTopRule) => {
      const collectorVisitor2 = new RepetitionCollector();
      currTopRule.accept(collectorVisitor2);
      const allRuleProductions = collectorVisitor2.allProductions;
      forEach(allRuleProductions, (currProd) => {
        const prodType = getProdType(currProd);
        const actualMaxLookahead = currProd.maxLookahead || maxLookahead;
        const currOccurrence = currProd.idx;
        const paths = getLookaheadPathsForOptionalProd(currOccurrence, currTopRule, prodType, actualMaxLookahead);
        const pathsInsideProduction = paths[0];
        if (isEmpty(flatten(pathsInsideProduction))) {
          const errMsg = errMsgProvider.buildEmptyRepetitionError({
            topLevelRule: currTopRule,
            repetition: currProd
          });
          errors.push({
            message: errMsg,
            type: ParserDefinitionErrorType.NO_NON_EMPTY_LOOKAHEAD,
            ruleName: currTopRule.name
          });
        }
      });
    });
    return errors;
  }
  function checkAlternativesAmbiguities(alternatives, alternation, rule, errMsgProvider) {
    const foundAmbiguousPaths = [];
    const identicalAmbiguities = reduce(alternatives, (result, currAlt, currAltIdx) => {
      if (alternation.definition[currAltIdx].ignoreAmbiguities === true) {
        return result;
      }
      forEach(currAlt, (currPath) => {
        const altsCurrPathAppearsIn = [currAltIdx];
        forEach(alternatives, (currOtherAlt, currOtherAltIdx) => {
          if (currAltIdx !== currOtherAltIdx && containsPath(currOtherAlt, currPath) && // ignore (skip) ambiguities with this "other" alternative
          alternation.definition[currOtherAltIdx].ignoreAmbiguities !== true) {
            altsCurrPathAppearsIn.push(currOtherAltIdx);
          }
        });
        if (altsCurrPathAppearsIn.length > 1 && !containsPath(foundAmbiguousPaths, currPath)) {
          foundAmbiguousPaths.push(currPath);
          result.push({
            alts: altsCurrPathAppearsIn,
            path: currPath
          });
        }
      });
      return result;
    }, []);
    const currErrors = map(identicalAmbiguities, (currAmbDescriptor) => {
      const ambgIndices = map(currAmbDescriptor.alts, (currAltIdx) => currAltIdx + 1);
      const currMessage = errMsgProvider.buildAlternationAmbiguityError({
        topLevelRule: rule,
        alternation,
        ambiguityIndices: ambgIndices,
        prefixPath: currAmbDescriptor.path
      });
      return {
        message: currMessage,
        type: ParserDefinitionErrorType.AMBIGUOUS_ALTS,
        ruleName: rule.name,
        occurrence: alternation.idx,
        alternatives: currAmbDescriptor.alts
      };
    });
    return currErrors;
  }
  function checkPrefixAlternativesAmbiguities(alternatives, alternation, rule, errMsgProvider) {
    const pathsAndIndices = reduce(alternatives, (result, currAlt, idx) => {
      const currPathsAndIdx = map(currAlt, (currPath) => {
        return { idx, path: currPath };
      });
      return result.concat(currPathsAndIdx);
    }, []);
    const errors = compact(flatMap(pathsAndIndices, (currPathAndIdx) => {
      const alternativeGast = alternation.definition[currPathAndIdx.idx];
      if (alternativeGast.ignoreAmbiguities === true) {
        return [];
      }
      const targetIdx = currPathAndIdx.idx;
      const targetPath = currPathAndIdx.path;
      const prefixAmbiguitiesPathsAndIndices = filter$2(pathsAndIndices, (searchPathAndIdx) => {
        return (
          // ignore (skip) ambiguities with this "other" alternative
          alternation.definition[searchPathAndIdx.idx].ignoreAmbiguities !== true && searchPathAndIdx.idx < targetIdx && // checking for strict prefix because identical lookaheads
          // will be be detected using a different validation.
          isStrictPrefixOfPath(searchPathAndIdx.path, targetPath)
        );
      });
      const currPathPrefixErrors = map(prefixAmbiguitiesPathsAndIndices, (currAmbPathAndIdx) => {
        const ambgIndices = [currAmbPathAndIdx.idx + 1, targetIdx + 1];
        const occurrence = alternation.idx === 0 ? "" : alternation.idx;
        const message = errMsgProvider.buildAlternationPrefixAmbiguityError({
          topLevelRule: rule,
          alternation,
          ambiguityIndices: ambgIndices,
          prefixPath: currAmbPathAndIdx.path
        });
        return {
          message,
          type: ParserDefinitionErrorType.AMBIGUOUS_PREFIX_ALTS,
          ruleName: rule.name,
          occurrence,
          alternatives: ambgIndices
        };
      });
      return currPathPrefixErrors;
    }));
    return errors;
  }
  function checkTerminalAndNoneTerminalsNameSpace(topLevels, tokenTypes, errMsgProvider) {
    const errors = [];
    const tokenNames = map(tokenTypes, (currToken) => currToken.name);
    forEach(topLevels, (currRule) => {
      const currRuleName = currRule.name;
      if (includes(tokenNames, currRuleName)) {
        const errMsg = errMsgProvider.buildNamespaceConflictError(currRule);
        errors.push({
          message: errMsg,
          type: ParserDefinitionErrorType.CONFLICT_TOKENS_RULES_NAMESPACE,
          ruleName: currRuleName
        });
      }
    });
    return errors;
  }
  function resolveGrammar(options) {
    const actualOptions = defaults(options, {
      errMsgProvider: defaultGrammarResolverErrorProvider
    });
    const topRulesTable = {};
    forEach(options.rules, (rule) => {
      topRulesTable[rule.name] = rule;
    });
    return resolveGrammar$1(topRulesTable, actualOptions.errMsgProvider);
  }
  function validateGrammar(options) {
    options = defaults(options, {
      errMsgProvider: defaultGrammarValidatorErrorProvider
    });
    return validateGrammar$1(options.rules, options.tokenTypes, options.errMsgProvider, options.grammarName);
  }
  const MISMATCHED_TOKEN_EXCEPTION = "MismatchedTokenException";
  const NO_VIABLE_ALT_EXCEPTION = "NoViableAltException";
  const EARLY_EXIT_EXCEPTION = "EarlyExitException";
  const NOT_ALL_INPUT_PARSED_EXCEPTION = "NotAllInputParsedException";
  const RECOGNITION_EXCEPTION_NAMES = [
    MISMATCHED_TOKEN_EXCEPTION,
    NO_VIABLE_ALT_EXCEPTION,
    EARLY_EXIT_EXCEPTION,
    NOT_ALL_INPUT_PARSED_EXCEPTION
  ];
  Object.freeze(RECOGNITION_EXCEPTION_NAMES);
  function isRecognitionException(error) {
    return includes(RECOGNITION_EXCEPTION_NAMES, error.name);
  }
  class RecognitionException extends Error {
    constructor(message, token) {
      super(message);
      this.token = token;
      this.resyncedTokens = [];
      Object.setPrototypeOf(this, new.target.prototype);
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  }
  class MismatchedTokenException extends RecognitionException {
    constructor(message, token, previousToken) {
      super(message, token);
      this.previousToken = previousToken;
      this.name = MISMATCHED_TOKEN_EXCEPTION;
    }
  }
  class NoViableAltException extends RecognitionException {
    constructor(message, token, previousToken) {
      super(message, token);
      this.previousToken = previousToken;
      this.name = NO_VIABLE_ALT_EXCEPTION;
    }
  }
  class NotAllInputParsedException extends RecognitionException {
    constructor(message, token) {
      super(message, token);
      this.name = NOT_ALL_INPUT_PARSED_EXCEPTION;
    }
  }
  class EarlyExitException extends RecognitionException {
    constructor(message, token, previousToken) {
      super(message, token);
      this.previousToken = previousToken;
      this.name = EARLY_EXIT_EXCEPTION;
    }
  }
  const EOF_FOLLOW_KEY = {};
  const IN_RULE_RECOVERY_EXCEPTION = "InRuleRecoveryException";
  class InRuleRecoveryException extends Error {
    constructor(message) {
      super(message);
      this.name = IN_RULE_RECOVERY_EXCEPTION;
    }
  }
  class Recoverable {
    initRecoverable(config) {
      this.firstAfterRepMap = {};
      this.resyncFollows = {};
      this.recoveryEnabled = has(config, "recoveryEnabled") ? config.recoveryEnabled : DEFAULT_PARSER_CONFIG.recoveryEnabled;
      if (this.recoveryEnabled) {
        this.attemptInRepetitionRecovery = attemptInRepetitionRecovery;
      }
    }
    getTokenToInsert(tokType) {
      const tokToInsert = createTokenInstance(tokType, "", NaN, NaN, NaN, NaN, NaN, NaN);
      tokToInsert.isInsertedInRecovery = true;
      return tokToInsert;
    }
    canTokenTypeBeInsertedInRecovery(tokType) {
      return true;
    }
    canTokenTypeBeDeletedInRecovery(tokType) {
      return true;
    }
    tryInRepetitionRecovery(grammarRule, grammarRuleArgs, lookAheadFunc, expectedTokType) {
      const reSyncTokType = this.findReSyncTokenType();
      const savedLexerState = this.exportLexerState();
      const resyncedTokens = [];
      let passedResyncPoint = false;
      const nextTokenWithoutResync = this.LA_FAST(1);
      let currToken = this.LA_FAST(1);
      const generateErrorMessage = () => {
        const previousToken = this.LA(0);
        const msg = this.errorMessageProvider.buildMismatchTokenMessage({
          expected: expectedTokType,
          actual: nextTokenWithoutResync,
          previous: previousToken,
          ruleName: this.getCurrRuleFullName()
        });
        const error = new MismatchedTokenException(msg, nextTokenWithoutResync, this.LA(0));
        error.resyncedTokens = dropRight(resyncedTokens);
        this.SAVE_ERROR(error);
      };
      while (!passedResyncPoint) {
        if (this.tokenMatcher(currToken, expectedTokType)) {
          generateErrorMessage();
          return;
        } else if (lookAheadFunc.call(this)) {
          generateErrorMessage();
          grammarRule.apply(this, grammarRuleArgs);
          return;
        } else if (this.tokenMatcher(currToken, reSyncTokType)) {
          passedResyncPoint = true;
        } else {
          currToken = this.SKIP_TOKEN();
          this.addToResyncTokens(currToken, resyncedTokens);
        }
      }
      this.importLexerState(savedLexerState);
    }
    shouldInRepetitionRecoveryBeTried(expectTokAfterLastMatch, nextTokIdx, notStuck) {
      if (notStuck === false) {
        return false;
      }
      if (this.tokenMatcher(this.LA_FAST(1), expectTokAfterLastMatch)) {
        return false;
      }
      if (this.isBackTracking()) {
        return false;
      }
      if (this.canPerformInRuleRecovery(expectTokAfterLastMatch, this.getFollowsForInRuleRecovery(expectTokAfterLastMatch, nextTokIdx))) {
        return false;
      }
      return true;
    }
    // Error Recovery functionality
    getFollowsForInRuleRecovery(tokType, tokIdxInRule) {
      const grammarPath = this.getCurrentGrammarPath(tokType, tokIdxInRule);
      const follows = this.getNextPossibleTokenTypes(grammarPath);
      return follows;
    }
    tryInRuleRecovery(expectedTokType, follows) {
      if (this.canRecoverWithSingleTokenInsertion(expectedTokType, follows)) {
        const tokToInsert = this.getTokenToInsert(expectedTokType);
        return tokToInsert;
      }
      if (this.canRecoverWithSingleTokenDeletion(expectedTokType)) {
        const nextTok = this.SKIP_TOKEN();
        this.consumeToken();
        return nextTok;
      }
      throw new InRuleRecoveryException("sad sad panda");
    }
    canPerformInRuleRecovery(expectedToken, follows) {
      return this.canRecoverWithSingleTokenInsertion(expectedToken, follows) || this.canRecoverWithSingleTokenDeletion(expectedToken);
    }
    canRecoverWithSingleTokenInsertion(expectedTokType, follows) {
      if (!this.canTokenTypeBeInsertedInRecovery(expectedTokType)) {
        return false;
      }
      if (isEmpty(follows)) {
        return false;
      }
      const mismatchedTok = this.LA_FAST(1);
      const isMisMatchedTokInFollows = find(follows, (possibleFollowsTokType) => {
        return this.tokenMatcher(mismatchedTok, possibleFollowsTokType);
      }) !== void 0;
      return isMisMatchedTokInFollows;
    }
    canRecoverWithSingleTokenDeletion(expectedTokType) {
      if (!this.canTokenTypeBeDeletedInRecovery(expectedTokType)) {
        return false;
      }
      const isNextTokenWhatIsExpected = this.tokenMatcher(
        // not using LA_FAST because LA(2) might be un-safe with maxLookahead=1
        // in some edge cases (?)
        this.LA(2),
        expectedTokType
      );
      return isNextTokenWhatIsExpected;
    }
    isInCurrentRuleReSyncSet(tokenTypeIdx) {
      const followKey = this.getCurrFollowKey();
      const currentRuleReSyncSet = this.getFollowSetFromFollowKey(followKey);
      return includes(currentRuleReSyncSet, tokenTypeIdx);
    }
    findReSyncTokenType() {
      const allPossibleReSyncTokTypes = this.flattenFollowSet();
      let nextToken = this.LA_FAST(1);
      let k = 2;
      while (true) {
        const foundMatch = find(allPossibleReSyncTokTypes, (resyncTokType) => {
          const canMatch = tokenMatcher(nextToken, resyncTokType);
          return canMatch;
        });
        if (foundMatch !== void 0) {
          return foundMatch;
        }
        nextToken = this.LA(k);
        k++;
      }
    }
    getCurrFollowKey() {
      if (this.RULE_STACK_IDX === 0) {
        return EOF_FOLLOW_KEY;
      }
      const currRuleShortName = this.currRuleShortName;
      const currRuleIdx = this.getLastExplicitRuleOccurrenceIndex();
      const prevRuleShortName = this.getPreviousExplicitRuleShortName();
      return {
        ruleName: this.shortRuleNameToFullName(currRuleShortName),
        idxInCallingRule: currRuleIdx,
        inRule: this.shortRuleNameToFullName(prevRuleShortName)
      };
    }
    buildFullFollowKeyStack() {
      const explicitRuleStack = this.RULE_STACK;
      const explicitOccurrenceStack = this.RULE_OCCURRENCE_STACK;
      const len = this.RULE_STACK_IDX + 1;
      const result = new Array(len);
      for (let idx = 0; idx < len; idx++) {
        if (idx === 0) {
          result[idx] = EOF_FOLLOW_KEY;
        } else {
          result[idx] = {
            ruleName: this.shortRuleNameToFullName(explicitRuleStack[idx]),
            idxInCallingRule: explicitOccurrenceStack[idx],
            inRule: this.shortRuleNameToFullName(explicitRuleStack[idx - 1])
          };
        }
      }
      return result;
    }
    flattenFollowSet() {
      const followStack = map(this.buildFullFollowKeyStack(), (currKey) => {
        return this.getFollowSetFromFollowKey(currKey);
      });
      return flatten(followStack);
    }
    getFollowSetFromFollowKey(followKey) {
      if (followKey === EOF_FOLLOW_KEY) {
        return [EOF];
      }
      const followName = followKey.ruleName + followKey.idxInCallingRule + IN + followKey.inRule;
      return this.resyncFollows[followName];
    }
    // It does not make any sense to include a virtual EOF token in the list of resynced tokens
    // as EOF does not really exist and thus does not contain any useful information (line/column numbers)
    addToResyncTokens(token, resyncTokens) {
      if (!this.tokenMatcher(token, EOF)) {
        resyncTokens.push(token);
      }
      return resyncTokens;
    }
    reSyncTo(tokType) {
      const resyncedTokens = [];
      let nextTok = this.LA_FAST(1);
      while (this.tokenMatcher(nextTok, tokType) === false) {
        nextTok = this.SKIP_TOKEN();
        this.addToResyncTokens(nextTok, resyncedTokens);
      }
      return dropRight(resyncedTokens);
    }
    attemptInRepetitionRecovery(prodFunc, args, lookaheadFunc, dslMethodIdx, prodOccurrence, nextToksWalker, notStuck) {
    }
    getCurrentGrammarPath(tokType, tokIdxInRule) {
      const pathRuleStack = this.getHumanReadableRuleStack();
      const pathOccurrenceStack = this.RULE_OCCURRENCE_STACK.slice(0, this.RULE_OCCURRENCE_STACK_IDX + 1);
      const grammarPath = {
        ruleStack: pathRuleStack,
        occurrenceStack: pathOccurrenceStack,
        lastTok: tokType,
        lastTokOccurrence: tokIdxInRule
      };
      return grammarPath;
    }
    getHumanReadableRuleStack() {
      const len = this.RULE_STACK_IDX + 1;
      const result = new Array(len);
      for (let i = 0; i < len; i++) {
        result[i] = this.shortRuleNameToFullName(this.RULE_STACK[i]);
      }
      return result;
    }
  }
  function attemptInRepetitionRecovery(prodFunc, args, lookaheadFunc, dslMethodIdx, prodOccurrence, nextToksWalker, notStuck) {
    const key = this.getKeyForAutomaticLookahead(dslMethodIdx, prodOccurrence);
    let firstAfterRepInfo = this.firstAfterRepMap[key];
    if (firstAfterRepInfo === void 0) {
      const currRuleName = this.getCurrRuleFullName();
      const ruleGrammar = this.getGAstProductions()[currRuleName];
      const walker = new nextToksWalker(ruleGrammar, prodOccurrence);
      firstAfterRepInfo = walker.startWalking();
      this.firstAfterRepMap[key] = firstAfterRepInfo;
    }
    let expectTokAfterLastMatch = firstAfterRepInfo.token;
    let nextTokIdx = firstAfterRepInfo.occurrence;
    const isEndOfRule = firstAfterRepInfo.isEndOfRule;
    if (this.RULE_STACK_IDX === 0 && isEndOfRule && expectTokAfterLastMatch === void 0) {
      expectTokAfterLastMatch = EOF;
      nextTokIdx = 1;
    }
    if (expectTokAfterLastMatch === void 0 || nextTokIdx === void 0) {
      return;
    }
    if (this.shouldInRepetitionRecoveryBeTried(expectTokAfterLastMatch, nextTokIdx, notStuck)) {
      this.tryInRepetitionRecovery(prodFunc, args, lookaheadFunc, expectTokAfterLastMatch);
    }
  }
  const BITS_FOR_METHOD_TYPE = 4;
  const BITS_FOR_OCCURRENCE_IDX = 8;
  const OR_IDX = 1 << BITS_FOR_OCCURRENCE_IDX;
  const OPTION_IDX = 2 << BITS_FOR_OCCURRENCE_IDX;
  const MANY_IDX = 3 << BITS_FOR_OCCURRENCE_IDX;
  const AT_LEAST_ONE_IDX = 4 << BITS_FOR_OCCURRENCE_IDX;
  const MANY_SEP_IDX = 5 << BITS_FOR_OCCURRENCE_IDX;
  const AT_LEAST_ONE_SEP_IDX = 6 << BITS_FOR_OCCURRENCE_IDX;
  function getKeyForAutomaticLookahead(ruleIdx, dslMethodIdx, occurrence) {
    return occurrence | dslMethodIdx | ruleIdx;
  }
  class LLkLookaheadStrategy {
    constructor(options) {
      var _a;
      this.maxLookahead = (_a = options === null || options === void 0 ? void 0 : options.maxLookahead) !== null && _a !== void 0 ? _a : DEFAULT_PARSER_CONFIG.maxLookahead;
    }
    validate(options) {
      const leftRecursionErrors = this.validateNoLeftRecursion(options.rules);
      if (isEmpty(leftRecursionErrors)) {
        const emptyAltErrors = this.validateEmptyOrAlternatives(options.rules);
        const ambiguousAltsErrors = this.validateAmbiguousAlternationAlternatives(options.rules, this.maxLookahead);
        const emptyRepetitionErrors = this.validateSomeNonEmptyLookaheadPath(options.rules, this.maxLookahead);
        const allErrors = [
          ...leftRecursionErrors,
          ...emptyAltErrors,
          ...ambiguousAltsErrors,
          ...emptyRepetitionErrors
        ];
        return allErrors;
      }
      return leftRecursionErrors;
    }
    validateNoLeftRecursion(rules2) {
      return flatMap(rules2, (currTopRule) => validateNoLeftRecursion(currTopRule, currTopRule, defaultGrammarValidatorErrorProvider));
    }
    validateEmptyOrAlternatives(rules2) {
      return flatMap(rules2, (currTopRule) => validateEmptyOrAlternative(currTopRule, defaultGrammarValidatorErrorProvider));
    }
    validateAmbiguousAlternationAlternatives(rules2, maxLookahead) {
      return flatMap(rules2, (currTopRule) => validateAmbiguousAlternationAlternatives(currTopRule, maxLookahead, defaultGrammarValidatorErrorProvider));
    }
    validateSomeNonEmptyLookaheadPath(rules2, maxLookahead) {
      return validateSomeNonEmptyLookaheadPath(rules2, maxLookahead, defaultGrammarValidatorErrorProvider);
    }
    buildLookaheadForAlternation(options) {
      return buildLookaheadFuncForOr(options.prodOccurrence, options.rule, options.maxLookahead, options.hasPredicates, options.dynamicTokensEnabled, buildAlternativesLookAheadFunc);
    }
    buildLookaheadForOptional(options) {
      return buildLookaheadFuncForOptionalProd(options.prodOccurrence, options.rule, options.maxLookahead, options.dynamicTokensEnabled, getProdType(options.prodType), buildSingleAlternativeLookaheadFunction);
    }
  }
  class LooksAhead {
    initLooksAhead(config) {
      this.dynamicTokensEnabled = has(config, "dynamicTokensEnabled") ? config.dynamicTokensEnabled : DEFAULT_PARSER_CONFIG.dynamicTokensEnabled;
      this.maxLookahead = has(config, "maxLookahead") ? config.maxLookahead : DEFAULT_PARSER_CONFIG.maxLookahead;
      this.lookaheadStrategy = has(config, "lookaheadStrategy") ? config.lookaheadStrategy : new LLkLookaheadStrategy({ maxLookahead: this.maxLookahead });
      this.lookAheadFuncsCache = /* @__PURE__ */ new Map();
    }
    preComputeLookaheadFunctions(rules2) {
      forEach(rules2, (currRule) => {
        this.TRACE_INIT(`${currRule.name} Rule Lookahead`, () => {
          const { alternation, repetition, option, repetitionMandatory, repetitionMandatoryWithSeparator, repetitionWithSeparator } = collectMethods(currRule);
          forEach(alternation, (currProd) => {
            const prodIdx = currProd.idx === 0 ? "" : currProd.idx;
            this.TRACE_INIT(`${getProductionDslName(currProd)}${prodIdx}`, () => {
              const laFunc = this.lookaheadStrategy.buildLookaheadForAlternation({
                prodOccurrence: currProd.idx,
                rule: currRule,
                maxLookahead: currProd.maxLookahead || this.maxLookahead,
                hasPredicates: currProd.hasPredicates,
                dynamicTokensEnabled: this.dynamicTokensEnabled
              });
              const key = getKeyForAutomaticLookahead(this.fullRuleNameToShort[currRule.name], OR_IDX, currProd.idx);
              this.setLaFuncCache(key, laFunc);
            });
          });
          forEach(repetition, (currProd) => {
            this.computeLookaheadFunc(currRule, currProd.idx, MANY_IDX, "Repetition", currProd.maxLookahead, getProductionDslName(currProd));
          });
          forEach(option, (currProd) => {
            this.computeLookaheadFunc(currRule, currProd.idx, OPTION_IDX, "Option", currProd.maxLookahead, getProductionDslName(currProd));
          });
          forEach(repetitionMandatory, (currProd) => {
            this.computeLookaheadFunc(currRule, currProd.idx, AT_LEAST_ONE_IDX, "RepetitionMandatory", currProd.maxLookahead, getProductionDslName(currProd));
          });
          forEach(repetitionMandatoryWithSeparator, (currProd) => {
            this.computeLookaheadFunc(currRule, currProd.idx, AT_LEAST_ONE_SEP_IDX, "RepetitionMandatoryWithSeparator", currProd.maxLookahead, getProductionDslName(currProd));
          });
          forEach(repetitionWithSeparator, (currProd) => {
            this.computeLookaheadFunc(currRule, currProd.idx, MANY_SEP_IDX, "RepetitionWithSeparator", currProd.maxLookahead, getProductionDslName(currProd));
          });
        });
      });
    }
    computeLookaheadFunc(rule, prodOccurrence, prodKey, prodType, prodMaxLookahead, dslMethodName) {
      this.TRACE_INIT(`${dslMethodName}${prodOccurrence === 0 ? "" : prodOccurrence}`, () => {
        const laFunc = this.lookaheadStrategy.buildLookaheadForOptional({
          prodOccurrence,
          rule,
          maxLookahead: prodMaxLookahead || this.maxLookahead,
          dynamicTokensEnabled: this.dynamicTokensEnabled,
          prodType
        });
        const key = getKeyForAutomaticLookahead(this.fullRuleNameToShort[rule.name], prodKey, prodOccurrence);
        this.setLaFuncCache(key, laFunc);
      });
    }
    // this actually returns a number, but it is always used as a string (object prop key)
    getKeyForAutomaticLookahead(dslMethodIdx, occurrence) {
      return getKeyForAutomaticLookahead(this.currRuleShortName, dslMethodIdx, occurrence);
    }
    getLaFuncFromCache(key) {
      return this.lookAheadFuncsCache.get(key);
    }
    /* istanbul ignore next */
    setLaFuncCache(key, value) {
      this.lookAheadFuncsCache.set(key, value);
    }
  }
  class DslMethodsCollectorVisitor extends GAstVisitor {
    constructor() {
      super(...arguments);
      this.dslMethods = {
        option: [],
        alternation: [],
        repetition: [],
        repetitionWithSeparator: [],
        repetitionMandatory: [],
        repetitionMandatoryWithSeparator: []
      };
    }
    reset() {
      this.dslMethods = {
        option: [],
        alternation: [],
        repetition: [],
        repetitionWithSeparator: [],
        repetitionMandatory: [],
        repetitionMandatoryWithSeparator: []
      };
    }
    visitOption(option) {
      this.dslMethods.option.push(option);
    }
    visitRepetitionWithSeparator(manySep) {
      this.dslMethods.repetitionWithSeparator.push(manySep);
    }
    visitRepetitionMandatory(atLeastOne) {
      this.dslMethods.repetitionMandatory.push(atLeastOne);
    }
    visitRepetitionMandatoryWithSeparator(atLeastOneSep) {
      this.dslMethods.repetitionMandatoryWithSeparator.push(atLeastOneSep);
    }
    visitRepetition(many) {
      this.dslMethods.repetition.push(many);
    }
    visitAlternation(or) {
      this.dslMethods.alternation.push(or);
    }
  }
  const collectorVisitor = new DslMethodsCollectorVisitor();
  function collectMethods(rule) {
    collectorVisitor.reset();
    rule.accept(collectorVisitor);
    const dslMethods = collectorVisitor.dslMethods;
    collectorVisitor.reset();
    return dslMethods;
  }
  function setNodeLocationOnlyOffset(currNodeLocation, newLocationInfo) {
    if (isNaN(currNodeLocation.startOffset) === true) {
      currNodeLocation.startOffset = newLocationInfo.startOffset;
      currNodeLocation.endOffset = newLocationInfo.endOffset;
    } else if (currNodeLocation.endOffset < newLocationInfo.endOffset === true) {
      currNodeLocation.endOffset = newLocationInfo.endOffset;
    }
  }
  function setNodeLocationFull(currNodeLocation, newLocationInfo) {
    if (isNaN(currNodeLocation.startOffset) === true) {
      currNodeLocation.startOffset = newLocationInfo.startOffset;
      currNodeLocation.startColumn = newLocationInfo.startColumn;
      currNodeLocation.startLine = newLocationInfo.startLine;
      currNodeLocation.endOffset = newLocationInfo.endOffset;
      currNodeLocation.endColumn = newLocationInfo.endColumn;
      currNodeLocation.endLine = newLocationInfo.endLine;
    } else if (currNodeLocation.endOffset < newLocationInfo.endOffset === true) {
      currNodeLocation.endOffset = newLocationInfo.endOffset;
      currNodeLocation.endColumn = newLocationInfo.endColumn;
      currNodeLocation.endLine = newLocationInfo.endLine;
    }
  }
  function addTerminalToCst(node, token, tokenTypeName) {
    if (node.children[tokenTypeName] === void 0) {
      node.children[tokenTypeName] = [token];
    } else {
      node.children[tokenTypeName].push(token);
    }
  }
  function addNoneTerminalToCst(node, ruleName, ruleResult) {
    if (node.children[ruleName] === void 0) {
      node.children[ruleName] = [ruleResult];
    } else {
      node.children[ruleName].push(ruleResult);
    }
  }
  const NAME = "name";
  function defineNameProp(obj, nameValue) {
    Object.defineProperty(obj, NAME, {
      enumerable: false,
      configurable: true,
      writable: false,
      value: nameValue
    });
  }
  function defaultVisit(ctx, param) {
    const childrenNames = keys(ctx);
    const childrenNamesLength = childrenNames.length;
    for (let i = 0; i < childrenNamesLength; i++) {
      const currChildName = childrenNames[i];
      const currChildArray = ctx[currChildName];
      const currChildArrayLength = currChildArray.length;
      for (let j = 0; j < currChildArrayLength; j++) {
        const currChild = currChildArray[j];
        if (currChild.tokenTypeIdx === void 0) {
          this[currChild.name](currChild.children, param);
        }
      }
    }
  }
  function createBaseSemanticVisitorConstructor(grammarName, ruleNames) {
    const derivedConstructor = function() {
    };
    defineNameProp(derivedConstructor, grammarName + "BaseSemantics");
    const semanticProto = {
      visit: function(cstNode, param) {
        if (isArray(cstNode)) {
          cstNode = cstNode[0];
        }
        if (isUndefined(cstNode)) {
          return void 0;
        }
        return this[cstNode.name](cstNode.children, param);
      },
      validateVisitor: function() {
        const semanticDefinitionErrors = validateVisitor(this, ruleNames);
        if (!isEmpty(semanticDefinitionErrors)) {
          const errorMessages = map(semanticDefinitionErrors, (currDefError) => currDefError.msg);
          throw Error(`Errors Detected in CST Visitor <${this.constructor.name}>:
	${errorMessages.join("\n\n").replace(/\n/g, "\n	")}`);
        }
      }
    };
    derivedConstructor.prototype = semanticProto;
    derivedConstructor.prototype.constructor = derivedConstructor;
    derivedConstructor._RULE_NAMES = ruleNames;
    return derivedConstructor;
  }
  function createBaseVisitorConstructorWithDefaults(grammarName, ruleNames, baseConstructor) {
    const derivedConstructor = function() {
    };
    defineNameProp(derivedConstructor, grammarName + "BaseSemanticsWithDefaults");
    const withDefaultsProto = Object.create(baseConstructor.prototype);
    forEach(ruleNames, (ruleName) => {
      withDefaultsProto[ruleName] = defaultVisit;
    });
    derivedConstructor.prototype = withDefaultsProto;
    derivedConstructor.prototype.constructor = derivedConstructor;
    return derivedConstructor;
  }
  var CstVisitorDefinitionError;
  (function(CstVisitorDefinitionError2) {
    CstVisitorDefinitionError2[CstVisitorDefinitionError2["REDUNDANT_METHOD"] = 0] = "REDUNDANT_METHOD";
    CstVisitorDefinitionError2[CstVisitorDefinitionError2["MISSING_METHOD"] = 1] = "MISSING_METHOD";
  })(CstVisitorDefinitionError || (CstVisitorDefinitionError = {}));
  function validateVisitor(visitorInstance, ruleNames) {
    const missingErrors = validateMissingCstMethods(visitorInstance, ruleNames);
    return missingErrors;
  }
  function validateMissingCstMethods(visitorInstance, ruleNames) {
    const missingRuleNames = filter$2(ruleNames, (currRuleName) => {
      return isFunction(visitorInstance[currRuleName]) === false;
    });
    const errors = map(missingRuleNames, (currRuleName) => {
      return {
        msg: `Missing visitor method: <${currRuleName}> on ${visitorInstance.constructor.name} CST Visitor.`,
        type: CstVisitorDefinitionError.MISSING_METHOD,
        methodName: currRuleName
      };
    });
    return compact(errors);
  }
  class TreeBuilder {
    initTreeBuilder(config) {
      this.CST_STACK = [];
      this.outputCst = config.outputCst;
      this.nodeLocationTracking = has(config, "nodeLocationTracking") ? config.nodeLocationTracking : DEFAULT_PARSER_CONFIG.nodeLocationTracking;
      if (!this.outputCst) {
        this.cstInvocationStateUpdate = noop;
        this.cstFinallyStateUpdate = noop;
        this.cstPostTerminal = noop;
        this.cstPostNonTerminal = noop;
        this.cstPostRule = noop;
      } else {
        if (/full/i.test(this.nodeLocationTracking)) {
          if (this.recoveryEnabled) {
            this.setNodeLocationFromToken = setNodeLocationFull;
            this.setNodeLocationFromNode = setNodeLocationFull;
            this.cstPostRule = noop;
            this.setInitialNodeLocation = this.setInitialNodeLocationFullRecovery;
          } else {
            this.setNodeLocationFromToken = noop;
            this.setNodeLocationFromNode = noop;
            this.cstPostRule = this.cstPostRuleFull;
            this.setInitialNodeLocation = this.setInitialNodeLocationFullRegular;
          }
        } else if (/onlyOffset/i.test(this.nodeLocationTracking)) {
          if (this.recoveryEnabled) {
            this.setNodeLocationFromToken = setNodeLocationOnlyOffset;
            this.setNodeLocationFromNode = setNodeLocationOnlyOffset;
            this.cstPostRule = noop;
            this.setInitialNodeLocation = this.setInitialNodeLocationOnlyOffsetRecovery;
          } else {
            this.setNodeLocationFromToken = noop;
            this.setNodeLocationFromNode = noop;
            this.cstPostRule = this.cstPostRuleOnlyOffset;
            this.setInitialNodeLocation = this.setInitialNodeLocationOnlyOffsetRegular;
          }
        } else if (/none/i.test(this.nodeLocationTracking)) {
          this.setNodeLocationFromToken = noop;
          this.setNodeLocationFromNode = noop;
          this.cstPostRule = noop;
          this.setInitialNodeLocation = noop;
        } else {
          throw Error(`Invalid <nodeLocationTracking> config option: "${config.nodeLocationTracking}"`);
        }
      }
    }
    setInitialNodeLocationOnlyOffsetRecovery(cstNode) {
      cstNode.location = {
        startOffset: NaN,
        endOffset: NaN
      };
    }
    setInitialNodeLocationOnlyOffsetRegular(cstNode) {
      cstNode.location = {
        // without error recovery the starting Location of a new CstNode is guaranteed
        // To be the next Token's startOffset (for valid inputs).
        // For invalid inputs there won't be any CSTOutput so this potential
        // inaccuracy does not matter
        startOffset: this.LA_FAST(1).startOffset,
        endOffset: NaN
      };
    }
    setInitialNodeLocationFullRecovery(cstNode) {
      cstNode.location = {
        startOffset: NaN,
        startLine: NaN,
        startColumn: NaN,
        endOffset: NaN,
        endLine: NaN,
        endColumn: NaN
      };
    }
    /**
         *  @see setInitialNodeLocationOnlyOffsetRegular for explanation why this work
    
         * @param cstNode
         */
    setInitialNodeLocationFullRegular(cstNode) {
      const nextToken = this.LA_FAST(1);
      cstNode.location = {
        startOffset: nextToken.startOffset,
        startLine: nextToken.startLine,
        startColumn: nextToken.startColumn,
        endOffset: NaN,
        endLine: NaN,
        endColumn: NaN
      };
    }
    cstInvocationStateUpdate(fullRuleName) {
      const cstNode = {
        name: fullRuleName,
        children: /* @__PURE__ */ Object.create(null)
      };
      this.setInitialNodeLocation(cstNode);
      this.CST_STACK.push(cstNode);
    }
    cstFinallyStateUpdate() {
      this.CST_STACK.pop();
    }
    cstPostRuleFull(ruleCstNode) {
      const prevToken = this.LA(0);
      const loc = ruleCstNode.location;
      if (loc.startOffset <= prevToken.startOffset === true) {
        loc.endOffset = prevToken.endOffset;
        loc.endLine = prevToken.endLine;
        loc.endColumn = prevToken.endColumn;
      } else {
        loc.startOffset = NaN;
        loc.startLine = NaN;
        loc.startColumn = NaN;
      }
    }
    cstPostRuleOnlyOffset(ruleCstNode) {
      const prevToken = this.LA(0);
      const loc = ruleCstNode.location;
      if (loc.startOffset <= prevToken.startOffset === true) {
        loc.endOffset = prevToken.endOffset;
      } else {
        loc.startOffset = NaN;
      }
    }
    cstPostTerminal(key, consumedToken) {
      const rootCst = this.CST_STACK[this.CST_STACK.length - 1];
      addTerminalToCst(rootCst, consumedToken, key);
      this.setNodeLocationFromToken(rootCst.location, consumedToken);
    }
    cstPostNonTerminal(ruleCstResult, ruleName) {
      const preCstNode = this.CST_STACK[this.CST_STACK.length - 1];
      addNoneTerminalToCst(preCstNode, ruleName, ruleCstResult);
      this.setNodeLocationFromNode(preCstNode.location, ruleCstResult.location);
    }
    getBaseCstVisitorConstructor() {
      if (isUndefined(this.baseCstVisitorConstructor)) {
        const newBaseCstVisitorConstructor = createBaseSemanticVisitorConstructor(this.className, keys(this.gastProductionsCache));
        this.baseCstVisitorConstructor = newBaseCstVisitorConstructor;
        return newBaseCstVisitorConstructor;
      }
      return this.baseCstVisitorConstructor;
    }
    getBaseCstVisitorConstructorWithDefaults() {
      if (isUndefined(this.baseCstVisitorWithDefaultsConstructor)) {
        const newConstructor = createBaseVisitorConstructorWithDefaults(this.className, keys(this.gastProductionsCache), this.getBaseCstVisitorConstructor());
        this.baseCstVisitorWithDefaultsConstructor = newConstructor;
        return newConstructor;
      }
      return this.baseCstVisitorWithDefaultsConstructor;
    }
    getPreviousExplicitRuleShortName() {
      return this.RULE_STACK[this.RULE_STACK_IDX - 1];
    }
    getLastExplicitRuleOccurrenceIndex() {
      return this.RULE_OCCURRENCE_STACK[this.RULE_OCCURRENCE_STACK_IDX];
    }
  }
  class LexerAdapter {
    initLexerAdapter() {
      this.tokVector = [];
      this.tokVectorLength = 0;
      this.currIdx = -1;
    }
    set input(newInput) {
      if (this.selfAnalysisDone !== true) {
        throw Error(`Missing <performSelfAnalysis> invocation at the end of the Parser's constructor.`);
      }
      this.reset();
      this.tokVector = newInput;
      this.tokVectorLength = newInput.length;
    }
    get input() {
      return this.tokVector;
    }
    // skips a token and returns the next token
    SKIP_TOKEN() {
      if (this.currIdx <= this.tokVectorLength - 2) {
        this.consumeToken();
        return this.LA_FAST(1);
      } else {
        return END_OF_FILE;
      }
    }
    // Lexer (accessing Token vector) related methods which can be overridden to implement lazy lexers
    // or lexers dependent on parser context.
    // Performance Optimized version of LA without bound checks
    // note that token beyond the end of the token vector EOF Token will still be returned
    // due to using sentinels at the end of the token vector. (for K=max lookahead)
    LA_FAST(howMuch) {
      const soughtIdx = this.currIdx + howMuch;
      return this.tokVector[soughtIdx];
    }
    LA(howMuch) {
      const soughtIdx = this.currIdx + howMuch;
      if (soughtIdx < 0 || this.tokVectorLength <= soughtIdx) {
        return END_OF_FILE;
      } else {
        return this.tokVector[soughtIdx];
      }
    }
    consumeToken() {
      this.currIdx++;
    }
    exportLexerState() {
      return this.currIdx;
    }
    importLexerState(newState) {
      this.currIdx = newState;
    }
    resetLexerState() {
      this.currIdx = -1;
    }
    moveToTerminatedState() {
      this.currIdx = this.tokVectorLength - 1;
    }
    getLexerPosition() {
      return this.exportLexerState();
    }
  }
  class RecognizerApi {
    ACTION(impl) {
      return impl.call(this);
    }
    consume(idx, tokType, options) {
      return this.consumeInternal(tokType, idx, options);
    }
    subrule(idx, ruleToCall, options) {
      return this.subruleInternal(ruleToCall, idx, options);
    }
    option(idx, actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, idx);
    }
    or(idx, altsOrOpts) {
      return this.orInternal(altsOrOpts, idx);
    }
    many(idx, actionORMethodDef) {
      return this.manyInternal(idx, actionORMethodDef);
    }
    atLeastOne(idx, actionORMethodDef) {
      return this.atLeastOneInternal(idx, actionORMethodDef);
    }
    CONSUME(tokType, options) {
      return this.consumeInternal(tokType, 0, options);
    }
    CONSUME1(tokType, options) {
      return this.consumeInternal(tokType, 1, options);
    }
    CONSUME2(tokType, options) {
      return this.consumeInternal(tokType, 2, options);
    }
    CONSUME3(tokType, options) {
      return this.consumeInternal(tokType, 3, options);
    }
    CONSUME4(tokType, options) {
      return this.consumeInternal(tokType, 4, options);
    }
    CONSUME5(tokType, options) {
      return this.consumeInternal(tokType, 5, options);
    }
    CONSUME6(tokType, options) {
      return this.consumeInternal(tokType, 6, options);
    }
    CONSUME7(tokType, options) {
      return this.consumeInternal(tokType, 7, options);
    }
    CONSUME8(tokType, options) {
      return this.consumeInternal(tokType, 8, options);
    }
    CONSUME9(tokType, options) {
      return this.consumeInternal(tokType, 9, options);
    }
    SUBRULE(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 0, options);
    }
    SUBRULE1(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 1, options);
    }
    SUBRULE2(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 2, options);
    }
    SUBRULE3(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 3, options);
    }
    SUBRULE4(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 4, options);
    }
    SUBRULE5(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 5, options);
    }
    SUBRULE6(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 6, options);
    }
    SUBRULE7(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 7, options);
    }
    SUBRULE8(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 8, options);
    }
    SUBRULE9(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 9, options);
    }
    OPTION(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 0);
    }
    OPTION1(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 1);
    }
    OPTION2(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 2);
    }
    OPTION3(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 3);
    }
    OPTION4(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 4);
    }
    OPTION5(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 5);
    }
    OPTION6(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 6);
    }
    OPTION7(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 7);
    }
    OPTION8(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 8);
    }
    OPTION9(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 9);
    }
    OR(altsOrOpts) {
      return this.orInternal(altsOrOpts, 0);
    }
    OR1(altsOrOpts) {
      return this.orInternal(altsOrOpts, 1);
    }
    OR2(altsOrOpts) {
      return this.orInternal(altsOrOpts, 2);
    }
    OR3(altsOrOpts) {
      return this.orInternal(altsOrOpts, 3);
    }
    OR4(altsOrOpts) {
      return this.orInternal(altsOrOpts, 4);
    }
    OR5(altsOrOpts) {
      return this.orInternal(altsOrOpts, 5);
    }
    OR6(altsOrOpts) {
      return this.orInternal(altsOrOpts, 6);
    }
    OR7(altsOrOpts) {
      return this.orInternal(altsOrOpts, 7);
    }
    OR8(altsOrOpts) {
      return this.orInternal(altsOrOpts, 8);
    }
    OR9(altsOrOpts) {
      return this.orInternal(altsOrOpts, 9);
    }
    MANY(actionORMethodDef) {
      this.manyInternal(0, actionORMethodDef);
    }
    MANY1(actionORMethodDef) {
      this.manyInternal(1, actionORMethodDef);
    }
    MANY2(actionORMethodDef) {
      this.manyInternal(2, actionORMethodDef);
    }
    MANY3(actionORMethodDef) {
      this.manyInternal(3, actionORMethodDef);
    }
    MANY4(actionORMethodDef) {
      this.manyInternal(4, actionORMethodDef);
    }
    MANY5(actionORMethodDef) {
      this.manyInternal(5, actionORMethodDef);
    }
    MANY6(actionORMethodDef) {
      this.manyInternal(6, actionORMethodDef);
    }
    MANY7(actionORMethodDef) {
      this.manyInternal(7, actionORMethodDef);
    }
    MANY8(actionORMethodDef) {
      this.manyInternal(8, actionORMethodDef);
    }
    MANY9(actionORMethodDef) {
      this.manyInternal(9, actionORMethodDef);
    }
    MANY_SEP(options) {
      this.manySepFirstInternal(0, options);
    }
    MANY_SEP1(options) {
      this.manySepFirstInternal(1, options);
    }
    MANY_SEP2(options) {
      this.manySepFirstInternal(2, options);
    }
    MANY_SEP3(options) {
      this.manySepFirstInternal(3, options);
    }
    MANY_SEP4(options) {
      this.manySepFirstInternal(4, options);
    }
    MANY_SEP5(options) {
      this.manySepFirstInternal(5, options);
    }
    MANY_SEP6(options) {
      this.manySepFirstInternal(6, options);
    }
    MANY_SEP7(options) {
      this.manySepFirstInternal(7, options);
    }
    MANY_SEP8(options) {
      this.manySepFirstInternal(8, options);
    }
    MANY_SEP9(options) {
      this.manySepFirstInternal(9, options);
    }
    AT_LEAST_ONE(actionORMethodDef) {
      this.atLeastOneInternal(0, actionORMethodDef);
    }
    AT_LEAST_ONE1(actionORMethodDef) {
      return this.atLeastOneInternal(1, actionORMethodDef);
    }
    AT_LEAST_ONE2(actionORMethodDef) {
      this.atLeastOneInternal(2, actionORMethodDef);
    }
    AT_LEAST_ONE3(actionORMethodDef) {
      this.atLeastOneInternal(3, actionORMethodDef);
    }
    AT_LEAST_ONE4(actionORMethodDef) {
      this.atLeastOneInternal(4, actionORMethodDef);
    }
    AT_LEAST_ONE5(actionORMethodDef) {
      this.atLeastOneInternal(5, actionORMethodDef);
    }
    AT_LEAST_ONE6(actionORMethodDef) {
      this.atLeastOneInternal(6, actionORMethodDef);
    }
    AT_LEAST_ONE7(actionORMethodDef) {
      this.atLeastOneInternal(7, actionORMethodDef);
    }
    AT_LEAST_ONE8(actionORMethodDef) {
      this.atLeastOneInternal(8, actionORMethodDef);
    }
    AT_LEAST_ONE9(actionORMethodDef) {
      this.atLeastOneInternal(9, actionORMethodDef);
    }
    AT_LEAST_ONE_SEP(options) {
      this.atLeastOneSepFirstInternal(0, options);
    }
    AT_LEAST_ONE_SEP1(options) {
      this.atLeastOneSepFirstInternal(1, options);
    }
    AT_LEAST_ONE_SEP2(options) {
      this.atLeastOneSepFirstInternal(2, options);
    }
    AT_LEAST_ONE_SEP3(options) {
      this.atLeastOneSepFirstInternal(3, options);
    }
    AT_LEAST_ONE_SEP4(options) {
      this.atLeastOneSepFirstInternal(4, options);
    }
    AT_LEAST_ONE_SEP5(options) {
      this.atLeastOneSepFirstInternal(5, options);
    }
    AT_LEAST_ONE_SEP6(options) {
      this.atLeastOneSepFirstInternal(6, options);
    }
    AT_LEAST_ONE_SEP7(options) {
      this.atLeastOneSepFirstInternal(7, options);
    }
    AT_LEAST_ONE_SEP8(options) {
      this.atLeastOneSepFirstInternal(8, options);
    }
    AT_LEAST_ONE_SEP9(options) {
      this.atLeastOneSepFirstInternal(9, options);
    }
    RULE(name, implementation, config = DEFAULT_RULE_CONFIG) {
      if (includes(this.definedRulesNames, name)) {
        const errMsg = defaultGrammarValidatorErrorProvider.buildDuplicateRuleNameError({
          topLevelRule: name,
          grammarName: this.className
        });
        const error = {
          message: errMsg,
          type: ParserDefinitionErrorType.DUPLICATE_RULE_NAME,
          ruleName: name
        };
        this.definitionErrors.push(error);
      }
      this.definedRulesNames.push(name);
      const ruleImplementation = this.defineRule(name, implementation, config);
      this[name] = ruleImplementation;
      return ruleImplementation;
    }
    OVERRIDE_RULE(name, impl, config = DEFAULT_RULE_CONFIG) {
      const ruleErrors = validateRuleIsOverridden(name, this.definedRulesNames, this.className);
      this.definitionErrors = this.definitionErrors.concat(ruleErrors);
      const ruleImplementation = this.defineRule(name, impl, config);
      this[name] = ruleImplementation;
      return ruleImplementation;
    }
    BACKTRACK(grammarRule, args) {
      var _a;
      const ruleToCall = (_a = grammarRule.coreRule) !== null && _a !== void 0 ? _a : grammarRule;
      return function() {
        this.isBackTrackingStack.push(1);
        const orgState = this.saveRecogState();
        try {
          ruleToCall.apply(this, args);
          return true;
        } catch (e) {
          if (isRecognitionException(e)) {
            return false;
          } else {
            throw e;
          }
        } finally {
          this.reloadRecogState(orgState);
          this.isBackTrackingStack.pop();
        }
      };
    }
    // GAST export APIs
    getGAstProductions() {
      return this.gastProductionsCache;
    }
    getSerializedGastProductions() {
      return serializeGrammar(values$1(this.gastProductionsCache));
    }
  }
  class RecognizerEngine {
    initRecognizerEngine(tokenVocabulary, config) {
      this.className = this.constructor.name;
      this.shortRuleNameToFull = {};
      this.fullRuleNameToShort = {};
      this.ruleShortNameIdx = 256;
      this.tokenMatcher = tokenStructuredMatcherNoCategories;
      this.subruleIdx = 0;
      this.currRuleShortName = 0;
      this.definedRulesNames = [];
      this.tokensMap = {};
      this.isBackTrackingStack = [];
      this.RULE_STACK = [];
      this.RULE_STACK_IDX = -1;
      this.RULE_OCCURRENCE_STACK = [];
      this.RULE_OCCURRENCE_STACK_IDX = -1;
      this.gastProductionsCache = {};
      if (has(config, "serializedGrammar")) {
        throw Error("The Parser's configuration can no longer contain a <serializedGrammar> property.\n	See: https://chevrotain.io/docs/changes/BREAKING_CHANGES.html#_6-0-0\n	For Further details.");
      }
      if (isArray(tokenVocabulary)) {
        if (isEmpty(tokenVocabulary)) {
          throw Error("A Token Vocabulary cannot be empty.\n	Note that the first argument for the parser constructor\n	is no longer a Token vector (since v4.0).");
        }
        if (typeof tokenVocabulary[0].startOffset === "number") {
          throw Error("The Parser constructor no longer accepts a token vector as the first argument.\n	See: https://chevrotain.io/docs/changes/BREAKING_CHANGES.html#_4-0-0\n	For Further details.");
        }
      }
      if (isArray(tokenVocabulary)) {
        this.tokensMap = reduce(tokenVocabulary, (acc, tokType) => {
          acc[tokType.name] = tokType;
          return acc;
        }, {});
      } else if (has(tokenVocabulary, "modes") && every(flatten(values$1(tokenVocabulary.modes)), isTokenType)) {
        const allTokenTypes2 = flatten(values$1(tokenVocabulary.modes));
        const uniqueTokens = uniq(allTokenTypes2);
        this.tokensMap = reduce(uniqueTokens, (acc, tokType) => {
          acc[tokType.name] = tokType;
          return acc;
        }, {});
      } else if (isObject(tokenVocabulary)) {
        this.tokensMap = clone(tokenVocabulary);
      } else {
        throw new Error("<tokensDictionary> argument must be An Array of Token constructors, A dictionary of Token constructors or an IMultiModeLexerDefinition");
      }
      this.tokensMap["EOF"] = EOF;
      const allTokenTypes = has(tokenVocabulary, "modes") ? flatten(values$1(tokenVocabulary.modes)) : values$1(tokenVocabulary);
      const noTokenCategoriesUsed = every(allTokenTypes, (tokenConstructor) => isEmpty(tokenConstructor.categoryMatches));
      this.tokenMatcher = noTokenCategoriesUsed ? tokenStructuredMatcherNoCategories : tokenStructuredMatcher;
      augmentTokenTypes(values$1(this.tokensMap));
    }
    defineRule(ruleName, impl, config) {
      if (this.selfAnalysisDone) {
        throw Error(`Grammar rule <${ruleName}> may not be defined after the 'performSelfAnalysis' method has been called'
Make sure that all grammar rule definitions are done before 'performSelfAnalysis' is called.`);
      }
      const resyncEnabled = has(config, "resyncEnabled") ? config.resyncEnabled : DEFAULT_RULE_CONFIG.resyncEnabled;
      const recoveryValueFunc = has(config, "recoveryValueFunc") ? config.recoveryValueFunc : DEFAULT_RULE_CONFIG.recoveryValueFunc;
      const shortName = this.ruleShortNameIdx << BITS_FOR_METHOD_TYPE + BITS_FOR_OCCURRENCE_IDX;
      this.ruleShortNameIdx++;
      this.shortRuleNameToFull[shortName] = ruleName;
      this.fullRuleNameToShort[ruleName] = shortName;
      let coreRuleFunction;
      if (this.outputCst === true) {
        coreRuleFunction = function invokeRuleWithTry(...args) {
          try {
            this.ruleInvocationStateUpdate(shortName, ruleName, this.subruleIdx);
            impl.apply(this, args);
            const cst = this.CST_STACK[this.CST_STACK.length - 1];
            this.cstPostRule(cst);
            return cst;
          } catch (e) {
            return this.invokeRuleCatch(e, resyncEnabled, recoveryValueFunc);
          } finally {
            this.ruleFinallyStateUpdate();
          }
        };
      } else {
        coreRuleFunction = function invokeRuleWithTryCst(...args) {
          try {
            this.ruleInvocationStateUpdate(shortName, ruleName, this.subruleIdx);
            return impl.apply(this, args);
          } catch (e) {
            return this.invokeRuleCatch(e, resyncEnabled, recoveryValueFunc);
          } finally {
            this.ruleFinallyStateUpdate();
          }
        };
      }
      const rootRuleFunction = function rootRule(...args) {
        this.onBeforeParse(ruleName);
        try {
          return coreRuleFunction.apply(this, args);
        } finally {
          this.onAfterParse(ruleName);
        }
      };
      const wrappedGrammarRule = Object.assign(rootRuleFunction, { ruleName, originalGrammarAction: impl, coreRule: coreRuleFunction });
      return wrappedGrammarRule;
    }
    invokeRuleCatch(e, resyncEnabledConfig, recoveryValueFunc) {
      const isFirstInvokedRule = this.RULE_STACK_IDX === 0;
      const reSyncEnabled = resyncEnabledConfig && !this.isBackTracking() && this.recoveryEnabled;
      if (isRecognitionException(e)) {
        const recogError = e;
        if (reSyncEnabled) {
          const reSyncTokType = this.findReSyncTokenType();
          if (this.isInCurrentRuleReSyncSet(reSyncTokType)) {
            recogError.resyncedTokens = this.reSyncTo(reSyncTokType);
            if (this.outputCst) {
              const partialCstResult = this.CST_STACK[this.CST_STACK.length - 1];
              partialCstResult.recoveredNode = true;
              return partialCstResult;
            } else {
              return recoveryValueFunc(e);
            }
          } else {
            if (this.outputCst) {
              const partialCstResult = this.CST_STACK[this.CST_STACK.length - 1];
              partialCstResult.recoveredNode = true;
              recogError.partialCstResult = partialCstResult;
            }
            throw recogError;
          }
        } else if (isFirstInvokedRule) {
          this.moveToTerminatedState();
          return recoveryValueFunc(e);
        } else {
          throw recogError;
        }
      } else {
        throw e;
      }
    }
    // Implementation of parsing DSL
    optionInternal(actionORMethodDef, occurrence) {
      const key = this.getKeyForAutomaticLookahead(OPTION_IDX, occurrence);
      return this.optionInternalLogic(actionORMethodDef, occurrence, key);
    }
    optionInternalLogic(actionORMethodDef, occurrence, key) {
      let lookAheadFunc = this.getLaFuncFromCache(key);
      let action;
      if (typeof actionORMethodDef !== "function") {
        action = actionORMethodDef.DEF;
        const predicate = actionORMethodDef.GATE;
        if (predicate !== void 0) {
          const orgLookaheadFunction = lookAheadFunc;
          lookAheadFunc = () => {
            return predicate.call(this) && orgLookaheadFunction.call(this);
          };
        }
      } else {
        action = actionORMethodDef;
      }
      if (lookAheadFunc.call(this) === true) {
        return action.call(this);
      }
      return void 0;
    }
    atLeastOneInternal(prodOccurrence, actionORMethodDef) {
      const laKey = this.getKeyForAutomaticLookahead(AT_LEAST_ONE_IDX, prodOccurrence);
      return this.atLeastOneInternalLogic(prodOccurrence, actionORMethodDef, laKey);
    }
    atLeastOneInternalLogic(prodOccurrence, actionORMethodDef, key) {
      let lookAheadFunc = this.getLaFuncFromCache(key);
      let action;
      if (typeof actionORMethodDef !== "function") {
        action = actionORMethodDef.DEF;
        const predicate = actionORMethodDef.GATE;
        if (predicate !== void 0) {
          const orgLookaheadFunction = lookAheadFunc;
          lookAheadFunc = () => {
            return predicate.call(this) && orgLookaheadFunction.call(this);
          };
        }
      } else {
        action = actionORMethodDef;
      }
      if (lookAheadFunc.call(this) === true) {
        let notStuck = this.doSingleRepetition(action);
        while (lookAheadFunc.call(this) === true && notStuck === true) {
          notStuck = this.doSingleRepetition(action);
        }
      } else {
        throw this.raiseEarlyExitException(prodOccurrence, PROD_TYPE.REPETITION_MANDATORY, actionORMethodDef.ERR_MSG);
      }
      this.attemptInRepetitionRecovery(this.atLeastOneInternal, [prodOccurrence, actionORMethodDef], lookAheadFunc, AT_LEAST_ONE_IDX, prodOccurrence, NextTerminalAfterAtLeastOneWalker);
    }
    atLeastOneSepFirstInternal(prodOccurrence, options) {
      const laKey = this.getKeyForAutomaticLookahead(AT_LEAST_ONE_SEP_IDX, prodOccurrence);
      this.atLeastOneSepFirstInternalLogic(prodOccurrence, options, laKey);
    }
    atLeastOneSepFirstInternalLogic(prodOccurrence, options, key) {
      const action = options.DEF;
      const separator2 = options.SEP;
      const firstIterationLookaheadFunc = this.getLaFuncFromCache(key);
      if (firstIterationLookaheadFunc.call(this) === true) {
        action.call(this);
        const separatorLookAheadFunc = () => {
          return this.tokenMatcher(this.LA_FAST(1), separator2);
        };
        while (this.tokenMatcher(this.LA_FAST(1), separator2) === true) {
          this.CONSUME(separator2);
          action.call(this);
        }
        this.attemptInRepetitionRecovery(this.repetitionSepSecondInternal, [
          prodOccurrence,
          separator2,
          separatorLookAheadFunc,
          action,
          NextTerminalAfterAtLeastOneSepWalker
        ], separatorLookAheadFunc, AT_LEAST_ONE_SEP_IDX, prodOccurrence, NextTerminalAfterAtLeastOneSepWalker);
      } else {
        throw this.raiseEarlyExitException(prodOccurrence, PROD_TYPE.REPETITION_MANDATORY_WITH_SEPARATOR, options.ERR_MSG);
      }
    }
    manyInternal(prodOccurrence, actionORMethodDef) {
      const laKey = this.getKeyForAutomaticLookahead(MANY_IDX, prodOccurrence);
      return this.manyInternalLogic(prodOccurrence, actionORMethodDef, laKey);
    }
    manyInternalLogic(prodOccurrence, actionORMethodDef, key) {
      let lookaheadFunction = this.getLaFuncFromCache(key);
      let action;
      if (typeof actionORMethodDef !== "function") {
        action = actionORMethodDef.DEF;
        const predicate = actionORMethodDef.GATE;
        if (predicate !== void 0) {
          const orgLookaheadFunction = lookaheadFunction;
          lookaheadFunction = () => {
            return predicate.call(this) && orgLookaheadFunction.call(this);
          };
        }
      } else {
        action = actionORMethodDef;
      }
      let notStuck = true;
      while (lookaheadFunction.call(this) === true && notStuck === true) {
        notStuck = this.doSingleRepetition(action);
      }
      this.attemptInRepetitionRecovery(
        this.manyInternal,
        [prodOccurrence, actionORMethodDef],
        lookaheadFunction,
        MANY_IDX,
        prodOccurrence,
        NextTerminalAfterManyWalker,
        // The notStuck parameter is only relevant when "attemptInRepetitionRecovery"
        // is invoked from manyInternal, in the MANY_SEP case and AT_LEAST_ONE[_SEP]
        // An infinite loop cannot occur as:
        // - Either the lookahead is guaranteed to consume something (Single Token Separator)
        // - AT_LEAST_ONE by definition is guaranteed to consume something (or error out).
        notStuck
      );
    }
    manySepFirstInternal(prodOccurrence, options) {
      const laKey = this.getKeyForAutomaticLookahead(MANY_SEP_IDX, prodOccurrence);
      this.manySepFirstInternalLogic(prodOccurrence, options, laKey);
    }
    manySepFirstInternalLogic(prodOccurrence, options, key) {
      const action = options.DEF;
      const separator2 = options.SEP;
      const firstIterationLaFunc = this.getLaFuncFromCache(key);
      if (firstIterationLaFunc.call(this) === true) {
        action.call(this);
        const separatorLookAheadFunc = () => {
          return this.tokenMatcher(this.LA_FAST(1), separator2);
        };
        while (this.tokenMatcher(this.LA_FAST(1), separator2) === true) {
          this.CONSUME(separator2);
          action.call(this);
        }
        this.attemptInRepetitionRecovery(this.repetitionSepSecondInternal, [
          prodOccurrence,
          separator2,
          separatorLookAheadFunc,
          action,
          NextTerminalAfterManySepWalker
        ], separatorLookAheadFunc, MANY_SEP_IDX, prodOccurrence, NextTerminalAfterManySepWalker);
      }
    }
    repetitionSepSecondInternal(prodOccurrence, separator2, separatorLookAheadFunc, action, nextTerminalAfterWalker) {
      while (separatorLookAheadFunc()) {
        this.CONSUME(separator2);
        action.call(this);
      }
      this.attemptInRepetitionRecovery(this.repetitionSepSecondInternal, [
        prodOccurrence,
        separator2,
        separatorLookAheadFunc,
        action,
        nextTerminalAfterWalker
      ], separatorLookAheadFunc, AT_LEAST_ONE_SEP_IDX, prodOccurrence, nextTerminalAfterWalker);
    }
    doSingleRepetition(action) {
      const beforeIteration = this.getLexerPosition();
      action.call(this);
      const afterIteration = this.getLexerPosition();
      return afterIteration > beforeIteration;
    }
    orInternal(altsOrOpts, occurrence) {
      const laKey = this.getKeyForAutomaticLookahead(OR_IDX, occurrence);
      const alts = isArray(altsOrOpts) ? altsOrOpts : altsOrOpts.DEF;
      const laFunc = this.getLaFuncFromCache(laKey);
      const altIdxToTake = laFunc.call(this, alts);
      if (altIdxToTake !== void 0) {
        const chosenAlternative = alts[altIdxToTake];
        return chosenAlternative.ALT.call(this);
      }
      this.raiseNoAltException(occurrence, altsOrOpts.ERR_MSG);
    }
    ruleFinallyStateUpdate() {
      this.RULE_STACK_IDX--;
      this.RULE_OCCURRENCE_STACK_IDX--;
      if (this.RULE_STACK_IDX >= 0) {
        this.currRuleShortName = this.RULE_STACK[this.RULE_STACK_IDX];
      }
      this.cstFinallyStateUpdate();
    }
    subruleInternal(ruleToCall, idx, options) {
      let ruleResult;
      try {
        const args = options !== void 0 ? options.ARGS : void 0;
        this.subruleIdx = idx;
        ruleResult = ruleToCall.coreRule.apply(this, args);
        this.cstPostNonTerminal(ruleResult, options !== void 0 && options.LABEL !== void 0 ? options.LABEL : ruleToCall.ruleName);
        return ruleResult;
      } catch (e) {
        throw this.subruleInternalError(e, options, ruleToCall.ruleName);
      }
    }
    subruleInternalError(e, options, ruleName) {
      if (isRecognitionException(e) && e.partialCstResult !== void 0) {
        this.cstPostNonTerminal(e.partialCstResult, options !== void 0 && options.LABEL !== void 0 ? options.LABEL : ruleName);
        delete e.partialCstResult;
      }
      throw e;
    }
    consumeInternal(tokType, idx, options) {
      let consumedToken;
      try {
        const nextToken = this.LA_FAST(1);
        if (this.tokenMatcher(nextToken, tokType) === true) {
          this.consumeToken();
          consumedToken = nextToken;
        } else {
          this.consumeInternalError(tokType, nextToken, options);
        }
      } catch (eFromConsumption) {
        consumedToken = this.consumeInternalRecovery(tokType, idx, eFromConsumption);
      }
      this.cstPostTerminal(options !== void 0 && options.LABEL !== void 0 ? options.LABEL : tokType.name, consumedToken);
      return consumedToken;
    }
    consumeInternalError(tokType, nextToken, options) {
      let msg;
      const previousToken = this.LA(0);
      if (options !== void 0 && options.ERR_MSG) {
        msg = options.ERR_MSG;
      } else {
        msg = this.errorMessageProvider.buildMismatchTokenMessage({
          expected: tokType,
          actual: nextToken,
          previous: previousToken,
          ruleName: this.getCurrRuleFullName()
        });
      }
      throw this.SAVE_ERROR(new MismatchedTokenException(msg, nextToken, previousToken));
    }
    consumeInternalRecovery(tokType, idx, eFromConsumption) {
      if (this.recoveryEnabled && // TODO: more robust checking of the exception type. Perhaps Typescript extending expressions?
      eFromConsumption.name === "MismatchedTokenException" && !this.isBackTracking()) {
        const follows = this.getFollowsForInRuleRecovery(tokType, idx);
        try {
          return this.tryInRuleRecovery(tokType, follows);
        } catch (eFromInRuleRecovery) {
          if (eFromInRuleRecovery.name === IN_RULE_RECOVERY_EXCEPTION) {
            throw eFromConsumption;
          } else {
            throw eFromInRuleRecovery;
          }
        }
      } else {
        throw eFromConsumption;
      }
    }
    saveRecogState() {
      const savedErrors = this.errors;
      const savedRuleStack = this.RULE_STACK.slice(0, this.RULE_STACK_IDX + 1);
      return {
        errors: savedErrors,
        lexerState: this.exportLexerState(),
        RULE_STACK: savedRuleStack,
        CST_STACK: this.CST_STACK
      };
    }
    reloadRecogState(newState) {
      this.errors = newState.errors;
      this.importLexerState(newState.lexerState);
      const saved = newState.RULE_STACK;
      for (let i = 0; i < saved.length; i++) {
        this.RULE_STACK[i] = saved[i];
      }
      this.RULE_STACK_IDX = saved.length - 1;
      if (this.RULE_STACK_IDX >= 0) {
        this.currRuleShortName = this.RULE_STACK[this.RULE_STACK_IDX];
      }
    }
    ruleInvocationStateUpdate(shortName, fullName, idxInCallingRule) {
      this.RULE_OCCURRENCE_STACK[++this.RULE_OCCURRENCE_STACK_IDX] = idxInCallingRule;
      this.RULE_STACK[++this.RULE_STACK_IDX] = shortName;
      this.currRuleShortName = shortName;
      this.cstInvocationStateUpdate(fullName);
    }
    isBackTracking() {
      return this.isBackTrackingStack.length !== 0;
    }
    getCurrRuleFullName() {
      const shortName = this.currRuleShortName;
      return this.shortRuleNameToFull[shortName];
    }
    shortRuleNameToFullName(shortName) {
      return this.shortRuleNameToFull[shortName];
    }
    isAtEndOfInput() {
      return this.tokenMatcher(this.LA(1), EOF);
    }
    reset() {
      this.resetLexerState();
      this.subruleIdx = 0;
      this.currRuleShortName = 0;
      this.isBackTrackingStack = [];
      this.errors = [];
      this.RULE_STACK_IDX = -1;
      this.RULE_OCCURRENCE_STACK_IDX = -1;
      this.CST_STACK = [];
    }
    /**
     * Hook called before the root-level parsing rule is invoked.
     * This is only called when a rule is invoked directly by the consumer
     * (e.g., `parser.json()`), not when invoked as a sub-rule via SUBRULE.
     *
     * Override this method to perform actions before parsing begins.
     * The default implementation is a no-op.
     *
     * @param ruleName - The name of the root rule being invoked.
     */
    onBeforeParse(ruleName) {
      for (let i = 0; i < this.maxLookahead + 1; i++) {
        this.tokVector.push(END_OF_FILE);
      }
    }
    /**
     * Hook called after the root-level parsing rule has completed (or thrown).
     * This is only called when a rule is invoked directly by the consumer
     * (e.g., `parser.json()`), not when invoked as a sub-rule via SUBRULE.
     *
     * This hook is called in a `finally` block, so it executes regardless of
     * whether parsing succeeded or threw an error.
     *
     * Override this method to perform actions after parsing completes.
     * The default implementation is a no-op.
     *
     * @param ruleName - The name of the root rule that was invoked.
     */
    onAfterParse(ruleName) {
      if (this.isAtEndOfInput() === false) {
        const firstRedundantTok = this.LA(1);
        const errMsg = this.errorMessageProvider.buildNotAllInputParsedMessage({
          firstRedundant: firstRedundantTok,
          ruleName: this.getCurrRuleFullName()
        });
        this.SAVE_ERROR(new NotAllInputParsedException(errMsg, firstRedundantTok));
      }
      while (this.tokVector.at(-1) === END_OF_FILE) {
        this.tokVector.pop();
      }
    }
  }
  class ErrorHandler {
    initErrorHandler(config) {
      this._errors = [];
      this.errorMessageProvider = has(config, "errorMessageProvider") ? config.errorMessageProvider : DEFAULT_PARSER_CONFIG.errorMessageProvider;
    }
    SAVE_ERROR(error) {
      if (isRecognitionException(error)) {
        error.context = {
          ruleStack: this.getHumanReadableRuleStack(),
          ruleOccurrenceStack: this.RULE_OCCURRENCE_STACK.slice(0, this.RULE_OCCURRENCE_STACK_IDX + 1)
        };
        this._errors.push(error);
        return error;
      } else {
        throw Error("Trying to save an Error which is not a RecognitionException");
      }
    }
    get errors() {
      return clone(this._errors);
    }
    set errors(newErrors) {
      this._errors = newErrors;
    }
    // TODO: consider caching the error message computed information
    raiseEarlyExitException(occurrence, prodType, userDefinedErrMsg) {
      const ruleName = this.getCurrRuleFullName();
      const ruleGrammar = this.getGAstProductions()[ruleName];
      const lookAheadPathsPerAlternative = getLookaheadPathsForOptionalProd(occurrence, ruleGrammar, prodType, this.maxLookahead);
      const insideProdPaths = lookAheadPathsPerAlternative[0];
      const actualTokens = [];
      for (let i = 1; i <= this.maxLookahead; i++) {
        actualTokens.push(this.LA(i));
      }
      const msg = this.errorMessageProvider.buildEarlyExitMessage({
        expectedIterationPaths: insideProdPaths,
        actual: actualTokens,
        previous: this.LA(0),
        customUserDescription: userDefinedErrMsg,
        ruleName
      });
      throw this.SAVE_ERROR(new EarlyExitException(msg, this.LA(1), this.LA(0)));
    }
    // TODO: consider caching the error message computed information
    raiseNoAltException(occurrence, errMsgTypes) {
      const ruleName = this.getCurrRuleFullName();
      const ruleGrammar = this.getGAstProductions()[ruleName];
      const lookAheadPathsPerAlternative = getLookaheadPathsForOr(occurrence, ruleGrammar, this.maxLookahead);
      const actualTokens = [];
      for (let i = 1; i <= this.maxLookahead; i++) {
        actualTokens.push(this.LA(i));
      }
      const previousToken = this.LA(0);
      const errMsg = this.errorMessageProvider.buildNoViableAltMessage({
        expectedPathsPerAlt: lookAheadPathsPerAlternative,
        actual: actualTokens,
        previous: previousToken,
        customUserDescription: errMsgTypes,
        ruleName: this.getCurrRuleFullName()
      });
      throw this.SAVE_ERROR(new NoViableAltException(errMsg, this.LA(1), previousToken));
    }
  }
  class ContentAssist {
    initContentAssist() {
    }
    computeContentAssist(startRuleName, precedingInput) {
      const startRuleGast = this.gastProductionsCache[startRuleName];
      if (isUndefined(startRuleGast)) {
        throw Error(`Rule ->${startRuleName}<- does not exist in this grammar.`);
      }
      return nextPossibleTokensAfter([startRuleGast], precedingInput, this.tokenMatcher, this.maxLookahead);
    }
    // TODO: should this be a member method or a utility? it does not have any state or usage of 'this'...
    // TODO: should this be more explicitly part of the public API?
    getNextPossibleTokenTypes(grammarPath) {
      const topRuleName = head(grammarPath.ruleStack);
      const gastProductions = this.getGAstProductions();
      const topProduction = gastProductions[topRuleName];
      const nextPossibleTokenTypes = new NextAfterTokenWalker(topProduction, grammarPath).startWalking();
      return nextPossibleTokenTypes;
    }
  }
  const RECORDING_NULL_OBJECT = {
    description: "This Object indicates the Parser is during Recording Phase"
  };
  Object.freeze(RECORDING_NULL_OBJECT);
  const HANDLE_SEPARATOR = true;
  const MAX_METHOD_IDX = Math.pow(2, BITS_FOR_OCCURRENCE_IDX) - 1;
  const RFT = createToken$1({ name: "RECORDING_PHASE_TOKEN", pattern: Lexer.NA });
  augmentTokenTypes([RFT]);
  const RECORDING_PHASE_TOKEN = createTokenInstance(
    RFT,
    "This IToken indicates the Parser is in Recording Phase\n	See: https://chevrotain.io/docs/guide/internals.html#grammar-recording for details",
    // Using "-1" instead of NaN (as in EOF) because an actual number is less likely to
    // cause errors if the output of LA or CONSUME would be (incorrectly) used during the recording phase.
    -1,
    -1,
    -1,
    -1,
    -1,
    -1
  );
  Object.freeze(RECORDING_PHASE_TOKEN);
  const RECORDING_PHASE_CSTNODE = {
    name: "This CSTNode indicates the Parser is in Recording Phase\n	See: https://chevrotain.io/docs/guide/internals.html#grammar-recording for details",
    children: {}
  };
  class GastRecorder {
    initGastRecorder(config) {
      this.recordingProdStack = [];
      this.RECORDING_PHASE = false;
    }
    enableRecording() {
      this.RECORDING_PHASE = true;
      this.TRACE_INIT("Enable Recording", () => {
        for (let i = 0; i < 10; i++) {
          const idx = i > 0 ? i : "";
          this[`CONSUME${idx}`] = function(arg1, arg2) {
            return this.consumeInternalRecord(arg1, i, arg2);
          };
          this[`SUBRULE${idx}`] = function(arg1, arg2) {
            return this.subruleInternalRecord(arg1, i, arg2);
          };
          this[`OPTION${idx}`] = function(arg1) {
            return this.optionInternalRecord(arg1, i);
          };
          this[`OR${idx}`] = function(arg1) {
            return this.orInternalRecord(arg1, i);
          };
          this[`MANY${idx}`] = function(arg1) {
            this.manyInternalRecord(i, arg1);
          };
          this[`MANY_SEP${idx}`] = function(arg1) {
            this.manySepFirstInternalRecord(i, arg1);
          };
          this[`AT_LEAST_ONE${idx}`] = function(arg1) {
            this.atLeastOneInternalRecord(i, arg1);
          };
          this[`AT_LEAST_ONE_SEP${idx}`] = function(arg1) {
            this.atLeastOneSepFirstInternalRecord(i, arg1);
          };
        }
        this[`consume`] = function(idx, arg1, arg2) {
          return this.consumeInternalRecord(arg1, idx, arg2);
        };
        this[`subrule`] = function(idx, arg1, arg2) {
          return this.subruleInternalRecord(arg1, idx, arg2);
        };
        this[`option`] = function(idx, arg1) {
          return this.optionInternalRecord(arg1, idx);
        };
        this[`or`] = function(idx, arg1) {
          return this.orInternalRecord(arg1, idx);
        };
        this[`many`] = function(idx, arg1) {
          this.manyInternalRecord(idx, arg1);
        };
        this[`atLeastOne`] = function(idx, arg1) {
          this.atLeastOneInternalRecord(idx, arg1);
        };
        this.ACTION = this.ACTION_RECORD;
        this.BACKTRACK = this.BACKTRACK_RECORD;
        this.LA = this.LA_RECORD;
      });
    }
    disableRecording() {
      this.RECORDING_PHASE = false;
      this.TRACE_INIT("Deleting Recording methods", () => {
        const that = this;
        for (let i = 0; i < 10; i++) {
          const idx = i > 0 ? i : "";
          delete that[`CONSUME${idx}`];
          delete that[`SUBRULE${idx}`];
          delete that[`OPTION${idx}`];
          delete that[`OR${idx}`];
          delete that[`MANY${idx}`];
          delete that[`MANY_SEP${idx}`];
          delete that[`AT_LEAST_ONE${idx}`];
          delete that[`AT_LEAST_ONE_SEP${idx}`];
        }
        delete that[`consume`];
        delete that[`subrule`];
        delete that[`option`];
        delete that[`or`];
        delete that[`many`];
        delete that[`atLeastOne`];
        delete that.ACTION;
        delete that.BACKTRACK;
        delete that.LA;
      });
    }
    //   Parser methods are called inside an ACTION?
    //   Maybe try/catch/finally on ACTIONS while disabling the recorders state changes?
    // @ts-expect-error -- noop place holder
    ACTION_RECORD(impl) {
    }
    // Executing backtracking logic will break our recording logic assumptions
    BACKTRACK_RECORD(grammarRule, args) {
      return () => true;
    }
    // LA is part of the official API and may be used for custom lookahead logic
    // by end users who may forget to wrap it in ACTION or inside a GATE
    LA_RECORD(howMuch) {
      return END_OF_FILE;
    }
    topLevelRuleRecord(name, def) {
      try {
        const newTopLevelRule = new Rule({ definition: [], name });
        newTopLevelRule.name = name;
        this.recordingProdStack.push(newTopLevelRule);
        def.call(this);
        this.recordingProdStack.pop();
        return newTopLevelRule;
      } catch (originalError) {
        if (originalError.KNOWN_RECORDER_ERROR !== true) {
          try {
            originalError.message = originalError.message + '\n	 This error was thrown during the "grammar recording phase" For more info see:\n	https://chevrotain.io/docs/guide/internals.html#grammar-recording';
          } catch (mutabilityError) {
            throw originalError;
          }
        }
        throw originalError;
      }
    }
    // Implementation of parsing DSL
    optionInternalRecord(actionORMethodDef, occurrence) {
      return recordProd.call(this, Option, actionORMethodDef, occurrence);
    }
    atLeastOneInternalRecord(occurrence, actionORMethodDef) {
      recordProd.call(this, RepetitionMandatory, actionORMethodDef, occurrence);
    }
    atLeastOneSepFirstInternalRecord(occurrence, options) {
      recordProd.call(this, RepetitionMandatoryWithSeparator, options, occurrence, HANDLE_SEPARATOR);
    }
    manyInternalRecord(occurrence, actionORMethodDef) {
      recordProd.call(this, Repetition, actionORMethodDef, occurrence);
    }
    manySepFirstInternalRecord(occurrence, options) {
      recordProd.call(this, RepetitionWithSeparator, options, occurrence, HANDLE_SEPARATOR);
    }
    orInternalRecord(altsOrOpts, occurrence) {
      return recordOrProd.call(this, altsOrOpts, occurrence);
    }
    subruleInternalRecord(ruleToCall, occurrence, options) {
      assertMethodIdxIsValid(occurrence);
      if (!ruleToCall || has(ruleToCall, "ruleName") === false) {
        const error = new Error(`<SUBRULE${getIdxSuffix(occurrence)}> argument is invalid expecting a Parser method reference but got: <${JSON.stringify(ruleToCall)}>
 inside top level rule: <${this.recordingProdStack[0].name}>`);
        error.KNOWN_RECORDER_ERROR = true;
        throw error;
      }
      const prevProd = last(this.recordingProdStack);
      const ruleName = ruleToCall.ruleName;
      const newNoneTerminal = new NonTerminal({
        idx: occurrence,
        nonTerminalName: ruleName,
        label: options === null || options === void 0 ? void 0 : options.LABEL,
        // The resolving of the `referencedRule` property will be done once all the Rule's GASTs have been created
        referencedRule: void 0
      });
      prevProd.definition.push(newNoneTerminal);
      return this.outputCst ? RECORDING_PHASE_CSTNODE : RECORDING_NULL_OBJECT;
    }
    consumeInternalRecord(tokType, occurrence, options) {
      assertMethodIdxIsValid(occurrence);
      if (!hasShortKeyProperty(tokType)) {
        const error = new Error(`<CONSUME${getIdxSuffix(occurrence)}> argument is invalid expecting a TokenType reference but got: <${JSON.stringify(tokType)}>
 inside top level rule: <${this.recordingProdStack[0].name}>`);
        error.KNOWN_RECORDER_ERROR = true;
        throw error;
      }
      const prevProd = last(this.recordingProdStack);
      const newNoneTerminal = new Terminal({
        idx: occurrence,
        terminalType: tokType,
        label: options === null || options === void 0 ? void 0 : options.LABEL
      });
      prevProd.definition.push(newNoneTerminal);
      return RECORDING_PHASE_TOKEN;
    }
  }
  function recordProd(prodConstructor, mainProdArg, occurrence, handleSep = false) {
    assertMethodIdxIsValid(occurrence);
    const prevProd = last(this.recordingProdStack);
    const grammarAction = isFunction(mainProdArg) ? mainProdArg : mainProdArg.DEF;
    const newProd = new prodConstructor({ definition: [], idx: occurrence });
    if (handleSep) {
      newProd.separator = mainProdArg.SEP;
    }
    if (has(mainProdArg, "MAX_LOOKAHEAD")) {
      newProd.maxLookahead = mainProdArg.MAX_LOOKAHEAD;
    }
    this.recordingProdStack.push(newProd);
    grammarAction.call(this);
    prevProd.definition.push(newProd);
    this.recordingProdStack.pop();
    return RECORDING_NULL_OBJECT;
  }
  function recordOrProd(mainProdArg, occurrence) {
    assertMethodIdxIsValid(occurrence);
    const prevProd = last(this.recordingProdStack);
    const hasOptions = isArray(mainProdArg) === false;
    const alts = hasOptions === false ? mainProdArg : mainProdArg.DEF;
    const newOrProd = new Alternation({
      definition: [],
      idx: occurrence,
      ignoreAmbiguities: hasOptions && mainProdArg.IGNORE_AMBIGUITIES === true
    });
    if (has(mainProdArg, "MAX_LOOKAHEAD")) {
      newOrProd.maxLookahead = mainProdArg.MAX_LOOKAHEAD;
    }
    const hasPredicates = some(alts, (currAlt) => isFunction(currAlt.GATE));
    newOrProd.hasPredicates = hasPredicates;
    prevProd.definition.push(newOrProd);
    forEach(alts, (currAlt) => {
      const currAltFlat = new Alternative({ definition: [] });
      newOrProd.definition.push(currAltFlat);
      if (has(currAlt, "IGNORE_AMBIGUITIES")) {
        currAltFlat.ignoreAmbiguities = currAlt.IGNORE_AMBIGUITIES;
      } else if (has(currAlt, "GATE")) {
        currAltFlat.ignoreAmbiguities = true;
      }
      this.recordingProdStack.push(currAltFlat);
      currAlt.ALT.call(this);
      this.recordingProdStack.pop();
    });
    return RECORDING_NULL_OBJECT;
  }
  function getIdxSuffix(idx) {
    return idx === 0 ? "" : `${idx}`;
  }
  function assertMethodIdxIsValid(idx) {
    if (idx < 0 || idx > MAX_METHOD_IDX) {
      const error = new Error(
        // The stack trace will contain all the needed details
        `Invalid DSL Method idx value: <${idx}>
	Idx value must be a none negative value smaller than ${MAX_METHOD_IDX + 1}`
      );
      error.KNOWN_RECORDER_ERROR = true;
      throw error;
    }
  }
  class PerformanceTracer {
    initPerformanceTracer(config) {
      if (has(config, "traceInitPerf")) {
        const userTraceInitPerf = config.traceInitPerf;
        const traceIsNumber = typeof userTraceInitPerf === "number";
        this.traceInitMaxIdent = traceIsNumber ? userTraceInitPerf : Infinity;
        this.traceInitPerf = traceIsNumber ? userTraceInitPerf > 0 : userTraceInitPerf;
      } else {
        this.traceInitMaxIdent = 0;
        this.traceInitPerf = DEFAULT_PARSER_CONFIG.traceInitPerf;
      }
      this.traceInitIndent = -1;
    }
    TRACE_INIT(phaseDesc, phaseImpl) {
      if (this.traceInitPerf === true) {
        this.traceInitIndent++;
        const indent = new Array(this.traceInitIndent + 1).join("	");
        if (this.traceInitIndent < this.traceInitMaxIdent) {
          console.log(`${indent}--> <${phaseDesc}>`);
        }
        const { time, value } = timer(phaseImpl);
        const traceMethod = time > 10 ? console.warn : console.log;
        if (this.traceInitIndent < this.traceInitMaxIdent) {
          traceMethod(`${indent}<-- <${phaseDesc}> time: ${time}ms`);
        }
        this.traceInitIndent--;
        return value;
      } else {
        return phaseImpl();
      }
    }
  }
  function applyMixins(derivedCtor, baseCtors) {
    baseCtors.forEach((baseCtor) => {
      const baseProto = baseCtor.prototype;
      Object.getOwnPropertyNames(baseProto).forEach((propName) => {
        if (propName === "constructor") {
          return;
        }
        const basePropDescriptor = Object.getOwnPropertyDescriptor(baseProto, propName);
        if (basePropDescriptor && (basePropDescriptor.get || basePropDescriptor.set)) {
          Object.defineProperty(derivedCtor.prototype, propName, basePropDescriptor);
        } else {
          derivedCtor.prototype[propName] = baseCtor.prototype[propName];
        }
      });
    });
  }
  const END_OF_FILE = createTokenInstance(EOF, "", NaN, NaN, NaN, NaN, NaN, NaN);
  Object.freeze(END_OF_FILE);
  const DEFAULT_PARSER_CONFIG = Object.freeze({
    recoveryEnabled: false,
    maxLookahead: 3,
    dynamicTokensEnabled: false,
    outputCst: true,
    errorMessageProvider: defaultParserErrorProvider,
    nodeLocationTracking: "none",
    traceInitPerf: false,
    skipValidations: false
  });
  const DEFAULT_RULE_CONFIG = Object.freeze({
    recoveryValueFunc: () => void 0,
    resyncEnabled: true
  });
  var ParserDefinitionErrorType;
  (function(ParserDefinitionErrorType2) {
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["INVALID_RULE_NAME"] = 0] = "INVALID_RULE_NAME";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["DUPLICATE_RULE_NAME"] = 1] = "DUPLICATE_RULE_NAME";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["INVALID_RULE_OVERRIDE"] = 2] = "INVALID_RULE_OVERRIDE";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["DUPLICATE_PRODUCTIONS"] = 3] = "DUPLICATE_PRODUCTIONS";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["UNRESOLVED_SUBRULE_REF"] = 4] = "UNRESOLVED_SUBRULE_REF";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["LEFT_RECURSION"] = 5] = "LEFT_RECURSION";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["NONE_LAST_EMPTY_ALT"] = 6] = "NONE_LAST_EMPTY_ALT";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["AMBIGUOUS_ALTS"] = 7] = "AMBIGUOUS_ALTS";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["CONFLICT_TOKENS_RULES_NAMESPACE"] = 8] = "CONFLICT_TOKENS_RULES_NAMESPACE";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["INVALID_TOKEN_NAME"] = 9] = "INVALID_TOKEN_NAME";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["NO_NON_EMPTY_LOOKAHEAD"] = 10] = "NO_NON_EMPTY_LOOKAHEAD";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["AMBIGUOUS_PREFIX_ALTS"] = 11] = "AMBIGUOUS_PREFIX_ALTS";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["TOO_MANY_ALTS"] = 12] = "TOO_MANY_ALTS";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["CUSTOM_LOOKAHEAD_VALIDATION"] = 13] = "CUSTOM_LOOKAHEAD_VALIDATION";
  })(ParserDefinitionErrorType || (ParserDefinitionErrorType = {}));
  let Parser$1 = class Parser2 {
    /**
     *  @deprecated use the **instance** method with the same name instead
     */
    static performSelfAnalysis(parserInstance) {
      throw Error("The **static** `performSelfAnalysis` method has been deprecated.	\nUse the **instance** method with the same name instead.");
    }
    performSelfAnalysis() {
      this.TRACE_INIT("performSelfAnalysis", () => {
        let defErrorsMsgs;
        this.selfAnalysisDone = true;
        const className = this.className;
        this.TRACE_INIT("toFastProps", () => {
          toFastProperties(this);
        });
        this.TRACE_INIT("Grammar Recording", () => {
          try {
            this.enableRecording();
            forEach(this.definedRulesNames, (currRuleName) => {
              const wrappedRule = this[currRuleName];
              const originalGrammarAction = wrappedRule["originalGrammarAction"];
              let recordedRuleGast;
              this.TRACE_INIT(`${currRuleName} Rule`, () => {
                recordedRuleGast = this.topLevelRuleRecord(currRuleName, originalGrammarAction);
              });
              this.gastProductionsCache[currRuleName] = recordedRuleGast;
            });
          } finally {
            this.disableRecording();
          }
        });
        let resolverErrors = [];
        this.TRACE_INIT("Grammar Resolving", () => {
          resolverErrors = resolveGrammar({
            rules: values$1(this.gastProductionsCache)
          });
          this.definitionErrors = this.definitionErrors.concat(resolverErrors);
        });
        this.TRACE_INIT("Grammar Validations", () => {
          if (isEmpty(resolverErrors) && this.skipValidations === false) {
            const validationErrors = validateGrammar({
              rules: values$1(this.gastProductionsCache),
              tokenTypes: values$1(this.tokensMap),
              errMsgProvider: defaultGrammarValidatorErrorProvider,
              grammarName: className
            });
            const lookaheadValidationErrors = validateLookahead({
              lookaheadStrategy: this.lookaheadStrategy,
              rules: values$1(this.gastProductionsCache),
              tokenTypes: values$1(this.tokensMap),
              grammarName: className
            });
            this.definitionErrors = this.definitionErrors.concat(validationErrors, lookaheadValidationErrors);
          }
        });
        if (isEmpty(this.definitionErrors)) {
          if (this.recoveryEnabled) {
            this.TRACE_INIT("computeAllProdsFollows", () => {
              const allFollows = computeAllProdsFollows(values$1(this.gastProductionsCache));
              this.resyncFollows = allFollows;
            });
          }
          this.TRACE_INIT("ComputeLookaheadFunctions", () => {
            var _a, _b;
            (_b = (_a = this.lookaheadStrategy).initialize) === null || _b === void 0 ? void 0 : _b.call(_a, {
              rules: values$1(this.gastProductionsCache)
            });
            this.preComputeLookaheadFunctions(values$1(this.gastProductionsCache));
          });
        }
        if (!Parser2.DEFER_DEFINITION_ERRORS_HANDLING && !isEmpty(this.definitionErrors)) {
          defErrorsMsgs = map(this.definitionErrors, (defError) => defError.message);
          throw new Error(`Parser Definition Errors detected:
 ${defErrorsMsgs.join("\n-------------------------------\n")}`);
        }
      });
    }
    constructor(tokenVocabulary, config) {
      this.definitionErrors = [];
      this.selfAnalysisDone = false;
      const that = this;
      that.initErrorHandler(config);
      that.initLexerAdapter();
      that.initLooksAhead(config);
      that.initRecognizerEngine(tokenVocabulary, config);
      that.initRecoverable(config);
      that.initTreeBuilder(config);
      that.initContentAssist();
      that.initGastRecorder(config);
      that.initPerformanceTracer(config);
      if (has(config, "ignoredIssues")) {
        throw new Error("The <ignoredIssues> IParserConfig property has been deprecated.\n	Please use the <IGNORE_AMBIGUITIES> flag on the relevant DSL method instead.\n	See: https://chevrotain.io/docs/guide/resolving_grammar_errors.html#IGNORING_AMBIGUITIES\n	For further details.");
      }
      this.skipValidations = has(config, "skipValidations") ? config.skipValidations : DEFAULT_PARSER_CONFIG.skipValidations;
    }
  };
  Parser$1.DEFER_DEFINITION_ERRORS_HANDLING = false;
  applyMixins(Parser$1, [
    Recoverable,
    LooksAhead,
    TreeBuilder,
    LexerAdapter,
    RecognizerEngine,
    RecognizerApi,
    ErrorHandler,
    ContentAssist,
    GastRecorder,
    PerformanceTracer
  ]);
  class EmbeddedActionsParser extends Parser$1 {
    constructor(tokenVocabulary, config = DEFAULT_PARSER_CONFIG) {
      const configClone = clone(config);
      configClone.outputCst = false;
      super(tokenVocabulary, configClone);
    }
  }
  function unCapitalize(str2) {
    return str2.charAt(0).toLowerCase() + str2.slice(1);
  }
  function createToken(config) {
    return createToken$1(config);
  }
  const traqulaIndentation = "When you use this string, you expect traqula to handle indentation after every newline";
  class LexerBuilder {
    constructor(starter) {
      __publicField(this, "tokens");
      this.tokens = (starter == null ? void 0 : starter.tokens) ? [...starter.tokens] : [];
    }
    static create(starter) {
      return new LexerBuilder(starter);
    }
    merge(merge, overwrite = []) {
      const extraTokens = merge.tokens.filter((token) => {
        const overwriteToken = overwrite.find((t) => t.name === token.name);
        if (overwriteToken) {
          return false;
        }
        const match = this.tokens.find((t) => t.name === token.name);
        if (match) {
          if (match !== token) {
            throw new Error(`Token with name ${token.name} already exists. Implementation is different and no overwrite was provided.`);
          }
          return false;
        }
        return true;
      });
      this.tokens.push(...extraTokens);
      return this;
    }
    add(...token) {
      this.tokens.push(...token);
      return this;
    }
    addBefore(before, ...token) {
      const index = this.tokens.indexOf(before);
      if (index === -1) {
        throw new Error("Token not found");
      }
      this.tokens.splice(index, 0, ...token);
      return this;
    }
    moveBeforeOrAfter(beforeOrAfter, before, ...tokens) {
      const beforeIndex = this.tokens.indexOf(before) + (beforeOrAfter === "before" ? 0 : 1);
      if (beforeIndex === -1) {
        throw new Error("BeforeToken not found");
      }
      for (const token of tokens) {
        const tokenIndex = this.tokens.indexOf(token);
        if (tokenIndex === -1) {
          throw new Error("Token not found");
        }
        this.tokens.splice(tokenIndex, 1);
        this.tokens.splice(beforeIndex, 0, token);
      }
      return this;
    }
    /**
     * @param before token to move rest before
     * @param tokens tokens to move before the first token
     */
    moveBefore(before, ...tokens) {
      return this.moveBeforeOrAfter("before", before, ...tokens);
    }
    moveAfter(after, ...tokens) {
      return this.moveBeforeOrAfter("after", after, ...tokens);
    }
    addAfter(after, ...token) {
      const index = this.tokens.indexOf(after);
      if (index === -1) {
        throw new Error("Token not found");
      }
      this.tokens.splice(index + 1, 0, ...token);
      return this;
    }
    delete(...token) {
      for (const t of token) {
        const index = this.tokens.indexOf(t);
        if (index === -1) {
          throw new Error("Token not found");
        }
        this.tokens.splice(index, 1);
      }
      return this;
    }
    build(lexerConfig) {
      return new Lexer(this.tokens, {
        positionTracking: "onlyStart",
        recoveryEnabled: false,
        ensureOptimizations: true,
        // SafeMode: true,
        // SkipValidations: true,
        ...lexerConfig
      });
    }
    get tokenVocabulary() {
      return this.tokens;
    }
  }
  class DynamicParser extends EmbeddedActionsParser {
    constructor(rules2, tokenVocabulary, config = {}) {
      super(tokenVocabulary, {
        // RecoveryEnabled: true,
        maxLookahead: 1,
        skipValidations: true,
        dynamicTokensEnabled: false,
        ...config
      });
      __publicField(this, "context");
      this.context = void 0;
      const selfRef = this.constructSelfRef();
      const implArgs = {
        ...selfRef,
        cache: /* @__PURE__ */ new WeakMap()
      };
      for (const rule of Object.values(rules2)) {
        this[rule.name] = this.RULE(rule.name, rule.impl(implArgs));
      }
      this.performSelfAnalysis();
    }
    setContext(context) {
      this.context = context;
    }
    constructSelfRef() {
      const subRuleImpl = (chevrotainSubrule) => (cstDef, ...arg) => chevrotainSubrule(this[cstDef.name], { ARGS: [this.context, ...arg] });
      return {
        CONSUME: (tokenType, option) => this.CONSUME(tokenType, option),
        CONSUME1: (tokenType, option) => this.CONSUME1(tokenType, option),
        CONSUME2: (tokenType, option) => this.CONSUME2(tokenType, option),
        CONSUME3: (tokenType, option) => this.CONSUME3(tokenType, option),
        CONSUME4: (tokenType, option) => this.CONSUME4(tokenType, option),
        CONSUME5: (tokenType, option) => this.CONSUME5(tokenType, option),
        CONSUME6: (tokenType, option) => this.CONSUME6(tokenType, option),
        CONSUME7: (tokenType, option) => this.CONSUME7(tokenType, option),
        CONSUME8: (tokenType, option) => this.CONSUME8(tokenType, option),
        CONSUME9: (tokenType, option) => this.CONSUME9(tokenType, option),
        OPTION: (actionORMethodDef) => this.OPTION(actionORMethodDef),
        OPTION1: (actionORMethodDef) => this.OPTION1(actionORMethodDef),
        OPTION2: (actionORMethodDef) => this.OPTION2(actionORMethodDef),
        OPTION3: (actionORMethodDef) => this.OPTION3(actionORMethodDef),
        OPTION4: (actionORMethodDef) => this.OPTION4(actionORMethodDef),
        OPTION5: (actionORMethodDef) => this.OPTION5(actionORMethodDef),
        OPTION6: (actionORMethodDef) => this.OPTION6(actionORMethodDef),
        OPTION7: (actionORMethodDef) => this.OPTION7(actionORMethodDef),
        OPTION8: (actionORMethodDef) => this.OPTION8(actionORMethodDef),
        OPTION9: (actionORMethodDef) => this.OPTION9(actionORMethodDef),
        OR: (altsOrOpts) => this.OR(altsOrOpts),
        OR1: (altsOrOpts) => this.OR1(altsOrOpts),
        OR2: (altsOrOpts) => this.OR2(altsOrOpts),
        OR3: (altsOrOpts) => this.OR3(altsOrOpts),
        OR4: (altsOrOpts) => this.OR4(altsOrOpts),
        OR5: (altsOrOpts) => this.OR5(altsOrOpts),
        OR6: (altsOrOpts) => this.OR6(altsOrOpts),
        OR7: (altsOrOpts) => this.OR7(altsOrOpts),
        OR8: (altsOrOpts) => this.OR8(altsOrOpts),
        OR9: (altsOrOpts) => this.OR9(altsOrOpts),
        MANY: (actionORMethodDef) => this.MANY(actionORMethodDef),
        MANY1: (actionORMethodDef) => this.MANY1(actionORMethodDef),
        MANY2: (actionORMethodDef) => this.MANY2(actionORMethodDef),
        MANY3: (actionORMethodDef) => this.MANY3(actionORMethodDef),
        MANY4: (actionORMethodDef) => this.MANY4(actionORMethodDef),
        MANY5: (actionORMethodDef) => this.MANY5(actionORMethodDef),
        MANY6: (actionORMethodDef) => this.MANY6(actionORMethodDef),
        MANY7: (actionORMethodDef) => this.MANY7(actionORMethodDef),
        MANY8: (actionORMethodDef) => this.MANY8(actionORMethodDef),
        MANY9: (actionORMethodDef) => this.MANY9(actionORMethodDef),
        MANY_SEP: (options) => this.MANY_SEP(options),
        MANY_SEP1: (options) => this.MANY_SEP1(options),
        MANY_SEP2: (options) => this.MANY_SEP2(options),
        MANY_SEP3: (options) => this.MANY_SEP3(options),
        MANY_SEP4: (options) => this.MANY_SEP4(options),
        MANY_SEP5: (options) => this.MANY_SEP5(options),
        MANY_SEP6: (options) => this.MANY_SEP6(options),
        MANY_SEP7: (options) => this.MANY_SEP7(options),
        MANY_SEP8: (options) => this.MANY_SEP8(options),
        MANY_SEP9: (options) => this.MANY_SEP9(options),
        AT_LEAST_ONE: (actionORMethodDef) => this.AT_LEAST_ONE(actionORMethodDef),
        AT_LEAST_ONE1: (actionORMethodDef) => this.AT_LEAST_ONE1(actionORMethodDef),
        AT_LEAST_ONE2: (actionORMethodDef) => this.AT_LEAST_ONE2(actionORMethodDef),
        AT_LEAST_ONE3: (actionORMethodDef) => this.AT_LEAST_ONE3(actionORMethodDef),
        AT_LEAST_ONE4: (actionORMethodDef) => this.AT_LEAST_ONE4(actionORMethodDef),
        AT_LEAST_ONE5: (actionORMethodDef) => this.AT_LEAST_ONE5(actionORMethodDef),
        AT_LEAST_ONE6: (actionORMethodDef) => this.AT_LEAST_ONE6(actionORMethodDef),
        AT_LEAST_ONE7: (actionORMethodDef) => this.AT_LEAST_ONE7(actionORMethodDef),
        AT_LEAST_ONE8: (actionORMethodDef) => this.AT_LEAST_ONE8(actionORMethodDef),
        AT_LEAST_ONE9: (actionORMethodDef) => this.AT_LEAST_ONE9(actionORMethodDef),
        AT_LEAST_ONE_SEP: (options) => this.AT_LEAST_ONE_SEP(options),
        AT_LEAST_ONE_SEP1: (options) => this.AT_LEAST_ONE_SEP1(options),
        AT_LEAST_ONE_SEP2: (options) => this.AT_LEAST_ONE_SEP2(options),
        AT_LEAST_ONE_SEP3: (options) => this.AT_LEAST_ONE_SEP3(options),
        AT_LEAST_ONE_SEP4: (options) => this.AT_LEAST_ONE_SEP4(options),
        AT_LEAST_ONE_SEP5: (options) => this.AT_LEAST_ONE_SEP5(options),
        AT_LEAST_ONE_SEP6: (options) => this.AT_LEAST_ONE_SEP6(options),
        AT_LEAST_ONE_SEP7: (options) => this.AT_LEAST_ONE_SEP7(options),
        AT_LEAST_ONE_SEP8: (options) => this.AT_LEAST_ONE_SEP8(options),
        AT_LEAST_ONE_SEP9: (options) => this.AT_LEAST_ONE_SEP9(options),
        ACTION: (func) => this.ACTION(func),
        BACKTRACK: (cstDef, ...args) => this.BACKTRACK(this[cstDef.name], { ARGS: args }),
        SUBRULE: subRuleImpl((rule, args) => this.SUBRULE(rule, args)),
        SUBRULE1: subRuleImpl((rule, args) => this.SUBRULE1(rule, args)),
        SUBRULE2: subRuleImpl((rule, args) => this.SUBRULE2(rule, args)),
        SUBRULE3: subRuleImpl((rule, args) => this.SUBRULE3(rule, args)),
        SUBRULE4: subRuleImpl((rule, args) => this.SUBRULE4(rule, args)),
        SUBRULE5: subRuleImpl((rule, args) => this.SUBRULE5(rule, args)),
        SUBRULE6: subRuleImpl((rule, args) => this.SUBRULE6(rule, args)),
        SUBRULE7: subRuleImpl((rule, args) => this.SUBRULE7(rule, args)),
        SUBRULE8: subRuleImpl((rule, args) => this.SUBRULE8(rule, args)),
        SUBRULE9: subRuleImpl((rule, args) => this.SUBRULE9(rule, args))
      };
    }
  }
  function listToRuleDefMap(rules2) {
    const newRules = {};
    for (const rule of rules2) {
      newRules[rule.name] = rule;
    }
    return newRules;
  }
  class ParserBuilder {
    constructor(startRules) {
      __publicField(this, "rules");
      this.rules = startRules;
    }
    /**
     * Create a builder from some initial grammar rules or an existing builder.
     * If a builder is provided, a new copy will be created.
     */
    static create(start) {
      if (Array.isArray(start)) {
        return new ParserBuilder(listToRuleDefMap(start));
      }
      return new ParserBuilder({ ...start.rules });
    }
    widenContext() {
      return this;
    }
    typePatch() {
      return this;
    }
    /**
     * Change the implementation of an existing grammar rule.
     */
    patchRule(patch) {
      const self2 = this;
      self2.rules[patch.name] = patch;
      return self2;
    }
    /**
     * Add a rule to the grammar. If the rule already exists, but the implementation differs, an error will be thrown.
     */
    addRuleRedundant(rule) {
      const self2 = this;
      const rules2 = self2.rules;
      if (rules2[rule.name] !== void 0 && rules2[rule.name] !== rule) {
        throw new Error(`Rule ${rule.name} already exists in the builder`);
      }
      rules2[rule.name] = rule;
      return self2;
    }
    /**
     * Add a rule to the grammar. Will raise a typescript error if the rule already exists in the grammar.
     */
    addRule(rule) {
      return this.addRuleRedundant(rule);
    }
    addMany(...rules2) {
      this.rules = { ...this.rules, ...listToRuleDefMap(rules2) };
      return this;
    }
    /**
     * Delete a grammar rule by its name.
     */
    deleteRule(ruleName) {
      delete this.rules[ruleName];
      return this;
    }
    getRule(ruleName) {
      return this.rules[ruleName];
    }
    /**
     * Merge this grammar builder with another.
     * It is best to merge the bigger grammar with the smaller one.
     * If the two builders both have a grammar rule with the same name,
     * no error will be thrown case they map to the same ruledef object.
     * If they map to a different object, an error will be thrown.
     * To fix this problem, the overridingRules array should contain a rule with the same conflicting name,
     * this rule implementation will be used.
     */
    merge(builder, overridingRules) {
      const otherRules = { ...builder.rules };
      const myRules = this.rules;
      for (const rule of Object.values(myRules)) {
        if (otherRules[rule.name] === void 0) {
          otherRules[rule.name] = rule;
        } else {
          const existingRule = otherRules[rule.name];
          if (existingRule !== rule) {
            const override = overridingRules.find((x) => x.name === rule.name);
            if (override) {
              otherRules[rule.name] = override;
            } else {
              throw new Error(`Rule with name "${rule.name}" already exists in the builder, specify an override to resolve conflict`);
            }
          }
        }
      }
      this.rules = otherRules;
      return this;
    }
    defaultErrorHandler(input, errors) {
      const firstError = errors[0];
      const messageBuilder = ["Parse error"];
      const lineIdx = firstError.token.startLine;
      if (lineIdx !== void 0 && !Number.isNaN(lineIdx)) {
        const errorLine = input.split("\n")[lineIdx - 1];
        messageBuilder.push(` on line ${lineIdx}
${errorLine}`);
        const columnIdx = firstError.token.startColumn;
        if (columnIdx !== void 0) {
          messageBuilder.push(`
${"-".repeat(columnIdx - 1)}^`);
        }
      }
      messageBuilder.push(`
${firstError.message}`);
      throw new Error(messageBuilder.join(""));
    }
    build({ tokenVocabulary, parserConfig = {}, lexerConfig = {}, queryPreProcessor = (s) => s, errorHandler }) {
      const lexer = LexerBuilder.create().add(...tokenVocabulary).build({
        positionTracking: "onlyOffset",
        recoveryEnabled: false,
        ensureOptimizations: true,
        safeMode: false,
        skipValidations: true,
        ...lexerConfig
      });
      const parser = this.consume({
        tokenVocabulary,
        config: parserConfig
      });
      const selfSufficientParser = {};
      for (const rule of Object.values(this.rules)) {
        selfSufficientParser[rule.name] = (input, context, ...args) => {
          const processedInput = queryPreProcessor(input);
          const lexResult = lexer.tokenize(processedInput);
          parser.input = lexResult.tokens;
          parser.setContext(context);
          const result = parser[rule.name](context, ...args);
          if (parser.errors.length > 0) {
            if (errorHandler) {
              errorHandler(parser.errors);
            } else {
              this.defaultErrorHandler(processedInput, parser.errors);
            }
          }
          return result;
        };
      }
      return selfSufficientParser;
    }
    consume({ tokenVocabulary, config = {} }) {
      return new DynamicParser(this.rules, tokenVocabulary, config);
    }
  }
  class TransformerObject {
    /**
     * Creates stateless transformer.
     * @param defaultContext
     */
    constructor(defaultContext = {}) {
      __publicField(this, "defaultContext");
      __publicField(this, "maxStackSize", 1e6);
      this.defaultContext = defaultContext;
    }
    clone(newDefaultContext = {}) {
      return new TransformerObject({ ...this.defaultContext, ...newDefaultContext });
    }
    /**
     * Function to shallow clone any type.
     * @param obj
     * @protected
     */
    cloneObj(obj) {
      if (obj === null || typeof obj !== "object") {
        return obj;
      }
      const proto = Object.getPrototypeOf(obj);
      if (proto === Object.prototype || proto === null) {
        return { ...obj };
      }
      return Object.assign(Object.create(proto), obj);
    }
    /**
     * Recursively transforms all objects that are not arrays. Mapper is called on deeper objects first.
     * @param startObject object to start iterating from
     * @param mapper mapper to transform the various objects - argument is a copy of the original
     * @param preVisitor callback that is evaluated before iterating deeper.
     *   If continues is false, we do not iterate deeper, current object is still mapped. - default: true
     *   If shortcut is true, we do not iterate deeper, nor do we branch out, this mapper will be the last one called.
     *    - Default false
     */
    transformObject(startObject, mapper, preVisitor = () => ({})) {
      const defaults2 = this.defaultContext;
      const defaultCopyFlag = defaults2.copy ?? true;
      const defaultContinues = defaults2.continue ?? true;
      const defaultIgnoreKeys = defaults2.ignoreKeys;
      const defaultShallowKeys = defaults2.shallowKeys;
      const defaultDidShortCut = defaults2.shortcut ?? false;
      let didShortCut = false;
      const resultWrap = { res: startObject };
      const stack = [startObject];
      const stackParent = [resultWrap];
      const stackParentKey = ["res"];
      const handleMapperOnLen = [];
      const mapperCopyStack = [];
      const mapperOrigStack = [];
      const mapperParent = [];
      const mapperParentKey = [];
      function handleMapper() {
        while (stack.length === handleMapperOnLen.at(-1)) {
          handleMapperOnLen.pop();
          const copyToMap = mapperCopyStack.pop();
          const origToMap = mapperOrigStack.pop();
          const parent = mapperParent.pop();
          const parentKey = mapperParentKey.pop();
          parent[parentKey] = mapper(copyToMap, origToMap);
        }
      }
      while (stack.length > 0 && stack.length < this.maxStackSize) {
        const curObject = stack.pop();
        const curParent = stackParent.pop();
        const curKey = stackParentKey.pop();
        if (!didShortCut) {
          if (Array.isArray(curObject)) {
            const newArr = [...curObject];
            handleMapperOnLen.push(stack.length);
            mapperCopyStack.push(newArr);
            mapperOrigStack.push(curObject);
            mapperParent.push(curParent);
            mapperParentKey.push(curKey);
            for (let index = curObject.length - 1; index >= 0; index--) {
              const val = curObject[index];
              if (val !== null && typeof val === "object") {
                stack.push(val);
                stackParent.push(newArr);
                stackParentKey.push(index.toString());
              }
            }
            handleMapper();
            continue;
          }
          const context = preVisitor(curObject);
          const copyFlag = context.copy ?? defaultCopyFlag;
          const continues = context.continue ?? defaultContinues;
          const ignoreKeys = context.ignoreKeys ?? defaultIgnoreKeys;
          const shallowKeys = context.shallowKeys ?? defaultShallowKeys;
          didShortCut = context.shortcut ?? defaultDidShortCut;
          const copy2 = copyFlag ? this.cloneObj(curObject) : curObject;
          handleMapperOnLen.push(stack.length);
          mapperCopyStack.push(copy2);
          mapperOrigStack.push(curObject);
          mapperParent.push(curParent);
          mapperParentKey.push(curKey);
          if (continues && !didShortCut) {
            for (const key in copy2) {
              if (!Object.hasOwn(copy2, key)) {
                continue;
              }
              const val = copy2[key];
              const onlyShallow = shallowKeys && (shallowKeys == null ? void 0 : shallowKeys.has(key));
              if (onlyShallow) {
                copy2[key] = this.cloneObj(val);
              }
              if (ignoreKeys && ignoreKeys.has(key)) {
                continue;
              }
              if (!onlyShallow && val !== null && typeof val === "object") {
                stack.push(val);
                stackParentKey.push(key);
                stackParent.push(copy2);
              }
            }
          }
        }
        handleMapper();
      }
      if (stack.length >= this.maxStackSize) {
        throw new Error("Transform object stack overflowed");
      }
      handleMapper();
      return resultWrap.res;
    }
    /**
     * Visitor that visits all objects. Visits deeper objects first.
     */
    visitObject(startObject, visitor, preVisitor = () => ({})) {
      const defaults2 = this.defaultContext;
      const defaultContinues = defaults2.continue ?? true;
      const defaultIgnoreKeys = defaults2.ignoreKeys;
      const defaultShortcut = defaults2.shortcut ?? false;
      let didShortCut = false;
      const stack = [startObject];
      const handleVisitorOnLen = [];
      const visitorStack = [];
      function handleVisitor() {
        while (stack.length === handleVisitorOnLen.at(-1)) {
          handleVisitorOnLen.pop();
          const toVisit = visitorStack.pop();
          visitor(toVisit);
        }
      }
      while (stack.length > 0 && stack.length < this.maxStackSize) {
        const curObject = stack.pop();
        if (!didShortCut) {
          if (Array.isArray(curObject)) {
            for (let i = curObject.length - 1; i >= 0; i--) {
              const val = curObject[i];
              if (val !== null && typeof val === "object") {
                stack.push(val);
              }
            }
            handleVisitor();
            continue;
          }
          const context = preVisitor(curObject);
          didShortCut = context.shortcut ?? defaultShortcut;
          const continues = context.continue ?? defaultContinues;
          const ignoreKeys = context.ignoreKeys ?? defaultIgnoreKeys;
          handleVisitorOnLen.push(stack.length);
          visitorStack.push(curObject);
          if (continues && !didShortCut) {
            for (const key in curObject) {
              if (!Object.hasOwn(curObject, key)) {
                continue;
              }
              if (ignoreKeys && ignoreKeys.has(key)) {
                continue;
              }
              const val = curObject[key];
              if (val && typeof val === "object") {
                stack.push(val);
              }
            }
          }
        }
        handleVisitor();
      }
      if (stack.length >= this.maxStackSize) {
        throw new Error("Transform object stack overflowed");
      }
      handleVisitor();
    }
  }
  class TransformerTyped extends TransformerObject {
    constructor(defaultContext = {}, defaultNodePreVisitor = {}) {
      super(defaultContext);
      __publicField(this, "defaultNodePreVisitor");
      this.defaultNodePreVisitor = defaultNodePreVisitor;
    }
    clone(newDefaultContext = {}, newDefaultNodePreVisitor = {}) {
      return new TransformerTyped({ ...this.defaultContext, ...newDefaultContext }, { ...this.defaultNodePreVisitor, ...newDefaultNodePreVisitor });
    }
    /**
     * Transform a single node ({@link Typed}).
     * @param startObject the object from which we will start the transformation,
     *   potentially visiting and transforming its descendants along the way.
     * @param nodeCallBacks a dictionary mapping the various node types to objects optionally
     *    containing preVisitor and transformer.
     *    The preVisitor allows you to provide {@link TransformContext} for the current object,
     *    altering how it will be transformed.
     *    The transformer allows you to manipulate the copy of the current object,
     *    and expects you to return the value that should take the current objects place.
     * @return the result of transforming the requested descendant operations (based on the preVisitor)
     * using a transformer that works its way back up from the descendant to the startObject.
     */
    transformNode(startObject, nodeCallBacks) {
      const transformWrapper = (copy2, orig) => {
        var _a;
        let ogTransform;
        const casted = copy2;
        if (casted.type) {
          ogTransform = (_a = nodeCallBacks[casted.type]) == null ? void 0 : _a.transform;
        }
        return ogTransform ? ogTransform(casted, orig) : copy2;
      };
      const nodeDefaults = this.defaultNodePreVisitor;
      const preVisitWrapper = (curObject) => {
        var _a;
        let ogPreVisit;
        let nodeContext = {};
        const casted = curObject;
        if (casted.type) {
          ogPreVisit = (_a = nodeCallBacks[casted.type]) == null ? void 0 : _a.preVisitor;
          nodeContext = nodeDefaults[casted.type] ?? nodeContext;
        }
        return ogPreVisit ? { ...nodeContext, ...ogPreVisit(casted) } : nodeContext;
      };
      return this.transformObject(startObject, transformWrapper, preVisitWrapper);
    }
    /**
     * Visit a selected subTree given a startObject, steering the visits based on {@link Typed} nodes.
     * Will first call the preVisitor on the project and notice it should not iterate on its descendants.
     * It then visits the project, and the outermost distinct, printing '21'.
     * The pre-visitor visits starting from the root, going deeper, while the actual visitor goes in reverse.
     * @param startObject the object from which we will start visiting,
     *   potentially visiting its descendants along the way.
     * @param nodeCallBacks a dictionary mapping the various operation types to objects optionally
     *    containing preVisitor and visitor.
     *    The preVisitor allows you to provide {@link VisitContext} for the current object,
     *    altering how it will be visited.
     *    The visitor allows you to visit the object from deepest to the outermost object.
     *    This is useful if you for example want to manipulate the objects you visit during your visits,
     *    similar to {@link this.transformNode}.
     */
    visitNode(startObject, nodeCallBacks) {
      const visitorWrapper = (curObject) => {
        var _a;
        const casted = curObject;
        if (casted.type) {
          const ogTransform = (_a = nodeCallBacks[casted.type]) == null ? void 0 : _a.visitor;
          if (ogTransform) {
            ogTransform(casted);
          }
        }
      };
      const nodeDefaults = this.defaultNodePreVisitor;
      const preVisitWrapper = (curObject) => {
        var _a;
        let ogPreVisit;
        let nodeContext = {};
        const casted = curObject;
        if (casted.type) {
          ogPreVisit = (_a = nodeCallBacks[casted.type]) == null ? void 0 : _a.preVisitor;
          nodeContext = nodeDefaults[casted.type] ?? nodeContext;
        }
        return ogPreVisit ? { ...nodeContext, ...ogPreVisit(casted) } : nodeContext;
      };
      return this.visitObject(startObject, visitorWrapper, preVisitWrapper);
    }
  }
  class TransformerSubTyped extends TransformerTyped {
    constructor(defaultContext = {}, defaultNodePreVisitor = {}) {
      super(defaultContext, defaultNodePreVisitor);
    }
    clone(newDefaultContext = {}, newDefaultNodePreVisitor = {}) {
      return new TransformerSubTyped({ ...this.defaultContext, ...newDefaultContext }, { ...this.defaultNodePreVisitor, ...newDefaultNodePreVisitor });
    }
    /**
     * Transform a single node ({@link Typed}).
     * Similar to {@link this.transformNode} but also allowing you to target the subTypes.
     * @param startObject the object from which we will start the transformation,
     *   potentially visiting and transforming its descendants along the way.
     * @param nodeCallBacks a dictionary mapping the various operation types to objects optionally
     *    containing preVisitor and transformer.
     *    The preVisitor allows you to provide {@link TransformContext} for the current object,
     *    altering how it will be transformed.
     *    The transformer allows you to manipulate the copy of the current object,
     *    and expects you to return the value that should take the current objects place.
     * @param nodeSpecificCallBacks Same as nodeCallBacks but using an additional level of indirection to
     *     indicate the subType.
     * @return the result of transforming the requested descendant operations (based on the preVisitor)
     * using a transformer that works its way back up from the descendant to the startObject.
     */
    transformNodeSpecific(startObject, nodeCallBacks, nodeSpecificCallBacks) {
      const transformWrapper = (copy2, orig) => {
        var _a, _b;
        let ogTransform;
        const casted = copy2;
        if (casted.type && casted.subType) {
          const specific = nodeSpecificCallBacks[casted.type];
          if (specific) {
            ogTransform = (_a = specific[casted.subType]) == null ? void 0 : _a.transform;
          }
          if (!ogTransform) {
            ogTransform = (_b = nodeCallBacks[casted.type]) == null ? void 0 : _b.transform;
          }
        }
        return ogTransform ? ogTransform(casted, orig) : copy2;
      };
      const preVisitWrapper = (curObject) => {
        var _a, _b;
        let ogPreVisit;
        const casted = curObject;
        if (casted.type && casted.subType) {
          const specific = nodeSpecificCallBacks[casted.type];
          if (specific) {
            ogPreVisit = (_a = specific[casted.subType]) == null ? void 0 : _a.preVisitor;
          }
          if (!ogPreVisit) {
            ogPreVisit = (_b = nodeCallBacks[casted.type]) == null ? void 0 : _b.preVisitor;
          }
        }
        return ogPreVisit ? ogPreVisit(casted) : {};
      };
      return this.transformObject(startObject, transformWrapper, preVisitWrapper);
    }
    /**
     * Visit a selected subTree given a startObject, steering the visits based on {@link Typed} nodes.
     * Similar to {@link this.visitNode}, but also allowing you to target subTypes.
     * Will call the preVisitor on the outer distinct, then the visitor of the special distinct,
     * followed by the visiting the outer distinct, printing '231'.
     * The pre-visitor visits starting from the root, going deeper, while the actual visitor goes in reverse.
     * @param startObject the object from which we will start visiting,
     *   potentially visiting its descendants along the way.
     * @param nodeCallBacks a dictionary mapping the various operation types to objects optionally
     *    containing preVisitor and visitor.
     *    The preVisitor allows you to provide {@link VisitContext} for the current object,
     *    altering how it will be visited.
     *    The visitor allows you to visit the object from deepest to the outermost object.
     *    This is useful if you for example want to manipulate the objects you visit during your visits,
     *    similar to {@link mapOperation}.
     * @param nodeSpecificCallBacks Same as nodeCallBacks but using an additional level of indirection to
     *     indicate the subType.
     */
    visitNodeSpecific(startObject, nodeCallBacks, nodeSpecificCallBacks) {
      const visitWrapper = (curObject) => {
        var _a, _b;
        let ogTransform;
        const casted = curObject;
        if (casted.type && casted.subType) {
          const specific = nodeSpecificCallBacks[casted.type];
          if (specific) {
            ogTransform = (_a = specific[casted.subType]) == null ? void 0 : _a.visitor;
          }
          if (!ogTransform) {
            ogTransform = (_b = nodeCallBacks[casted.type]) == null ? void 0 : _b.visitor;
          }
        }
        if (ogTransform) {
          ogTransform(casted);
        }
      };
      const preVisitWrapper = (curObject) => {
        var _a, _b;
        let ogPreVisit;
        const casted = curObject;
        if (casted.type && casted.subType) {
          const specific = nodeSpecificCallBacks[casted.type];
          if (specific) {
            ogPreVisit = (_a = specific[casted.subType]) == null ? void 0 : _a.preVisitor;
          }
          if (!ogPreVisit) {
            ogPreVisit = (_b = nodeCallBacks[casted.type]) == null ? void 0 : _b.preVisitor;
          }
        }
        return ogPreVisit ? ogPreVisit(casted) : {};
      };
      this.visitObject(startObject, visitWrapper, preVisitWrapper);
    }
  }
  var BuiltInCalls;
  (function(BuiltInCalls2) {
    BuiltInCalls2["Str"] = "builtInStr";
    BuiltInCalls2["Lang"] = "builtInLang";
    BuiltInCalls2["Langmatches"] = "builtInLangmatches";
    BuiltInCalls2["Datatype"] = "builtInDatatype";
    BuiltInCalls2["Bound"] = "builtInBound";
    BuiltInCalls2["Iri"] = "builtInIri";
    BuiltInCalls2["Uri"] = "builtInUri";
    BuiltInCalls2["Bnode"] = "builtInBnode";
    BuiltInCalls2["Rand"] = "builtInRand";
    BuiltInCalls2["Abs"] = "builtInAbs";
    BuiltInCalls2["Ceil"] = "builtInCeil";
    BuiltInCalls2["Floor"] = "builtInFloor";
    BuiltInCalls2["Round"] = "builtInRound";
    BuiltInCalls2["Concat"] = "builtInConcat";
    BuiltInCalls2["Strlen"] = "builtInStrlen";
    BuiltInCalls2["Ucase"] = "builtInUcase";
    BuiltInCalls2["Lcase"] = "builtInLcase";
    BuiltInCalls2["Encode_for_uri"] = "builtInEncode_for_uri";
    BuiltInCalls2["Contains"] = "builtInContains";
    BuiltInCalls2["Strstarts"] = "builtInStrstarts";
    BuiltInCalls2["Strends"] = "builtInStrends";
    BuiltInCalls2["Strbefore"] = "builtInStrbefore";
    BuiltInCalls2["Strafter"] = "builtInStrafter";
    BuiltInCalls2["Year"] = "builtInYear";
    BuiltInCalls2["Month"] = "builtInMonth";
    BuiltInCalls2["Day"] = "builtInDay";
    BuiltInCalls2["Hours"] = "builtInHours";
    BuiltInCalls2["Minutes"] = "builtInMinutes";
    BuiltInCalls2["Seconds"] = "builtInSeconds";
    BuiltInCalls2["Timezone"] = "builtInTimezone";
    BuiltInCalls2["Tz"] = "builtInTz";
    BuiltInCalls2["Now"] = "builtInNow";
    BuiltInCalls2["Uuid"] = "builtInUuid";
    BuiltInCalls2["Struuid"] = "builtInStruuid";
    BuiltInCalls2["Md5"] = "builtInMd5";
    BuiltInCalls2["Sha1"] = "builtInSha1";
    BuiltInCalls2["Sha256"] = "builtInSha256";
    BuiltInCalls2["Sha384"] = "builtInSha384";
    BuiltInCalls2["Sha512"] = "builtInSha512";
    BuiltInCalls2["Coalesce"] = "builtInCoalesce";
    BuiltInCalls2["If"] = "builtInIf";
    BuiltInCalls2["Strlang"] = "builtInStrlang";
    BuiltInCalls2["Strdt"] = "builtInStrdt";
    BuiltInCalls2["Sameterm"] = "builtInSameterm";
    BuiltInCalls2["Isiri"] = "builtInIsiri";
    BuiltInCalls2["Isuri"] = "builtInIsuri";
    BuiltInCalls2["Isblank"] = "builtInIsblank";
    BuiltInCalls2["Isliteral"] = "builtInIsliteral";
    BuiltInCalls2["Isnumeric"] = "builtInIsnumeric";
    BuiltInCalls2["Regex"] = "builtInRegex";
    BuiltInCalls2["Substr"] = "builtInSubstr";
    BuiltInCalls2["Replace"] = "builtInReplace";
    BuiltInCalls2["Exists"] = "builtInExists";
    BuiltInCalls2["Notexists"] = "builtInNotexists";
    BuiltInCalls2["Count"] = "builtInCount";
    BuiltInCalls2["Sum"] = "builtInSum";
    BuiltInCalls2["Min"] = "builtInMin";
    BuiltInCalls2["Max"] = "builtInMax";
    BuiltInCalls2["Avg"] = "builtInAvg";
    BuiltInCalls2["Sample"] = "builtInSample";
    BuiltInCalls2["Group_concat"] = "builtInGroup_concat";
  })(BuiltInCalls || (BuiltInCalls = {}));
  function capitalize(string2) {
    return string2.charAt(0).toUpperCase() + string2.slice(1);
  }
  const str = createToken({ name: capitalize(BuiltInCalls.Str), pattern: /str/i, label: "STR" });
  const lang = createToken({ name: capitalize(BuiltInCalls.Lang), pattern: /lang/i, label: "LANG" });
  const langmatches = createToken({
    name: capitalize(BuiltInCalls.Langmatches),
    pattern: /langmatches/i,
    label: "LANGMATCHES"
  });
  const datatype = createToken({
    name: capitalize(BuiltInCalls.Datatype),
    pattern: /datatype/i,
    label: "DATATYPE"
  });
  const bound = createToken({ name: capitalize(BuiltInCalls.Bound), pattern: /bound/i, label: "BOUND" });
  const iri$1 = createToken({ name: capitalize(BuiltInCalls.Iri), pattern: /iri/i, label: "IRI" });
  const uri = createToken({ name: capitalize(BuiltInCalls.Uri), pattern: /uri/i, label: "URI" });
  const bnode = createToken({ name: capitalize(BuiltInCalls.Bnode), pattern: /bnode/i, label: "BNODE" });
  const rand = createToken({ name: capitalize(BuiltInCalls.Rand), pattern: /rand/i, label: "RAND" });
  const abs = createToken({ name: capitalize(BuiltInCalls.Abs), pattern: /abs/i, label: "ABS" });
  const ceil = createToken({ name: capitalize(BuiltInCalls.Ceil), pattern: /ceil/i, label: "CEIL" });
  const floor = createToken({ name: capitalize(BuiltInCalls.Floor), pattern: /floor/i, label: "FLOOR" });
  const round = createToken({ name: capitalize(BuiltInCalls.Round), pattern: /round/i, label: "ROUND" });
  const concat = createToken({ name: capitalize(BuiltInCalls.Concat), pattern: /concat/i, label: "CONCAT" });
  const strlen = createToken({ name: capitalize(BuiltInCalls.Strlen), pattern: /strlen/i, label: "STRLEN" });
  const ucase = createToken({ name: capitalize(BuiltInCalls.Ucase), pattern: /ucase/i, label: "UCASE" });
  const lcase = createToken({ name: capitalize(BuiltInCalls.Lcase), pattern: /lcase/i, label: "LCASE" });
  const encode_for_uri = createToken({
    name: capitalize(BuiltInCalls.Encode_for_uri),
    pattern: /encode_for_uri/i,
    label: "ENCODE_FOR_URI"
  });
  const contains = createToken({
    name: capitalize(BuiltInCalls.Contains),
    pattern: /contains/i,
    label: "CONTAINS"
  });
  const strstarts = createToken({
    name: capitalize(BuiltInCalls.Strstarts),
    pattern: /strstarts/i,
    label: "STRSTARTS"
  });
  const strends = createToken({ name: capitalize(BuiltInCalls.Strends), pattern: /strends/i, label: "STRENDS" });
  const strbefore = createToken({
    name: capitalize(BuiltInCalls.Strbefore),
    pattern: /strbefore/i,
    label: "STRBEFORE"
  });
  const strafter = createToken({
    name: capitalize(BuiltInCalls.Strafter),
    pattern: /strafter/i,
    label: "STRAFTER"
  });
  const year = createToken({ name: capitalize(BuiltInCalls.Year), pattern: /year/i, label: "YEAR" });
  const month = createToken({ name: capitalize(BuiltInCalls.Month), pattern: /month/i, label: "MONTH" });
  const day = createToken({ name: capitalize(BuiltInCalls.Day), pattern: /day/i, label: "DAY" });
  const hours = createToken({ name: capitalize(BuiltInCalls.Hours), pattern: /hours/i, label: "HOURS" });
  const minutes = createToken({ name: capitalize(BuiltInCalls.Minutes), pattern: /minutes/i, label: "MINUTES" });
  const seconds = createToken({ name: capitalize(BuiltInCalls.Seconds), pattern: /seconds/i, label: "SECONDS" });
  const timezone = createToken({
    name: capitalize(BuiltInCalls.Timezone),
    pattern: /timezone/i,
    label: "TIMEZONE"
  });
  const tz = createToken({ name: capitalize(BuiltInCalls.Tz), pattern: /tz/i, label: "TZ" });
  const now = createToken({ name: capitalize(BuiltInCalls.Now), pattern: /now/i, label: "NOW" });
  const uuid = createToken({ name: capitalize(BuiltInCalls.Uuid), pattern: /uuid/i, label: "UUID" });
  const struuid = createToken({ name: capitalize(BuiltInCalls.Struuid), pattern: /struuid/i, label: "STRUUID" });
  const md5 = createToken({ name: capitalize(BuiltInCalls.Md5), pattern: /md5/i, label: "MD5" });
  const sha1 = createToken({ name: capitalize(BuiltInCalls.Sha1), pattern: /sha1/i, label: "SHA1" });
  const sha256 = createToken({ name: capitalize(BuiltInCalls.Sha256), pattern: /sha256/i, label: "SHA256" });
  const sha384 = createToken({ name: capitalize(BuiltInCalls.Sha384), pattern: /sha384/i, label: "SHA384" });
  const sha512 = createToken({ name: capitalize(BuiltInCalls.Sha512), pattern: /sha512/i, label: "SHA512" });
  const coalesce = createToken({
    name: capitalize(BuiltInCalls.Coalesce),
    pattern: /coalesce/i,
    label: "COALESCE"
  });
  const if_ = createToken({ name: capitalize(BuiltInCalls.If), pattern: /if/i, label: "IF" });
  const strlang = createToken({ name: capitalize(BuiltInCalls.Strlang), pattern: /strlang/i, label: "STRLANG" });
  const strdt = createToken({ name: capitalize(BuiltInCalls.Strdt), pattern: /strdt/i, label: "STRDT" });
  const sameterm = createToken({
    name: capitalize(BuiltInCalls.Sameterm),
    pattern: /sameterm/i,
    label: "SAMETERM"
  });
  const isiri = createToken({ name: capitalize(BuiltInCalls.Isiri), pattern: /isiri/i, label: "ISIRI" });
  const isuri = createToken({ name: capitalize(BuiltInCalls.Isuri), pattern: /isuri/i, label: "ISURI" });
  const isblank = createToken({ name: capitalize(BuiltInCalls.Isblank), pattern: /isblank/i, label: "ISBLANK" });
  const isliteral = createToken({
    name: capitalize(BuiltInCalls.Isliteral),
    pattern: /isliteral/i,
    label: "ISLITERAL"
  });
  const isnumeric = createToken({
    name: capitalize(BuiltInCalls.Isnumeric),
    pattern: /isnumeric/i,
    label: "ISNUMERIC"
  });
  const regex = createToken({ name: capitalize(BuiltInCalls.Regex), pattern: /regex/i, label: "REGEX" });
  const substr = createToken({ name: capitalize(BuiltInCalls.Substr), pattern: /substr/i, label: "SUBSTR" });
  const replace = createToken({ name: capitalize(BuiltInCalls.Replace), pattern: /replace/i, label: "REPLACE" });
  const exists = createToken({ name: capitalize(BuiltInCalls.Exists), pattern: /exists/i, label: "EXISTS" });
  const notexists = createToken({
    name: capitalize(BuiltInCalls.Notexists),
    pattern: /not exists/i,
    label: "NOT EXISTS"
  });
  const count = createToken({ name: capitalize(BuiltInCalls.Count), pattern: /count/i, label: "COUNT" });
  const sum = createToken({ name: capitalize(BuiltInCalls.Sum), pattern: /sum/i, label: "SUM" });
  const min = createToken({ name: capitalize(BuiltInCalls.Min), pattern: /min/i, label: "MIN" });
  const max = createToken({ name: capitalize(BuiltInCalls.Max), pattern: /max/i, label: "MAX" });
  const avg = createToken({ name: capitalize(BuiltInCalls.Avg), pattern: /avg/i, label: "AVG" });
  const sample = createToken({ name: capitalize(BuiltInCalls.Sample), pattern: /sample/i, label: "SAMPLE" });
  const groupConcat = createToken({
    name: capitalize(BuiltInCalls.Group_concat),
    pattern: /group_concat/i,
    label: "GROUP_CONCAT"
  });
  const allBuiltInCalls = LexerBuilder.create().add(langmatches, datatype, lang, bound, iri$1, uri, bnode, rand, abs, ceil, floor, round, concat, strlen, ucase, lcase, encode_for_uri, contains, strstarts, strends, strbefore, strafter, year, month, day, hours, minutes, seconds, timezone, tz, now, uuid, struuid, md5, sha1, sha256, sha384, sha512, coalesce, if_, strlang, strdt, sameterm, isiri, isuri, isblank, isliteral, isnumeric, regex, substr, replace, exists, notexists, count, sum, min, max, avg, sample, groupConcat, str);
  const named = createToken({ name: "NamedGraph", pattern: /named/i, label: "NAMED" });
  const default_ = createToken({ name: "DefaultGraph", pattern: /default/i, label: "DEFAULT" });
  const graph = createToken({ name: "Graph", pattern: /graph/i, label: "GRAPH" });
  const graphAll = createToken({ name: "GraphAll", pattern: /all/i, label: "ALL" });
  const allGraphTokens = LexerBuilder.create().add(named, default_, graph, graphAll);
  const pnCharsBasePattern = /[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF]/;
  const pnCharsUPattern = new RegExp(`${pnCharsBasePattern.source}|_`);
  const varNamePattern = new RegExp(`((${pnCharsUPattern.source})|[0-9])((${pnCharsUPattern.source})|[0-9]|[·̀-ͯ‿-⁀])*`);
  const iriRefPattern = /<([^\u0000-\u0020"<>\\^`{|}])*>/;
  const pnCharsPattern = new RegExp(`(${pnCharsUPattern.source})|[\\-0-9·̀-ͯ‿-⁀]`);
  const pnPrefixPattern = new RegExp(`(${pnCharsBasePattern.source})(((${pnCharsPattern.source})|\\.)*(${pnCharsPattern.source}))?`);
  const pNameNsPattern = new RegExp(`(${pnPrefixPattern.source})?:`);
  const percentPattern = /%[\dA-Fa-f]{2}/;
  const pnLocalEscPattern = /\\[!#$%&'()*+,./;=?@\\_~-]/;
  const plxPattern = new RegExp(`(${percentPattern.source})|(${pnLocalEscPattern.source})`);
  const pnLocalPattern = new RegExp(`((${pnCharsUPattern.source})|:|[0-9]|(${plxPattern.source}))(((${pnCharsPattern.source})|\\.|:|(${plxPattern.source}))*((${pnCharsPattern.source})|:|(${plxPattern.source})))?`);
  const pNameLnPattern = new RegExp(`(${pNameNsPattern.source})(${pnLocalPattern.source})`);
  const blankNodeLabelPattern = new RegExp(`_:((${pnCharsUPattern.source})|[0-9])(((${pnCharsPattern.source})|\\.)*(${pnCharsPattern.source}))?`);
  const var1Pattern = new RegExp(`\\?(${varNamePattern.source})`);
  const var2Pattern = new RegExp(`\\$(${varNamePattern.source})`);
  const langTagPattern = /@[A-Za-z]+(-[\dA-Za-z]+)*/;
  const integerPattern = /\d+/;
  const decimalPattern = /\d+\.\d+/;
  const exponentPattern = /[Ee][+-]?\d+/;
  const doublePattern = new RegExp(`([0-9]+\\.[0-9]*(${exponentPattern.source}))|(\\.[0-9]+(${exponentPattern.source}))|([0-9]+(${exponentPattern.source}))`);
  const integerPositivePattern = new RegExp(`\\+${integerPattern.source}`);
  const decimalPositivePattern = new RegExp(`\\+${decimalPattern.source}`);
  const doublePositivePattern = new RegExp(`\\+${doublePattern.source}`);
  const integerNegativePattern = new RegExp(`-${integerPattern.source}`);
  const decimalNegativePattern = new RegExp(`-${decimalPattern.source}`);
  const doubleNegativePattern = new RegExp(`-${doublePattern.source}`);
  const echarPattern = /\\[\\"'bfnrt]/u;
  const stringLiteral1Pattern = new RegExp(`'(([^\\u0027\\u005C\\u000A\r])|(${echarPattern.source}))*'`);
  const stringLiteral2Pattern = new RegExp(`"(([^\\u0022\\u005C\\u000A\\u000D])|(${echarPattern.source}))*"`);
  const stringLiteralLong1Pattern = new RegExp(`'''(('|(''))?([^'\\\\]|(${echarPattern.source})))*'''`);
  const stringLiteralLong2Pattern = new RegExp(`"""(("|(""))?([^"\\\\]|(${echarPattern.source})))*"""`);
  const wsPattern = /[\u0009\u000A\u000D ]/;
  const nilPattern = new RegExp(`\\((${wsPattern.source})*\\)`);
  const anonPattern = new RegExp(`\\[(${wsPattern.source})*\\]`);
  const commentPattern = /#[^\n]*\n/;
  const atLeastOneBlankPattern = new RegExp(`((${wsPattern.source}+)|(${commentPattern.source}))+`);
  const LCurly = createToken({ name: "LCurly", pattern: "{", label: "{" });
  const RCurly = createToken({ name: "RCurly", pattern: "}", label: "}" });
  const dot = createToken({ name: "Dot", pattern: ".", label: "." });
  const comma = createToken({ name: "Comma", pattern: ",", label: "," });
  const semi = createToken({ name: "Semi", pattern: ";", label: ";" });
  const LParen = createToken({ name: "LParen", pattern: "(", label: "(" });
  const RParen = createToken({ name: "RParen", pattern: ")", label: ")" });
  const LSquare = createToken({ name: "LSquare", pattern: "[", label: "[" });
  const RSquare = createToken({ name: "RSquare", pattern: "]", label: "]" });
  const pipe = createToken({ name: "Pipe", pattern: "|", label: "|" });
  const slash = createToken({ name: "Slash", pattern: "/", label: "/" });
  const hat = createToken({ name: "Hat", pattern: "^", label: "^" });
  const question = createToken({ name: "Question", pattern: "?", label: "?" });
  const star = createToken({ name: "Star", pattern: "*", label: "*" });
  const opPlus = createToken({ name: "OpPlus", pattern: "+", label: "+" });
  const opMinus = createToken({ name: "OpMinus", pattern: "-", label: "-" });
  const exclamation = createToken({ name: "Exclamation", pattern: "!", label: "!" });
  const logicAnd = createToken({ name: "LogicAnd", pattern: "&&", label: "&&" });
  const logicOr = createToken({ name: "LogicOr", pattern: "||", label: "||" });
  const equal = createToken({ name: "Equal", pattern: "=", label: "=" });
  const notEqual = createToken({ name: "NotEqual", pattern: "!=", label: "!=" });
  const lessThan = createToken({ name: "LessThan", pattern: "<", label: "<" });
  const greaterThan = createToken({ name: "GreaterThan", pattern: ">", label: ">" });
  const lessThanEqual = createToken({ name: "LessThanEqual", pattern: "<=", label: "<=" });
  const greaterThanEqual = createToken({ name: "GreaterThanEqual", pattern: ">=", label: ">=" });
  const hathat = createToken({ name: "Hathat", pattern: "^^", label: "^^" });
  const allSymbols = LexerBuilder.create().add(logicAnd, logicOr, notEqual, lessThanEqual, greaterThanEqual, LCurly, RCurly, dot, comma, semi, LParen, RParen, LSquare, RSquare, pipe, slash, hathat, hat, question, star, opPlus, opMinus, exclamation, equal, lessThan, greaterThan);
  const iriRef = createToken({ name: "IriRef", pattern: iriRefPattern });
  const pNameLn = createToken({ name: "PNameLn", pattern: pNameLnPattern });
  const pNameNs = createToken({ name: "PNameNs", pattern: pNameNsPattern, longer_alt: [pNameLn] });
  const blankNodeLabel = createToken({ name: "BlankNodeLabel", pattern: blankNodeLabelPattern });
  const var1 = createToken({ name: "Var1", pattern: var1Pattern });
  const var2 = createToken({ name: "Var2", pattern: var2Pattern });
  const langTag = createToken({ name: "LangTag", pattern: langTagPattern });
  const integer = createToken({ name: "Integer", pattern: integerPattern });
  const decimal = createToken({ name: "Decimal", pattern: decimalPattern });
  const double = createToken({ name: "Double", pattern: doublePattern });
  const integerPositive = createToken({ name: "IntegerPositive", pattern: integerPositivePattern });
  const decimalPositive = createToken({ name: "DecimalPositive", pattern: decimalPositivePattern });
  const doublePositive = createToken({ name: "DoublePositive", pattern: doublePositivePattern });
  const integerNegative = createToken({ name: "IntegerNegative", pattern: integerNegativePattern });
  const decimalNegative = createToken({ name: "DecimalNegative", pattern: decimalNegativePattern });
  const doubleNegative = createToken({ name: "DoubleNegative", pattern: doubleNegativePattern });
  const stringLiteral1 = createToken({ name: "StringLiteral1", pattern: stringLiteral1Pattern });
  const stringLiteral2 = createToken({ name: "StringLiteral2", pattern: stringLiteral2Pattern });
  const stringLiteralLong1 = createToken({ name: "StringLiteralLong1", pattern: stringLiteralLong1Pattern });
  const stringLiteralLong2 = createToken({ name: "StringLiteralLong2", pattern: stringLiteralLong2Pattern });
  const ws = createToken({ name: "Ws", pattern: wsPattern, group: Lexer.SKIPPED });
  const comment = createToken({ name: "Comment", pattern: commentPattern, group: Lexer.SKIPPED });
  const nil = createToken({ name: "Nil", pattern: nilPattern });
  const anon = createToken({ name: "Anon", pattern: anonPattern });
  const allTerminals = LexerBuilder.create().add(iriRef, pNameNs, pNameLn, blankNodeLabel, var1, var2, langTag, double, decimal, integer, doublePositive, decimalPositive, integerPositive, doubleNegative, decimalNegative, integerNegative, stringLiteralLong1, stringLiteralLong2, stringLiteral1, stringLiteral2, ws, comment, nil, anon);
  const baseDecl$1 = createToken({ name: "BaseDecl", pattern: /base/i, label: "BASE" });
  const prefixDecl$1 = createToken({ name: "PrefixDecl", pattern: /prefix/i, label: "PREFIX" });
  const select = createToken({ name: "Select", pattern: /select/i, label: "SELECT" });
  const distinct = createToken({ name: "Distinct", pattern: /distinct/i, label: "DISTINCT" });
  const reduced = createToken({ name: "Reduced", pattern: /reduced/i, label: "REDUCED" });
  const as = createToken({ name: "As", pattern: /as/i, label: "AS" });
  const construct = createToken({ name: "Construct", pattern: /construct/i, label: "CONSTRUCT" });
  const describe = createToken({ name: "Describe", pattern: /describe/i, label: "DESCRIBE" });
  const ask = createToken({ name: "Ask", pattern: /ask/i, label: "ASK" });
  const from = createToken({ name: "From", pattern: /from/i, label: "FROM" });
  const where = createToken({ name: "Where", pattern: /where/i, label: "WHERE" });
  const groupByGroup = createToken({ name: "GroupByGroup", pattern: /group/i, label: "_GROUP_ BY" });
  const by = createToken({ name: "By", pattern: /by/i, label: "BY" });
  const having = createToken({ name: "Having", pattern: /having/i, label: "HAVING" });
  const order = createToken({ name: "Order", pattern: /order/i, label: "_ORDER_ BY" });
  const orderAsc = createToken({ name: "OrderAsc", pattern: /asc/i, label: "ASC" });
  const orderDesc = createToken({ name: "OrderDesc", pattern: /desc/i, label: "DESC" });
  const limit = createToken({ name: "Limit", pattern: /limit/i, label: "LIMIT" });
  const offset = createToken({ name: "Offset", pattern: /offset/i, label: "OFFSET" });
  const values = createToken({ name: "Values", pattern: /values/i, label: "VALUES" });
  const load$1 = createToken({ name: "Load", pattern: /load/i, label: "LOAD" });
  const silent = createToken({ name: "Silent", pattern: /silent/i, label: "SILENT" });
  const loadInto = createToken({ name: "LoadInto", pattern: /into/i, label: "INTO" });
  const clear$1 = createToken({ name: "Clear", pattern: /clear/i, label: "CLEAR" });
  const drop$1 = createToken({ name: "Drop", pattern: /drop/i, label: "DROP" });
  const create$1 = createToken({ name: "Create", pattern: /create/i, label: "CREATE" });
  const add$1 = createToken({ name: "Add", pattern: /add/i, label: "ADD" });
  const to = createToken({ name: "To", pattern: /to/i, label: "TO" });
  const move$1 = createToken({ name: "Move", pattern: /move/i, label: "MOVE" });
  const copy$1 = createToken({ name: "Copy", pattern: /copy/i, label: "COPY" });
  const modifyWith = createToken({ name: "ModifyWith", pattern: /with/i, label: "WITH" });
  const deleteDataClause = createToken({
    name: "DeleteDataClause",
    pattern: new RegExp(`delete(${atLeastOneBlankPattern.source})data`, "i"),
    label: "DELETE DATA"
  });
  const deleteWhereClause = createToken({
    name: "DeleteWhereClause",
    pattern: new RegExp(`delete(${atLeastOneBlankPattern.source})where`, "i"),
    label: "DELETE WHERE"
  });
  const deleteClause$1 = createToken({ name: "DeleteClause", pattern: /delete/i, label: "DELETE" });
  const insertDataClause = createToken({
    name: "InsertDataClause",
    pattern: new RegExp(`insert(${atLeastOneBlankPattern.source})data`, "i"),
    label: "INSERT DATA"
  });
  const insertClause$1 = createToken({ name: "InsertClause", pattern: /insert/i, label: "insert" });
  const usingClause$1 = createToken({ name: "UsingClause", pattern: /using/i, label: "USING" });
  const optional = createToken({ name: "Optional", pattern: /optional/i, label: "OPTIONAL" });
  const service = createToken({ name: "Service", pattern: /service/i, label: "SERVICE" });
  const bind$1 = createToken({ name: "Bind", pattern: /bind/i, label: "BIND" });
  const undef = createToken({ name: "Undef", pattern: /undef/i, label: "UNDEF" });
  const minus = createToken({ name: "Minus", pattern: /minus/i, label: "MINUS" });
  const union = createToken({ name: "Union", pattern: /union/i, label: "UNION" });
  const filter$1 = createToken({ name: "Filter", pattern: /filter/i, label: "FILTER" });
  const a = createToken({ name: "a", pattern: "a", label: "type declaration 'a'" });
  const true_ = createToken({ name: "True", pattern: /true/i, label: "true" });
  const false_ = createToken({ name: "False", pattern: /false/i, label: "false" });
  const in_ = createToken({ name: "In", pattern: /in/i, label: "IN" });
  const notIn = createToken({ name: "NotIn", pattern: /not[\u0020\u0009\u000D\u000A]+in/i, label: "NOT IN" });
  const separator = createToken({ name: "Separator", pattern: /separator/i, label: "SEPARATOR" });
  const allBaseTokens = LexerBuilder.create().add(baseDecl$1, prefixDecl$1, select, distinct, reduced, construct, describe, ask, from, where, having, groupByGroup, by, order, orderAsc, orderDesc, limit, offset, values, load$1, silent, loadInto, clear$1, drop$1, create$1, add$1, to, move$1, copy$1, modifyWith, deleteWhereClause, deleteDataClause, deleteClause$1, insertDataClause, insertClause$1, usingClause$1, optional, service, bind$1, undef, minus, union, filter$1, as, a, true_, false_, in_, notIn, separator);
  const sparql11LexerBuilder = LexerBuilder.create(allTerminals).merge(allBaseTokens).merge(allBuiltInCalls).merge(allGraphTokens).merge(allSymbols).moveAfter(avg, a).moveBefore(a, graphAll).moveAfter(groupConcat, groupByGroup);
  const nodeType$8 = "contextDef";
  function ContextFactoryMixin(Base) {
    return class ContextFactory extends Base {
      contextDefinitionPrefix(loc, key, value) {
        return {
          type: nodeType$8,
          subType: "prefix",
          key,
          value,
          loc
        };
      }
      isContextDefinitionPrefix(contextDef) {
        return this.isOfSubType(contextDef, nodeType$8, "prefix");
      }
      contextDefinitionBase(loc, value) {
        return {
          type: "contextDef",
          subType: "base",
          value,
          loc
        };
      }
      isContextDefinitionBase(contextDef) {
        return this.isOfSubType(contextDef, nodeType$8, "base");
      }
    };
  }
  const nodeType$7 = "expression";
  function ExpressionFactoryMixin(Base) {
    return class ExpressionFactory extends Base {
      isExpressionPure(obj) {
        return this.isOfType(obj, nodeType$7);
      }
      formatOperator(operator) {
        return operator.toLowerCase().replaceAll(" ", "");
      }
      expressionOperation(operator, args, loc) {
        return {
          type: nodeType$7,
          subType: "operation",
          operator: this.formatOperator(operator),
          args,
          loc
        };
      }
      isExpressionOperator(obj) {
        return this.isOfSubType(obj, nodeType$7, "operation");
      }
      expressionFunctionCall(functionOp, args, distinct2, loc) {
        return {
          type: "expression",
          subType: "functionCall",
          function: functionOp,
          args,
          distinct: distinct2,
          loc
        };
      }
      isExpressionFunctionCall(obj) {
        return this.isOfSubType(obj, nodeType$7, "functionCall");
      }
      expressionPatternOperation(operator, args, loc) {
        return {
          type: nodeType$7,
          subType: "patternOperation",
          operator: this.formatOperator(operator),
          args,
          loc
        };
      }
      isExpressionPatternOperation(obj) {
        return this.isOfSubType(obj, nodeType$7, "patternOperation");
      }
      aggregate(aggregation, distinct2, arg, separator2, loc) {
        const base = {
          type: "expression",
          subType: "aggregate",
          aggregation: this.formatOperator(aggregation),
          distinct: distinct2,
          loc
        };
        if (this.isOfType(arg, "wildcard")) {
          return { ...base, expression: [arg] };
        }
        if (separator2 === void 0) {
          return { ...base, expression: [arg] };
        }
        return { ...base, expression: [arg], separator: separator2 };
      }
      isExpressionAggregate(obj) {
        return this.isOfSubType(obj, nodeType$7, "aggregate");
      }
      isExpressionAggregateSeparator(obj) {
        return this.isOfSubType(obj, nodeType$7, "aggregate") && typeof obj.separator === "string";
      }
      isExpressionAggregateOnWildcard(obj) {
        const casted = obj;
        return this.isOfSubType(obj, nodeType$7, "aggregate") && Array.isArray(casted.expression) && casted.expression.length === 1 && this.isOfType(casted.expression[0], "wildcard");
      }
      isExpressionAggregateDefault(obj) {
        const casted = obj;
        return this.isOfSubType(obj, nodeType$7, "operation") && Array.isArray(casted.expression) && casted.expression.length === 1 && !this.isOfType(casted.expression[0], "wildcard");
      }
    };
  }
  const nodeType$6 = "graphRef";
  function GraphRefFactoryMixin(Base) {
    return class GraphRefFactory extends Base {
      isGraphRef(obj) {
        return this.isOfType(obj, nodeType$6);
      }
      graphRefDefault(loc) {
        return {
          type: nodeType$6,
          subType: "default",
          loc
        };
      }
      isGraphRefDefault(graphRef2) {
        return this.isOfSubType(graphRef2, nodeType$6, "default");
      }
      graphRefNamed(loc) {
        return {
          type: nodeType$6,
          subType: "named",
          loc
        };
      }
      isGraphRefNamed(graphRef2) {
        return this.isOfSubType(graphRef2, nodeType$6, "named");
      }
      graphRefAll(loc) {
        return {
          type: nodeType$6,
          subType: "all",
          loc
        };
      }
      isGraphRefAll(graphRef2) {
        return this.isOfSubType(graphRef2, nodeType$6, "all");
      }
      graphRefSpecific(graph2, loc) {
        return {
          type: nodeType$6,
          subType: "specific",
          graph: graph2,
          loc
        };
      }
      isGraphRefSpecific(graphRef2) {
        return this.isOfSubType(graphRef2, nodeType$6, "specific");
      }
    };
  }
  function asArg(arg) {
    return new FlatCall(arg);
  }
  class FlatCall {
    constructor(input) {
      __publicField(this, "input");
      this.input = input;
    }
    call(func) {
      this.input = func(this.input);
      return this;
    }
    returns() {
      return this.input;
    }
  }
  const nodeType$5 = "path";
  function PathFactoryMixin(Base) {
    return class PathFactory extends Base {
      isPathPure(obj) {
        return this.isOfType(obj, nodeType$5);
      }
      path(subType, items, loc) {
        const base = {
          type: nodeType$5,
          loc,
          items
        };
        if (subType === "|" || subType === "/") {
          return {
            ...base,
            subType
          };
        }
        if ((subType === "?" || subType === "*" || subType === "+" || subType === "^") && items.length === 1) {
          return {
            ...base,
            subType,
            items
          };
        }
        if (subType === "^" && items.length === 1 && !this.isPathPure(items[0])) {
          return {
            ...base,
            subType,
            items
          };
        }
        if (subType === "!" && items.length === 1 && (this.isPathAlternativeLimited(items[0]) || !this.isPathPure(items[0]) || this.isPathNegatedElt(items[0]))) {
          return {
            ...base,
            subType,
            items
          };
        }
        throw new Error("Invalid path type");
      }
      isPathOfType(obj, subTypes) {
        return this.isOfType(obj, nodeType$5) && subTypes.includes(obj.subType);
      }
      isPathChain(obj) {
        return this.isOfSubType(obj, nodeType$5, "/") || this.isOfSubType(obj, nodeType$5, "|");
      }
      isPathModified(obj) {
        return this.isOfSubType(obj, nodeType$5, "?") || this.isOfSubType(obj, nodeType$5, "*") || this.isOfSubType(obj, nodeType$5, "+") || this.isOfSubType(obj, nodeType$5, "^");
      }
      isPathNegatedElt(obj) {
        const casted = obj;
        return this.isOfSubType(obj, nodeType$5, "^") && Array.isArray(casted.items) && casted.items.length === 1 && typeof casted.items[0] === "object" && (casted.items[0] ?? false) && !this.isPathPure(casted.items[0]);
      }
      isPathNegated(obj) {
        return this.isOfSubType(obj, nodeType$5, "!");
      }
      isPathAlternativeLimited(obj) {
        const casted = obj;
        return this.isOfSubType(obj, nodeType$5, "|") && Array.isArray(casted.items) && casted.items.every((item) => !this.isPathPure(item) || this.isPathNegatedElt(item));
      }
    };
  }
  const nodeType$4 = "pattern";
  function PatternFactoryMixin(Base) {
    return class PatternFactory extends Base {
      isPattern(obj) {
        return this.isOfType(obj, nodeType$4);
      }
      patternBgp(triples, loc) {
        return { type: nodeType$4, subType: "bgp", triples, loc };
      }
      isPatternBgp(obj) {
        return this.isOfSubType(obj, nodeType$4, "bgp");
      }
      patternGroup(patterns, loc) {
        return { type: nodeType$4, subType: "group", patterns, loc };
      }
      isPatternGroup(obj) {
        return this.isOfSubType(obj, nodeType$4, "group");
      }
      patternGraph(name, patterns, loc) {
        return { type: nodeType$4, subType: "graph", name, patterns, loc };
      }
      isPatternGraph(obj) {
        return this.isOfSubType(obj, nodeType$4, "graph");
      }
      patternOptional(patterns, loc) {
        return { type: nodeType$4, subType: "optional", patterns, loc };
      }
      isPatternOptional(obj) {
        return this.isOfSubType(obj, nodeType$4, "optional");
      }
      patternValues(variables, values2, loc) {
        return { type: nodeType$4, subType: "values", variables, values: values2, loc };
      }
      isPatternValues(obj) {
        return this.isOfSubType(obj, nodeType$4, "values");
      }
      patternFilter(expression2, loc) {
        return {
          type: nodeType$4,
          subType: "filter",
          expression: expression2,
          loc
        };
      }
      isPatternFilter(obj) {
        return this.isOfSubType(obj, nodeType$4, "filter");
      }
      patternBind(expression2, variable, loc) {
        return {
          type: nodeType$4,
          subType: "bind",
          expression: expression2,
          variable,
          loc
        };
      }
      isPatternBind(obj) {
        return this.isOfSubType(obj, nodeType$4, "bind");
      }
      patternUnion(patterns, loc) {
        return {
          type: nodeType$4,
          subType: "union",
          patterns,
          loc
        };
      }
      isPatternUnion(obj) {
        return this.isOfSubType(obj, nodeType$4, "union");
      }
      patternMinus(patterns, loc) {
        return {
          type: nodeType$4,
          subType: "minus",
          patterns,
          loc
        };
      }
      isPatternMinus(obj) {
        return this.isOfSubType(obj, nodeType$4, "minus");
      }
      patternService(name, patterns, silent2, loc) {
        return {
          type: nodeType$4,
          subType: "service",
          silent: silent2,
          name,
          patterns,
          loc
        };
      }
      isPatternService(obj) {
        return this.isOfSubType(obj, nodeType$4, "service");
      }
    };
  }
  const nodeType$3 = "query";
  function QueryFactoryMixin(Base) {
    return class QueryFactory extends Base {
      isQuery(obj) {
        return this.isOfType(obj, nodeType$3);
      }
      isQuerySelect(obj) {
        return this.isOfSubType(obj, nodeType$3, "select");
      }
      queryConstruct(loc, context, template, where2, solutionModifiers, datasets, values2) {
        return {
          type: "query",
          subType: "construct",
          context,
          template,
          where: where2,
          solutionModifiers,
          datasets,
          values: values2,
          loc
        };
      }
      isQueryConstruct(obj) {
        return this.isOfSubType(obj, nodeType$3, "construct");
      }
      isQueryDescribe(obj) {
        return this.isOfSubType(obj, nodeType$3, "describe");
      }
      isQueryAsk(obj) {
        return this.isOfSubType(obj, nodeType$3, "ask");
      }
      querySelect(arg, loc) {
        return {
          type: nodeType$3,
          subType: "select",
          ...arg,
          loc
        };
      }
    };
  }
  const nodeType$2 = "solutionModifier";
  function SolutionModifiersFactoryMixin(Base) {
    return class SolutionModifiersFactory extends Base {
      isSolutionModifier(obj) {
        return this.isOfType(obj, nodeType$2);
      }
      solutionModifierHaving(having2, loc) {
        return {
          type: nodeType$2,
          subType: "having",
          having: having2,
          loc
        };
      }
      isSolutionModifierHaving(obj) {
        return this.isOfSubType(obj, nodeType$2, "having");
      }
      solutionModifierOrder(orderDefs, loc) {
        return {
          type: nodeType$2,
          subType: "order",
          orderDefs,
          loc
        };
      }
      isSolutionModifierOrder(obj) {
        return this.isOfSubType(obj, nodeType$2, "order");
      }
      solutionModifierLimitOffset(limit2, offset2, loc) {
        return {
          type: nodeType$2,
          subType: "limitOffset",
          limit: limit2,
          offset: offset2,
          loc
        };
      }
      isSolutionModifierLimitOffset(obj) {
        return this.isOfSubType(obj, nodeType$2, "limitOffset");
      }
      solutionModifierGroup(groupings, loc) {
        return {
          type: "solutionModifier",
          subType: "group",
          groupings,
          loc
        };
      }
      isSolutionModifierGroup(obj) {
        return this.isOfSubType(obj, nodeType$2, "group");
      }
    };
  }
  const nodeType$1 = "term";
  function TermFactoryMixin(Base) {
    return class TermFactory extends Base {
      constructor() {
        super(...arguments);
        __publicField(this, "__blankNodeCounter", 0);
      }
      resetBlankNodeCounter() {
        this.__blankNodeCounter = 0;
      }
      isTerm(x) {
        return this.isOfType(x, "term");
      }
      termBlank(label, loc) {
        const base = {
          type: "term",
          subType: "blankNode",
          loc
        };
        if (label === void 0) {
          return { ...base, label: `g_${this.__blankNodeCounter++}` };
        }
        return { ...base, label: `e_${label}` };
      }
      isTermBlank(obj) {
        return this.isOfSubType(obj, nodeType$1, "blankNode");
      }
      termLiteral(loc, value, langOrIri) {
        return {
          type: nodeType$1,
          subType: "literal",
          value,
          langOrIri,
          loc
        };
      }
      isTermLiteral(obj) {
        return this.isOfSubType(obj, nodeType$1, "literal");
      }
      isTermLiteralLangStr(obj) {
        return this.isTermLiteral(obj) && typeof obj.langOrIri === "string";
      }
      isTermLiteralStr(obj) {
        return this.isTermLiteral(obj) && typeof obj.langOrIri === "undefined";
      }
      isTermLiteralTyped(obj) {
        const casted = obj;
        return this.isTermLiteral(obj) && typeof casted.langOrIri === "object" && casted.langOrIri !== null && this.isTermNamed(casted.langOrIri);
      }
      termVariable(value, loc) {
        return {
          type: nodeType$1,
          subType: "variable",
          value,
          loc
        };
      }
      isTermVariable(obj) {
        return this.isOfSubType(obj, nodeType$1, "variable");
      }
      termNamed(loc, value, prefix) {
        const base = {
          type: nodeType$1,
          subType: "namedNode",
          value,
          loc
        };
        if (prefix === void 0) {
          return base;
        }
        return { ...base, prefix };
      }
      isTermNamed(obj) {
        return this.isOfSubType(obj, nodeType$1, "namedNode");
      }
      isTermNamedPrefixed(obj) {
        const casted = obj;
        return this.isTermNamed(obj) && typeof casted.prefix === "string";
      }
    };
  }
  const nodeType = "updateOperation";
  function UpdateOperationFactoryMixin(Base) {
    return class UpdateOperationFactory extends Base {
      isUpdateOperation(obj) {
        return this.isOfType(obj, nodeType);
      }
      updateOperationLoad(loc, source, silent2, destination) {
        return {
          type: nodeType,
          subType: "load",
          silent: silent2,
          source,
          ...destination && { destination },
          loc
        };
      }
      isUpdateOperationLoad(obj) {
        return this.isOfSubType(obj, nodeType, "load");
      }
      updateOperationClearDrop(subType, silent2, destination, loc) {
        return {
          type: "updateOperation",
          subType,
          silent: silent2,
          destination,
          loc
        };
      }
      updateOperationClear(destination, silent2, loc) {
        return this.updateOperationClearDrop("clear", silent2, destination, loc);
      }
      isUpdateOperationClear(obj) {
        return this.isOfSubType(obj, nodeType, "clear");
      }
      updateOperationDrop(destination, silent2, loc) {
        return this.updateOperationClearDrop("drop", silent2, destination, loc);
      }
      isUpdateOperationDrop(obj) {
        return this.isOfSubType(obj, nodeType, "drop");
      }
      updateOperationCreate(destination, silent2, loc) {
        return {
          type: "updateOperation",
          subType: "create",
          silent: silent2,
          destination,
          loc
        };
      }
      isUpdateOperationCreate(obj) {
        return this.isOfSubType(obj, nodeType, "create");
      }
      updateOperationAddMoveCopy(subType, source, destination, silent2, loc) {
        return {
          type: "updateOperation",
          subType,
          silent: silent2,
          source,
          destination,
          loc
        };
      }
      updateOperationAdd(source, destination, silent2, loc) {
        return this.updateOperationAddMoveCopy("add", source, destination, silent2, loc);
      }
      isUpdateOperationAdd(obj) {
        return this.isOfSubType(obj, nodeType, "add");
      }
      updateOperationMove(source, destination, silent2, loc) {
        return this.updateOperationAddMoveCopy("move", source, destination, silent2, loc);
      }
      isUpdateOperationMove(obj) {
        return this.isOfSubType(obj, nodeType, "move");
      }
      updateOperationCopy(source, destination, silent2, loc) {
        return this.updateOperationAddMoveCopy("copy", source, destination, silent2, loc);
      }
      isUpdateOperationCopy(obj) {
        return this.isOfSubType(obj, nodeType, "copy");
      }
      updateOperationInsDelDataWhere(subType, data, loc) {
        return {
          type: "updateOperation",
          subType,
          data,
          loc
        };
      }
      updateOperationInsertData(data, loc) {
        return this.updateOperationInsDelDataWhere("insertdata", data, loc);
      }
      isUpdateOperationInsertData(obj) {
        return this.isOfSubType(obj, nodeType, "insertdata");
      }
      updateOperationDeleteData(data, loc) {
        return this.updateOperationInsDelDataWhere("deletedata", data, loc);
      }
      isUpdateOperationDeleteData(obj) {
        return this.isOfSubType(obj, nodeType, "deletedata");
      }
      updateOperationDeleteWhere(data, loc) {
        return this.updateOperationInsDelDataWhere("deletewhere", data, loc);
      }
      isUpdateOperationDeleteWhere(obj) {
        return this.isOfSubType(obj, nodeType, "deletewhere");
      }
      updateOperationModify(loc, insert, del, where2, from2, graph2) {
        return {
          type: "updateOperation",
          subType: "modify",
          insert: insert ?? [],
          delete: del ?? [],
          graph: graph2,
          where: where2,
          from: from2,
          loc
        };
      }
      isUpdateOperationModify(obj) {
        return this.isOfSubType(obj, nodeType, "modify");
      }
    };
  }
  let AstFactory$1 = class AstFactory extends asArg(AstCoreFactory).call(ContextFactoryMixin).call(ExpressionFactoryMixin).call(GraphRefFactoryMixin).call(PathFactoryMixin).call(PatternFactoryMixin).call(QueryFactoryMixin).call(SolutionModifiersFactoryMixin).call(TermFactoryMixin).call(UpdateOperationFactoryMixin).returns() {
    alwaysSparql11(obj) {
      return true;
    }
    isPath(obj) {
      return this.isPathPure(obj) || this.isTermNamed(obj);
    }
    isExpression(obj) {
      return this.isExpressionPure(obj) || this.isTermNamed(obj) || this.isTermVariable(obj) || this.isTermLiteral(obj);
    }
    graphNodeIdentifier(graphNode2) {
      return graphNode2.type === "tripleCollection" ? graphNode2.identifier : graphNode2;
    }
    triple(subject, predicate, object2, loc) {
      return {
        type: "triple",
        subject,
        predicate,
        object: object2,
        loc: loc ?? this.sourceLocation(subject, predicate, object2)
      };
    }
    isTriple(obj) {
      return this.isOfType(obj, "triple");
    }
    datasetClauses(clauses, loc) {
      return {
        type: "datasetClauses",
        clauses,
        loc
      };
    }
    isDatasetClauses(obj) {
      return this.isOfType(obj, "datasetClauses");
    }
    wildcard(loc) {
      return { type: "wildcard", loc };
    }
    isWildcard(obj) {
      return this.isOfType(obj, "wildcard");
    }
    isTripleCollection(obj) {
      return this.isOfType(obj, "tripleCollection");
    }
    tripleCollectionBlankNodeProperties(identifier, triples, loc) {
      return {
        type: "tripleCollection",
        subType: "blankNodeProperties",
        identifier,
        triples,
        loc
      };
    }
    isTripleCollectionBlankNodeProperties(obj) {
      return this.isOfSubType(obj, "tripleCollection", "blankNodeProperties");
    }
    tripleCollectionList(identifier, triples, loc) {
      return {
        type: "tripleCollection",
        subType: "list",
        identifier,
        triples,
        loc
      };
    }
    isTripleCollectionList(obj) {
      return this.isOfSubType(obj, "tripleCollection", "list");
    }
    graphQuads(graph2, triples, loc) {
      return {
        type: "graph",
        graph: graph2,
        triples,
        loc
      };
    }
    isGraphQuads(obj) {
      return super.isOfType(obj, "graph");
    }
    isUpdate(obj) {
      return super.isOfType(obj, "update");
    }
  };
  function sparqlCodepointEscape(input) {
    const sanitizedInput = input.replaceAll(/\\u([0-9a-fA-F]{4})|\\U([0-9a-fA-F]{8})/gu, (_, unicode4, unicode8) => {
      if (unicode4) {
        const charCode2 = Number.parseInt(unicode4, 16);
        return String.fromCodePoint(charCode2);
      }
      const charCode = Number.parseInt(unicode8, 16);
      if (charCode < 65535) {
        return String.fromCodePoint(charCode);
      }
      const substractedCharCode = charCode - 65536;
      return String.fromCodePoint(55296 + (substractedCharCode >> 10), 56320 + (substractedCharCode & 1023));
    });
    if (/[\uD800-\uDBFF](?:[^\uDC00-\uDFFF]|$)/u.test(sanitizedInput)) {
      throw new Error(`Invalid unicode codepoint of surrogate pair without corresponding codepoint`);
    }
    return sanitizedInput;
  }
  var CommonIRIs;
  (function(CommonIRIs2) {
    CommonIRIs2["BOOLEAN"] = "http://www.w3.org/2001/XMLSchema#boolean";
    CommonIRIs2["INTEGER"] = "http://www.w3.org/2001/XMLSchema#integer";
    CommonIRIs2["DECIMAL"] = "http://www.w3.org/2001/XMLSchema#decimal";
    CommonIRIs2["DOUBLE"] = "http://www.w3.org/2001/XMLSchema#double";
    CommonIRIs2["STRING"] = "http://www.w3.org/2001/XMLSchema#string";
    CommonIRIs2["FIRST"] = "http://www.w3.org/1999/02/22-rdf-syntax-ns#first";
    CommonIRIs2["REST"] = "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest";
    CommonIRIs2["NIL"] = "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil";
    CommonIRIs2["TYPE"] = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
  })(CommonIRIs || (CommonIRIs = {}));
  class AstTransformer extends TransformerSubTyped {
  }
  const F$1 = new AstFactory$1();
  const transformer = new AstTransformer();
  function getAggregatesOfExpression(expression2) {
    if (F$1.isExpressionAggregate(expression2)) {
      return [expression2];
    }
    if (F$1.isExpressionOperator(expression2)) {
      const aggregates = [];
      for (const arg of expression2.args) {
        aggregates.push(...getAggregatesOfExpression(arg));
      }
      return aggregates;
    }
    return [];
  }
  function getExpressionId(expression2) {
    if (F$1.isTerm(expression2) && F$1.isTermVariable(expression2)) {
      return expression2.value;
    }
    if (F$1.isExpression(expression2)) {
      if (F$1.isExpressionAggregate(expression2) && F$1.isTermVariable(expression2.expression[0])) {
        return expression2.expression[0].value;
      }
      return void 0;
    }
    return expression2.variable.value;
  }
  function getVariablesFromExpression(expression2, variables) {
    if (F$1.isExpressionOperator(expression2)) {
      for (const expr of expression2.args) {
        getVariablesFromExpression(expr, variables);
      }
    } else if (F$1.isTerm(expression2) && F$1.isTermVariable(expression2)) {
      variables.add(expression2.value);
    }
  }
  function queryProjectionIsGood(query2) {
    if (query2.variables.length === 1 && F$1.isWildcard(query2.variables[0])) {
      if (query2.solutionModifiers.group !== void 0) {
        throw new Error("GROUP BY not allowed with wildcard");
      }
      return;
    }
    const variables = query2.variables;
    const hasCountAggregate = variables.flatMap((varVal) => F$1.isTerm(varVal) ? [] : getAggregatesOfExpression(varVal.expression)).some((agg) => agg.aggregation === "count" && !agg.expression.some((arg) => F$1.isWildcard(arg)));
    const groupBy2 = query2.solutionModifiers.group;
    if (hasCountAggregate || groupBy2) {
      for (const selectVar of variables) {
        if (F$1.isTerm(selectVar)) {
          if (!groupBy2 || !groupBy2.groupings.map((groupvar) => getExpressionId(groupvar)).includes(getExpressionId(selectVar))) {
            throw new Error("Variable not allowed in projection");
          }
        } else if (getAggregatesOfExpression(selectVar.expression).length === 0) {
          const usedvars = /* @__PURE__ */ new Set();
          getVariablesFromExpression(selectVar.expression, usedvars);
          for (const usedvar of usedvars) {
            if (!groupBy2 || !groupBy2.groupings.map((groupVar) => getExpressionId(groupVar)).includes(usedvar)) {
              throw new Error(`Use of ungrouped variable in projection of operation (?${usedvar})`);
            }
          }
        }
      }
    }
    const subqueries = query2.where.patterns.filter((pattern) => pattern.type === "query");
    if (subqueries.length > 0) {
      const selectBoundedVars = /* @__PURE__ */ new Set();
      for (const variable of variables) {
        if ("variable" in variable) {
          selectBoundedVars.add(variable.variable.value);
        }
      }
      const vars = subqueries.flatMap((sub) => sub.variables).map((v) => F$1.isTerm(v) ? v.value : F$1.isWildcard(v) ? "*" : v.variable.value);
      const subqueryIds = new Set(vars);
      for (const selectedVarId of selectBoundedVars) {
        if (subqueryIds.has(selectedVarId)) {
          throw new Error(`Target id of 'AS' (?${selectedVarId}) already used in subquery`);
        }
      }
    }
  }
  function findPatternBoundedVars(op, boundedVars) {
    function recurse(x) {
      findPatternBoundedVars(x, boundedVars);
    }
    if (op === void 0) {
      return;
    }
    if (Array.isArray(op)) {
      for (const iter of op) {
        recurse(iter);
      }
    } else if (F$1.isQuery(op)) {
      if (F$1.isQuerySelect(op) || F$1.isQueryDescribe(op)) {
        recurse([
          ...op.variables.some((x) => F$1.isWildcard(x)) ? [op.where] : op.variables,
          op.solutionModifiers.group,
          op.values
        ]);
      } else {
        recurse(op.solutionModifiers.group);
      }
    } else if (F$1.isTriple(op)) {
      recurse([op.subject, op.predicate, op.object]);
    } else if (F$1.isPathPure(op)) {
      recurse(op.items);
    } else if (F$1.isTripleCollection(op)) {
      recurse([op.identifier, ...op.triples]);
    } else if (F$1.isSolutionModifierGroup(op)) {
      recurse(op.groupings.filter((g) => "variable" in g).map((x) => x.variable));
    } else if (F$1.isSolutionModifierHaving(op)) {
      recurse(op.having);
    } else if (F$1.isSolutionModifierOrder(op)) {
      recurse(op.orderDefs.map((x) => x.expression));
    } else if (F$1.isPatternValues(op)) {
      for (const v of Object.keys(op.values.at(0) ?? {})) {
        boundedVars.add(v);
      }
    } else if (F$1.isPatternBgp(op)) {
      recurse(op.triples);
    } else if (F$1.isPatternGroup(op) || F$1.isPatternUnion(op) || F$1.isPatternOptional(op)) {
      recurse(op.patterns);
    } else if (F$1.isPatternService(op) || F$1.isPatternGraph(op)) {
      recurse([op.name, ...op.patterns]);
    } else if (F$1.isPatternBind(op)) {
      recurse(op.variable);
    } else if (F$1.isTermVariable(op)) {
      boundedVars.add(op.value);
    }
  }
  function checkNote13(patterns) {
    for (const [index, pattern] of patterns.entries()) {
      if (F$1.isPatternBind(pattern) && index > 0 && F$1.isPatternBgp(patterns[index - 1])) {
        const bgp = patterns[index - 1];
        const variables = [];
        transformer.visitNodeSpecific(bgp, {}, { term: { variable: { visitor: (var_2) => {
          variables.push(var_2);
        } } } });
        if (variables.some((var_2) => var_2.value === pattern.variable.value)) {
          throw new Error(`Variable used to bind is already bound (?${pattern.variable.value})`);
        }
      }
    }
    const boundedVars = /* @__PURE__ */ new Set();
    for (const pattern of patterns) {
      if (F$1.isPatternBind(pattern)) {
        if (boundedVars.has(pattern.variable.value)) {
          throw new Error(`Variable used to bind is already bound (?${pattern.variable.value})`);
        }
      } else {
        findPatternBoundedVars(pattern, boundedVars);
      }
    }
  }
  function updateNoReuseBlankNodeLabels(updateQuery) {
    const blankLabelsUsedInInsertData = /* @__PURE__ */ new Set();
    for (const update2 of updateQuery.updates) {
      if (!update2.operation) {
        continue;
      }
      const operation = update2.operation;
      if (operation.subType === "insertdata") {
        const blankNodesHere = /* @__PURE__ */ new Set();
        transformer.visitNodeSpecific(operation, {}, { term: { blankNode: { visitor: (blankNode2) => {
          blankNodesHere.add(blankNode2.label);
          if (blankLabelsUsedInInsertData.has(blankNode2.label)) {
            throw new Error("Detected reuse blank node across different INSERT DATA clauses");
          }
        } } } });
        for (const blankNode2 of blankNodesHere) {
          blankLabelsUsedInInsertData.add(blankNode2);
        }
      }
    }
  }
  function stringEscapedLexical(str2) {
    const lexical = str2.replaceAll(/["\\\t\n\r\b\f]/gu, (char) => {
      switch (char) {
        case "	":
          return "\\t";
        case "\n":
          return "\\n";
        case "\r":
          return "\\r";
        case "\b":
          return "\\b";
        case "\f":
          return "\\f";
        case '"':
          return '\\"';
        case "\\":
          return "\\\\";
        default:
          return char;
      }
    });
    return `"${lexical}"`;
  }
  const rdfLiteral$1 = {
    name: "rdfLiteral",
    impl: ({ ACTION, SUBRULE1, CONSUME, OPTION, OR }) => (C) => {
      const value = SUBRULE1(string);
      return OPTION(() => OR([
        { ALT: () => {
          const lang2 = CONSUME(langTag);
          return ACTION(() => C.astFactory.termLiteral(C.astFactory.sourceLocation(value, lang2), value.value, lang2.image.slice(1).toLowerCase()));
        } },
        { ALT: () => {
          CONSUME(hathat);
          const iriVal = SUBRULE1(iri);
          return ACTION(() => C.astFactory.termLiteral(C.astFactory.sourceLocation(value, iriVal), value.value, iriVal));
        } }
      ])) ?? value;
    },
    gImpl: ({ SUBRULE, PRINT, PRINT_WORD }) => (ast, { astFactory }) => {
      if (!ast.langOrIri || typeof ast.langOrIri === "string") {
        astFactory.printFilter(ast, () => {
          PRINT_WORD("");
          PRINT(stringEscapedLexical(ast.value));
        });
        if (typeof ast.langOrIri === "string") {
          astFactory.printFilter(ast, () => PRINT("@", ast.langOrIri));
        }
      } else if (astFactory.isSourceLocationNoMaterialize(ast.langOrIri.loc)) {
        astFactory.printFilter(ast, () => {
          PRINT_WORD(ast.value);
        });
      } else {
        astFactory.printFilter(ast, () => {
          PRINT_WORD("");
          PRINT(stringEscapedLexical(ast.value), "^^");
        });
        SUBRULE(iri, ast.langOrIri);
      }
    }
  };
  const numericLiteral = {
    name: "numericLiteral",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(numericLiteralUnsigned) },
      { ALT: () => SUBRULE(numericLiteralPositive) },
      { ALT: () => SUBRULE(numericLiteralNegative) }
    ])
  };
  const numericLiteralUnsigned = {
    name: "numericLiteralUnsigned",
    impl: ({ ACTION, CONSUME, OR }) => (C) => {
      const parsed = OR([
        { ALT: () => [CONSUME(integer), CommonIRIs.INTEGER] },
        { ALT: () => [CONSUME(decimal), CommonIRIs.DECIMAL] },
        { ALT: () => [CONSUME(double), CommonIRIs.DOUBLE] }
      ]);
      return ACTION(() => C.astFactory.termLiteral(C.astFactory.sourceLocation(parsed[0]), parsed[0].image, C.astFactory.termNamed(C.astFactory.sourceLocation(), parsed[1])));
    }
  };
  const numericLiteralPositive = {
    name: "numericLiteralPositive",
    impl: ({ ACTION, CONSUME, OR }) => (C) => {
      const parsed = OR([
        { ALT: () => [CONSUME(integerPositive), CommonIRIs.INTEGER] },
        { ALT: () => [CONSUME(decimalPositive), CommonIRIs.DECIMAL] },
        { ALT: () => [CONSUME(doublePositive), CommonIRIs.DOUBLE] }
      ]);
      return ACTION(() => C.astFactory.termLiteral(C.astFactory.sourceLocation(parsed[0]), parsed[0].image, C.astFactory.termNamed(C.astFactory.sourceLocation(), parsed[1])));
    }
  };
  const numericLiteralNegative = {
    name: "numericLiteralNegative",
    impl: ({ ACTION, CONSUME, OR }) => (C) => {
      const parsed = OR([
        { ALT: () => [CONSUME(integerNegative), CommonIRIs.INTEGER] },
        { ALT: () => [CONSUME(decimalNegative), CommonIRIs.DECIMAL] },
        { ALT: () => [CONSUME(doubleNegative), CommonIRIs.DOUBLE] }
      ]);
      return ACTION(() => C.astFactory.termLiteral(C.astFactory.sourceLocation(parsed[0]), parsed[0].image, C.astFactory.termNamed(C.astFactory.sourceLocation(), parsed[1])));
    }
  };
  const booleanLiteral = {
    name: "booleanLiteral",
    impl: ({ ACTION, CONSUME, OR }) => (C) => {
      const token = OR([
        { ALT: () => CONSUME(true_) },
        { ALT: () => CONSUME(false_) }
      ]);
      return ACTION(() => C.astFactory.termLiteral(C.astFactory.sourceLocation(token), token.image.toLowerCase(), C.astFactory.termNamed(C.astFactory.sourceLocation(), CommonIRIs.BOOLEAN)));
    }
  };
  const string = {
    name: "string",
    impl: ({ ACTION, CONSUME, OR }) => (C) => {
      const x = OR([
        { ALT: () => {
          const token = CONSUME(stringLiteral1);
          return [token, token.image.slice(1, -1)];
        } },
        { ALT: () => {
          const token = CONSUME(stringLiteral2);
          return [token, token.image.slice(1, -1)];
        } },
        { ALT: () => {
          const token = CONSUME(stringLiteralLong1);
          return [token, token.image.slice(3, -3)];
        } },
        { ALT: () => {
          const token = CONSUME(stringLiteralLong2);
          return [token, token.image.slice(3, -3)];
        } }
      ]);
      return ACTION(() => {
        const F2 = C.astFactory;
        const value = x[1].replaceAll(/\\([tnrbf"'\\])/gu, (_, char) => {
          switch (char) {
            case "t":
              return "	";
            case "n":
              return "\n";
            case "r":
              return "\r";
            case "b":
              return "\b";
            case "f":
              return "\f";
            default:
              return char;
          }
        });
        return F2.termLiteral(F2.sourceLocation(x[0]), value);
      });
    }
  };
  const iri = {
    name: "iri",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(iriFull) },
      { ALT: () => SUBRULE(prefixedName) }
    ]),
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => F2.isTermNamedPrefixed(ast) ? SUBRULE(prefixedName, ast) : SUBRULE(iriFull, ast)
  };
  const iriFull = {
    name: "iriFull",
    impl: ({ ACTION, CONSUME }) => (C) => {
      const iriToken = CONSUME(iriRef);
      return ACTION(() => C.astFactory.termNamed(C.astFactory.sourceLocation(iriToken), iriToken.image.slice(1, -1)));
    },
    gImpl: ({ PRINT }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT("<", ast.value, ">"));
    }
  };
  const prefixedName = {
    name: "prefixedName",
    impl: ({ ACTION, CONSUME, OR }) => (C) => {
      function verifyPrefix(prefix) {
        if (!C.skipValidation && C.prefixes[prefix] === void 0) {
          throw new Error(`Unknown prefix: ${prefix}`);
        }
      }
      return OR([{
        ALT: () => {
          const longName = CONSUME(pNameLn);
          return ACTION(() => {
            const [prefix, localName] = longName.image.split(":");
            verifyPrefix(prefix);
            return C.astFactory.termNamed(C.astFactory.sourceLocation(longName), localName, prefix);
          });
        }
      }, {
        ALT: () => {
          const shortName = CONSUME(pNameNs);
          return ACTION(() => {
            const prefix = shortName.image.slice(0, -1);
            verifyPrefix(prefix);
            return C.astFactory.termNamed(C.astFactory.sourceLocation(shortName), "", prefix);
          });
        }
      }]);
    },
    gImpl: ({ PRINT }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT(ast.prefix, ":", ast.value));
    }
  };
  const blankNode = {
    name: "blankNode",
    impl: ({ ACTION, CONSUME, OR }) => (C) => {
      const result = OR([
        { ALT: () => {
          const labelToken = CONSUME(blankNodeLabel);
          return ACTION(() => C.astFactory.termBlank(labelToken.image.slice(2), C.astFactory.sourceLocation(labelToken)));
        } },
        { ALT: () => {
          const anonToken = CONSUME(anon);
          return ACTION(() => C.astFactory.termBlank(void 0, C.astFactory.sourceLocation(anonToken)));
        } }
      ]);
      ACTION(() => {
        if (!C.parseMode.has("canCreateBlankNodes")) {
          throw new Error("Blank nodes are not allowed in this context");
        }
      });
      return result;
    },
    gImpl: ({ PRINT }) => (ast, { astFactory }) => {
      astFactory.printFilter(ast, () => PRINT("_:", ast.label.replace(/^e_/u, "")));
    }
  };
  const verbA = {
    name: "VerbA",
    impl: ({ ACTION, CONSUME }) => (C) => {
      const token = CONSUME(a);
      return ACTION(() => C.astFactory.termNamed(C.astFactory.sourceLocation(token), CommonIRIs.TYPE, void 0));
    }
  };
  const prologue$1 = {
    name: "prologue",
    impl: ({ SUBRULE, MANY, OR }) => () => {
      const result = [];
      MANY(() => OR([
        { ALT: () => result.push(SUBRULE(baseDecl)) },
        // TODO: the [spec](https://www.w3.org/TR/sparql11-query/#iriRefs) says you cannot redefine prefixes.
        //  We might need to check this.
        { ALT: () => result.push(SUBRULE(prefixDecl)) }
      ]));
      return result;
    },
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      for (const context of ast) {
        if (F2.isContextDefinitionBase(context)) {
          SUBRULE(baseDecl, context);
        } else if (F2.isContextDefinitionPrefix(context)) {
          SUBRULE(prefixDecl, context);
        }
      }
    }
  };
  const baseDecl = {
    name: "baseDecl",
    impl: ({ ACTION, CONSUME, SUBRULE }) => (C) => {
      const base = CONSUME(baseDecl$1);
      const val = SUBRULE(iriFull);
      return ACTION(() => C.astFactory.contextDefinitionBase(C.astFactory.sourceLocation(base, val), val));
    },
    gImpl: ({ SUBRULE, PRINT_ON_EMPTY, NEW_LINE }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_ON_EMPTY("BASE "));
      SUBRULE(iri, ast.value);
      F2.printFilter(ast, () => NEW_LINE());
    }
  };
  const prefixDecl = {
    name: "prefixDecl",
    impl: ({ ACTION, CONSUME, SUBRULE }) => (C) => {
      const prefix = CONSUME(prefixDecl$1);
      const name = CONSUME(pNameNs).image.slice(0, -1);
      const value = SUBRULE(iriFull);
      return ACTION(() => {
        C.prefixes[name] = value.value;
        return C.astFactory.contextDefinitionPrefix(C.astFactory.sourceLocation(prefix, value), name, value);
      });
    },
    gImpl: ({ SUBRULE, PRINT_ON_EMPTY, NEW_LINE }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_ON_EMPTY("PREFIX ", `${ast.key}: `);
      });
      SUBRULE(iri, ast.value);
      F2.printFilter(ast, () => NEW_LINE());
    }
  };
  const verb = {
    name: "verb",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(varOrIri) },
      { ALT: () => SUBRULE(verbA) }
    ])
  };
  const varOrTerm$1 = {
    name: "varOrTerm",
    impl: ({ SUBRULE, OR }) => (C) => OR([
      { GATE: () => C.parseMode.has("canParseVars"), ALT: () => SUBRULE(var_) },
      { ALT: () => SUBRULE(graphTerm) }
    ]),
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      if (F2.isTermVariable(ast)) {
        return SUBRULE(var_, ast);
      }
      return SUBRULE(graphTerm, ast);
    }
  };
  const varOrIri = {
    name: "varOrIri",
    impl: ({ SUBRULE, OR }) => (C) => OR([
      { GATE: () => C.parseMode.has("canParseVars"), ALT: () => SUBRULE(var_) },
      { ALT: () => SUBRULE(iri) }
    ])
  };
  const var_ = {
    name: "var",
    impl: ({ ACTION, CONSUME, OR }) => (C) => {
      const varToken = OR([
        { ALT: () => CONSUME(var1) },
        { ALT: () => CONSUME(var2) }
      ]);
      return ACTION(() => C.astFactory.termVariable(varToken.image.slice(1), C.astFactory.sourceLocation(varToken)));
    },
    gImpl: ({ PRINT }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT(`?${ast.value}`));
    }
  };
  const graphTerm = {
    name: "graphTerm",
    impl: ({ ACTION, SUBRULE, CONSUME, OR }) => (C) => OR([
      { ALT: () => SUBRULE(iri) },
      { ALT: () => SUBRULE(rdfLiteral$1) },
      { ALT: () => SUBRULE(numericLiteral) },
      { ALT: () => SUBRULE(booleanLiteral) },
      { GATE: () => C.parseMode.has("canCreateBlankNodes"), ALT: () => SUBRULE(blankNode) },
      { ALT: () => {
        const tokenNil = CONSUME(nil);
        return ACTION(() => C.astFactory.termNamed(C.astFactory.sourceLocation(tokenNil), CommonIRIs.NIL));
      } }
    ]),
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      if (F2.isTermNamed(ast)) {
        SUBRULE(iri, ast);
      } else if (F2.isTermLiteral(ast)) {
        SUBRULE(rdfLiteral$1, ast);
      } else if (F2.isTermBlank(ast)) {
        SUBRULE(blankNode, ast);
      }
    }
  };
  function datasetClauseUsing(name, token) {
    return {
      name,
      impl: ({ ACTION, SUBRULE, CONSUME, OR }) => (C) => {
        const start = CONSUME(token);
        return OR([
          { ALT: () => {
            const iri2 = SUBRULE(defaultGraphClause);
            return ACTION(() => C.astFactory.wrap({ clauseType: "default", value: iri2 }, C.astFactory.sourceLocation(start, iri2)));
          } },
          { ALT: () => {
            const namedClause = SUBRULE(namedGraphClause);
            return ACTION(() => C.astFactory.wrap({
              clauseType: "named",
              value: namedClause.val
            }, C.astFactory.sourceLocation(start, namedClause)));
          } }
        ]);
      }
    };
  }
  const datasetClause = datasetClauseUsing("datasetClause", from);
  const defaultGraphClause = {
    name: "defaultGraphClause",
    impl: ({ SUBRULE }) => () => SUBRULE(sourceSelector)
  };
  const usingClause = datasetClauseUsing("usingClause", usingClause$1);
  function datasetClauseUsingStar(name, subRule, fromUsing) {
    return {
      name,
      impl: ({ ACTION, MANY, SUBRULE }) => (C) => {
        const clauses = [];
        MANY(() => {
          const clause = SUBRULE(subRule);
          clauses.push(clause);
        });
        return ACTION(() => C.astFactory.datasetClauses(clauses.map((clause) => clause.val), C.astFactory.sourceLocation(...clauses)));
      },
      gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
        for (const clause of ast.clauses) {
          F2.printFilter(ast, () => PRINT_WORD(fromUsing));
          if (clause.clauseType === "named") {
            F2.printFilter(ast, () => PRINT_WORD("NAMED"));
          }
          SUBRULE(iri, clause.value);
        }
      }
    };
  }
  const datasetClauseStar = datasetClauseUsingStar("datasetClauses", datasetClause, "FROM");
  const usingClauseStar = datasetClauseUsingStar("usingClauses", usingClause, "USING");
  const namedGraphClause = {
    name: "namedGraphClause",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const named$1 = CONSUME(named);
      const iri2 = SUBRULE(sourceSelector);
      return ACTION(() => C.astFactory.wrap(iri2, C.astFactory.sourceLocation(named$1, iri2)));
    }
  };
  const sourceSelector = {
    name: "sourceSelector",
    impl: ({ SUBRULE }) => () => SUBRULE(iri)
  };
  function funcExpr1(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
        const operator = CONSUME(func);
        CONSUME(LParen);
        const arg = SUBRULE(expression);
        const close = CONSUME(RParen);
        return ACTION(() => C.astFactory.expressionOperation(operator.image, [arg], C.astFactory.sourceLocation(operator, close)));
      }
    };
  }
  function funcExpr2(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2 }) => (C) => {
        const operator = CONSUME(func);
        CONSUME(LParen);
        const arg1 = SUBRULE1(expression);
        CONSUME(comma);
        const arg2 = SUBRULE2(expression);
        const close = CONSUME(RParen);
        return ACTION(() => C.astFactory.expressionOperation(operator.image, [arg1, arg2], C.astFactory.sourceLocation(operator, close)));
      }
    };
  }
  function funcExpr3(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, CONSUME, CONSUME1, CONSUME2, SUBRULE1, SUBRULE2, SUBRULE3 }) => (C) => {
        const operator = CONSUME(func);
        CONSUME(LParen);
        const arg1 = SUBRULE1(expression);
        CONSUME1(comma);
        const arg2 = SUBRULE2(expression);
        CONSUME2(comma);
        const arg3 = SUBRULE3(expression);
        const close = CONSUME(RParen);
        return ACTION(() => C.astFactory.expressionOperation(operator.image, [arg1, arg2, arg3], C.astFactory.sourceLocation(operator, close)));
      }
    };
  }
  function funcVar1(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
        const operator = CONSUME(func);
        CONSUME(LParen);
        const arg = SUBRULE(var_);
        const close = CONSUME(RParen);
        return ACTION(() => C.astFactory.expressionOperation(operator.image, [arg], C.astFactory.sourceLocation(operator, close)));
      }
    };
  }
  function funcExprOrNil1(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, CONSUME, OR, SUBRULE }) => (C) => {
        const operator = CONSUME(func);
        return OR([
          { ALT: () => {
            CONSUME(LParen);
            const arg = SUBRULE(expression);
            const close = CONSUME(RParen);
            return ACTION(() => C.astFactory.expressionOperation(operator.image, [arg], C.astFactory.sourceLocation(operator, close)));
          } },
          { ALT: () => {
            const nil$1 = CONSUME(nil);
            return ACTION(() => C.astFactory.expressionOperation(operator.image, [], C.astFactory.sourceLocation(operator, nil$1)));
          } }
        ]);
      }
    };
  }
  function funcNil1(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, CONSUME }) => (C) => {
        const operator = CONSUME(func);
        const nil$1 = CONSUME(nil);
        return ACTION(() => C.astFactory.expressionOperation(operator.image, [], C.astFactory.sourceLocation(operator, nil$1)));
      }
    };
  }
  function funcExprList1(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, CONSUME, SUBRULE }) => (C) => {
        const operator = CONSUME(func);
        const args = SUBRULE(expressionList);
        return ACTION(() => C.astFactory.expressionOperation(operator.image, args.val, C.astFactory.sourceLocation(operator, args)));
      }
    };
  }
  function funcExpr2or3(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, SUBRULE3, CONSUME1, OPTION, CONSUME2 }) => (C) => {
        const operator = CONSUME(func);
        CONSUME(LParen);
        const arg1 = SUBRULE1(expression);
        CONSUME1(comma);
        const arg2 = SUBRULE2(expression);
        const arg3 = OPTION(() => {
          CONSUME2(comma);
          return SUBRULE3(expression);
        });
        const close = CONSUME(RParen);
        return ACTION(() => C.astFactory.expressionOperation(operator.image, arg3 ? [arg1, arg2, arg3] : [arg1, arg2], C.astFactory.sourceLocation(operator, close)));
      }
    };
  }
  function funcExpr3or4(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, SUBRULE3, SUBRULE4, CONSUME1, OPTION, CONSUME2, CONSUME3 }) => (C) => {
        const operator = CONSUME(func);
        CONSUME(LParen);
        const arg1 = SUBRULE1(expression);
        CONSUME1(comma);
        const arg2 = SUBRULE2(expression);
        CONSUME2(comma);
        const arg3 = SUBRULE3(expression);
        const arg4 = OPTION(() => {
          CONSUME3(comma);
          return SUBRULE4(expression);
        });
        const close = CONSUME(RParen);
        return ACTION(() => C.astFactory.expressionOperation(operator.image, arg4 ? [arg1, arg2, arg3, arg4] : [arg1, arg2, arg3], C.astFactory.sourceLocation(operator, close)));
      }
    };
  }
  function funcGroupGraphPattern(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
        const operator = CONSUME(func);
        const group = SUBRULE(groupGraphPattern);
        return ACTION(() => C.astFactory.expressionPatternOperation(operator.image, group, C.astFactory.sourceLocation(operator, group)));
      }
    };
  }
  function baseAggregateFunc(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, CONSUME, SUBRULE, OPTION }) => (C) => {
        const operator = CONSUME(func);
        CONSUME(LParen);
        const distinct$1 = OPTION(() => CONSUME(distinct));
        const expr1 = SUBRULE(expression);
        const close = CONSUME(RParen);
        return ACTION(() => C.astFactory.aggregate(operator.image, distinct$1 !== void 0, expr1, void 0, C.astFactory.sourceLocation(operator, close)));
      }
    };
  }
  const builtInStr = funcExpr1(str);
  const builtInLang = funcExpr1(lang);
  const builtInLangmatches = funcExpr2(langmatches);
  const builtInDatatype = funcExpr1(datatype);
  const builtInBound = funcVar1(bound);
  const builtInIri = funcExpr1(iri$1);
  const builtInUri = funcExpr1(uri);
  const builtInBnodeSparqlJs = funcExprOrNil1(bnode);
  const builtInRand = funcNil1(rand);
  const builtInAbs = funcExpr1(abs);
  const builtInCeil = funcExpr1(ceil);
  const builtInFloor = funcExpr1(floor);
  const builtInRound = funcExpr1(round);
  const builtInConcat = funcExprList1(concat);
  const builtInStrlen = funcExpr1(strlen);
  const builtInUcase = funcExpr1(ucase);
  const builtInLcase = funcExpr1(lcase);
  const builtInEncode_for_uri = funcExpr1(encode_for_uri);
  const builtInContains = funcExpr2(contains);
  const builtInStrstarts = funcExpr2(strstarts);
  const builtInStrends = funcExpr2(strends);
  const builtInStrbefore = funcExpr2(strbefore);
  const builtInStrafter = funcExpr2(strafter);
  const builtInYear = funcExpr1(year);
  const builtInMonth = funcExpr1(month);
  const builtInDay = funcExpr1(day);
  const builtInHours = funcExpr1(hours);
  const builtInMinutes = funcExpr1(minutes);
  const builtInSeconds = funcExpr1(seconds);
  const builtInTimezone = funcExpr1(timezone);
  const builtInTz = funcExpr1(tz);
  const builtInNow = funcNil1(now);
  const builtInUuid = funcNil1(uuid);
  const builtInStruuid = funcNil1(struuid);
  const builtInMd5 = funcExpr1(md5);
  const builtInSha1 = funcExpr1(sha1);
  const builtInSha256 = funcExpr1(sha256);
  const builtInSha384 = funcExpr1(sha384);
  const builtInSha512 = funcExpr1(sha512);
  const builtInCoalesce = funcExprList1(coalesce);
  const builtInIf = funcExpr3(if_);
  const builtInStrlang = funcExpr2(strlang);
  const builtInStrdt = funcExpr2(strdt);
  const builtInSameterm = funcExpr2(sameterm);
  const builtInIsiri = funcExpr1(isiri);
  const builtInIsuri = funcExpr1(isuri);
  const builtInIsblank = funcExpr1(isblank);
  const builtInIsliteral = funcExpr1(isliteral);
  const builtInIsnumeric = funcExpr1(isnumeric);
  function builtInCallList(SUBRULE) {
    return [
      { ALT: () => SUBRULE(aggregate) },
      { ALT: () => SUBRULE(builtInStr) },
      { ALT: () => SUBRULE(builtInLang) },
      { ALT: () => SUBRULE(builtInLangmatches) },
      { ALT: () => SUBRULE(builtInDatatype) },
      { ALT: () => SUBRULE(builtInBound) },
      { ALT: () => SUBRULE(builtInIri) },
      { ALT: () => SUBRULE(builtInUri) },
      { ALT: () => SUBRULE(builtInBnodeSparqlJs) },
      { ALT: () => SUBRULE(builtInRand) },
      { ALT: () => SUBRULE(builtInAbs) },
      { ALT: () => SUBRULE(builtInCeil) },
      { ALT: () => SUBRULE(builtInFloor) },
      { ALT: () => SUBRULE(builtInRound) },
      { ALT: () => SUBRULE(builtInConcat) },
      { ALT: () => SUBRULE(substringExpression) },
      { ALT: () => SUBRULE(builtInStrlen) },
      { ALT: () => SUBRULE(strReplaceExpression) },
      { ALT: () => SUBRULE(builtInUcase) },
      { ALT: () => SUBRULE(builtInLcase) },
      { ALT: () => SUBRULE(builtInEncode_for_uri) },
      { ALT: () => SUBRULE(builtInContains) },
      { ALT: () => SUBRULE(builtInStrstarts) },
      { ALT: () => SUBRULE(builtInStrends) },
      { ALT: () => SUBRULE(builtInStrbefore) },
      { ALT: () => SUBRULE(builtInStrafter) },
      { ALT: () => SUBRULE(builtInYear) },
      { ALT: () => SUBRULE(builtInMonth) },
      { ALT: () => SUBRULE(builtInDay) },
      { ALT: () => SUBRULE(builtInHours) },
      { ALT: () => SUBRULE(builtInMinutes) },
      { ALT: () => SUBRULE(builtInSeconds) },
      { ALT: () => SUBRULE(builtInTimezone) },
      { ALT: () => SUBRULE(builtInTz) },
      { ALT: () => SUBRULE(builtInNow) },
      { ALT: () => SUBRULE(builtInUuid) },
      { ALT: () => SUBRULE(builtInStruuid) },
      { ALT: () => SUBRULE(builtInMd5) },
      { ALT: () => SUBRULE(builtInSha1) },
      { ALT: () => SUBRULE(builtInSha256) },
      { ALT: () => SUBRULE(builtInSha384) },
      { ALT: () => SUBRULE(builtInSha512) },
      { ALT: () => SUBRULE(builtInCoalesce) },
      { ALT: () => SUBRULE(builtInIf) },
      { ALT: () => SUBRULE(builtInStrlang) },
      { ALT: () => SUBRULE(builtInStrdt) },
      { ALT: () => SUBRULE(builtInSameterm) },
      { ALT: () => SUBRULE(builtInIsiri) },
      { ALT: () => SUBRULE(builtInIsuri) },
      { ALT: () => SUBRULE(builtInIsblank) },
      { ALT: () => SUBRULE(builtInIsliteral) },
      { ALT: () => SUBRULE(builtInIsnumeric) },
      { ALT: () => SUBRULE(regexExpression) },
      { ALT: () => SUBRULE(existsFunc) },
      { ALT: () => SUBRULE(notExistsFunc) }
    ];
  }
  const builtInCall$1 = {
    name: "builtInCall",
    impl: ({ OR, SUBRULE, cache }) => () => {
      const cached = cache.get(builtInCall$1);
      if (cached) {
        return OR(cached);
      }
      const builtIns = builtInCallList(SUBRULE);
      cache.set(builtInCall$1, builtIns);
      return OR(builtIns);
    }
  };
  const regexExpression = funcExpr2or3(regex);
  const substringExpression = funcExpr2or3(substr);
  const strReplaceExpression = funcExpr3or4(replace);
  const existsFunc = funcGroupGraphPattern(exists);
  const notExistsFunc = funcGroupGraphPattern(notexists);
  const aggregateCount = {
    name: unCapitalize(count.name),
    impl: ({ ACTION, CONSUME, SUBRULE, OR, OPTION }) => (C) => {
      const operatorToken = CONSUME(count);
      CONSUME(LParen);
      const distinctToken = OPTION(() => CONSUME(distinct));
      const expressionVal = OR([
        { ALT: () => {
          const starToken = CONSUME(star);
          return ACTION(() => C.astFactory.wildcard(C.astFactory.sourceLocation(starToken)));
        } },
        { ALT: () => SUBRULE(expression) }
      ]);
      const closeToken = CONSUME(RParen);
      return ACTION(() => {
        const F2 = C.astFactory;
        if (C.astFactory.isWildcard(expressionVal)) {
          return F2.aggregate(operatorToken.image, Boolean(distinctToken), expressionVal, void 0, C.astFactory.sourceLocation(operatorToken, closeToken));
        }
        return F2.aggregate(operatorToken.image, Boolean(distinctToken), expressionVal, void 0, C.astFactory.sourceLocation(operatorToken, closeToken));
      });
    }
  };
  const aggregateSum = baseAggregateFunc(sum);
  const aggregateMin = baseAggregateFunc(min);
  const aggregateMax = baseAggregateFunc(max);
  const aggregateAvg = baseAggregateFunc(avg);
  const aggregateSample = baseAggregateFunc(sample);
  const aggregateGroup_concat = {
    name: unCapitalize(groupConcat.name),
    impl: ({ ACTION, CONSUME, OPTION1, SUBRULE, OPTION2 }) => (C) => {
      const operatorToken = CONSUME(groupConcat);
      CONSUME(LParen);
      const distinctToken = OPTION1(() => CONSUME(distinct));
      const expr = SUBRULE(expression);
      const sep = OPTION2(() => {
        CONSUME(semi);
        CONSUME(separator);
        CONSUME(equal);
        return SUBRULE(string);
      });
      const closeToken = CONSUME(RParen);
      return ACTION(() => {
        const F2 = C.astFactory;
        return F2.aggregate(operatorToken.image, Boolean(distinctToken), expr, (sep == null ? void 0 : sep.value) ?? " ", F2.sourceLocation(operatorToken, closeToken));
      });
    }
  };
  const aggregate = {
    name: "aggregate",
    impl: ({ ACTION, SUBRULE, OR }) => (C) => {
      const wasInAggregate = ACTION(() => C.parseMode.has("inAggregate"));
      ACTION(() => C.parseMode.add("inAggregate"));
      const result = OR([
        { ALT: () => SUBRULE(aggregateCount) },
        { ALT: () => SUBRULE(aggregateSum) },
        { ALT: () => SUBRULE(aggregateMin) },
        { ALT: () => SUBRULE(aggregateMax) },
        { ALT: () => SUBRULE(aggregateAvg) },
        { ALT: () => SUBRULE(aggregateSample) },
        { ALT: () => SUBRULE(aggregateGroup_concat) }
      ]);
      ACTION(() => !wasInAggregate && C.parseMode.delete("inAggregate"));
      ACTION(() => {
        if (!C.parseMode.has("canParseAggregate")) {
          throw new Error("Aggregates are only allowed in SELECT, HAVING, and ORDER BY clauses.");
        }
        if (C.parseMode.has("inAggregate")) {
          throw new Error("An aggregate function is not allowed within an aggregate function.");
        }
      });
      return result;
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_WORD(ast.aggregation.toUpperCase(), "(");
        if (ast.distinct) {
          PRINT_WORD("DISTINCT");
        }
      });
      const arg = ast.expression[0];
      if (F2.isWildcard(arg)) {
        F2.printFilter(ast, () => PRINT_WORD("*"));
      } else {
        SUBRULE(expression, arg);
      }
      if (F2.isExpressionAggregateSeparator(ast)) {
        F2.printFilter(ast, () => PRINT_WORD(";", "SEPARATOR", "=", stringEscapedLexical(ast.separator)));
      }
      F2.printFilter(ast, () => PRINT_WORD(")"));
    }
  };
  const path = {
    name: "path",
    impl: ({ SUBRULE }) => () => SUBRULE(pathAlternative)
  };
  const pathGenerator = {
    name: "path",
    gImpl: ({ PRINT, SUBRULE }) => (ast, { astFactory: F2 }, braces = true) => {
      if (F2.isTerm(ast) && F2.isTermNamed(ast)) {
        SUBRULE(iri, ast);
      } else {
        F2.printFilter(ast, () => braces && PRINT("("));
        switch (ast.subType) {
          case "|":
          case "/": {
            const [head2, ...tail] = ast.items;
            SUBRULE(pathGenerator, head2, braces);
            for (const val of tail) {
              F2.printFilter(ast, () => PRINT(ast.subType));
              SUBRULE(pathGenerator, val, braces);
            }
            break;
          }
          case "^":
            F2.printFilter(ast, () => PRINT("^"));
            SUBRULE(pathGenerator, ast.items[0], braces);
            break;
          case "?":
          case "*":
          case "+":
            SUBRULE(pathGenerator, ast.items[0], braces);
            F2.printFilter(ast, () => PRINT(ast.subType));
            break;
          case "!":
            F2.printFilter(ast, () => PRINT("!"));
            F2.printFilter(ast, () => PRINT("("));
            SUBRULE(pathGenerator, ast.items[0], false);
            F2.printFilter(ast, () => PRINT(")"));
            break;
        }
        F2.printFilter(ast, () => braces && PRINT(")"));
      }
    }
  };
  function pathChainHelper(name, SEP, subType, subRule) {
    return {
      name,
      impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, MANY }) => (C) => {
        const head2 = SUBRULE1(subRule);
        let tailEnd = head2;
        const tail = [];
        MANY(() => {
          CONSUME(SEP);
          tailEnd = SUBRULE2(subRule);
          tail.push(tailEnd);
        });
        return ACTION(() => tail.length === 0 ? head2 : C.astFactory.path(subType, [head2, ...tail], C.astFactory.sourceLocation(head2, tailEnd)));
      }
    };
  }
  const pathEltOrInverse = {
    name: "pathEltOrInverse",
    impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, OR }) => (C) => OR([
      { ALT: () => SUBRULE1(pathElt) },
      { ALT: () => {
        const hat$1 = CONSUME(hat);
        const item = SUBRULE2(pathElt);
        return ACTION(() => C.astFactory.path("^", [item], C.astFactory.sourceLocation(hat$1, item)));
      } }
    ])
  };
  const pathSequence = pathChainHelper("pathSequence", slash, "/", pathEltOrInverse);
  const pathAlternative = pathChainHelper("pathAlternative", pipe, "|", pathSequence);
  const pathElt = {
    name: "pathElt",
    impl: ({ ACTION, SUBRULE, OPTION }) => (C) => {
      const item = SUBRULE(pathPrimary);
      const modification = OPTION(() => SUBRULE(pathMod));
      return ACTION(() => modification === void 0 ? item : C.astFactory.path(modification.image, [item], C.astFactory.sourceLocation(item, modification)));
    }
  };
  const pathMod = {
    name: "pathMod",
    impl: ({ CONSUME, OR }) => () => OR([
      { ALT: () => CONSUME(question) },
      { ALT: () => CONSUME(star) },
      { ALT: () => CONSUME(opPlus) }
    ])
  };
  const pathPrimary = {
    name: "pathPrimary",
    impl: ({ SUBRULE, CONSUME, OR }) => () => OR([
      { ALT: () => SUBRULE(iri) },
      { ALT: () => SUBRULE(verbA) },
      { ALT: () => SUBRULE(pathNegatedPropertySet) },
      { ALT: () => {
        CONSUME(LParen);
        const resRecursive = SUBRULE(path);
        CONSUME(RParen);
        return resRecursive;
      } }
    ])
  };
  const pathNegatedPropertySet = {
    name: "pathNegatedPropertySet",
    impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, SUBRULE3, OR, MANY }) => (C) => {
      const exclamation$1 = CONSUME(exclamation);
      return OR([
        { ALT: () => {
          const noAlternative = SUBRULE1(pathOneInPropertySet);
          return ACTION(() => C.astFactory.path("!", [noAlternative], C.astFactory.sourceLocation(exclamation$1, noAlternative)));
        } },
        { ALT: () => {
          const open = CONSUME(LParen);
          const head2 = SUBRULE2(pathOneInPropertySet);
          const tail = [];
          MANY(() => {
            CONSUME(pipe);
            const item = SUBRULE3(pathOneInPropertySet);
            tail.push(item);
          });
          const close = CONSUME(RParen);
          return ACTION(() => {
            const F2 = C.astFactory;
            if (tail.length === 0) {
              return F2.path("!", [head2], F2.sourceLocation(exclamation$1, close));
            }
            return F2.path("!", [F2.path("|", [head2, ...tail], F2.sourceLocation(open, close))], F2.sourceLocation(exclamation$1, close));
          });
        } }
      ]);
    }
  };
  const pathOneInPropertySet = {
    name: "pathOneInPropertySet",
    impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, OR1, OR2 }) => (C) => OR1([
      { ALT: () => SUBRULE1(iri) },
      { ALT: () => SUBRULE1(verbA) },
      { ALT: () => {
        const hat$1 = CONSUME(hat);
        const item = OR2([
          { ALT: () => SUBRULE2(iri) },
          { ALT: () => SUBRULE2(verbA) }
        ]);
        return ACTION(() => C.astFactory.path("^", [item], C.astFactory.sourceLocation(hat$1, item)));
      } }
    ])
  };
  function triplesDotSeperated(triplesSameSubjectSubrule) {
    return ({ ACTION, AT_LEAST_ONE, SUBRULE, CONSUME, OPTION }) => (C) => {
      const triples = [];
      let parsedDot = true;
      let dotToken;
      AT_LEAST_ONE({
        GATE: () => parsedDot,
        DEF: () => {
          parsedDot = false;
          const template = SUBRULE(triplesSameSubjectSubrule);
          ACTION(() => {
            triples.push(...template);
          });
          OPTION(() => {
            dotToken = CONSUME(dot);
            parsedDot = true;
          });
        }
      });
      return ACTION(() => C.astFactory.patternBgp(triples, C.astFactory.sourceLocation(...triples, dotToken)));
    };
  }
  const triplesBlock = {
    name: "triplesBlock",
    impl: (implArgs) => (C) => triplesDotSeperated(triplesSameSubjectPath$1)(implArgs)(C),
    gImpl: ({ SUBRULE, PRINT_WORD, HANDLE_LOC, NEW_LINE }) => (ast, { astFactory: F2 }) => {
      for (const [index, triple] of ast.triples.entries()) {
        HANDLE_LOC(triple, () => {
          const nextTriple = ast.triples.at(index + 1);
          if (F2.isTripleCollection(triple)) {
            SUBRULE(graphNodePath$1, triple);
            const isSubjectOfTriple = (nextTriple == null ? void 0 : nextTriple.type) === "triple" && F2.isSourceLocationNoMaterialize(nextTriple.subject.loc);
            if (!isSubjectOfTriple) {
              F2.printFilter(triple, () => {
                PRINT_WORD(".");
                NEW_LINE();
              });
            }
          } else {
            SUBRULE(graphNodePath$1, triple.subject);
            F2.printFilter(triple, () => PRINT_WORD(""));
            if (F2.isTerm(triple.predicate) && F2.isTermVariable(triple.predicate)) {
              SUBRULE(varOrTerm$1, triple.predicate);
            } else {
              SUBRULE(pathGenerator, triple.predicate, void 0);
            }
            F2.printFilter(triple, () => PRINT_WORD(""));
            SUBRULE(graphNodePath$1, triple.object);
            if (nextTriple === void 0 || F2.isTripleCollection(nextTriple) || !F2.isSourceLocationNoMaterialize(nextTriple.subject.loc)) {
              F2.printFilter(ast, () => {
                PRINT_WORD(".");
                NEW_LINE();
              });
            } else if (F2.isSourceLocationNoMaterialize(nextTriple.predicate.loc)) {
              F2.printFilter(ast, () => PRINT_WORD(","));
            } else {
              F2.printFilter(ast, () => {
                PRINT_WORD(";");
                NEW_LINE();
              });
            }
          }
        });
      }
    }
  };
  function triplesSameSubjectImpl$1(name, allowPaths) {
    return {
      name,
      impl: ({ ACTION, SUBRULE, OR }) => (C) => OR([
        { ALT: () => {
          const subject = SUBRULE(varOrTerm$1);
          const res = SUBRULE(allowPaths ? propertyListPathNotEmpty : propertyListNotEmpty, ACTION(() => C.astFactory.dematerialized(subject)));
          return ACTION(() => {
            if (res.length > 0) {
              res[0].subject = subject;
              res[0].loc = C.astFactory.sourceLocation(subject, res[0]);
            }
            return res;
          });
        } },
        { ALT: () => {
          const subjectNode = SUBRULE(allowPaths ? triplesNodePath : triplesNode);
          const restNode = SUBRULE(allowPaths ? propertyListPath : propertyList, ACTION(() => C.astFactory.graphNodeIdentifier(subjectNode)));
          return ACTION(() => {
            if (restNode.length === 0) {
              return [subjectNode];
            }
            restNode[0].subject = subjectNode;
            restNode[0].loc = C.astFactory.sourceLocation(subjectNode, restNode[0]);
            return restNode;
          });
        } }
      ])
    };
  }
  const triplesSameSubject$1 = triplesSameSubjectImpl$1("triplesSameSubject", false);
  const triplesSameSubjectPath$1 = triplesSameSubjectImpl$1("triplesSameSubjectPath", true);
  const triplesTemplate = {
    name: "triplesTemplate",
    impl: triplesDotSeperated(triplesSameSubject$1)
  };
  function propertyListImpl(name, allowPaths) {
    return {
      name,
      impl: ({ SUBRULE, OPTION }) => (_, subject) => OPTION(() => SUBRULE(allowPaths ? propertyListPathNotEmpty : propertyListNotEmpty, subject)) ?? []
    };
  }
  const propertyList = propertyListImpl("propertyList", false);
  const propertyListPath = propertyListImpl("propertyListPath", true);
  function propertyListNotEmptyImplementation(name, allowPaths) {
    return {
      name,
      impl: ({ ACTION, CONSUME, AT_LEAST_ONE, SUBRULE1, MANY2, OR1 }) => (_, subject) => {
        const result = [];
        let parsedSemi = true;
        AT_LEAST_ONE({
          GATE: () => parsedSemi,
          DEF: () => {
            parsedSemi = false;
            const predicate = allowPaths ? OR1([
              { ALT: () => SUBRULE1(verbPath) },
              { ALT: () => SUBRULE1(verbSimple) }
            ]) : SUBRULE1(verb);
            const triples = SUBRULE1(allowPaths ? objectListPath : objectList, subject, predicate);
            MANY2(() => {
              CONSUME(semi);
              parsedSemi = true;
            });
            ACTION(() => {
              result.push(...triples);
            });
          }
        });
        return result;
      }
    };
  }
  const propertyListNotEmpty = propertyListNotEmptyImplementation("propertyListNotEmpty", false);
  const propertyListPathNotEmpty = propertyListNotEmptyImplementation("propertyListPathNotEmpty", true);
  const verbPath = {
    name: "verbPath",
    impl: ({ SUBRULE }) => () => SUBRULE(path)
  };
  const verbSimple = {
    name: "verbSimple",
    impl: ({ SUBRULE }) => () => SUBRULE(var_)
  };
  function objectListImpl(name, allowPaths) {
    return {
      name,
      impl: ({ ACTION, SUBRULE, AT_LEAST_ONE_SEP }) => (_, subj, pred) => {
        const objects = [];
        AT_LEAST_ONE_SEP({
          SEP: comma,
          DEF: () => {
            const objectTriple = SUBRULE(allowPaths ? objectPath$1 : object$1, subj, pred);
            ACTION(() => {
              objects.push(objectTriple);
            });
          }
        });
        return objects;
      }
    };
  }
  const objectList = objectListImpl("objectList", false);
  const objectListPath = objectListImpl("objectListPath", true);
  function objectImpl$1(name, allowPaths) {
    return {
      name,
      impl: ({ ACTION, SUBRULE }) => (C, subject, predicate) => {
        const node = SUBRULE(allowPaths ? graphNodePath$1 : graphNode$1);
        return ACTION(() => C.astFactory.triple(subject, predicate, node));
      }
    };
  }
  const object$1 = objectImpl$1("object", false);
  const objectPath$1 = objectImpl$1("objectPath", true);
  function collectionImpl(name, allowPaths) {
    return {
      name,
      impl: ({ ACTION, AT_LEAST_ONE, SUBRULE, CONSUME }) => (C) => {
        const terms = [];
        const startToken = CONSUME(LParen);
        AT_LEAST_ONE(() => {
          terms.push(SUBRULE(allowPaths ? graphNodePath$1 : graphNode$1));
        });
        const endToken = CONSUME(RParen);
        return ACTION(() => {
          const F2 = C.astFactory;
          const triples = [];
          const predFirst = F2.termNamed(F2.sourceLocation(), CommonIRIs.FIRST, void 0);
          const predRest = F2.termNamed(F2.sourceLocation(), CommonIRIs.REST, void 0);
          const predNil = F2.termNamed(F2.sourceLocation(), CommonIRIs.NIL, void 0);
          const listHead = F2.termBlank(void 0, F2.sourceLocation());
          let iterHead = listHead;
          for (const [index, term] of terms.entries()) {
            const lastInList = index === terms.length - 1;
            const headTriple = F2.triple(iterHead, predFirst, term);
            triples.push(headTriple);
            if (lastInList) {
              const nilTriple = F2.triple(iterHead, predRest, predNil);
              triples.push(nilTriple);
            } else {
              const tail = F2.termBlank(void 0, F2.sourceLocation());
              const linkTriple = F2.triple(iterHead, predRest, tail);
              triples.push(linkTriple);
              iterHead = tail;
            }
          }
          return F2.tripleCollectionList(listHead, triples, F2.sourceLocation(startToken, endToken));
        });
      },
      gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
        F2.printFilter(ast, () => PRINT_WORD("("));
        for (const [idx, triple] of ast.triples.entries()) {
          if (idx % 2 === 0) {
            SUBRULE(allowPaths ? graphNodePath$1 : graphNode$1, triple.object);
          }
        }
        F2.printFilter(ast, () => PRINT_WORD(")"));
      }
    };
  }
  const collection = collectionImpl("collection", false);
  const collectionPath = collectionImpl("collectionPath", true);
  function triplesNodeImpl(name, allowPaths) {
    return {
      name,
      impl: ({ SUBRULE, OR }) => () => OR([
        { ALT: () => SUBRULE(allowPaths ? collectionPath : collection) },
        { ALT: () => SUBRULE(allowPaths ? blankNodePropertyListPath : blankNodePropertyList) }
      ]),
      gImpl: ({ SUBRULE }) => (ast) => ast.subType === "list" ? SUBRULE(allowPaths ? collectionPath : collection, ast) : SUBRULE(allowPaths ? blankNodePropertyListPath : blankNodePropertyList, ast)
    };
  }
  const triplesNode = triplesNodeImpl("triplesNode", false);
  const triplesNodePath = triplesNodeImpl("triplesNodePath", true);
  function blankNodePropertyListImpl(name, allowPaths) {
    const propertyPathNotEmptyImpl = allowPaths ? propertyListPathNotEmpty : propertyListNotEmpty;
    return {
      name,
      impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
        const startToken = CONSUME(LSquare);
        const blankNode2 = ACTION(() => C.astFactory.termBlank(void 0, C.astFactory.sourceLocation()));
        const propList = SUBRULE(propertyPathNotEmptyImpl, blankNode2);
        const endToken = CONSUME(RSquare);
        return ACTION(() => C.astFactory.tripleCollectionBlankNodeProperties(blankNode2, propList, C.astFactory.sourceLocation(startToken, endToken)));
      },
      gImpl: ({ SUBRULE, PRINT, PRINT_WORD, HANDLE_LOC, PRINT_ON_EMPTY, NEW_LINE }) => (ast, c) => {
        const { astFactory: F2, indentInc } = c;
        F2.printFilter(ast, () => {
          c[traqulaIndentation] += indentInc;
          PRINT("[");
          NEW_LINE();
        });
        for (const triple of ast.triples) {
          HANDLE_LOC(triple, () => {
            if (F2.isTerm(triple.predicate) && F2.isTermVariable(triple.predicate)) {
              SUBRULE(varOrTerm$1, triple.predicate);
            } else {
              SUBRULE(pathGenerator, triple.predicate, void 0);
            }
            F2.printFilter(triple, () => PRINT_WORD(""));
            SUBRULE(graphNodePath$1, triple.object);
            F2.printFilter(ast, () => {
              PRINT_WORD(";");
              NEW_LINE();
            });
          });
        }
        F2.printFilter(ast, () => {
          c[traqulaIndentation] -= indentInc;
          PRINT_ON_EMPTY("]");
        });
      }
    };
  }
  const blankNodePropertyList = blankNodePropertyListImpl("blankNodePropertyList", false);
  const blankNodePropertyListPath = blankNodePropertyListImpl("blankNodePropertyListPath", true);
  function graphNodeImpl(name, allowPaths) {
    const triplesNodeRule = allowPaths ? triplesNodePath : triplesNode;
    return {
      name,
      impl: ({ SUBRULE, OR }) => (C) => OR([
        { ALT: () => SUBRULE(varOrTerm$1) },
        {
          GATE: () => C.parseMode.has("canCreateBlankNodes"),
          ALT: () => SUBRULE(triplesNodeRule)
        }
      ]),
      gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
        if (F2.isTerm(ast)) {
          SUBRULE(varOrTerm$1, ast);
        } else {
          SUBRULE(triplesNodeRule, ast);
        }
      }
    };
  }
  const graphNode$1 = graphNodeImpl("graphNode", false);
  const graphNodePath$1 = graphNodeImpl("graphNodePath", true);
  const whereClause = {
    name: "whereClause",
    impl: ({ ACTION, SUBRULE, CONSUME, OPTION }) => (C) => {
      const where$1 = OPTION(() => CONSUME(where));
      const group = SUBRULE(groupGraphPattern);
      return ACTION(() => C.astFactory.wrap(group, C.astFactory.sourceLocation(where$1, group)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_WORD("WHERE"));
      SUBRULE(groupGraphPattern, ast.val);
    }
  };
  const groupGraphPattern = {
    name: "groupGraphPattern",
    impl: ({ ACTION, SUBRULE, CONSUME, OR }) => (C) => {
      const open = CONSUME(LCurly);
      const patterns = OR([
        { ALT: () => [SUBRULE(subSelect)] },
        { ALT: () => SUBRULE(groupGraphPatternSub) }
      ]);
      const close = CONSUME(RCurly);
      return ACTION(() => C.astFactory.patternGroup(patterns, C.astFactory.sourceLocation(open, close)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD, NEW_LINE, PRINT_ON_OWN_LINE }) => (ast, C) => {
      const { astFactory: F2, indentInc } = C;
      F2.printFilter(ast, () => {
        C[traqulaIndentation] += indentInc;
        PRINT_WORD("{");
        NEW_LINE();
      });
      for (const pattern of ast.patterns) {
        SUBRULE(generatePattern, pattern);
      }
      F2.printFilter(ast, () => {
        C[traqulaIndentation] -= indentInc;
        PRINT_ON_OWN_LINE("}");
      });
    }
  };
  const generatePattern = {
    name: "generatePattern",
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      if (ast.type === "query") {
        SUBRULE(query, F2.querySelect({
          context: [],
          datasets: F2.datasetClauses([], F2.sourceLocation()),
          where: ast.where,
          variables: ast.variables,
          solutionModifiers: ast.solutionModifiers,
          values: ast.values,
          distinct: ast.distinct,
          reduced: ast.reduced
        }, ast.loc));
      } else if (ast.subType === "group") {
        SUBRULE(groupGraphPattern, ast);
      } else if (ast.subType === "bgp") {
        SUBRULE(triplesBlock, ast);
      } else {
        SUBRULE(graphPatternNotTriples, ast);
      }
    }
  };
  const groupGraphPatternSub = {
    name: "groupGraphPatternSub",
    impl: ({ ACTION, SUBRULE, CONSUME, MANY, SUBRULE1, SUBRULE2, OPTION1, OPTION2, OPTION3 }) => (C) => {
      const patterns = [];
      const bgpPattern = OPTION1(() => SUBRULE1(triplesBlock));
      if (bgpPattern) {
        patterns.push(bgpPattern);
      }
      MANY(() => {
        const notTriples = SUBRULE(graphPatternNotTriples);
        patterns.push(notTriples);
        OPTION2(() => CONSUME(dot));
        const moreTriples = OPTION3(() => SUBRULE2(triplesBlock));
        if (moreTriples) {
          patterns.push(moreTriples);
        }
      });
      ACTION(() => !C.skipValidation && checkNote13(patterns));
      return patterns;
    }
  };
  const graphPatternNotTriples = {
    name: "graphPatternNotTriples",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(groupOrUnionGraphPattern) },
      { ALT: () => SUBRULE(optionalGraphPattern) },
      { ALT: () => SUBRULE(minusGraphPattern) },
      { ALT: () => SUBRULE(graphGraphPattern) },
      { ALT: () => SUBRULE(serviceGraphPattern) },
      { ALT: () => SUBRULE(filter) },
      { ALT: () => SUBRULE(bind) },
      { ALT: () => SUBRULE(inlineData) }
    ]),
    gImpl: ({ SUBRULE }) => (ast) => {
      switch (ast.subType) {
        case "group":
        case "union":
          SUBRULE(groupOrUnionGraphPattern, ast);
          break;
        case "optional":
          SUBRULE(optionalGraphPattern, ast);
          break;
        case "minus":
          SUBRULE(minusGraphPattern, ast);
          break;
        case "graph":
          SUBRULE(graphGraphPattern, ast);
          break;
        case "service":
          SUBRULE(serviceGraphPattern, ast);
          break;
        case "filter":
          SUBRULE(filter, ast);
          break;
        case "bind":
          SUBRULE(bind, ast);
          break;
        case "values":
          SUBRULE(inlineData, ast);
          break;
      }
    }
  };
  const optionalGraphPattern = {
    name: "optionalGraphPattern",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const optional$1 = CONSUME(optional);
      const group = SUBRULE(groupGraphPattern);
      return ACTION(() => C.astFactory.patternOptional(group.patterns, C.astFactory.sourceLocation(optional$1, group)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_WORD("OPTIONAL"));
      SUBRULE(groupGraphPattern, F2.patternGroup(ast.patterns, ast.loc));
    }
  };
  const graphGraphPattern = {
    name: "graphGraphPattern",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const graph$1 = CONSUME(graph);
      const name = SUBRULE(varOrIri);
      const group = SUBRULE(groupGraphPattern);
      return ACTION(() => C.astFactory.patternGraph(name, group.patterns, C.astFactory.sourceLocation(graph$1, group)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_WORD("GRAPH"));
      SUBRULE(varOrTerm$1, ast.name);
      SUBRULE(groupGraphPattern, F2.patternGroup(ast.patterns, ast.loc));
    }
  };
  const serviceGraphPattern = {
    name: "serviceGraphPattern",
    impl: ({ ACTION, SUBRULE1, CONSUME, OPTION }) => (C) => {
      const service$1 = CONSUME(service);
      const silent$1 = OPTION(() => {
        CONSUME(silent);
        return true;
      }) ?? false;
      const name = SUBRULE1(varOrIri);
      const group = SUBRULE1(groupGraphPattern);
      return ACTION(() => C.astFactory.patternService(name, group.patterns, silent$1, C.astFactory.sourceLocation(service$1, group)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_WORD("SERVICE");
        if (ast.silent) {
          PRINT_WORD("SILENT");
        }
      });
      SUBRULE(varOrTerm$1, ast.name);
      SUBRULE(groupGraphPattern, F2.patternGroup(ast.patterns, ast.loc));
    }
  };
  const bind = {
    name: "bind",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const bind2 = CONSUME(bind$1);
      CONSUME(LParen);
      const expressionVal = SUBRULE(expression);
      CONSUME(as);
      const variable = SUBRULE(var_);
      const close = CONSUME(RParen);
      return ACTION(() => C.astFactory.patternBind(expressionVal, variable, C.astFactory.sourceLocation(bind2, close)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD, NEW_LINE }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_WORD("BIND", "("));
      SUBRULE(expression, ast.expression);
      F2.printFilter(ast, () => PRINT_WORD("AS"));
      SUBRULE(var_, ast.variable);
      F2.printFilter(ast, () => {
        PRINT_WORD(")");
        NEW_LINE();
      });
    }
  };
  const inlineData = {
    name: "inlineData",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const values$12 = CONSUME(values);
      const datablock = SUBRULE(dataBlock);
      return ACTION(() => {
        datablock.loc = C.astFactory.sourceLocation(values$12, datablock);
        return datablock;
      });
    },
    gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY, NEW_LINE, PRINT_ON_OWN_LINE }) => (ast, C) => {
      const { astFactory: F2, indentInc } = C;
      const variables = ast.variables;
      const singleVar = variables.length === 1;
      F2.printFilter(ast, () => {
        PRINT_ON_EMPTY("VALUES", singleVar ? "" : "( ");
      });
      for (const variable of variables) {
        F2.printFilter(ast, () => PRINT_WORD(""));
        SUBRULE(varOrTerm$1, variable);
        F2.printFilter(ast, () => PRINT_WORD(""));
      }
      F2.printFilter(ast, () => {
        C[traqulaIndentation] += indentInc;
        PRINT_WORD(singleVar ? "" : ")", "{");
        NEW_LINE();
      });
      for (const mapping of ast.values) {
        F2.printFilter(ast, () => !singleVar && PRINT_WORD("("));
        for (const variable of variables) {
          const var_2 = variable.value;
          if (mapping[var_2] === void 0) {
            F2.printFilter(ast, () => PRINT_WORD("UNDEF"));
          } else {
            SUBRULE(graphNodePath$1, mapping[var_2]);
          }
        }
        F2.printFilter(ast, () => {
          PRINT_WORD(singleVar ? "" : ")");
          NEW_LINE();
        });
      }
      F2.printFilter(ast, () => {
        C[traqulaIndentation] -= indentInc;
        PRINT_ON_OWN_LINE("}");
      });
    }
  };
  const dataBlock = {
    name: "dataBlock",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(inlineDataOneVar) },
      { ALT: () => SUBRULE(inlineDataFull) }
    ])
  };
  const inlineDataOneVar = {
    name: "inlineDataOneVar",
    impl: ({ ACTION, SUBRULE, CONSUME, MANY }) => (C) => {
      const res = [];
      const varVal = SUBRULE(var_);
      CONSUME(LCurly);
      MANY(() => {
        const value = SUBRULE(dataBlockValue$1);
        ACTION(() => {
          res.push({ [varVal.value]: value });
        });
      });
      const close = CONSUME(RCurly);
      return ACTION(() => C.astFactory.patternValues([varVal], res, C.astFactory.sourceLocation(varVal, close)));
    }
  };
  const inlineDataFull = {
    name: "inlineDataFull",
    impl: ({ ACTION, OR, MANY1, MANY2, MANY3, MANY4, SUBRULE, CONSUME1, CONSUME2 }) => (C) => {
      const res = [];
      const vars = [];
      return OR([
        { ALT: () => {
          const nil$1 = CONSUME1(nil);
          CONSUME1(LCurly);
          MANY1(() => {
            CONSUME2(nil);
            res.push({});
          });
          const close = CONSUME1(RCurly);
          return ACTION(() => C.astFactory.patternValues(vars, res, C.astFactory.sourceLocation(nil$1, close)));
        } },
        { ALT: () => {
          const open = CONSUME1(LParen);
          MANY2(() => {
            vars.push(SUBRULE(var_));
          });
          CONSUME1(RParen);
          CONSUME2(LCurly);
          MANY3(() => {
            let parsedValues = 0;
            const currentRow = {};
            CONSUME2(LParen);
            MANY4(() => {
              ACTION(() => {
                if (!C.skipValidation && parsedValues >= vars.length) {
                  throw new Error("Number of dataBlockValues does not match number of variables. Too much values.");
                }
              });
              const value = SUBRULE(dataBlockValue$1);
              ACTION(() => {
                currentRow[vars[parsedValues].value] = value;
                parsedValues++;
              });
            });
            CONSUME2(RParen);
            ACTION(() => {
              res.push(currentRow);
              if (!C.skipValidation && vars.length !== parsedValues) {
                throw new Error("Number of dataBlockValues does not match number of variables. Too few values.");
              }
            });
          });
          const close = CONSUME2(RCurly);
          return ACTION(() => C.astFactory.patternValues(vars, res, C.astFactory.sourceLocation(open, close)));
        } }
      ]);
    }
  };
  const dataBlockValue$1 = {
    name: "dataBlockValue",
    impl: ({ SUBRULE, CONSUME, OR }) => () => OR([
      { ALT: () => SUBRULE(iri) },
      { ALT: () => SUBRULE(rdfLiteral$1) },
      { ALT: () => SUBRULE(numericLiteral) },
      { ALT: () => SUBRULE(booleanLiteral) },
      { ALT: () => {
        CONSUME(undef);
        return void 0;
      } }
    ])
  };
  const minusGraphPattern = {
    name: "minusGraphPattern",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const minus$1 = CONSUME(minus);
      const group = SUBRULE(groupGraphPattern);
      return ACTION(() => C.astFactory.patternMinus(group.patterns, C.astFactory.sourceLocation(minus$1, group)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_WORD("MINUS"));
      SUBRULE(groupGraphPattern, F2.patternGroup(ast.patterns, ast.loc));
    }
  };
  const groupOrUnionGraphPattern = {
    name: "groupOrUnionGraphPattern",
    impl: ({ ACTION, MANY, SUBRULE1, SUBRULE2, CONSUME }) => (C) => {
      const groups = [];
      const group = SUBRULE1(groupGraphPattern);
      groups.push(group);
      MANY(() => {
        CONSUME(union);
        const group2 = SUBRULE2(groupGraphPattern);
        groups.push(group2);
      });
      return ACTION(() => groups.length === 1 ? groups[0] : C.astFactory.patternUnion(groups, C.astFactory.sourceLocation(group, groups.at(-1))));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      if (F2.isPatternUnion(ast)) {
        const [head2, ...tail] = ast.patterns;
        SUBRULE(groupGraphPattern, head2);
        for (const pattern of tail) {
          F2.printFilter(ast, () => PRINT_WORD("UNION"));
          SUBRULE(groupGraphPattern, pattern);
        }
      } else {
        SUBRULE(groupGraphPattern, ast);
      }
    }
  };
  const filter = {
    name: "filter",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const filterToken = CONSUME(filter$1);
      const expression2 = SUBRULE(constraint);
      return ACTION(() => C.astFactory.patternFilter(expression2, C.astFactory.sourceLocation(filterToken, expression2)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD, NEW_LINE }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_WORD("FILTER ("));
      SUBRULE(expression, ast.expression);
      F2.printFilter(ast, () => {
        PRINT_WORD(")");
        NEW_LINE();
      });
    }
  };
  const constraint = {
    name: "constraint",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(brackettedExpression) },
      { ALT: () => SUBRULE(builtInCall$1) },
      { ALT: () => SUBRULE(functionCall) }
    ])
  };
  const functionCall = {
    name: "functionCall",
    impl: ({ ACTION, SUBRULE }) => (C) => {
      const func = SUBRULE(iri);
      const args = SUBRULE(argList);
      return ACTION(() => C.astFactory.expressionFunctionCall(func, args.val.args, args.val.distinct, C.astFactory.sourceLocation(func, args)));
    }
  };
  const argList = {
    name: "argList",
    impl: ({ ACTION, CONSUME, SUBRULE1, OPTION, OR, AT_LEAST_ONE_SEP }) => (C) => OR([
      { ALT: () => {
        const nil$1 = CONSUME(nil);
        return ACTION(() => C.astFactory.wrap({ args: [], distinct: false }, C.astFactory.sourceLocation(nil$1)));
      } },
      { ALT: () => {
        const args = [];
        const open = CONSUME(LParen);
        const distinct$1 = OPTION(() => {
          CONSUME(distinct);
          return true;
        }) ?? false;
        AT_LEAST_ONE_SEP({
          SEP: comma,
          DEF: () => {
            const arg = SUBRULE1(expression);
            args.push(arg);
          }
        });
        const close = CONSUME(RParen);
        return ACTION(() => C.astFactory.wrap({ args, distinct: distinct$1 }, C.astFactory.sourceLocation(open, close)));
      } }
    ]),
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_WORD("(");
        if (ast.val.distinct) {
          PRINT_WORD("DISTINCT");
        }
      });
      const [head2, ...tail] = ast.val.args;
      if (head2) {
        SUBRULE(expression, head2);
      }
      for (const expr of tail) {
        F2.printFilter(ast, () => PRINT_WORD(","));
        SUBRULE(expression, expr);
      }
      F2.printFilter(ast, () => PRINT_WORD(")"));
    }
  };
  const expressionList = {
    name: "expressionList",
    impl: ({ ACTION, CONSUME, MANY, OR, SUBRULE1, SUBRULE2 }) => (C) => OR([
      { ALT: () => {
        const nil$1 = CONSUME(nil);
        return ACTION(() => C.astFactory.wrap([], C.astFactory.sourceLocation(nil$1)));
      } },
      { ALT: () => {
        const open = CONSUME(LParen);
        const expr1 = SUBRULE1(expression);
        const args = [expr1];
        MANY(() => {
          CONSUME(comma);
          const expr = SUBRULE2(expression);
          args.push(expr);
        });
        const close = CONSUME(RParen);
        return ACTION(() => C.astFactory.wrap(args, C.astFactory.sourceLocation(open, close)));
      } }
    ])
  };
  const infixOperators = /* @__PURE__ */ new Set(["in", "notin", "||", "&&", "=", "!=", "<", ">", "<=", ">=", "+", "-", "*", "/"]);
  const prefixOperator = { "!": "", uplus: "+", uminus: "-" };
  const expression = {
    name: "expression",
    impl: ({ SUBRULE }) => () => SUBRULE(conditionalOrExpression),
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      if (F2.isTerm(ast)) {
        SUBRULE(varOrTerm$1, ast);
      } else if (F2.isExpressionOperator(ast)) {
        if (infixOperators.has(ast.operator)) {
          const [left, ...right] = ast.args;
          F2.printFilter(ast, () => PRINT_WORD("("));
          SUBRULE(expression, left);
          F2.printFilter(ast, () => {
            if (ast.operator === "notin") {
              PRINT_WORD("NOT IN");
            } else if (ast.operator === "in") {
              PRINT_WORD("IN");
            } else {
              PRINT_WORD(ast.operator.toUpperCase());
            }
          });
          if (right.length === 1) {
            SUBRULE(expression, right[0]);
          } else {
            SUBRULE(argList, F2.wrap({ args: right, distinct: false }, ast.loc));
          }
          F2.printFilter(ast, () => PRINT_WORD(")"));
        } else if (typeof prefixOperator[ast.operator] === "string") {
          const [expr] = ast.args;
          F2.printFilter(ast, () => PRINT_WORD(prefixOperator[ast.operator] || ast.operator.toUpperCase()));
          SUBRULE(expression, expr);
        } else {
          F2.printFilter(ast, () => PRINT_WORD(ast.operator.toUpperCase(), "("));
          const [head2, ...tail] = ast.args;
          if (head2) {
            SUBRULE(expression, head2);
          }
          for (const arg of tail) {
            F2.printFilter(ast, () => PRINT_WORD(","));
            SUBRULE(expression, arg);
          }
          F2.printFilter(ast, () => PRINT_WORD(")"));
        }
      } else if (F2.isExpressionPatternOperation(ast)) {
        const patterns = ast.args;
        F2.printFilter(ast, () => PRINT_WORD(ast.operator === "exists" ? "EXISTS" : "NOT EXISTS"));
        SUBRULE(groupGraphPattern, patterns);
      } else if (F2.isExpressionFunctionCall(ast)) {
        SUBRULE(iriOrFunction, ast);
      } else if (F2.isExpressionAggregate(ast)) {
        SUBRULE(aggregate, ast);
      }
    }
  };
  function constructLeftDeep(startGenerator, restGenerator, ACTION, MANY) {
    let iterExpr = startGenerator();
    MANY(() => {
      const res = restGenerator();
      ACTION(() => {
        iterExpr = res(iterExpr);
      });
    });
    return iterExpr;
  }
  const conditionalOrExpression = {
    name: "conditionalOrExpression",
    impl: ({ ACTION, MANY, CONSUME, SUBRULE1, SUBRULE2 }) => (C) => constructLeftDeep(() => SUBRULE1(conditionalAndExpression), () => {
      CONSUME(logicOr);
      const args = SUBRULE2(conditionalAndExpression);
      return (left) => ACTION(() => C.astFactory.expressionOperation("||", [left, args], C.astFactory.sourceLocation(left, args)));
    }, ACTION, MANY)
  };
  const conditionalAndExpression = {
    name: "conditionalAndExpression",
    impl: ({ ACTION, MANY, SUBRULE1, SUBRULE2, CONSUME }) => (C) => constructLeftDeep(() => SUBRULE1(valueLogical), () => {
      CONSUME(logicAnd);
      const arg = SUBRULE2(valueLogical);
      return (left) => ACTION(() => C.astFactory.expressionOperation("&&", [left, arg], C.astFactory.sourceLocation(left, arg)));
    }, ACTION, MANY)
  };
  const valueLogical = {
    name: "valueLogical",
    impl: ({ SUBRULE }) => () => SUBRULE(relationalExpression)
  };
  const relationalExpression = {
    name: "relationalExpression",
    impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, OPTION, OR1, OR2, OR3 }) => (C) => {
      const args1 = SUBRULE1(numericExpression);
      const expression2 = OPTION(() => OR1([
        { ALT: () => {
          const operator = OR2([
            { ALT: () => CONSUME(equal) },
            { ALT: () => CONSUME(notEqual) },
            { ALT: () => CONSUME(lessThan) },
            { ALT: () => CONSUME(greaterThan) },
            { ALT: () => CONSUME(lessThanEqual) },
            { ALT: () => CONSUME(greaterThanEqual) }
          ]);
          const expr = SUBRULE2(numericExpression);
          return ACTION(() => C.astFactory.expressionOperation(operator.image, [args1, expr], C.astFactory.sourceLocation(args1, expr)));
        } },
        { ALT: () => {
          const operator = OR3([
            { ALT: () => CONSUME(in_) },
            { ALT: () => CONSUME(notIn) }
          ]);
          const args = SUBRULE1(expressionList);
          return ACTION(() => C.astFactory.expressionOperation(operator.image, [args1, ...args.val], C.astFactory.sourceLocation(args1, args)));
        } }
      ]));
      return expression2 ?? args1;
    }
  };
  const numericExpression = {
    name: "numericExpression",
    impl: ({ SUBRULE }) => () => SUBRULE(additiveExpression)
  };
  const additiveExpression = {
    name: "additiveExpression",
    impl: ({ ACTION, SUBRULE, CONSUME, SUBRULE1, SUBRULE2, MANY1, MANY2, OR1, OR2, OR3, OR4 }) => (C) => constructLeftDeep(() => SUBRULE1(multiplicativeExpression), () => OR1([
      { ALT: () => {
        const operator = OR2([
          { ALT: () => CONSUME(opPlus) },
          { ALT: () => CONSUME(opMinus) }
        ]);
        const arg = SUBRULE2(multiplicativeExpression);
        return ACTION(() => (left) => C.astFactory.expressionOperation(operator.image, [left, arg], C.astFactory.sourceLocation(left, arg)));
      } },
      { ALT: () => {
        const { operator, startInt } = OR3([
          { ALT: () => {
            const integer2 = SUBRULE(numericLiteralPositive);
            return ACTION(() => {
              integer2.value = integer2.value.replace(/^\+/u, "");
              return {
                operator: "+",
                startInt: integer2
              };
            });
          } },
          { ALT: () => {
            const integer2 = SUBRULE(numericLiteralNegative);
            return ACTION(() => {
              integer2.value = integer2.value.replace(/^-/u, "");
              return {
                operator: "-",
                startInt: integer2
              };
            });
          } }
        ]);
        const multiplicativeExpr = constructLeftDeep(() => ACTION(() => startInt), () => {
          const innerOperator = OR4([
            { ALT: () => CONSUME(star) },
            { ALT: () => CONSUME(slash) }
          ]);
          const innerExpr = SUBRULE1(unaryExpression$1);
          return ACTION(() => (leftInner) => C.astFactory.expressionOperation(innerOperator.image, [leftInner, innerExpr], C.astFactory.sourceLocation(leftInner, innerExpr)));
        }, ACTION, MANY2);
        return (left) => C.astFactory.expressionOperation(operator, [left, multiplicativeExpr], C.astFactory.sourceLocation(left, multiplicativeExpr));
      } }
    ]), ACTION, MANY1)
  };
  const multiplicativeExpression = {
    name: "multiplicativeExpression",
    impl: ({ ACTION, CONSUME, MANY, SUBRULE1, SUBRULE2, OR }) => (C) => constructLeftDeep(() => SUBRULE1(unaryExpression$1), () => {
      const operator = OR([
        { ALT: () => CONSUME(star) },
        { ALT: () => CONSUME(slash) }
      ]);
      const expr = SUBRULE2(unaryExpression$1);
      return (left) => ({
        type: "expression",
        subType: "operation",
        operator: operator.image,
        args: [left, expr],
        loc: C.astFactory.sourceLocation(left, expr)
      });
    }, ACTION, MANY)
  };
  const unaryExpression$1 = {
    name: "unaryExpression",
    impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, OR1, OR2 }) => (C) => OR1([
      { ALT: () => SUBRULE1(primaryExpression$1) },
      { ALT: () => {
        const operator = OR2([
          { ALT: () => CONSUME(exclamation) },
          { ALT: () => CONSUME(opPlus) },
          { ALT: () => CONSUME(opMinus) }
        ]);
        const expr = SUBRULE2(primaryExpression$1);
        return ACTION(() => C.astFactory.expressionOperation(operator.image === "!" ? "!" : operator.image === "+" ? "UPLUS" : "UMINUS", [expr], C.astFactory.sourceLocation(operator, expr)));
      } }
    ])
  };
  const primaryExpression$1 = {
    name: "primaryExpression",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(brackettedExpression) },
      { ALT: () => SUBRULE(builtInCall$1) },
      { ALT: () => SUBRULE(iriOrFunction) },
      { ALT: () => SUBRULE(rdfLiteral$1) },
      { ALT: () => SUBRULE(numericLiteral) },
      { ALT: () => SUBRULE(booleanLiteral) },
      { ALT: () => SUBRULE(var_) }
    ])
  };
  const brackettedExpression = {
    name: "brackettedExpression",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const open = CONSUME(LParen);
      const expr = SUBRULE(expression);
      const close = CONSUME(RParen);
      return ACTION(() => {
        expr.loc = C.astFactory.sourceLocation(open, close);
        return expr;
      });
    }
  };
  const iriOrFunction = {
    name: "iriOrFunction",
    impl: ({ ACTION, SUBRULE, OPTION }) => (C) => {
      const iriVal = SUBRULE(iri);
      const functionCall2 = OPTION(() => {
        const args = SUBRULE(argList);
        return ACTION(() => {
          const distinct2 = args.val.distinct;
          if (!C.parseMode.has("canParseAggregate") && distinct2) {
            throw new Error(`DISTINCT implies that this function is an aggregated function, which is not allowed in this context.`);
          }
          return {
            type: "expression",
            subType: "functionCall",
            function: iriVal,
            args: args.val.args,
            distinct: distinct2,
            loc: C.astFactory.sourceLocation(iriVal, args)
          };
        });
      });
      return functionCall2 ?? iriVal;
    },
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      if (F2.isTermNamed(ast)) {
        SUBRULE(iri, ast);
      } else {
        SUBRULE(iri, ast.function);
        SUBRULE(argList, F2.wrap({ args: ast.args, distinct: ast.distinct }, ast.loc));
      }
    }
  };
  const solutionModifier = {
    name: "solutionModifier",
    impl: ({ ACTION, SUBRULE, OPTION1, OPTION2, OPTION3, OPTION4 }) => () => {
      const group = OPTION1(() => SUBRULE(groupClause));
      const having2 = OPTION2(() => SUBRULE(havingClause));
      const order2 = OPTION3(() => SUBRULE(orderClause));
      const limitOffset = OPTION4(() => SUBRULE(limitOffsetClauses));
      return ACTION(() => ({
        ...limitOffset && { limitOffset },
        ...group && { group },
        ...having2 && { having: having2 },
        ...order2 && { order: order2 }
      }));
    },
    gImpl: ({ SUBRULE }) => (ast) => {
      if (ast.group) {
        SUBRULE(groupClause, ast.group);
      }
      if (ast.having) {
        SUBRULE(havingClause, ast.having);
      }
      if (ast.order) {
        SUBRULE(orderClause, ast.order);
      }
      if (ast.limitOffset) {
        SUBRULE(limitOffsetClauses, ast.limitOffset);
      }
    }
  };
  const groupClause = {
    name: "groupClause",
    impl: ({ ACTION, AT_LEAST_ONE, SUBRULE1, CONSUME }) => (C) => {
      const groupings = [];
      const start = CONSUME(groupByGroup);
      CONSUME(by);
      AT_LEAST_ONE(() => {
        groupings.push(SUBRULE1(groupCondition));
      });
      return ACTION(() => ({
        type: "solutionModifier",
        subType: "group",
        groupings,
        loc: C.astFactory.sourceLocation(start, groupings.at(-1))
      }));
    },
    gImpl: ({ PRINT_WORDS, SUBRULE, PRINT_ON_EMPTY }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_ON_EMPTY("GROUP BY ");
      });
      for (const grouping of ast.groupings) {
        if (F2.isExpression(grouping)) {
          SUBRULE(expression, grouping);
        } else {
          F2.printFilter(ast, () => PRINT_WORDS("("));
          SUBRULE(expression, grouping.value);
          F2.printFilter(ast, () => PRINT_WORDS("AS"));
          SUBRULE(var_, grouping.variable);
          F2.printFilter(ast, () => PRINT_WORDS(")"));
        }
      }
    }
  };
  const groupCondition = {
    name: "groupCondition",
    impl: ({ ACTION, SUBRULE, CONSUME, SUBRULE1, SUBRULE2, OPTION, OR }) => (C) => OR([
      { ALT: () => SUBRULE(builtInCall$1) },
      { ALT: () => SUBRULE(functionCall) },
      { ALT: () => SUBRULE2(var_) },
      {
        ALT: () => {
          const open = CONSUME(LParen);
          const expressionValue = SUBRULE(expression);
          const variable = OPTION(() => {
            CONSUME(as);
            return SUBRULE1(var_);
          });
          const close = CONSUME(RParen);
          return ACTION(() => {
            if (variable !== void 0) {
              return {
                variable,
                value: expressionValue,
                loc: C.astFactory.sourceLocation(open, close)
              };
            }
            return expressionValue;
          });
        }
      }
    ])
  };
  const havingClause = {
    name: "havingClause",
    impl: ({ ACTION, AT_LEAST_ONE, SUBRULE, CONSUME }) => (C) => {
      const having$1 = CONSUME(having);
      const expressions = [];
      const couldParseAgg = ACTION(() => C.parseMode.has("canParseAggregate") || !C.parseMode.add("canParseAggregate"));
      AT_LEAST_ONE(() => {
        expressions.push(SUBRULE(havingCondition));
      });
      ACTION(() => !couldParseAgg && C.parseMode.delete("canParseAggregate"));
      return ACTION(() => C.astFactory.solutionModifierHaving(expressions, C.astFactory.sourceLocation(having$1, expressions.at(-1))));
    },
    gImpl: ({ PRINT_ON_EMPTY, SUBRULE }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_ON_EMPTY("HAVING ");
      });
      for (const having2 of ast.having) {
        SUBRULE(expression, having2);
      }
    }
  };
  const havingCondition = {
    name: "havingCondition",
    impl: ({ SUBRULE }) => () => SUBRULE(constraint)
  };
  const orderClause = {
    name: "orderClause",
    impl: ({ ACTION, AT_LEAST_ONE, SUBRULE1, CONSUME }) => (C) => {
      const order$1 = CONSUME(order);
      CONSUME(by);
      const orderings = [];
      const couldParseAgg = ACTION(() => C.parseMode.has("canParseAggregate") || !C.parseMode.add("canParseAggregate"));
      AT_LEAST_ONE(() => {
        orderings.push(SUBRULE1(orderCondition));
      });
      ACTION(() => !couldParseAgg && C.parseMode.delete("canParseAggregate"));
      return ACTION(() => C.astFactory.solutionModifierOrder(orderings, C.astFactory.sourceLocation(order$1, orderings.at(-1))));
    },
    gImpl: ({ PRINT_WORDS, PRINT_ON_EMPTY, SUBRULE }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_ON_EMPTY("ORDER BY ");
      });
      for (const ordering of ast.orderDefs) {
        if (ordering.descending) {
          F2.printFilter(ast, () => PRINT_WORDS("DESC"));
        } else {
          F2.printFilter(ast, () => PRINT_WORDS("ASC"));
        }
        F2.printFilter(ast, () => PRINT_WORDS("("));
        SUBRULE(expression, ordering.expression);
        F2.printFilter(ast, () => PRINT_WORDS(")"));
      }
    }
  };
  const orderCondition = {
    name: "orderCondition",
    impl: ({ ACTION, SUBRULE, CONSUME, OR1, OR2 }) => (C) => OR1([
      { ALT: () => {
        const descending = OR2([
          { ALT: () => {
            const token = CONSUME(orderAsc);
            return [false, token];
          } },
          { ALT: () => {
            const token = CONSUME(orderDesc);
            return [true, token];
          } }
        ]);
        const expr = SUBRULE(brackettedExpression);
        return ACTION(() => ({
          expression: expr,
          descending: descending[0],
          loc: C.astFactory.sourceLocation(descending[1], expr)
        }));
      } },
      { ALT: () => {
        const expr = SUBRULE(constraint);
        return ACTION(() => ({ expression: expr, descending: false, loc: expr.loc }));
      } },
      { ALT: () => {
        const expr = SUBRULE(var_);
        return ACTION(() => ({ expression: expr, descending: false, loc: expr.loc }));
      } }
    ])
  };
  const limitOffsetClauses = {
    name: "limitOffsetClauses",
    impl: ({ ACTION, SUBRULE1, SUBRULE2, OPTION1, OPTION2, OR }) => (C) => OR([
      { ALT: () => {
        const limit2 = SUBRULE1(limitClause);
        const offset2 = OPTION1(() => SUBRULE1(offsetClause));
        return ACTION(() => C.astFactory.solutionModifierLimitOffset(limit2.val, offset2 == null ? void 0 : offset2.val, C.astFactory.sourceLocation(limit2, ...offset2 ? [offset2] : [])));
      } },
      { ALT: () => {
        const offset2 = SUBRULE2(offsetClause);
        const limit2 = OPTION2(() => SUBRULE2(limitClause));
        return ACTION(() => C.astFactory.solutionModifierLimitOffset(limit2 == null ? void 0 : limit2.val, offset2.val, C.astFactory.sourceLocation(offset2, limit2)));
      } }
    ]),
    gImpl: ({ PRINT_WORDS, NEW_LINE }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        NEW_LINE();
        if (ast.limit) {
          PRINT_WORDS("LIMIT", String(ast.limit));
        }
        if (ast.offset) {
          PRINT_WORDS("OFFSET", String(ast.offset));
        }
      });
    }
  };
  const limitClause = {
    name: "limitClause",
    impl: ({ ACTION, CONSUME }) => (C) => {
      const offset2 = CONSUME(limit);
      const value = CONSUME(integer);
      const val = Number.parseInt(value.image, 10);
      return ACTION(() => C.astFactory.wrap(val, C.astFactory.sourceLocation(offset2, value)));
    }
  };
  const offsetClause = {
    name: "offsetClause",
    impl: ({ CONSUME, ACTION }) => (C) => {
      const offset$1 = CONSUME(offset);
      const value = CONSUME(integer);
      const val = Number.parseInt(value.image, 10);
      return ACTION(() => C.astFactory.wrap(val, C.astFactory.sourceLocation(offset$1, value)));
    }
  };
  const queryUnit = {
    name: "queryUnit",
    impl: ({ SUBRULE }) => () => SUBRULE(query)
  };
  const query = {
    name: "query",
    impl: ({ ACTION, SUBRULE, OR }) => (C) => {
      const prologueValues = SUBRULE(prologue$1);
      const subType = OR([
        { ALT: () => SUBRULE(selectQuery) },
        { ALT: () => SUBRULE(constructQuery) },
        { ALT: () => SUBRULE(describeQuery) },
        { ALT: () => SUBRULE(askQuery) }
      ]);
      const values2 = SUBRULE(valuesClause);
      return ACTION(() => ({
        context: prologueValues,
        ...subType,
        type: "query",
        ...values2 && { values: values2 },
        loc: C.astFactory.sourceLocation(prologueValues.at(0), subType, values2)
      }));
    },
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      SUBRULE(prologue$1, ast.context);
      if (F2.isQuerySelect(ast)) {
        SUBRULE(selectQuery, ast);
      } else if (F2.isQueryConstruct(ast)) {
        SUBRULE(constructQuery, ast);
      } else if (F2.isQueryDescribe(ast)) {
        SUBRULE(describeQuery, ast);
      } else if (F2.isQueryAsk(ast)) {
        SUBRULE(askQuery, ast);
      }
      if (ast.values) {
        SUBRULE(inlineData, ast.values);
      }
    }
  };
  const selectQuery = {
    name: "selectQuery",
    impl: ({ ACTION, SUBRULE }) => (C) => {
      const selectVal = SUBRULE(selectClause);
      const from2 = SUBRULE(datasetClauseStar);
      const where2 = SUBRULE(whereClause);
      const modifiers = SUBRULE(solutionModifier);
      return ACTION(() => {
        const ret = {
          subType: "select",
          where: where2.val,
          solutionModifiers: modifiers,
          datasets: from2,
          ...selectVal.val,
          loc: C.astFactory.sourceLocation(selectVal, where2, modifiers.group, modifiers.having, modifiers.order, modifiers.limitOffset)
        };
        if (!C.skipValidation) {
          queryProjectionIsGood(ret);
        }
        return ret;
      });
    },
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      SUBRULE(selectClause, F2.wrap({
        variables: ast.variables,
        distinct: ast.distinct,
        reduced: ast.reduced
      }, F2.sourceLocation(...ast.variables)));
      SUBRULE(datasetClauseStar, ast.datasets);
      SUBRULE(whereClause, F2.wrap(ast.where, ast.where.loc));
      SUBRULE(solutionModifier, ast.solutionModifiers);
    }
  };
  const subSelect = {
    name: "subSelect",
    impl: ({ ACTION, SUBRULE }) => (C) => {
      const selectVal = SUBRULE(selectClause);
      const where2 = SUBRULE(whereClause);
      const modifiers = SUBRULE(solutionModifier);
      const values2 = SUBRULE(valuesClause);
      return ACTION(() => C.astFactory.querySelect({
        where: where2.val,
        datasets: C.astFactory.datasetClauses([], C.astFactory.sourceLocation()),
        context: [],
        solutionModifiers: modifiers,
        ...selectVal.val,
        ...values2 && { values: values2 }
      }, C.astFactory.sourceLocation(selectVal, where2, modifiers.group, modifiers.having, modifiers.order, modifiers.limitOffset, values2)));
    }
  };
  const selectClause = {
    name: "selectClause",
    impl: ({ ACTION, AT_LEAST_ONE, SUBRULE1, SUBRULE2, CONSUME, OPTION, OR1, OR2, OR3 }) => (C) => {
      const select$1 = CONSUME(select);
      const couldParseAgg = ACTION(() => C.parseMode.has("canParseAggregate") || !C.parseMode.add("canParseAggregate"));
      const distinctAndReduced = OPTION(() => OR1([
        { ALT: () => {
          CONSUME(distinct);
          return [true, false];
        } },
        { ALT: () => {
          CONSUME(reduced);
          return [false, true];
        } }
      ])) ?? [false, false];
      const distRed = ACTION(() => {
        const [distinct2, reduced2] = distinctAndReduced;
        return {
          ...distinct2 && { distinct: distinct2 },
          ...reduced2 && { reduced: reduced2 }
        };
      });
      let last2;
      const val = OR2([
        { ALT: () => {
          const star$1 = CONSUME(star);
          return ACTION(() => {
            last2 = star$1;
            return { variables: [C.astFactory.wildcard(C.astFactory.sourceLocation(star$1))], ...distRed };
          });
        } },
        { ALT: () => {
          const usedVars = [];
          const variables = [];
          AT_LEAST_ONE(() => OR3([
            { ALT: () => {
              const raw = SUBRULE1(var_);
              ACTION(() => {
                if (!C.skipValidation && usedVars.some((v) => v.value === raw.value)) {
                  throw new Error(`Variable ${raw.value} used more than once in SELECT clause`);
                }
                usedVars.push(raw);
                variables.push(raw);
                last2 = raw;
              });
            } },
            { ALT: () => {
              const open = CONSUME(LParen);
              const expr = SUBRULE1(expression);
              CONSUME(as);
              const variable = SUBRULE2(var_);
              const close = CONSUME(RParen);
              ACTION(() => {
                last2 = close;
                if (!C.skipValidation && usedVars.some((v) => v.value === variable.value)) {
                  throw new Error(`Variable ${variable.value} used more than once in SELECT clause`);
                }
                usedVars.push(variable);
                variables.push(C.astFactory.patternBind(expr, variable, C.astFactory.sourceLocation(open, last2)));
              });
            } }
          ]));
          return { variables, ...distRed };
        } }
      ]);
      ACTION(() => !couldParseAgg && C.parseMode.delete("canParseAggregate"));
      return ACTION(() => C.astFactory.wrap(val, C.astFactory.sourceLocation(select$1, last2)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_ON_EMPTY("SELECT ");
        if (ast.val.distinct) {
          PRINT_WORD("DISTINCT");
        } else if (ast.val.reduced) {
          PRINT_WORD("REDUCED");
        }
      });
      for (const variable of ast.val.variables) {
        if (F2.isWildcard(variable)) {
          F2.printFilter(ast, () => PRINT_WORD("*"));
        } else if (F2.isTerm(variable)) {
          SUBRULE(var_, variable);
        } else {
          F2.printFilter(ast, () => PRINT_WORD("("));
          SUBRULE(expression, variable.expression);
          F2.printFilter(ast, () => PRINT_WORD("AS"));
          SUBRULE(var_, variable.variable);
          F2.printFilter(ast, () => PRINT_WORD(")"));
        }
        F2.printFilter(ast, () => PRINT_WORD(""));
      }
      F2.printFilter(ast, () => PRINT_WORD(""));
    }
  };
  const constructQuery = {
    name: "constructQuery",
    impl: ({ ACTION, SUBRULE1, SUBRULE2, CONSUME, OR }) => (C) => {
      const construct$1 = CONSUME(construct);
      return OR([
        { ALT: () => {
          const template = SUBRULE1(constructTemplate);
          const from2 = SUBRULE1(datasetClauseStar);
          const where2 = SUBRULE1(whereClause);
          const modifiers = SUBRULE1(solutionModifier);
          return ACTION(() => ({
            subType: "construct",
            template: template.val,
            datasets: from2,
            where: where2.val,
            solutionModifiers: modifiers,
            loc: C.astFactory.sourceLocation(construct$1, where2, modifiers.group, modifiers.having, modifiers.order, modifiers.limitOffset)
          }));
        } },
        { ALT: () => {
          const from2 = SUBRULE2(datasetClauseStar);
          CONSUME(where);
          const template = SUBRULE2(constructTemplate);
          const modifiers = SUBRULE2(solutionModifier);
          return ACTION(() => ({
            subType: "construct",
            template: template.val,
            datasets: from2,
            where: C.astFactory.patternGroup([template.val], C.astFactory.sourceLocation()),
            solutionModifiers: modifiers,
            loc: C.astFactory.sourceLocation(construct$1, template, modifiers.group, modifiers.having, modifiers.order, modifiers.limitOffset)
          }));
        } }
      ]);
    },
    gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY, PRINT_ON_OWN_LINE, NEW_LINE }) => (ast, C) => {
      const { astFactory: F2, indentInc } = C;
      F2.printFilter(ast, () => PRINT_ON_EMPTY("CONSTRUCT "));
      if (!F2.isSourceLocationNoMaterialize(ast.where.loc)) {
        F2.printFilter(ast, () => {
          C[traqulaIndentation] += indentInc;
          PRINT_WORD("{");
          NEW_LINE();
        });
        SUBRULE(triplesBlock, ast.template);
        F2.printFilter(ast, () => {
          C[traqulaIndentation] -= indentInc;
          PRINT_ON_OWN_LINE("}");
        });
      }
      SUBRULE(datasetClauseStar, ast.datasets);
      if (F2.isSourceLocationNoMaterialize(ast.where.loc)) {
        SUBRULE(whereClause, F2.wrap(F2.patternGroup([ast.template], ast.template.loc), ast.template.loc));
      } else {
        SUBRULE(whereClause, F2.wrap(ast.where, ast.where.loc));
      }
      SUBRULE(solutionModifier, ast.solutionModifiers);
    }
  };
  const describeQuery = {
    name: "describeQuery",
    impl: ({ ACTION, AT_LEAST_ONE, SUBRULE1, CONSUME, OPTION, OR }) => (C) => {
      const describe$1 = CONSUME(describe);
      const variables = OR([
        { ALT: () => {
          const variables2 = [];
          AT_LEAST_ONE(() => {
            variables2.push(SUBRULE1(varOrIri));
          });
          return variables2;
        } },
        { ALT: () => {
          const star$1 = CONSUME(star);
          return [ACTION(() => C.astFactory.wildcard(C.astFactory.sourceLocation(star$1)))];
        } }
      ]);
      const from2 = SUBRULE1(datasetClauseStar);
      const where2 = OPTION(() => SUBRULE1(whereClause));
      const modifiers = SUBRULE1(solutionModifier);
      return ACTION(() => ({
        subType: "describe",
        variables,
        datasets: from2,
        ...where2 && { where: where2.val },
        solutionModifiers: modifiers,
        loc: C.astFactory.sourceLocation(describe$1, ...variables, from2, where2, modifiers.group, modifiers.having, modifiers.order, modifiers.limitOffset)
      }));
    },
    gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_ON_EMPTY("DESCRIBE "));
      if (F2.isWildcard(ast.variables[0])) {
        F2.printFilter(ast, () => PRINT_WORD("*"));
      } else {
        for (const variable of ast.variables) {
          SUBRULE(varOrTerm$1, variable);
        }
      }
      SUBRULE(datasetClauseStar, ast.datasets);
      if (ast.where) {
        SUBRULE(whereClause, F2.wrap(ast.where, ast.loc));
      }
      SUBRULE(solutionModifier, ast.solutionModifiers);
    }
  };
  const askQuery = {
    name: "askQuery",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const ask$1 = CONSUME(ask);
      const from2 = SUBRULE(datasetClauseStar);
      const where2 = SUBRULE(whereClause);
      const modifiers = SUBRULE(solutionModifier);
      return ACTION(() => ({
        subType: "ask",
        datasets: from2,
        where: where2.val,
        solutionModifiers: modifiers,
        loc: C.astFactory.sourceLocation(ask$1, from2, where2, modifiers.group, modifiers.having, modifiers.order, modifiers.limitOffset)
      }));
    },
    gImpl: ({ SUBRULE, PRINT_ON_EMPTY }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_ON_EMPTY("ASK "));
      SUBRULE(datasetClauseStar, ast.datasets);
      SUBRULE(whereClause, F2.wrap(ast.where, ast.loc));
      SUBRULE(solutionModifier, ast.solutionModifiers);
    }
  };
  const valuesClause = {
    name: "valuesClause",
    impl: ({ OPTION, SUBRULE }) => () => OPTION(() => SUBRULE(inlineData))
  };
  const constructTemplate = {
    name: "constructTemplate",
    impl: ({ ACTION, SUBRULE1, CONSUME, OPTION }) => (C) => {
      const open = CONSUME(LCurly);
      const triples = OPTION(() => SUBRULE1(constructTriples));
      const close = CONSUME(RCurly);
      return ACTION(() => C.astFactory.wrap(triples ?? C.astFactory.patternBgp([], C.astFactory.sourceLocation()), C.astFactory.sourceLocation(open, close)));
    }
  };
  const constructTriples = {
    name: "constructTriples",
    impl: triplesTemplate.impl
  };
  const updateUnit = {
    name: "updateUnit",
    impl: ({ SUBRULE }) => () => SUBRULE(update)
  };
  const update = {
    name: "update",
    impl: ({ ACTION, SUBRULE, SUBRULE1, SUBRULE2, CONSUME, OPTION1, MANY }) => (C) => {
      const updates = [];
      const prologueValues = SUBRULE1(prologue$1);
      updates.push({ context: prologueValues });
      let parsedSemi = true;
      MANY({
        GATE: () => parsedSemi,
        DEF: () => {
          parsedSemi = false;
          updates.at(-1).operation = SUBRULE(update1);
          OPTION1(() => {
            CONSUME(semi);
            parsedSemi = true;
            const innerPrologue = SUBRULE2(prologue$1);
            updates.push({ context: innerPrologue });
          });
        }
      });
      return ACTION(() => {
        const update2 = {
          type: "update",
          updates,
          loc: C.astFactory.sourceLocation(...updates.flatMap((x) => [...x.context, x.operation]))
        };
        if (!C.skipValidation) {
          updateNoReuseBlankNodeLabels(update2);
        }
        return update2;
      });
    },
    gImpl: ({ SUBRULE, PRINT, NEW_LINE }) => (ast, { astFactory: F2 }) => {
      const [head2, ...tail] = ast.updates;
      if (head2) {
        SUBRULE(prologue$1, head2.context);
        if (head2.operation) {
          SUBRULE(update1, head2.operation);
        }
      }
      for (const update2 of tail) {
        F2.printFilter(ast, () => {
          PRINT(";");
          NEW_LINE();
        });
        SUBRULE(prologue$1, update2.context);
        if (update2.operation) {
          SUBRULE(update1, update2.operation);
        }
      }
    }
  };
  const update1 = {
    name: "update1",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(load) },
      { ALT: () => SUBRULE(clear) },
      { ALT: () => SUBRULE(drop) },
      { ALT: () => SUBRULE(add) },
      { ALT: () => SUBRULE(move) },
      { ALT: () => SUBRULE(copy) },
      { ALT: () => SUBRULE(create) },
      { ALT: () => SUBRULE(insertData) },
      { ALT: () => SUBRULE(deleteData) },
      { ALT: () => SUBRULE(deleteWhere) },
      { ALT: () => SUBRULE(modify) }
    ]),
    gImpl: ({ SUBRULE }) => (ast) => {
      switch (ast.subType) {
        case "load":
          SUBRULE(load, ast);
          break;
        case "clear":
          SUBRULE(clear, ast);
          break;
        case "drop":
          SUBRULE(drop, ast);
          break;
        case "add":
          SUBRULE(add, ast);
          break;
        case "move":
          SUBRULE(move, ast);
          break;
        case "copy":
          SUBRULE(copy, ast);
          break;
        case "create":
          SUBRULE(create, ast);
          break;
        case "insertdata":
          SUBRULE(insertData, ast);
          break;
        case "deletedata":
          SUBRULE(deleteData, ast);
          break;
        case "deletewhere":
          SUBRULE(deleteWhere, ast);
          break;
        case "modify":
          SUBRULE(modify, ast);
          break;
      }
    }
  };
  const load = {
    name: "load",
    impl: ({ ACTION, SUBRULE1, CONSUME, OPTION1, OPTION2 }) => (C) => {
      const loadToken = CONSUME(load$1);
      const silent$1 = OPTION1(() => CONSUME(silent));
      const source = SUBRULE1(iri);
      const destination = OPTION2(() => {
        CONSUME(loadInto);
        return SUBRULE1(graphRef);
      });
      return ACTION(() => C.astFactory.updateOperationLoad(C.astFactory.sourceLocation(loadToken, source, destination), source, Boolean(silent$1), destination));
    },
    gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_ON_EMPTY("LOAD ");
        if (ast.silent) {
          PRINT_WORD("SILENT");
        }
      });
      SUBRULE(iri, ast.source);
      if (ast.destination) {
        F2.printFilter(ast, () => PRINT_WORD("INTO"));
        SUBRULE(graphRefAll, ast.destination);
      }
    }
  };
  function clearOrDrop(operation) {
    return {
      name: unCapitalize(operation.name),
      impl: ({ ACTION, SUBRULE1, CONSUME, OPTION }) => (C) => {
        const opToken = CONSUME(operation);
        const silent$1 = OPTION(() => CONSUME(silent));
        const destination = SUBRULE1(graphRefAll);
        return ACTION(() => C.astFactory.updateOperationClearDrop(unCapitalize(operation.name), Boolean(silent$1), destination, C.astFactory.sourceLocation(opToken, destination)));
      },
      gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY }) => (ast, { astFactory: F2 }) => {
        F2.printFilter(ast, () => {
          PRINT_ON_EMPTY(operation.name.toUpperCase(), " ");
          if (ast.silent) {
            PRINT_WORD("SILENT");
          }
        });
        SUBRULE(graphRefAll, ast.destination);
      }
    };
  }
  const clear = clearOrDrop(clear$1);
  const drop = clearOrDrop(drop$1);
  const create = {
    name: "create",
    impl: ({ ACTION, SUBRULE1, CONSUME, OPTION }) => (C) => {
      const createToken2 = CONSUME(create$1);
      const silent$1 = OPTION(() => CONSUME(silent));
      const destination = SUBRULE1(graphRef);
      return ACTION(() => C.astFactory.updateOperationCreate(destination, Boolean(silent$1), C.astFactory.sourceLocation(createToken2, destination)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_ON_EMPTY("CREATE ");
        if (ast.silent) {
          PRINT_WORD("SILENT");
        }
      });
      SUBRULE(graphRefAll, ast.destination);
    }
  };
  function copyMoveAddOperation(operation) {
    return {
      name: unCapitalize(operation.name),
      impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, OPTION }) => (C) => {
        const op = CONSUME(operation);
        const silent$1 = OPTION(() => CONSUME(silent));
        const source = SUBRULE1(graphOrDefault);
        CONSUME(to);
        const destination = SUBRULE2(graphOrDefault);
        return ACTION(() => C.astFactory.updateOperationAddMoveCopy(unCapitalize(operation.name), source, destination, Boolean(silent$1), C.astFactory.sourceLocation(op, destination)));
      },
      gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY }) => (ast, { astFactory: F2 }) => {
        F2.printFilter(ast, () => {
          PRINT_ON_EMPTY(operation.name.toUpperCase(), " ");
          if (ast.silent) {
            PRINT_WORD("SILENT");
          }
        });
        SUBRULE(graphRefAll, ast.source);
        F2.printFilter(ast, () => PRINT_WORD("TO"));
        SUBRULE(graphRefAll, ast.destination);
      }
    };
  }
  const add = copyMoveAddOperation(add$1);
  const move = copyMoveAddOperation(move$1);
  const copy = copyMoveAddOperation(copy$1);
  const quadPattern = {
    name: "quadPattern",
    impl: ({ ACTION, SUBRULE1, CONSUME }) => (C) => {
      const open = CONSUME(LCurly);
      const val = SUBRULE1(quads);
      const close = CONSUME(RCurly);
      return ACTION(() => C.astFactory.wrap(val.val, C.astFactory.sourceLocation(open, close)));
    }
  };
  const quadData = {
    name: "quadData",
    impl: ({ ACTION, SUBRULE1, CONSUME }) => (C) => {
      const open = CONSUME(LCurly);
      const couldParseVars = ACTION(() => C.parseMode.delete("canParseVars"));
      const val = SUBRULE1(quads);
      ACTION(() => couldParseVars && C.parseMode.add("canParseVars"));
      const close = CONSUME(RCurly);
      return ACTION(() => C.astFactory.wrap(val.val, C.astFactory.sourceLocation(open, close)));
    }
  };
  function insertDeleteDelWhere(name, subType, cons1, dataRule) {
    return {
      name,
      impl: ({ ACTION, SUBRULE1, CONSUME }) => (C) => {
        const insDelToken = CONSUME(cons1);
        let couldCreateBlankNodes = true;
        if (name !== "insertData") {
          couldCreateBlankNodes = ACTION(() => C.parseMode.delete("canCreateBlankNodes"));
        }
        const data = SUBRULE1(dataRule);
        if (name !== "insertData") {
          ACTION(() => couldCreateBlankNodes && C.parseMode.add("canCreateBlankNodes"));
        }
        return ACTION(() => C.astFactory.updateOperationInsDelDataWhere(subType, data.val, C.astFactory.sourceLocation(insDelToken, data)));
      },
      gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY, PRINT_ON_OWN_LINE, NEW_LINE }) => (ast, C) => {
        const { astFactory: F2, indentInc } = C;
        F2.printFilter(ast, () => {
          if (subType === "insertdata") {
            PRINT_ON_EMPTY("INSERT DATA ");
          } else if (subType === "deletedata") {
            PRINT_ON_EMPTY("DELETE DATA ");
          } else if (subType === "deletewhere") {
            PRINT_ON_EMPTY("DELETE WHERE ");
          }
          C[traqulaIndentation] += indentInc;
          PRINT_WORD("{");
          NEW_LINE();
        });
        SUBRULE(quads, F2.wrap(ast.data, ast.loc));
        F2.printFilter(ast, () => {
          C[traqulaIndentation] -= indentInc;
          PRINT_ON_OWN_LINE("}");
        });
      }
    };
  }
  const insertData = insertDeleteDelWhere("insertData", "insertdata", insertDataClause, quadData);
  const deleteData = insertDeleteDelWhere("deleteData", "deletedata", deleteDataClause, quadData);
  const deleteWhere = insertDeleteDelWhere("deleteWhere", "deletewhere", deleteWhereClause, quadPattern);
  const modify = {
    name: "modify",
    impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, OPTION1, OPTION2, OR }) => (C) => {
      const graph2 = OPTION1(() => {
        const withToken = CONSUME(modifyWith);
        const graph3 = SUBRULE1(iri);
        return { withToken, graph: graph3 };
      });
      const { insert, del } = OR([
        { ALT: () => {
          const del2 = SUBRULE1(deleteClause);
          const insert2 = OPTION2(() => SUBRULE1(insertClause));
          return { del: del2, insert: insert2 };
        } },
        { ALT: () => {
          const insert2 = SUBRULE2(insertClause);
          return { insert: insert2, del: void 0 };
        } }
      ]);
      const using = SUBRULE1(usingClauseStar);
      CONSUME(where);
      const where$1 = SUBRULE1(groupGraphPattern);
      return ACTION(() => C.astFactory.updateOperationModify(C.astFactory.sourceLocation(graph2 == null ? void 0 : graph2.withToken, del, insert, where$1), (insert == null ? void 0 : insert.val) ?? [], (del == null ? void 0 : del.val) ?? [], where$1, using, graph2 == null ? void 0 : graph2.graph));
    },
    gImpl: ({ SUBRULE, PRINT_WORDS, PRINT_ON_EMPTY, NEW_LINE }) => (ast, C) => {
      const { astFactory: F2, indentInc } = C;
      if (ast.graph) {
        F2.printFilter(ast, () => PRINT_WORDS("WITH"));
        SUBRULE(iri, ast.graph);
      }
      if (ast.delete.length > 0) {
        F2.printFilter(ast, () => {
          C[traqulaIndentation] += indentInc;
          PRINT_WORDS("DELETE", "{");
          NEW_LINE();
        });
        SUBRULE(quads, F2.wrap(ast.delete, ast.loc));
        F2.printFilter(ast, () => {
          C[traqulaIndentation] -= indentInc;
          PRINT_ON_EMPTY("}");
          NEW_LINE();
        });
      }
      if (ast.insert.length > 0) {
        F2.printFilter(ast, () => {
          C[traqulaIndentation] += indentInc;
          PRINT_WORDS("INSERT", "{");
          NEW_LINE();
        });
        SUBRULE(quads, F2.wrap(ast.insert, ast.loc));
        F2.printFilter(ast, () => {
          C[traqulaIndentation] -= indentInc;
          PRINT_ON_EMPTY("} ");
          NEW_LINE();
        });
      }
      SUBRULE(usingClauseStar, ast.from);
      F2.printFilter(ast, () => PRINT_WORDS("WHERE"));
      SUBRULE(groupGraphPattern, ast.where);
    }
  };
  const deleteClause = {
    name: "deleteClause",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const delToken = CONSUME(deleteClause$1);
      const couldCreateBlankNodes = ACTION(() => C.parseMode.delete("canCreateBlankNodes"));
      const del = SUBRULE(quadPattern);
      ACTION(() => couldCreateBlankNodes && C.parseMode.add("canCreateBlankNodes"));
      return ACTION(() => C.astFactory.wrap(del.val, C.astFactory.sourceLocation(delToken, del)));
    }
  };
  const insertClause = {
    name: "insertClause",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const insertToken = CONSUME(insertClause$1);
      const insert = SUBRULE(quadPattern);
      return ACTION(() => C.astFactory.wrap(insert.val, C.astFactory.sourceLocation(insertToken, insert)));
    }
  };
  const graphOrDefault = {
    name: "graphOrDefault",
    impl: ({ ACTION, SUBRULE1, CONSUME, OPTION, OR }) => (C) => OR([
      { ALT: () => {
        const def = CONSUME(default_);
        return ACTION(() => C.astFactory.graphRefDefault(C.astFactory.sourceLocation(def)));
      } },
      { ALT: () => {
        const graph$1 = OPTION(() => CONSUME(graph));
        const name = SUBRULE1(iri);
        return ACTION(() => C.astFactory.graphRefSpecific(name, C.astFactory.sourceLocation(graph$1, name)));
      } }
    ])
  };
  const graphRef = {
    name: "graphRef",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const graph$1 = CONSUME(graph);
      const val = SUBRULE(iri);
      return ACTION(() => C.astFactory.graphRefSpecific(val, C.astFactory.sourceLocation(graph$1, val)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_WORD("GRAPH"));
      SUBRULE(iri, ast.graph);
    }
  };
  const graphRefAll = {
    name: "graphRefAll",
    impl: ({ ACTION, SUBRULE, CONSUME, OR }) => (C) => OR([
      { ALT: () => SUBRULE(graphRef) },
      { ALT: () => {
        const def = CONSUME(default_);
        return ACTION(() => C.astFactory.graphRefDefault(C.astFactory.sourceLocation(def)));
      } },
      { ALT: () => {
        const named$1 = CONSUME(named);
        return ACTION(() => C.astFactory.graphRefNamed(C.astFactory.sourceLocation(named$1)));
      } },
      { ALT: () => {
        const graphAll$1 = CONSUME(graphAll);
        return ACTION(() => C.astFactory.graphRefAll(C.astFactory.sourceLocation(graphAll$1)));
      } }
    ]),
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      if (F2.isGraphRefSpecific(ast)) {
        SUBRULE(graphRef, ast);
      } else if (F2.isGraphRefDefault(ast)) {
        F2.printFilter(ast, () => PRINT_WORD("DEFAULT"));
      } else if (F2.isGraphRefNamed(ast)) {
        F2.printFilter(ast, () => PRINT_WORD("NAMED"));
      } else if (F2.isGraphRefAll(ast)) {
        F2.printFilter(ast, () => PRINT_WORD("ALL"));
      }
    }
  };
  const quads = {
    name: "quads",
    impl: ({ ACTION, SUBRULE, CONSUME, MANY, SUBRULE1, SUBRULE2, OPTION1, OPTION2, OPTION3 }) => (C) => {
      const quads2 = [];
      let last2;
      OPTION1(() => {
        const triples = SUBRULE1(triplesTemplate);
        last2 = triples;
        ACTION(() => quads2.push(triples));
      });
      MANY(() => {
        const notTriples = SUBRULE(quadsNotTriples);
        last2 = notTriples;
        quads2.push(notTriples);
        OPTION2(() => {
          const dotToken = CONSUME(dot);
          last2 = dotToken;
          return dotToken;
        });
        OPTION3(() => {
          const triples = SUBRULE2(triplesTemplate);
          last2 = triples;
          ACTION(() => quads2.push(triples));
        });
      });
      return ACTION(() => C.astFactory.wrap(quads2, C.astFactory.sourceLocation(quads2.at(0), last2)));
    },
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      for (const quad of ast.val) {
        if (F2.isPattern(quad)) {
          SUBRULE(triplesBlock, quad);
        } else {
          SUBRULE(quadsNotTriples, quad);
        }
      }
    }
  };
  const quadsNotTriples = {
    name: "quadsNotTriples",
    impl: ({ ACTION, SUBRULE1, CONSUME, OPTION }) => (C) => {
      const graph$1 = CONSUME(graph);
      const name = SUBRULE1(varOrIri);
      CONSUME(LCurly);
      const triples = OPTION(() => SUBRULE1(triplesTemplate));
      const close = CONSUME(RCurly);
      return ACTION(() => C.astFactory.graphQuads(name, triples ?? C.astFactory.patternBgp([], C.astFactory.sourceLocation()), C.astFactory.sourceLocation(graph$1, close)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD, NEW_LINE, PRINT_ON_OWN_LINE }) => (ast, C) => {
      const { astFactory: F2, indentInc } = C;
      F2.printFilter(ast, () => PRINT_WORD("GRAPH"));
      SUBRULE(varOrTerm$1, ast.graph);
      F2.printFilter(ast, () => {
        C[traqulaIndentation] += indentInc;
        PRINT_WORD("{");
        NEW_LINE();
      });
      SUBRULE(triplesBlock, ast.triples);
      F2.printFilter(ast, () => {
        C[traqulaIndentation] -= indentInc;
        PRINT_ON_OWN_LINE("}");
      });
    }
  };
  const queryOrUpdate = {
    name: "queryOrUpdate",
    impl: ({ ACTION, SUBRULE, OR1, OR2, MANY, OPTION1, CONSUME, SUBRULE2 }) => (C) => {
      const prologueValues = SUBRULE(prologue$1);
      return OR1([
        { ALT: () => {
          const subType = OR2([
            { ALT: () => SUBRULE(selectQuery) },
            { ALT: () => SUBRULE(constructQuery) },
            { ALT: () => SUBRULE(describeQuery) },
            { ALT: () => SUBRULE(askQuery) }
          ]);
          const values2 = SUBRULE(valuesClause);
          return ACTION(() => ({
            context: prologueValues,
            ...subType,
            type: "query",
            ...values2 && { values: values2 },
            loc: C.astFactory.sourceLocation(prologueValues.at(0), subType, values2)
          }));
        } },
        { ALT: () => {
          const updates = [];
          updates.push({ context: prologueValues });
          let parsedSemi = true;
          MANY({
            GATE: () => parsedSemi,
            DEF: () => {
              parsedSemi = false;
              updates.at(-1).operation = SUBRULE(update1);
              OPTION1(() => {
                CONSUME(semi);
                parsedSemi = true;
                const innerPrologue = SUBRULE2(prologue$1);
                updates.push({ context: innerPrologue });
              });
            }
          });
          return ACTION(() => {
            const update2 = {
              type: "update",
              updates,
              loc: C.astFactory.sourceLocation(...updates.flatMap((x) => [...x.context, x.operation]))
            };
            if (!C.skipValidation) {
              updateNoReuseBlankNodeLabels(update2);
            }
            return update2;
          });
        } }
      ]);
    },
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      if (F2.isQuery(ast)) {
        SUBRULE(query, ast);
      } else {
        SUBRULE(update, ast);
      }
    }
  };
  const rulesNoBuiltIn = [
    expression,
    conditionalOrExpression,
    conditionalAndExpression,
    valueLogical,
    relationalExpression,
    numericExpression,
    expressionList,
    additiveExpression,
    multiplicativeExpression,
    unaryExpression$1,
    primaryExpression$1,
    brackettedExpression,
    // BuiltInCall,
    iriOrFunction,
    rdfLiteral$1,
    numericLiteral,
    numericLiteralUnsigned,
    numericLiteralPositive,
    numericLiteralNegative,
    booleanLiteral,
    var_,
    builtInStr,
    builtInLang,
    builtInLangmatches,
    builtInDatatype,
    builtInBound,
    builtInIri,
    builtInUri,
    builtInBnodeSparqlJs,
    builtInRand,
    builtInAbs,
    builtInCeil,
    builtInFloor,
    builtInRound,
    builtInConcat,
    builtInStrlen,
    builtInUcase,
    builtInLcase,
    builtInEncode_for_uri
  ];
  const builtInPatch = {
    name: "builtInCall",
    impl: ({ OR, SUBRULE }) => () => OR(builtInCallList(SUBRULE).slice(0, -2))
  };
  const expressionParserBuilder = ParserBuilder.create(rulesNoBuiltIn).addMany(builtInContains, builtInStrstarts, builtInStrends, builtInStrbefore, builtInStrafter, builtInYear, builtInMonth, builtInDay, builtInHours, builtInMinutes, builtInSeconds, builtInTimezone, builtInTz, builtInNow, builtInUuid, builtInStruuid, builtInMd5, builtInSha1, builtInSha256, builtInSha384, builtInSha512, builtInCoalesce, builtInIf, builtInStrlang, builtInStrdt, builtInSameterm, builtInIsiri, builtInIsuri, builtInIsblank, builtInIsliteral, builtInIsnumeric, regexExpression, substringExpression, strReplaceExpression, aggregateCount, aggregateSum, aggregateMin, aggregateMax, aggregateAvg, aggregateSample, aggregateGroup_concat, aggregate, iri, prefixedName, argList, string).addRule(builtInPatch);
  const rules$3 = [
    objectList,
    object$1,
    graphNode$1,
    varOrTerm$1,
    triplesNode,
    collection,
    blankNodePropertyList,
    propertyListNotEmpty,
    // PropertyListNotEmpty
    verb,
    verbA,
    varOrIri,
    var_,
    iri,
    iriFull,
    prefixedName,
    graphTerm,
    rdfLiteral$1,
    numericLiteral,
    booleanLiteral,
    blankNode,
    string,
    numericLiteralUnsigned,
    numericLiteralPositive,
    numericLiteralNegative
  ];
  const objectListParserBuilder = ParserBuilder.create(rules$3);
  const triplesBlockParserBuilder = ParserBuilder.create([
    triplesBlock,
    triplesSameSubjectPath$1,
    // VarOrTerm is included in the required ObjectList rule
    propertyListPathNotEmpty,
    triplesNodePath,
    propertyListPath,
    // PropertyListNotEmpty
    verbPath,
    verbSimple,
    objectListPath
  ]).merge(objectListParserBuilder, []).addMany(
    path,
    pathAlternative,
    pathSequence,
    pathEltOrInverse,
    pathElt,
    pathPrimary,
    pathMod,
    pathNegatedPropertySet,
    pathOneInPropertySet,
    // ObjectListPath
    objectPath$1,
    graphNodePath$1,
    collectionPath,
    blankNodePropertyListPath
  );
  const rules$2 = [
    subSelect,
    selectClause,
    whereClause,
    solutionModifier,
    valuesClause
  ];
  const subSelectParserBuilder = ParserBuilder.create(rules$2).merge(expressionParserBuilder, []).patchRule(builtInCall$1).addMany(existsFunc, notExistsFunc, groupGraphPattern, groupGraphPatternSub).merge(triplesBlockParserBuilder, []).addMany(
    graphPatternNotTriples,
    groupOrUnionGraphPattern,
    optionalGraphPattern,
    minusGraphPattern,
    graphGraphPattern,
    serviceGraphPattern,
    filter,
    bind,
    inlineData,
    constraint,
    functionCall,
    dataBlock,
    inlineDataOneVar,
    inlineDataFull,
    dataBlockValue$1,
    // Solution modifier
    groupClause,
    havingClause,
    orderClause,
    limitOffsetClauses,
    groupCondition,
    havingCondition,
    orderCondition,
    limitClause,
    offsetClause
  );
  const rules$1 = [
    triplesTemplate,
    triplesSameSubject$1,
    varOrTerm$1,
    propertyListNotEmpty,
    triplesNode,
    propertyList,
    var_,
    graphTerm,
    iri,
    iriFull,
    prefixedName,
    rdfLiteral$1,
    string,
    numericLiteral,
    numericLiteralUnsigned,
    numericLiteralPositive,
    numericLiteralNegative,
    booleanLiteral,
    blankNode,
    verb,
    verbA,
    varOrIri,
    objectList,
    object$1,
    collection,
    blankNodePropertyList,
    graphNode$1
  ];
  const triplesTemplateParserBuilder = ParserBuilder.create(rules$1);
  const rules = [
    queryUnit,
    query,
    prologue$1,
    selectQuery,
    constructQuery,
    describeQuery,
    askQuery,
    valuesClause,
    baseDecl,
    prefixDecl
  ];
  const queryUnitParserBuilder = ParserBuilder.create(rules).merge(subSelectParserBuilder, []).addRule(datasetClause).addRule(datasetClauseStar).addRule(defaultGraphClause).addRule(namedGraphClause).addRule(sourceSelector).addRule(constructTemplate).merge(triplesTemplateParserBuilder, []).addRule(constructTriples);
  const update1Patch = {
    name: "update1",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(load) },
      { ALT: () => SUBRULE(clear) },
      { ALT: () => SUBRULE(drop) },
      { ALT: () => SUBRULE(add) },
      { ALT: () => SUBRULE(move) },
      { ALT: () => SUBRULE(copy) },
      { ALT: () => SUBRULE(create) },
      { ALT: () => SUBRULE(insertData) },
      { ALT: () => SUBRULE(deleteData) },
      { ALT: () => SUBRULE(deleteWhere) }
    ]),
    gImpl: update1.gImpl
  };
  const rulesNoUpdate1 = [
    updateUnit,
    update,
    prologue$1,
    // Update1,
    baseDecl,
    prefixDecl,
    load,
    clear,
    drop,
    add,
    move,
    copy,
    create,
    insertData,
    deleteData,
    deleteWhere,
    iri,
    prefixedName,
    graphRef,
    graphRefAll,
    graphOrDefault,
    quadData,
    quads
  ];
  const updateNoModifyParserBuilder = ParserBuilder.create(rulesNoUpdate1).addRule(update1Patch).merge(triplesTemplateParserBuilder, []).addRule(quadPattern).addRule(quadsNotTriples);
  const updateParserBuilder = ParserBuilder.create(updateNoModifyParserBuilder).patchRule(update1).addMany(modify, deleteClause, insertClause, usingClause, defaultGraphClause, namedGraphClause, sourceSelector, usingClauseStar, groupGraphPattern).merge(objectListParserBuilder, []).merge(subSelectParserBuilder, []);
  const sparql11ParserBuilder = ParserBuilder.create(queryUnitParserBuilder).merge(updateParserBuilder, []).addRule(queryOrUpdate);
  const version = createToken({ name: "Version", pattern: /version/i, label: "version identifier" });
  const tilde = createToken({ name: "Tilde", pattern: "~", label: "~" });
  const annotationOpen = createToken({ name: "AnnotationOpen", pattern: "{|", label: `Annotation Open: {|` });
  const annotationClose = createToken({ name: "AnnotationClose", pattern: "|}", label: "Annotation Close |}" });
  const reificationOpen = createToken({ name: "ReificationOpen", pattern: "<<", label: "Reification open <<" });
  const reificationClose = createToken({ name: "ReificationClose", pattern: ">>", label: "Reification close >>" });
  const tripleTermOpen = createToken({ name: "TripleTermOpen", pattern: "<<(", label: "Triple Term Open <<(" });
  const tripleTermClose = createToken({ name: "TripleTermClose", pattern: ")>>", label: "Triple Term Close )>>" });
  const buildInLangDir$1 = createToken({ name: "BuiltInLangdir", pattern: /langdir/i, label: "LANGDIR" });
  const buildInStrLangDir = createToken({
    name: "BuiltInStrLangdir",
    pattern: /strlangdir/i,
    label: "STRLANGDIR"
  });
  const buildInHasLang$1 = createToken({ name: "BuiltInHasLang", pattern: /haslang/i, label: "hasLANG" });
  const buildInHasLangDir$1 = createToken({
    name: "BuiltInHasLangdir",
    pattern: /haslangdir/i,
    label: "hasLANGDIR"
  });
  const buildInIsTRIPLE = createToken({ name: "BuiltInIsTriple", pattern: /istriple/i, label: "isTRIPLE" });
  const buildInTRIPLE = createToken({ name: "BuiltInTriple", pattern: /triple/i, label: "TRIPLE" });
  const buildInSUBJECT = createToken({ name: "BuiltInSubject", pattern: /subject/i, label: "SUBJECT" });
  const buildInPREDICATE = createToken({ name: "BuiltInPredicate", pattern: /predicate/i, label: "PREDICATE" });
  const buildInOBJECT = createToken({ name: "BuiltInObject", pattern: /object/i, label: "OBJECT" });
  const LANG_DIR = createToken({
    name: "LANG_DIR",
    pattern: /@[a-z]+(?:-[\da-z]+)*(?:--[a-z]+)?/i,
    label: "LANG_DIR"
  });
  const sparql12LexerBuilder = LexerBuilder.create(sparql11LexerBuilder).addBefore(logicAnd, tilde, annotationOpen, annotationClose, tripleTermOpen, tripleTermClose, reificationOpen, reificationClose, version).addBefore(langmatches, buildInLangDir$1, buildInStrLangDir, buildInHasLangDir$1, buildInHasLang$1, buildInIsTRIPLE, buildInTRIPLE, buildInSUBJECT, buildInPREDICATE, buildInOBJECT).addBefore(langTag, LANG_DIR).delete(langTag);
  class AstFactory extends AstFactory$1 {
    constructor() {
      super(...arguments);
      /**
       * Overwritten triple constructor to always contain an empty annotations list
       */
      __publicField(this, "triple", (subject, predicate, object2, loc) => ({
        type: "triple",
        subject,
        predicate,
        object: object2,
        annotations: [],
        loc: loc ?? this.sourceLocation(subject, predicate, object2)
      }));
    }
    termTriple(subject, predicate, object2, loc) {
      return {
        type: "term",
        subType: "triple",
        subject,
        predicate,
        object: object2,
        loc
      };
    }
    isTermTriple(obj) {
      return this.isOfSubType(obj, "term", "triple");
    }
    tripleCollectionReifiedTriple(loc, subject, predicate, object2, reifier2) {
      return {
        type: "tripleCollection",
        subType: "reifiedTriple",
        triples: [this.triple(subject, predicate, object2)],
        identifier: reifier2 ?? this.termBlank(void 0, this.sourceLocation()),
        loc
      };
    }
    isTripleCollectionReifiedTriple(obj) {
      return this.isOfSubType(obj, "tripleCollection", "reifiedTriple");
    }
    tripleCollectionBlankNodeProperties(identifier, triples, loc) {
      return {
        type: "tripleCollection",
        subType: "blankNodeProperties",
        triples,
        identifier,
        loc
      };
    }
    annotatedTriple(subject, predicate, object2, annotations, loc) {
      return {
        type: "triple",
        subject,
        predicate,
        object: object2,
        annotations: annotations ?? [],
        loc: loc ?? this.sourceLocation(subject, predicate, object2, ...annotations ?? [])
      };
    }
    contextDefinitionVersion(version2, loc) {
      return {
        type: "contextDef",
        subType: "version",
        version: version2,
        loc
      };
    }
    isContextDefinitionVersion(obj) {
      return this.isOfSubType(obj, "contextDef", "version");
    }
  }
  const F = new AstFactory();
  function isLangDir(dir) {
    return dir === "ltr" || dir === "rtl";
  }
  function langTagHasCorrectRange(literal) {
    if (F.isTermLiteralLangStr(literal)) {
      const dirSplit = literal.langOrIri.split("--");
      if (dirSplit.length > 1) {
        const [_, direction] = dirSplit;
        if (!isLangDir(direction)) {
          throw new Error(`language direction "${direction}" of literal "${JSON.stringify(literal)}" is not is required range 'ltr' | 'rtl'.`);
        }
      }
    }
  }
  const versionDecl = {
    name: "versionDecl",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const versionToken = CONSUME(version);
      const identifier = SUBRULE(versionSpecifier);
      return ACTION(() => C.astFactory.contextDefinitionVersion(identifier.val, C.astFactory.sourceLocation(versionToken, identifier)));
    },
    gImpl: ({ PRINT_ON_OWN_LINE }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_ON_OWN_LINE("VERSION ", `${stringEscapedLexical(ast.version)}`);
      });
    }
  };
  const versionSpecifier = {
    name: "versionSpecifier",
    impl: ({ ACTION, CONSUME, OR }) => (C) => {
      const token = OR([
        { ALT: () => CONSUME(stringLiteral1) },
        { ALT: () => CONSUME(stringLiteral2) }
      ]);
      return ACTION(() => C.astFactory.wrap(token.image.slice(1, -1), C.astFactory.sourceLocation(token)));
    }
  };
  const prologue = {
    name: "prologue",
    impl: ({ SUBRULE, MANY, OR }) => () => {
      const result = [];
      MANY(() => OR([
        { ALT: () => result.push(SUBRULE(baseDecl)) },
        // TODO: the [spec](https://www.w3.org/TR/sparql11-query/#iriRefs) says you cannot redefine prefixes.
        //  We might need to check this.
        { ALT: () => result.push(SUBRULE(prefixDecl)) },
        { ALT: () => result.push(SUBRULE(versionDecl)) }
      ]));
      return result;
    },
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      for (const context of ast) {
        if (F2.isContextDefinitionBase(context)) {
          SUBRULE(baseDecl, context);
        } else if (F2.isContextDefinitionPrefix(context)) {
          SUBRULE(prefixDecl, context);
        } else if (F2.isContextDefinitionVersion(context)) {
          SUBRULE(versionDecl, context);
        }
      }
    }
  };
  function reifiedTripleBlockImpl(name, allowPath) {
    return {
      name,
      impl: ({ ACTION, SUBRULE }) => (C) => {
        const triple = SUBRULE(reifiedTriple);
        const properties = SUBRULE(allowPath ? propertyListPath : propertyList, ACTION(() => C.astFactory.dematerialized(triple.identifier)));
        return ACTION(() => [triple, ...properties]);
      }
    };
  }
  const reifiedTripleBlock = reifiedTripleBlockImpl("reifiedTripleBlock", false);
  const reifiedTripleBlockPath = reifiedTripleBlockImpl("reifiedTripleBlockPath", true);
  const dataBlockValue = {
    name: "dataBlockValue",
    impl: ($) => (C) => $.OR2([
      { ALT: () => dataBlockValue$1.impl($)(C) },
      { ALT: () => $.SUBRULE(tripleTermData) }
    ])
  };
  const reifier = {
    name: "reifier",
    impl: ({ ACTION, CONSUME, SUBRULE, OPTION }) => (C) => {
      const tildeToken = CONSUME(tilde);
      const reifier2 = OPTION(() => SUBRULE(varOrReifierId));
      return ACTION(() => {
        if (reifier2 === void 0 && !C.parseMode.has("canCreateBlankNodes")) {
          throw new Error("Cannot create blanknodes in current parse mode");
        }
        return C.astFactory.wrap(reifier2 ?? C.astFactory.termBlank(void 0, C.astFactory.sourceLocation()), C.astFactory.sourceLocation(tildeToken, reifier2));
      });
    }
  };
  const varOrReifierId = {
    name: "varOrReifierId",
    impl: ({ SUBRULE, OR }) => (C) => OR([
      { GATE: () => C.parseMode.has("canParseVars"), ALT: () => SUBRULE(var_) },
      { ALT: () => SUBRULE(iri) },
      { ALT: () => SUBRULE(blankNode) }
    ])
  };
  function triplesSameSubjectImpl(name, allowPaths) {
    return {
      name,
      impl: ($) => (C) => $.OR2([
        { ALT: () => allowPaths ? triplesSameSubjectPath$1.impl($)(C) : triplesSameSubject$1.impl($)(C) },
        { ALT: () => $.SUBRULE(allowPaths ? reifiedTripleBlockPath : reifiedTripleBlock) }
      ])
    };
  }
  const triplesSameSubject = triplesSameSubjectImpl("triplesSameSubject", false);
  const triplesSameSubjectPath = triplesSameSubjectImpl("triplesSameSubjectPath", true);
  function objectImpl(name, allowPaths) {
    return {
      name,
      impl: ({ ACTION, SUBRULE }) => (C, subject, predicate) => {
        const objectVal = SUBRULE(allowPaths ? graphNodePath : graphNode);
        const annotationVal = SUBRULE(allowPaths ? annotationPath : annotation);
        return ACTION(() => {
          const F2 = C.astFactory;
          if (F2.isPathPure(predicate) && annotationVal.length > 0) {
            throw new Error("Note 17 violation");
          }
          return F2.annotatedTriple(subject, predicate, objectVal, annotationVal);
        });
      }
    };
  }
  const object = objectImpl("object", false);
  const objectPath = objectImpl("objectPath", true);
  function annotationImpl(name, allowPaths) {
    return {
      name,
      impl: ({ ACTION, SUBRULE, OR, MANY }) => (C) => {
        const annotations = [];
        let currentReifier;
        MANY(() => {
          OR([
            { ALT: () => {
              const node = SUBRULE(reifier);
              annotations.push(node);
              currentReifier = node.val;
            } },
            { ALT: () => {
              ACTION(() => {
                if (!currentReifier && !C.parseMode.has("canCreateBlankNodes")) {
                  throw new Error("Cannot create blanknodes in current parse mode");
                }
                currentReifier = currentReifier ?? C.astFactory.termBlank(void 0, C.astFactory.sourceLocation());
              });
              const block = SUBRULE(allowPaths ? annotationBlockPath : annotationBlock, currentReifier);
              ACTION(() => {
                annotations.push(block);
                currentReifier = void 0;
              });
            } }
          ]);
        });
        return annotations;
      },
      gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
        for (const annotation2 of ast) {
          if (F2.isTripleCollectionBlankNodeProperties(annotation2)) {
            SUBRULE(annotationBlockPath, annotation2);
          } else {
            F2.printFilter(annotation2, () => PRINT_WORD("~"));
            SUBRULE(graphNodePath, annotation2.val);
          }
        }
      }
    };
  }
  const annotationPath = annotationImpl("annotationPath", true);
  const annotation = annotationImpl("annotation", false);
  function annotationBlockImpl(name, allowPaths) {
    return {
      name,
      impl: ({ ACTION, SUBRULE, CONSUME }) => (C, arg) => {
        const open = CONSUME(annotationOpen);
        const res = SUBRULE(allowPaths ? propertyListPathNotEmpty : propertyListNotEmpty, arg);
        const close = CONSUME(annotationClose);
        return ACTION(() => C.astFactory.tripleCollectionBlankNodeProperties(arg, res, C.astFactory.sourceLocation(open, close)));
      },
      gImpl: ({ SUBRULE, PRINT_WORD, HANDLE_LOC, NEW_LINE, PRINT_ON_OWN_LINE }) => (ast, C) => {
        const { astFactory: F2, indentInc } = C;
        F2.printFilter(ast, () => {
          PRINT_WORD("{|");
          if (ast.triples.length > 1) {
            C[traqulaIndentation] += indentInc;
            NEW_LINE();
          }
        });
        function printTriple(triple) {
          HANDLE_LOC(triple, () => {
            if (F2.isTerm(triple.predicate)) {
              SUBRULE(graphNodePath, triple.predicate);
            } else {
              SUBRULE(pathGenerator, triple.predicate, void 0);
            }
            F2.printFilter(triple, () => PRINT_WORD(""));
            SUBRULE(graphNodePath, triple.object);
          });
        }
        const [head2, ...tail] = ast.triples;
        printTriple(head2);
        for (const triple of tail) {
          F2.printFilter(ast, () => {
            PRINT_WORD(";");
            NEW_LINE();
          });
          printTriple(triple);
        }
        F2.printFilter(ast, () => {
          if (ast.triples.length > 1) {
            PRINT_ON_OWN_LINE("|}");
          } else {
            PRINT_WORD("|}");
          }
        });
      }
    };
  }
  const annotationBlockPath = annotationBlockImpl("annotationBlockPath", true);
  const annotationBlock = annotationBlockImpl("annotationBlock", false);
  const graphNode = {
    name: "graphNode",
    impl: ($) => (C) => $.OR2([
      { ALT: () => graphNode$1.impl($)(C) },
      { ALT: () => $.SUBRULE(reifiedTriple) }
    ])
  };
  const graphNodePath = {
    name: "graphNodePath",
    impl: ($) => (C) => $.OR2([
      { ALT: () => graphNodePath$1.impl($)(C) },
      { ALT: () => $.SUBRULE(reifiedTriple) }
    ]),
    gImpl: ($) => (ast, C) => {
      if (C.astFactory.isTripleCollectionReifiedTriple(ast)) {
        $.SUBRULE(reifiedTriple, ast);
      } else {
        graphNodePath$1.gImpl($)(ast, C);
      }
    }
  };
  const varOrTerm = {
    name: "varOrTerm",
    impl: ({ ACTION, SUBRULE, OR, CONSUME }) => (C) => OR([
      { GATE: () => C.parseMode.has("canParseVars"), ALT: () => SUBRULE(var_) },
      { ALT: () => SUBRULE(iri) },
      { ALT: () => SUBRULE(rdfLiteral) },
      { ALT: () => SUBRULE(numericLiteral) },
      { ALT: () => SUBRULE(booleanLiteral) },
      { ALT: () => SUBRULE(blankNode) },
      { ALT: () => {
        const token = CONSUME(nil);
        return ACTION(() => C.astFactory.termNamed(C.astFactory.sourceLocation(token), CommonIRIs.NIL));
      } },
      { ALT: () => SUBRULE(tripleTerm) }
    ])
    // Generation remains untouched - go through graphTerm
  };
  const reifiedTriple = {
    name: "reifiedTriple",
    impl: ({ ACTION, CONSUME, SUBRULE, OPTION }) => (C) => {
      const open = CONSUME(reificationOpen);
      const subject = SUBRULE(reifiedTripleSubject);
      const predicate = SUBRULE(verb);
      const object2 = SUBRULE(reifiedTripleObject);
      const reifierVal = OPTION(() => SUBRULE(reifier));
      const close = CONSUME(reificationClose);
      return ACTION(() => {
        if (reifierVal === void 0 && !C.parseMode.has("canCreateBlankNodes")) {
          throw new Error("Cannot create blanknodes in current parse mode");
        }
        return C.astFactory.tripleCollectionReifiedTriple(C.astFactory.sourceLocation(open, close), subject, predicate, object2, reifierVal == null ? void 0 : reifierVal.val);
      });
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_WORD("<<"));
      const triple = ast.triples[0];
      SUBRULE(graphNodePath, triple.subject);
      F2.printFilter(ast, () => PRINT_WORD(""));
      if (F2.isPathPure(triple.predicate)) {
        SUBRULE(pathGenerator, triple.predicate, void 0);
      } else {
        SUBRULE(graphNodePath, triple.predicate);
      }
      F2.printFilter(ast, () => PRINT_WORD(""));
      SUBRULE(graphNodePath, triple.object);
      SUBRULE(annotationPath, [F2.wrap(ast.identifier, ast.identifier.loc)]);
      F2.printFilter(ast, () => PRINT_WORD(">>"));
    }
  };
  const reifiedTripleSubject = {
    name: "reifiedTripleSubject",
    impl: ({ OR, SUBRULE }) => (C) => OR([
      { GATE: () => C.parseMode.has("canParseVars"), ALT: () => SUBRULE(var_) },
      { ALT: () => SUBRULE(iri) },
      { ALT: () => SUBRULE(rdfLiteral) },
      { ALT: () => SUBRULE(numericLiteral) },
      { ALT: () => SUBRULE(booleanLiteral) },
      { ALT: () => SUBRULE(blankNode) },
      { ALT: () => SUBRULE(reifiedTriple) },
      { ALT: () => SUBRULE(tripleTerm) }
    ])
  };
  const reifiedTripleObject = {
    name: "reifiedTripleObject",
    impl: reifiedTripleSubject.impl
  };
  const tripleTerm = {
    name: "tripleTerm",
    impl: ({ ACTION, CONSUME, SUBRULE }) => (C) => {
      const open = CONSUME(tripleTermOpen);
      const subject = SUBRULE(tripleTermSubject);
      const predicate = SUBRULE(verb);
      const object2 = SUBRULE(tripleTermObject);
      const close = CONSUME(tripleTermClose);
      return ACTION(() => C.astFactory.termTriple(subject, predicate, object2, C.astFactory.sourceLocation(open, close)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_WORD("<<("));
      SUBRULE(graphNodePath, ast.subject);
      F2.printFilter(ast, () => PRINT_WORD(""));
      SUBRULE(graphNodePath, ast.predicate);
      F2.printFilter(ast, () => PRINT_WORD(""));
      SUBRULE(graphNodePath, ast.object);
      F2.printFilter(ast, () => PRINT_WORD(")>>"));
    }
  };
  const tripleTermSubject = {
    name: "tripleTermSubject",
    impl: ({ SUBRULE, OR }) => (C) => OR([
      { GATE: () => C.parseMode.has("canParseVars"), ALT: () => SUBRULE(var_) },
      { ALT: () => SUBRULE(iri) },
      { ALT: () => SUBRULE(rdfLiteral) },
      { ALT: () => SUBRULE(numericLiteral) },
      { ALT: () => SUBRULE(booleanLiteral) },
      { ALT: () => SUBRULE(blankNode) },
      { ALT: () => SUBRULE(tripleTerm) }
    ])
  };
  const tripleTermObject = {
    name: "tripleTermObject",
    impl: tripleTermSubject.impl
  };
  const tripleTermData = {
    name: "tripleTermData",
    impl: ({ ACTION, CONSUME, OR, SUBRULE }) => (C) => {
      const open = CONSUME(tripleTermOpen);
      const subject = SUBRULE(tripleTermDataSubject);
      const predicate = OR([
        { ALT: () => SUBRULE(iri) },
        { ALT: () => {
          const token = CONSUME(a);
          return ACTION(() => C.astFactory.termNamed(C.astFactory.sourceLocation(token), CommonIRIs.TYPE));
        } }
      ]);
      const object2 = SUBRULE(tripleTermDataObject);
      const close = CONSUME(tripleTermClose);
      return ACTION(() => C.astFactory.termTriple(subject, predicate, object2, C.astFactory.sourceLocation(open, close)));
    }
  };
  const tripleTermDataSubject = {
    name: "tripleTermDataSubject",
    impl: ({ OR, SUBRULE }) => () => OR([
      { ALT: () => SUBRULE(iri) }
    ])
  };
  const tripleTermDataObject = {
    name: "tripleTermDataObject",
    impl: ({ OR, SUBRULE }) => () => OR([
      { ALT: () => SUBRULE(iri) },
      { ALT: () => SUBRULE(rdfLiteral) },
      { ALT: () => SUBRULE(numericLiteral) },
      { ALT: () => SUBRULE(booleanLiteral) },
      { ALT: () => SUBRULE(tripleTermData) }
    ])
  };
  const primaryExpression = {
    name: "primaryExpression",
    impl: ($) => (C) => $.OR2([
      { ALT: () => primaryExpression$1.impl($)(C) },
      { ALT: () => $.SUBRULE(exprTripleTerm) }
    ])
  };
  const exprTripleTerm = {
    name: "exprTripleTerm",
    impl: ({ ACTION, CONSUME, SUBRULE }) => (C) => {
      const open = CONSUME(tripleTermOpen);
      const subject = SUBRULE(exprTripleTermSubject);
      const predicate = SUBRULE(verb);
      const object2 = SUBRULE(exprTripleTermObject);
      const close = CONSUME(tripleTermClose);
      return ACTION(() => C.astFactory.termTriple(subject, predicate, object2, C.astFactory.sourceLocation(open, close)));
    }
  };
  const exprTripleTermSubject = {
    name: "exprTripleTermSubject",
    impl: ({ OR, SUBRULE }) => (C) => OR([
      { ALT: () => SUBRULE(iri) },
      { GATE: () => C.parseMode.has("canParseVars"), ALT: () => SUBRULE(var_) }
    ])
  };
  const exprTripleTermObject = {
    name: "exprTripleTermObject",
    impl: ({ OR, SUBRULE }) => (C) => OR([
      { ALT: () => SUBRULE(iri) },
      { ALT: () => SUBRULE(rdfLiteral) },
      { ALT: () => SUBRULE(numericLiteral) },
      { ALT: () => SUBRULE(booleanLiteral) },
      { GATE: () => C.parseMode.has("canParseVars"), ALT: () => SUBRULE(var_) },
      { ALT: () => SUBRULE(exprTripleTerm) }
    ])
  };
  const buildInLangDir = funcExpr1(buildInLangDir$1);
  const buildInLangStrDir = funcExpr3(buildInStrLangDir);
  const buildInHasLang = funcExpr1(buildInHasLang$1);
  const buildInHasLangDir = funcExpr1(buildInHasLangDir$1);
  const buildInIsTriple = funcExpr1(buildInIsTRIPLE);
  const buildInTriple = funcExpr3(buildInTRIPLE);
  const buildInSubject = funcExpr1(buildInSUBJECT);
  const buildInPredicate = funcExpr1(buildInPREDICATE);
  const buildInObject = funcExpr1(buildInOBJECT);
  const builtInCall = {
    name: "builtInCall",
    impl: ($) => (C) => $.OR2([
      { ALT: () => builtInCall$1.impl($)(C) },
      { ALT: () => $.SUBRULE(buildInLangDir) },
      { ALT: () => $.SUBRULE(buildInLangStrDir) },
      { ALT: () => $.SUBRULE(buildInHasLang) },
      { ALT: () => $.SUBRULE(buildInHasLangDir) },
      { ALT: () => $.SUBRULE(buildInIsTriple) },
      { ALT: () => $.SUBRULE(buildInTriple) },
      { ALT: () => $.SUBRULE(buildInSubject) },
      { ALT: () => $.SUBRULE(buildInPredicate) },
      { ALT: () => $.SUBRULE(buildInObject) }
    ])
  };
  const rdfLiteral = {
    name: "rdfLiteral",
    impl: ({ ACTION, SUBRULE, OPTION, CONSUME, OR }) => (C) => {
      const value = SUBRULE(string);
      return OPTION(() => OR([
        { ALT: () => {
          const langTag2 = CONSUME(LANG_DIR);
          return ACTION(() => {
            const literal = C.astFactory.termLiteral(C.astFactory.sourceLocation(value, langTag2), value.value, langTag2.image.slice(1).toLowerCase());
            langTagHasCorrectRange(literal);
            return literal;
          });
        } },
        { ALT: () => {
          CONSUME(hathat);
          const iriVal = SUBRULE(iri);
          return ACTION(() => C.astFactory.termLiteral(C.astFactory.sourceLocation(value, iriVal), value.value, iriVal));
        } }
      ])) ?? value;
    }
  };
  const unaryExpression = {
    name: "unaryExpression",
    impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, OR1, OR2 }) => (C) => OR1([
      { ALT: () => SUBRULE1(primaryExpression) },
      { ALT: () => {
        const operator = CONSUME(exclamation);
        const expr = SUBRULE1(unaryExpression);
        return ACTION(() => C.astFactory.expressionOperation("!", [expr], C.astFactory.sourceLocation(operator, expr)));
      } },
      { ALT: () => {
        const operator = OR2([
          { ALT: () => CONSUME(opPlus) },
          { ALT: () => CONSUME(opMinus) }
        ]);
        const expr = SUBRULE2(primaryExpression);
        return ACTION(() => C.astFactory.expressionOperation(operator.image === "!" ? "!" : operator.image === "+" ? "UPLUS" : "UMINUS", [expr], C.astFactory.sourceLocation(operator, expr)));
      } }
    ])
  };
  function completeParseContext(context) {
    return {
      astFactory: context.astFactory ?? new AstFactory({ tracksSourceLocation: false }),
      baseIRI: context.baseIRI,
      prefixes: { ...context.prefixes },
      parseMode: context.parseMode ? new Set(context.parseMode) : /* @__PURE__ */ new Set(["canParseVars", "canCreateBlankNodes"]),
      skipValidation: context.skipValidation ?? false
    };
  }
  function copyParseContext(context) {
    return {
      ...context,
      prefixes: { ...context.prefixes },
      parseMode: new Set(context.parseMode)
    };
  }
  const sparql12ParserBuilder = ParserBuilder.create(sparql11ParserBuilder).widenContext().typePatch().addMany(reifiedTripleBlock, reifiedTripleBlockPath, reifier, varOrReifierId, annotation, annotationPath, annotationBlockPath, annotationBlock, reifiedTriple, reifiedTripleSubject, reifiedTripleObject, tripleTerm, tripleTermSubject, tripleTermObject, tripleTermData, tripleTermDataSubject, tripleTermDataObject, exprTripleTerm, exprTripleTermSubject, exprTripleTermObject).addMany(versionDecl, versionSpecifier).addMany(buildInLangDir, buildInLangStrDir, buildInHasLang, buildInHasLangDir, buildInIsTriple, buildInTriple, buildInSubject, buildInPredicate, buildInObject).patchRule(dataBlockValue).patchRule(triplesSameSubject).patchRule(triplesSameSubjectPath).patchRule(object).patchRule(objectPath).patchRule(graphNode).patchRule(graphNodePath).patchRule(varOrTerm).deleteRule(graphTerm.name).patchRule(primaryExpression).patchRule(builtInCall).patchRule(rdfLiteral).patchRule(unaryExpression).patchRule(prologue);
  class Parser {
    constructor(args = {}) {
      __publicField(this, "parser");
      __publicField(this, "defaultContext");
      this.parser = sparql12ParserBuilder.build({
        ...args,
        queryPreProcessor: sparqlCodepointEscape,
        tokenVocabulary: sparql12LexerBuilder.tokenVocabulary
      });
      this.defaultContext = completeParseContext(args.defaultContext ?? {});
    }
    /**
     * Parse a query string starting from the
     * [QueryUnit](https://www.w3.org/TR/sparql12-query/#rQueryUnit)
     * or [QueryUpdate](https://www.w3.org/TR/sparql12-query/#rUpdateUnit) rules.
     * @param query
     * @param context
     */
    parse(query2, context = {}) {
      const ast = this.parser.queryOrUpdate(query2, copyParseContext({ ...this.defaultContext, ...context }));
      ast.loc = this.defaultContext.astFactory.sourceLocationInlinedSource(query2, ast.loc, 0, Number.MAX_SAFE_INTEGER);
      return ast;
    }
    /**
     * Parse a query string starting from the [Path](https://www.w3.org/TR/sparql12-query/#rPath) grammar rule.
     * @param query
     * @param context
     */
    parsePath(query2, context = {}) {
      const ast = this.parser.path(query2, copyParseContext({ ...this.defaultContext, ...context }));
      ast.loc = this.defaultContext.astFactory.sourceLocationInlinedSource(query2, ast.loc, 0, Number.MAX_SAFE_INTEGER);
      if (this.defaultContext.astFactory.isPathPure(ast)) {
        return {
          ...ast,
          prefixes: {}
        };
      }
      return ast;
    }
  }
  const legacyParser = new sparql.Parser({ sparqlStar: true });
  const traqulaParser = new Parser();
  function parseSparql(queryString) {
    try {
      return legacyParser.parse(queryString);
    } catch (e) {
      try {
        return traqulaParser.parse(queryString, { rdfStar: true });
      } catch (e2) {
        console.error("[SPARQL 1.2 Parser] Syntax Error:", e2);
        throw e2;
      }
    }
  }
  class QueryParser {
    parse(query2) {
      const parsed = parseSparql(query2);
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
  class UpdateEngine {
    constructor(store, factory, engine) {
      this.store = store;
      this.factory = factory;
      this.engine = engine;
    }
    async execute(update2) {
      for (const op of update2.updates) {
        await this.executeOperation(op);
      }
    }
    async executeOperation(op) {
      if (op.updateType === "insert" || op.updateType === "delete" || op.updateType === "insertdelete") {
        await this.handleInsertDelete(op);
      } else {
        throw new Error(`Unsupported update operation: ${op.updateType}`);
      }
    }
    async handleInsertDelete(op) {
      if (op.where && op.where.length > 0) {
        const selectQuery2 = {
          type: "query",
          queryType: "SELECT",
          variables: ["*"],
          where: op.where,
          prefixes: {}
          // Should pass from update prefixes if available? For now empty.
        };
        const varNames = this.engine.getVariableNames(selectQuery2);
        const results = await this.engine.execute(selectQuery2);
        if (!results || typeof results === "boolean" || typeof results[Symbol.asyncIterator] !== "function") return;
        const bindings = [];
        for await (const b of results) {
          if (Array.isArray(b)) bindings.push(b);
        }
        for (const binding of bindings) {
          const bindingMap = /* @__PURE__ */ new Map();
          varNames.forEach((name, idx) => {
            if (binding[idx] !== void 0) bindingMap.set(name, binding[idx]);
          });
          if (op.delete) {
            for (const bgp of op.delete) {
              const triples = this.instantiate(bgp.triples, bindingMap);
              this.deleteTriples(triples);
            }
          }
          if (op.insert) {
            for (const bgp of op.insert) {
              const triples = this.instantiate(bgp.triples, bindingMap);
              this.insertTriples(triples);
            }
          }
        }
      } else if (op.delete) {
        for (const bgp of op.delete) {
          this.deleteTriples(bgp.triples);
        }
      } else if (op.insert) {
        for (const bgp of op.insert) {
          this.insertTriples(bgp.triples);
        }
      }
    }
    instantiate(template, bindings) {
      const result = [];
      for (const t of template) {
        const s = this.resolveTerm(t.subject, bindings);
        const p = this.resolveTerm(t.predicate, bindings);
        const o = this.resolveTerm(t.object, bindings);
        if (s && p && o) {
          result.push({
            subject: this.idToTerm(s),
            predicate: this.idToTerm(p),
            object: this.idToTerm(o)
          });
        }
      }
      return result;
    }
    resolveTerm(term, bindings) {
      if (term.termType === "Variable") {
        const val = bindings.get(term.value);
        return val || null;
      }
      return this.termToNode(term);
    }
    idToTerm(id) {
      return this.factory.decode(id);
    }
    insertTriples(triples) {
      for (const t of triples) {
        const s = this.termToNode(t.subject);
        const p = this.termToNode(t.predicate);
        const o = this.termToNode(t.object);
        this.store.add(s, p, o, core.DEFAULT_GRAPH);
      }
    }
    deleteTriples(triples) {
      for (const t of triples) {
        const s = this.termToNode(t.subject);
        const p = this.termToNode(t.predicate);
        const o = this.termToNode(t.object);
        this.store.delete(s, p, o, core.DEFAULT_GRAPH);
      }
    }
    termToNode(term) {
      var _a;
      if (term.termType === "NamedNode") return this.factory.namedNode(term.value);
      if (term.termType === "BlankNode") return this.factory.blankNode(term.value);
      if (term.termType === "Literal") return this.factory.literal(term.value, (_a = term.datatype) == null ? void 0 : _a.value, term.language);
      if (isTriple(term)) {
        return this.factory.triple(
          this.termToNode(term.subject),
          this.termToNode(term.predicate),
          this.termToNode(term.object)
        );
      }
      return core.DEFAULT_GRAPH;
    }
  }
  exports2.Aggregator = Aggregator;
  exports2.ExpressionEvaluator = ExpressionEvaluator;
  exports2.Optimizer = Optimizer;
  exports2.QueryParser = QueryParser;
  exports2.SPARQLEngine = SPARQLEngine;
  exports2.UpdateEngine = UpdateEngine;
  exports2.isPropertyPath = isPropertyPath;
  exports2.isTriple = isTriple;
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
});
