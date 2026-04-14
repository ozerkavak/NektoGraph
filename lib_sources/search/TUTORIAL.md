# Search Library Tutorial

This guide explains how to use the `@triplestore/search` library to provide high-quality, reactive search results for your knowledge graph.

---

## 1. The Core Concept

The Search library does not just look for strings; it indexes the **labels** (`rdfs:label`, `skos:prefLabel`, etc.) found within a `QuadStore` and maps them back to their `NodeID`.

### The Build Phase
Before searching, you must build the index. This process scans the store and populates a high-speed token map.

```javascript
const search = new UnifiedSearch(store, factory, schemaIndex);
search.buildIndex();
```

---

## 2. 🇹🇷 Turkish Normalization

Searching for lowercase characters in Turkish is notoriously difficult due to the `i/İ` and `ı/I` distinction.

The Search library uses a strict normalization pipeline:
1. **Locale-Aware Lowercasing:** Uses `tr-TR` collation.
2. **Character Flattening:** Maps accented characters to their base form for fuzzy matches.
3. **Tokenization:** Splits long labels into searchable chunks.

**Example:**
Searching for "Çıkarım" will match "çıkarım", "CIKARIM", and "cikarim".

---

## 3. 🎯 Ranking and Scoring

We use a deterministic scoring model to ensure the most relevant results appear at the top.

- **Exact Start (+1000):** If the label starts exactly with your query.
- **Word Start (+800):** If one of the internal words in the label starts with your query.
- **Substring (+500):** If the query is found anywhere inside the label.
- **Levenshtein/Fuzzy (Optional):** Minor penalties for small typos.

---

## 4. Advanced Filters

You can restrict search results based on the RDF schema.

### Filtering by Class
Only return results that are instances of a specific class (e.g., searching only for "People").

```javascript
const personClass = factory.namedNode('http://schema.org/Person');
const results = await search.search(store, "Ali", {
    preferredClass: personClass
});
```

### Filtering by Language
Prioritize or restrict results to a specific language tag.

```javascript
const results = await search.search(store, "Ankara", {
    language: 'tr'
});
```

---

## 5. Integration with KGEntity

In the Antigravity ecosystem, search results are typically used to hydrate entities.

```javascript
const results = await search.search(store, query);
const items = results.map(res => {
    const entity = KGEntity.get(res.id); // Hydrate metadata
    return {
        id: res.id,
        title: entity.getDisplayName(),
        score: res.score
    };
});
```

---

## ⚠️ Performance Note

Building the index is an $O(N)$ operation where $N$ is the number of labels. For stores with >100,000 labels, it is recommended to run the indexing in a **Web Worker** to avoid UI stutter.

