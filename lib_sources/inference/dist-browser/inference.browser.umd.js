(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.InferenceLib = {}));
})(this, function(exports2) {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  class InferenceEngine {
    constructor(store) {
      __publicField(this, "modules", /* @__PURE__ */ new Map());
      __publicField(this, "enabledModules", /* @__PURE__ */ new Set());
      __publicField(this, "boundHandler");
      this.store = store;
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
        console.log(`[Inference] Enabling module: ${name}`);
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
        console.log(`[Inference] Disabling module: ${name}`);
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
      console.log(`[Inference] Global recompute triggered.`);
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
  class SubClassOfModule {
    constructor(store, factory) {
      __publicField(this, "name", "rdfs-subclass");
      __publicField(this, "targetGraphID");
      __publicField(this, "rdfsSubClassOf");
      __publicField(this, "rdfType");
      // Map<ChildID, Set<ParentID>> - stores direct and indirect parents (transitive closure)
      __publicField(this, "hierarchy", /* @__PURE__ */ new Map());
      this.store = store;
      this.factory = factory;
      this.targetGraphID = this.factory.namedNode("http://example.org/graphs/inference/rdfs-subclass");
      this.rdfsSubClassOf = this.factory.namedNode("http://www.w3.org/2000/01/rdf-schema#subClassOf");
      this.rdfType = this.factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    }
    process(event) {
      const result = { add: [], remove: [] };
      if (event.type === "add") {
        for (const q of event.quads) {
          if (q.predicate === this.rdfsSubClassOf) {
            result.add.push(...this.handleSchemaAdd(q.subject, q.object));
          } else if (q.predicate === this.rdfType) {
            const newInferences = this.inferTypes(q.subject, q.object);
            result.add.push(...newInferences);
          }
        }
      } else if (event.type === "delete") {
        for (const q of event.quads) {
          if (q.predicate === this.rdfType) {
            const typeC = q.object;
            const parents = this.hierarchy.get(typeC);
            if (parents) {
              for (const p of parents) {
                if (!this.stillImpliesType(q.subject, p)) {
                  result.remove.push({
                    subject: q.subject,
                    predicate: this.rdfType,
                    object: p,
                    graph: this.targetGraphID
                  });
                }
              }
            }
          }
        }
      }
      return result;
    }
    stillImpliesType(subject, parentCls) {
      const types = this.store.match(subject, this.rdfType, null, null);
      for (const [_, __, typeX] of types) {
        const parents = this.hierarchy.get(typeX);
        if (parents && parents.has(parentCls)) return true;
        if (typeX === parentCls) return true;
      }
      return false;
    }
    clear() {
      this.hierarchy.clear();
    }
    recompute() {
      this.clear();
      const allQuads = [];
      const schema = this.store.match(null, this.rdfsSubClassOf, null);
      for (const [s, _p, o] of schema) {
        this.handleSchemaAdd(s, o, false);
      }
      const data = this.store.match(null, this.rdfType, null);
      for (const [s, _p, o] of data) {
        const newInferences = this.inferTypes(s, o);
        allQuads.push(...newInferences);
      }
      return allQuads;
    }
    handleSchemaAdd(child, parent, augmentData = true) {
      const generated = [];
      let parents = this.hierarchy.get(child);
      if (!parents) {
        parents = /* @__PURE__ */ new Set();
        this.hierarchy.set(child, parents);
      }
      if (parents.has(parent)) return [];
      parents.add(parent);
      const grandParents = this.hierarchy.get(parent);
      if (grandParents) {
        for (const gp of grandParents) {
          parents.add(gp);
        }
      }
      for (const [_, pSet] of this.hierarchy) {
        if (pSet.has(child)) {
          pSet.add(parent);
          if (grandParents) {
            for (const gp of grandParents) {
              pSet.add(gp);
            }
          }
        }
      }
      if (augmentData) {
        const instances = this.store.match(null, this.rdfType, child);
        for (const [s] of instances) {
          generated.push({ subject: s, predicate: this.rdfType, object: parent, graph: this.targetGraphID });
          if (grandParents) {
            for (const gp of grandParents) {
              generated.push({ subject: s, predicate: this.rdfType, object: gp, graph: this.targetGraphID });
            }
          }
        }
      }
      return generated;
    }
    inferTypes(subject, type) {
      const parents = this.hierarchy.get(type);
      if (!parents) return [];
      const quads = [];
      for (const p of parents) {
        quads.push({
          subject,
          predicate: this.rdfType,
          object: p,
          graph: this.targetGraphID
        });
      }
      return quads;
    }
  }
  class SubPropertyOfModule {
    constructor(store, factory) {
      __publicField(this, "name", "rdfs-subproperty");
      __publicField(this, "targetGraphID");
      __publicField(this, "rdfsSubPropertyOf");
      // Map<SubProp, Set<SuperProp>>
      __publicField(this, "hierarchy", /* @__PURE__ */ new Map());
      this.store = store;
      this.factory = factory;
      this.targetGraphID = this.factory.namedNode("http://example.org/graphs/inference/rdfs-subproperty");
      this.rdfsSubPropertyOf = this.factory.namedNode("http://www.w3.org/2000/01/rdf-schema#subPropertyOf");
    }
    process(event) {
      const result = { add: [], remove: [] };
      if (event.type === "add") {
        for (const q of event.quads) {
          if (q.predicate === this.rdfsSubPropertyOf) {
            result.add.push(...this.handleSchemaAdd(q.subject, q.object));
          } else {
            const supers = this.hierarchy.get(q.predicate);
            if (supers) {
              for (const superProp of supers) {
                result.add.push({
                  subject: q.subject,
                  predicate: superProp,
                  object: q.object,
                  graph: this.targetGraphID
                });
              }
            }
          }
        }
      } else if (event.type === "delete") {
        for (const q of event.quads) {
          const supers = this.hierarchy.get(q.predicate);
          if (supers) {
            for (const superProp of supers) {
              if (!this.stillImpliesProperty(q.subject, superProp, q.object)) {
                result.remove.push({
                  subject: q.subject,
                  predicate: superProp,
                  object: q.object,
                  graph: this.targetGraphID
                });
              }
            }
          }
        }
      }
      return result;
    }
    stillImpliesProperty(s, superProp, o) {
      const matches = this.store.match(s, null, o, null);
      for (const [_, p2] of matches) {
        if (p2 === superProp) return true;
        const supers = this.hierarchy.get(p2);
        if (supers && supers.has(superProp)) return true;
      }
      return false;
    }
    clear() {
      this.hierarchy.clear();
    }
    recompute() {
      this.clear();
      const schema = this.store.match(null, this.rdfsSubPropertyOf, null);
      for (const [s, _p, o] of schema) {
        this.handleSchemaAdd(s, o, false);
      }
      const inferredQuads = [];
      for (const [subProp, superProps] of this.hierarchy) {
        const matches = this.store.match(null, subProp, null);
        for (const [s, _p, o] of matches) {
          for (const superProp of superProps) {
            inferredQuads.push({
              subject: s,
              predicate: superProp,
              object: o,
              graph: this.targetGraphID
            });
          }
        }
      }
      return inferredQuads;
    }
    handleSchemaAdd(subProp, superProp, augmentData = true) {
      let parents = this.hierarchy.get(subProp);
      if (!parents) {
        parents = /* @__PURE__ */ new Set();
        this.hierarchy.set(subProp, parents);
      }
      if (parents.has(superProp)) return [];
      parents.add(superProp);
      const grandParents = this.hierarchy.get(superProp);
      if (grandParents) {
        for (const gp of grandParents) {
          parents.add(gp);
        }
      }
      for (const [_child, pSet] of this.hierarchy) {
        if (pSet.has(subProp)) {
          pSet.add(superProp);
          if (grandParents) {
            for (const gp of grandParents) {
              pSet.add(gp);
            }
          }
        }
      }
      const newQuads = [];
      if (augmentData) {
        const matches = this.store.match(null, subProp, null);
        for (const [s, _p, o] of matches) {
          newQuads.push({ subject: s, predicate: superProp, object: o, graph: this.targetGraphID });
          if (grandParents) {
            for (const gp of grandParents) {
              newQuads.push({ subject: s, predicate: gp, object: o, graph: this.targetGraphID });
            }
          }
        }
      }
      return newQuads;
    }
  }
  class RangeModule {
    constructor(store, factory) {
      __publicField(this, "name", "rdfs-range");
      __publicField(this, "targetGraphID");
      __publicField(this, "rdfsRange");
      __publicField(this, "rdfType");
      // Map<PropertyID, Set<ClassID>>
      __publicField(this, "ranges", /* @__PURE__ */ new Map());
      this.store = store;
      this.factory = factory;
      this.targetGraphID = this.factory.namedNode("http://example.org/graphs/inference/rdfs-range");
      this.rdfsRange = this.factory.namedNode("http://www.w3.org/2000/01/rdf-schema#range");
      this.rdfType = this.factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    }
    process(event) {
      const result = { add: [], remove: [] };
      if (event.type === "add") {
        for (const q of event.quads) {
          if (q.predicate === this.rdfsRange) {
            result.add.push(...this.handleSchemaAdd(q.subject, q.object));
          } else {
            const rangeClasses = this.ranges.get(q.predicate);
            if (rangeClasses) {
              for (const cls of rangeClasses) {
                result.add.push({
                  subject: q.object,
                  predicate: this.rdfType,
                  object: cls,
                  graph: this.targetGraphID
                });
              }
            }
          }
        }
      } else if (event.type === "delete") {
        for (const q of event.quads) {
          const rangeClasses = this.ranges.get(q.predicate);
          if (rangeClasses) {
            for (const cls of rangeClasses) {
              if (!this.stillImpliesType(q.object, cls)) {
                result.remove.push({
                  subject: q.object,
                  predicate: this.rdfType,
                  object: cls,
                  graph: this.targetGraphID
                });
              }
            }
          }
        }
      }
      return result;
    }
    stillImpliesType(object, cls) {
      for (const [prop, classes] of this.ranges) {
        if (classes.has(cls)) {
          const matches = this.store.match(null, prop, object, null);
          for (const _ of matches) return true;
        }
      }
      return false;
    }
    clear() {
      this.ranges.clear();
    }
    recompute() {
      this.clear();
      const schema = this.store.match(null, this.rdfsRange, null);
      for (const [s, _p, o] of schema) {
        this.handleSchemaAdd(s, o, false);
      }
      const inferredQuads = [];
      for (const [prop, classes] of this.ranges) {
        const matches = this.store.match(null, prop, null);
        for (const [_s, _p, o, _g] of matches) {
          for (const cls of classes) {
            inferredQuads.push({
              subject: o,
              // Range -> o a Class
              predicate: this.rdfType,
              object: cls,
              graph: this.targetGraphID
            });
          }
        }
      }
      return inferredQuads;
    }
    handleSchemaAdd(property, rangeClass, augmentData = true) {
      let classes = this.ranges.get(property);
      if (!classes) {
        classes = /* @__PURE__ */ new Set();
        this.ranges.set(property, classes);
      }
      if (classes.has(rangeClass)) return [];
      classes.add(rangeClass);
      const newQuads = [];
      if (augmentData) {
        const matches = this.store.match(null, property, null);
        for (const [_s, _p, o, _g] of matches) {
          newQuads.push({
            subject: o,
            predicate: this.rdfType,
            object: rangeClass,
            graph: this.targetGraphID
          });
        }
      }
      return newQuads;
    }
  }
  class DomainModule {
    constructor(store, factory) {
      __publicField(this, "name", "rdfs-domain");
      __publicField(this, "targetGraphID");
      __publicField(this, "rdfsDomain");
      __publicField(this, "rdfType");
      // Map<PropertyID, Set<ClassID>>
      __publicField(this, "domains", /* @__PURE__ */ new Map());
      this.store = store;
      this.factory = factory;
      this.targetGraphID = this.factory.namedNode("http://example.org/graphs/inference/rdfs-domain");
      this.rdfsDomain = this.factory.namedNode("http://www.w3.org/2000/01/rdf-schema#domain");
      this.rdfType = this.factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    }
    process(event) {
      const result = { add: [], remove: [] };
      if (event.type === "add") {
        for (const q of event.quads) {
          if (q.predicate === this.rdfsDomain) {
            result.add.push(...this.handleSchemaAdd(q.subject, q.object));
          } else {
            const domainClasses = this.domains.get(q.predicate);
            if (domainClasses) {
              for (const cls of domainClasses) {
                result.add.push({
                  subject: q.subject,
                  predicate: this.rdfType,
                  object: cls,
                  graph: this.targetGraphID
                });
              }
            }
          }
        }
      } else if (event.type === "delete") {
        for (const q of event.quads) {
          const domainClasses = this.domains.get(q.predicate);
          if (domainClasses) {
            for (const cls of domainClasses) {
              if (!this.stillImpliesType(q.subject, cls)) {
                result.remove.push({
                  subject: q.subject,
                  predicate: this.rdfType,
                  object: cls,
                  graph: this.targetGraphID
                });
              }
            }
          }
        }
      }
      return result;
    }
    stillImpliesType(subject, cls) {
      for (const [prop, classes] of this.domains) {
        if (classes.has(cls)) {
          if (this.store.hasAny(subject, prop, null)) {
            const matches = this.store.match(subject, prop, null, null);
            for (const _ of matches) return true;
          }
        }
      }
      return false;
    }
    clear() {
      this.domains.clear();
    }
    recompute() {
      this.clear();
      const schema = this.store.match(null, this.rdfsDomain, null);
      for (const [s, _p, o] of schema) {
        this.handleSchemaAdd(s, o, false);
      }
      const inferredQuads = [];
      for (const [prop, classes] of this.domains) {
        const matches = this.store.match(null, prop, null);
        for (const [s, _p, _o] of matches) {
          for (const cls of classes) {
            inferredQuads.push({
              subject: s,
              // Domain -> s a Class
              predicate: this.rdfType,
              object: cls,
              graph: this.targetGraphID
            });
          }
        }
      }
      return inferredQuads;
    }
    handleSchemaAdd(property, domainClass, augmentData = true) {
      let classes = this.domains.get(property);
      if (!classes) {
        classes = /* @__PURE__ */ new Set();
        this.domains.set(property, classes);
      }
      if (classes.has(domainClass)) return [];
      classes.add(domainClass);
      const newQuads = [];
      if (augmentData) {
        const matches = this.store.match(null, property, null);
        for (const [s] of matches) {
          newQuads.push({
            subject: s,
            predicate: this.rdfType,
            object: domainClass,
            graph: this.targetGraphID
          });
        }
      }
      return newQuads;
    }
  }
  class Vocabulary {
    constructor(factory) {
      // RDFS
      __publicField(this, "rdfsSubClassOf");
      __publicField(this, "rdfsSubPropertyOf");
      __publicField(this, "rdfsDomain");
      __publicField(this, "rdfsRange");
      __publicField(this, "rdfType");
      // OWL
      __publicField(this, "owlClass");
      __publicField(this, "owlObjectProperty");
      __publicField(this, "owlDatatypeProperty");
      __publicField(this, "owlRestriction");
      __publicField(this, "owlOnProperty");
      __publicField(this, "owlSomeValuesFrom");
      __publicField(this, "owlAllValuesFrom");
      __publicField(this, "owlHasValue");
      __publicField(this, "owlEquivalentClass");
      __publicField(this, "owlEquivalentProperty");
      __publicField(this, "owlSymmetricProperty");
      __publicField(this, "owlTransitiveProperty");
      __publicField(this, "owlInverseOf");
      __publicField(this, "owlFunctionalProperty");
      __publicField(this, "owlSameAs");
      __publicField(this, "owlDisjointWith");
      __publicField(this, "owlUnionOf");
      __publicField(this, "rdfFirst");
      __publicField(this, "rdfRest");
      __publicField(this, "rdfNil");
      this.rdfType = factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
      const rdfsBase = "http://www.w3.org/2000/01/rdf-schema#";
      this.rdfsSubClassOf = factory.namedNode(rdfsBase + "subClassOf");
      this.rdfsSubPropertyOf = factory.namedNode(rdfsBase + "subPropertyOf");
      this.rdfsDomain = factory.namedNode(rdfsBase + "domain");
      this.rdfsRange = factory.namedNode(rdfsBase + "range");
      const owlBase = "http://www.w3.org/2002/07/owl#";
      this.owlClass = factory.namedNode(owlBase + "Class");
      this.owlObjectProperty = factory.namedNode(owlBase + "ObjectProperty");
      this.owlDatatypeProperty = factory.namedNode(owlBase + "DatatypeProperty");
      this.owlRestriction = factory.namedNode(owlBase + "Restriction");
      this.owlOnProperty = factory.namedNode(owlBase + "onProperty");
      this.owlSomeValuesFrom = factory.namedNode(owlBase + "someValuesFrom");
      this.owlAllValuesFrom = factory.namedNode(owlBase + "allValuesFrom");
      this.owlHasValue = factory.namedNode(owlBase + "hasValue");
      this.owlEquivalentClass = factory.namedNode(owlBase + "equivalentClass");
      this.owlEquivalentProperty = factory.namedNode(owlBase + "equivalentProperty");
      this.owlSymmetricProperty = factory.namedNode(owlBase + "SymmetricProperty");
      this.owlTransitiveProperty = factory.namedNode(owlBase + "TransitiveProperty");
      this.owlInverseOf = factory.namedNode(owlBase + "inverseOf");
      this.owlFunctionalProperty = factory.namedNode(owlBase + "FunctionalProperty");
      this.owlSameAs = factory.namedNode(owlBase + "sameAs");
      this.owlDisjointWith = factory.namedNode(owlBase + "disjointWith");
      this.owlUnionOf = factory.namedNode(owlBase + "unionOf");
      this.rdfFirst = factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#first");
      this.rdfRest = factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#rest");
      this.rdfNil = factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#nil");
    }
  }
  class SchemaInspector {
    constructor(factory) {
      __publicField(this, "vocab");
      this.vocab = new Vocabulary(factory);
    }
    /**
     * Extracts deep metrics from a specific graph or the entire store.
     */
    getMetrics(store, graphID = null) {
      const v = this.vocab;
      const metrics = {
        classCount: 0,
        objectPropertyCount: 0,
        datatypePropertyCount: 0,
        propertyCount: 0,
        axiomCount: 0,
        restrictionCount: 0,
        individualCount: 0
      };
      metrics.classCount = this.countMatches(store, null, v.rdfType, v.owlClass, graphID);
      if (metrics.classCount === 0) ;
      metrics.objectPropertyCount = this.countMatches(store, null, v.rdfType, v.owlObjectProperty, graphID);
      metrics.datatypePropertyCount = this.countMatches(store, null, v.rdfType, v.owlDatatypeProperty, graphID);
      const allProperties = /* @__PURE__ */ new Set();
      for (const [s] of store.match(null, v.rdfType, v.owlObjectProperty, graphID)) allProperties.add(s);
      for (const [s] of store.match(null, v.rdfType, v.owlDatatypeProperty, graphID)) allProperties.add(s);
      metrics.propertyCount = allProperties.size;
      metrics.restrictionCount = this.countMatches(store, null, v.rdfType, v.owlRestriction, graphID);
      metrics.axiomCount += this.countMatches(store, null, v.rdfsSubClassOf, null, graphID);
      metrics.axiomCount += this.countMatches(store, null, v.rdfsSubPropertyOf, null, graphID);
      metrics.axiomCount += this.countMatches(store, null, v.rdfsDomain, null, graphID);
      metrics.axiomCount += this.countMatches(store, null, v.rdfsRange, null, graphID);
      metrics.axiomCount += this.countMatches(store, null, v.owlInverseOf, null, graphID);
      metrics.axiomCount += this.countMatches(store, null, v.owlEquivalentClass, null, graphID);
      metrics.axiomCount += this.countMatches(store, null, v.owlEquivalentProperty, null, graphID);
      const knownTypes = /* @__PURE__ */ new Set([v.owlClass, v.owlObjectProperty, v.owlDatatypeProperty, v.owlRestriction]);
      const individuals = /* @__PURE__ */ new Set();
      for (const [s, _p, o] of store.match(null, v.rdfType, null, graphID)) {
        if (!knownTypes.has(o)) {
          individuals.add(s);
        }
      }
      metrics.individualCount = individuals.size;
      return metrics;
    }
    countMatches(store, s, p, o, g) {
      let count = 0;
      for (const _ of store.match(s, p, o, g)) {
        count++;
      }
      return count;
    }
  }
  class TransitivePropertyModule {
    constructor(store, factory) {
      __publicField(this, "name", "owl-transitive");
      __publicField(this, "targetGraphID");
      __publicField(this, "owlTransitiveProperty");
      __publicField(this, "rdfType");
      __publicField(this, "transitiveProperties", /* @__PURE__ */ new Set());
      // Cache: Map<PropertyID, Map<SubjectID, Set<ObjectID>>>
      __publicField(this, "closureCache", /* @__PURE__ */ new Map());
      this.store = store;
      this.factory = factory;
      this.targetGraphID = this.factory.namedNode("http://example.org/graphs/inference/owl-transitive");
      this.owlTransitiveProperty = this.factory.namedNode("http://www.w3.org/2002/07/owl#TransitiveProperty");
      this.rdfType = this.factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    }
    process(event) {
      const result = { add: [], remove: [] };
      if (event.type === "add") {
        for (const q of event.quads) {
          if (q.predicate === this.rdfType && q.object === this.owlTransitiveProperty) {
            this.transitiveProperties.add(q.subject);
            result.add.push(...this.recomputeForProperty(q.subject));
          }
          if (this.transitiveProperties.has(q.predicate)) {
            this.expandTransitive(q.subject, q.predicate, q.object, result.add);
          }
        }
      } else if (event.type === "delete") ;
      return result;
    }
    clear() {
      this.transitiveProperties.clear();
      this.closureCache.clear();
    }
    recompute() {
      this.clear();
      const props = this.store.match(null, this.rdfType, this.owlTransitiveProperty);
      for (const [s] of props) {
        this.transitiveProperties.add(s);
      }
      const allQuads = [];
      for (const prop of this.transitiveProperties) {
        allQuads.push(...this.recomputeForProperty(prop));
      }
      return allQuads;
    }
    recomputeForProperty(prop) {
      const matches = this.store.match(null, prop, null);
      const adj = /* @__PURE__ */ new Map();
      const allNodes = /* @__PURE__ */ new Set();
      for (const [s, _p, o] of matches) {
        if (!adj.has(s)) adj.set(s, /* @__PURE__ */ new Set());
        adj.get(s).add(o);
        allNodes.add(s);
        allNodes.add(o);
      }
      const inferredQuads = [];
      const existingLinks = /* @__PURE__ */ new Set();
      for (const [s, _p, o] of matches) {
        existingLinks.add(`${s}|${o}`);
      }
      for (const startNode of allNodes) {
        const visited = /* @__PURE__ */ new Set();
        const queue = [startNode];
        visited.add(startNode);
        while (queue.length > 0) {
          const current = queue.shift();
          if (current !== startNode) {
            const key = `${startNode}|${current}`;
            if (!existingLinks.has(key)) {
              inferredQuads.push({
                subject: startNode,
                predicate: prop,
                object: current,
                graph: this.targetGraphID
              });
              existingLinks.add(key);
            }
          }
          const neighbors = adj.get(current);
          if (neighbors) {
            for (const next of neighbors) {
              if (!visited.has(next)) {
                visited.add(next);
                queue.push(next);
              }
            }
          }
        }
      }
      return inferredQuads;
    }
    // Helper: Incremental expansion (for single 'add' events)
    expandTransitive(s, p, o, collection, visited = /* @__PURE__ */ new Set()) {
      const key = `${s}|${p}|${o}`;
      if (visited.has(key)) return;
      visited.add(key);
      if (visited.size > 200) return;
      const incoming = this.store.match(null, p, s);
      for (const [x] of incoming) {
        if (!this.store.has(x, p, o, this.targetGraphID) && !this.store.has(x, p, o)) {
          collection.push({ subject: x, predicate: p, object: o, graph: this.targetGraphID });
          this.expandTransitive(x, p, o, collection, visited);
        }
      }
      const outgoing = this.store.match(o, p, null);
      for (const [_s, _p, y] of outgoing) {
        if (!this.store.has(s, p, y, this.targetGraphID) && !this.store.has(s, p, y)) {
          collection.push({ subject: s, predicate: p, object: y, graph: this.targetGraphID });
          this.expandTransitive(s, p, y, collection, visited);
        }
      }
    }
  }
  class SymmetricPropertyModule {
    constructor(store, factory) {
      __publicField(this, "name", "owl-symmetric");
      __publicField(this, "targetGraphID");
      __publicField(this, "owlSymmetricProperty");
      __publicField(this, "rdfType");
      __publicField(this, "symmetricProperties", /* @__PURE__ */ new Set());
      this.store = store;
      this.factory = factory;
      this.targetGraphID = this.factory.namedNode("http://example.org/graphs/inference/owl-symmetric");
      this.owlSymmetricProperty = this.factory.namedNode("http://www.w3.org/2002/07/owl#SymmetricProperty");
      this.rdfType = this.factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    }
    process(event) {
      const result = { add: [], remove: [] };
      if (event.type === "add") {
        for (const q of event.quads) {
          if (q.predicate === this.rdfType && q.object === this.owlSymmetricProperty) {
            this.symmetricProperties.add(q.subject);
            result.add.push(...this.recomputeForProperty(q.subject));
          }
          if (this.symmetricProperties.has(q.predicate)) {
            if (!this.store.has(q.object, q.predicate, q.subject)) {
              result.add.push({
                subject: q.object,
                predicate: q.predicate,
                object: q.subject,
                graph: this.targetGraphID
              });
            }
          }
        }
      } else if (event.type === "delete") {
        for (const q of event.quads) {
          if (this.symmetricProperties.has(q.predicate)) {
            result.remove.push({
              subject: q.object,
              predicate: q.predicate,
              object: q.subject,
              graph: this.targetGraphID
            });
          }
        }
      }
      return result;
    }
    clear() {
      this.symmetricProperties.clear();
    }
    recompute() {
      this.clear();
      const props = this.store.match(null, this.rdfType, this.owlSymmetricProperty);
      for (const [s] of props) {
        this.symmetricProperties.add(s);
      }
      const allQuads = [];
      for (const prop of this.symmetricProperties) {
        allQuads.push(...this.recomputeForProperty(prop));
      }
      return allQuads;
    }
    recomputeForProperty(prop) {
      const matches = this.store.match(null, prop, null);
      const inferredQuads = [];
      for (const [s, _p, o] of matches) {
        if (!this.store.has(o, prop, s)) {
          inferredQuads.push({
            subject: o,
            predicate: prop,
            object: s,
            graph: this.targetGraphID
          });
        }
      }
      return inferredQuads;
    }
  }
  class FunctionalPropertyModule {
    constructor(store, factory) {
      __publicField(this, "name", "owl-functional");
      __publicField(this, "targetGraphID");
      __publicField(this, "owlFunctionalProperty");
      __publicField(this, "owlSameAs");
      __publicField(this, "rdfType");
      __publicField(this, "functionalProperties", /* @__PURE__ */ new Set());
      this.store = store;
      this.factory = factory;
      this.targetGraphID = this.factory.namedNode("http://example.org/graphs/inference/owl-functional");
      this.owlFunctionalProperty = this.factory.namedNode("http://www.w3.org/2002/07/owl#FunctionalProperty");
      this.owlSameAs = this.factory.namedNode("http://www.w3.org/2002/07/owl#sameAs");
      this.rdfType = this.factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    }
    process(event) {
      const result = { add: [], remove: [] };
      if (event.type === "add") {
        for (const q of event.quads) {
          if (q.predicate === this.rdfType && q.object === this.owlFunctionalProperty) {
            this.functionalProperties.add(q.subject);
            result.add.push(...this.recomputeForProperty(q.subject));
          }
          if (this.functionalProperties.has(q.predicate)) {
            const matches = this.store.match(q.subject, q.predicate, null);
            for (const [_s, _p, o2] of matches) {
              if (o2 !== q.object) {
                if (!this.store.has(q.object, this.owlSameAs, o2)) {
                  result.add.push({
                    subject: q.object,
                    predicate: this.owlSameAs,
                    object: o2,
                    graph: this.targetGraphID
                  });
                }
              }
            }
          }
        }
      } else if (event.type === "delete") ;
      return result;
    }
    clear() {
      this.functionalProperties.clear();
    }
    recompute() {
      this.clear();
      const props = this.store.match(null, this.rdfType, this.owlFunctionalProperty);
      for (const [s] of props) {
        this.functionalProperties.add(s);
      }
      const allQuads = [];
      for (const prop of this.functionalProperties) {
        allQuads.push(...this.recomputeForProperty(prop));
      }
      return allQuads;
    }
    recomputeForProperty(prop) {
      const matches = this.store.match(null, prop, null);
      const inferredQuads = [];
      const buckets = /* @__PURE__ */ new Map();
      for (const [s, _p, o] of matches) {
        if (!buckets.has(s)) buckets.set(s, []);
        buckets.get(s).push(o);
      }
      for (const objects of buckets.values()) {
        if (objects.length > 1) {
          for (let i = 0; i < objects.length; i++) {
            for (let j = i + 1; j < objects.length; j++) {
              if (!this.store.has(objects[i], this.owlSameAs, objects[j])) {
                inferredQuads.push({
                  subject: objects[i],
                  predicate: this.owlSameAs,
                  object: objects[j],
                  graph: this.targetGraphID
                });
              }
            }
          }
        }
      }
      return inferredQuads;
    }
  }
  class InverseFunctionalPropertyModule {
    constructor(store, factory) {
      __publicField(this, "name", "owl-inverse-functional");
      __publicField(this, "targetGraphID");
      __publicField(this, "owlInverseFunctionalProperty");
      __publicField(this, "owlSameAs");
      __publicField(this, "rdfType");
      __publicField(this, "invFunctionalProperties", /* @__PURE__ */ new Set());
      this.store = store;
      this.factory = factory;
      this.targetGraphID = this.factory.namedNode("http://example.org/graphs/inference/owl-inverse-functional");
      this.owlInverseFunctionalProperty = this.factory.namedNode("http://www.w3.org/2002/07/owl#InverseFunctionalProperty");
      this.owlSameAs = this.factory.namedNode("http://www.w3.org/2002/07/owl#sameAs");
      this.rdfType = this.factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    }
    process(event) {
      const inferredQuads = [];
      if (event.type === "add") {
        for (const q of event.quads) {
          if (q.predicate === this.rdfType && q.object === this.owlInverseFunctionalProperty) {
            this.invFunctionalProperties.add(q.subject);
            inferredQuads.push(...this.recomputeForProperty(q.subject));
          }
          if (this.invFunctionalProperties.has(q.predicate)) {
            const matches = this.store.match(null, q.predicate, q.object);
            for (const [s2] of matches) {
              if (s2 !== q.subject) {
                if (!this.store.has(q.subject, this.owlSameAs, s2)) {
                  inferredQuads.push({
                    subject: q.subject,
                    predicate: this.owlSameAs,
                    object: s2,
                    graph: this.targetGraphID
                  });
                }
              }
            }
          }
        }
      }
      return { add: inferredQuads, remove: [] };
    }
    clear() {
      this.invFunctionalProperties.clear();
    }
    recompute() {
      this.clear();
      const props = this.store.match(null, this.rdfType, this.owlInverseFunctionalProperty);
      for (const [s] of props) {
        this.invFunctionalProperties.add(s);
      }
      const allQuads = [];
      for (const prop of this.invFunctionalProperties) {
        allQuads.push(...this.recomputeForProperty(prop));
      }
      return allQuads;
    }
    recomputeForProperty(prop) {
      const matches = this.store.match(null, prop, null);
      const inferredQuads = [];
      const buckets = /* @__PURE__ */ new Map();
      for (const [s, _p, o] of matches) {
        if (!buckets.has(o)) buckets.set(o, []);
        buckets.get(o).push(s);
      }
      for (const subjects of buckets.values()) {
        if (subjects.length > 1) {
          for (let i = 0; i < subjects.length; i++) {
            for (let j = i + 1; j < subjects.length; j++) {
              if (!this.store.has(subjects[i], this.owlSameAs, subjects[j])) {
                inferredQuads.push({
                  subject: subjects[i],
                  predicate: this.owlSameAs,
                  object: subjects[j],
                  graph: this.targetGraphID
                });
              }
            }
          }
        }
      }
      return inferredQuads;
    }
  }
  class ReflexivePropertyModule {
    constructor(store, factory) {
      __publicField(this, "name", "owl-reflexive");
      __publicField(this, "targetGraphID");
      __publicField(this, "owlReflexiveProperty");
      __publicField(this, "rdfType");
      __publicField(this, "reflexiveProperties", /* @__PURE__ */ new Set());
      this.store = store;
      this.factory = factory;
      this.targetGraphID = this.factory.namedNode("http://example.org/graphs/inference/owl-reflexive");
      this.owlReflexiveProperty = this.factory.namedNode("http://www.w3.org/2002/07/owl#ReflexiveProperty");
      this.rdfType = this.factory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    }
    process(event) {
      const result = { add: [], remove: [] };
      if (event.type === "add") {
        for (const q of event.quads) {
          if (q.predicate === this.rdfType && q.object === this.owlReflexiveProperty) {
            this.reflexiveProperties.add(q.subject);
            result.add.push(...this.recomputeForProperty(q.subject));
          }
          if (this.reflexiveProperties.has(q.predicate)) {
            if (!this.store.has(q.subject, q.predicate, q.subject)) {
              result.add.push({
                subject: q.subject,
                predicate: q.predicate,
                object: q.subject,
                graph: this.targetGraphID
              });
            }
            if (!this.store.has(q.object, q.predicate, q.object)) {
              result.add.push({
                subject: q.object,
                predicate: q.predicate,
                object: q.object,
                graph: this.targetGraphID
              });
            }
          }
        }
      } else if (event.type === "delete") ;
      return result;
    }
    clear() {
      this.reflexiveProperties.clear();
    }
    recompute() {
      this.clear();
      const props = this.store.match(null, this.rdfType, this.owlReflexiveProperty);
      for (const [s] of props) {
        this.reflexiveProperties.add(s);
      }
      const allQuads = [];
      for (const prop of this.reflexiveProperties) {
        allQuads.push(...this.recomputeForProperty(prop));
      }
      return allQuads;
    }
    recomputeForProperty(prop) {
      const matches = this.store.match(null, prop, null);
      const inferredQuads = [];
      const terms = /* @__PURE__ */ new Set();
      for (const [s, _p, o] of matches) {
        terms.add(s);
        terms.add(o);
      }
      for (const term of terms) {
        if (!this.store.has(term, prop, term)) {
          inferredQuads.push({
            subject: term,
            predicate: prop,
            object: term,
            graph: this.targetGraphID
          });
        }
      }
      return inferredQuads;
    }
  }
  class InverseOfModule {
    constructor(store, factory) {
      __publicField(this, "name", "owl-inverse");
      __publicField(this, "targetGraphID");
      __publicField(this, "owlInverseOf");
      // Map: Property -> List of Inverse Properties
      __publicField(this, "inverseMap", /* @__PURE__ */ new Map());
      this.store = store;
      this.factory = factory;
      this.targetGraphID = this.factory.namedNode("http://example.org/graphs/inference/owl-inverse");
      this.owlInverseOf = this.factory.namedNode("http://www.w3.org/2002/07/owl#inverseOf");
    }
    process(event) {
      const result = { add: [], remove: [] };
      const handleQuad = (q, isAdd) => {
        if (q.predicate === this.owlInverseOf) {
          const p1 = q.subject;
          const p2 = q.object;
          if (isAdd) {
            this.addInverseMapping(p1, p2);
            this.addInverseMapping(p2, p1);
            if (isAdd) {
              result.add.push(...this.recomputeForPropertyPair(p1, p2));
            }
          } else {
            this.removeInverseMapping(p1, p2);
            this.removeInverseMapping(p2, p1);
          }
        }
        if (this.inverseMap.has(q.predicate)) {
          const inverses = this.inverseMap.get(q.predicate);
          for (const invP of inverses) {
            if (isAdd) {
              if (!this.store.hasAny(q.object, invP, q.subject)) {
                result.add.push({
                  subject: q.object,
                  predicate: invP,
                  object: q.subject,
                  graph: this.targetGraphID
                });
              }
            } else {
              result.remove.push({
                subject: q.object,
                predicate: invP,
                object: q.subject,
                graph: this.targetGraphID
              });
            }
          }
        }
      };
      if (event.type === "add") {
        for (const q of event.quads) handleQuad(q, true);
      } else if (event.type === "delete") {
        for (const q of event.quads) handleQuad(q, false);
      }
      return result;
    }
    addInverseMapping(p1, p2) {
      if (!this.inverseMap.has(p1)) this.inverseMap.set(p1, []);
      const list = this.inverseMap.get(p1);
      if (!list.includes(p2)) list.push(p2);
    }
    removeInverseMapping(p1, p2) {
      if (this.inverseMap.has(p1)) {
        const list = this.inverseMap.get(p1);
        const idx = list.indexOf(p2);
        if (idx > -1) list.splice(idx, 1);
      }
    }
    clear() {
      this.inverseMap.clear();
    }
    recompute() {
      this.clear();
      for (const [s, _, o] of this.store.match(null, this.owlInverseOf, null)) {
        this.addInverseMapping(s, o);
        this.addInverseMapping(o, s);
      }
      const inferredQuads = [];
      for (const [p, inverses] of this.inverseMap) {
        for (const [s, _, o] of this.store.match(null, p, null)) {
          for (const invP of inverses) {
            if (!this.store.hasAny(o, invP, s)) {
              inferredQuads.push({
                subject: o,
                predicate: invP,
                object: s,
                graph: this.targetGraphID
              });
            }
          }
        }
      }
      return inferredQuads;
    }
    recomputeForPropertyPair(p1, p2) {
      const result = [];
      for (const [s, _, o] of this.store.match(null, p1, null)) {
        if (!this.store.hasAny(o, p2, s)) {
          result.push({ subject: o, predicate: p2, object: s, graph: this.targetGraphID });
        }
      }
      for (const [s, _, o] of this.store.match(null, p2, null)) {
        if (!this.store.hasAny(o, p1, s)) {
          result.push({ subject: o, predicate: p1, object: s, graph: this.targetGraphID });
        }
      }
      return result;
    }
  }
  exports2.DomainModule = DomainModule;
  exports2.FunctionalPropertyModule = FunctionalPropertyModule;
  exports2.InferenceEngine = InferenceEngine;
  exports2.InverseFunctionalPropertyModule = InverseFunctionalPropertyModule;
  exports2.InverseOfModule = InverseOfModule;
  exports2.RangeModule = RangeModule;
  exports2.ReflexivePropertyModule = ReflexivePropertyModule;
  exports2.SchemaInspector = SchemaInspector;
  exports2.SubClassOfModule = SubClassOfModule;
  exports2.SubPropertyOfModule = SubPropertyOfModule;
  exports2.SymmetricPropertyModule = SymmetricPropertyModule;
  exports2.TransitivePropertyModule = TransitivePropertyModule;
  exports2.Vocabulary = Vocabulary;
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
});
