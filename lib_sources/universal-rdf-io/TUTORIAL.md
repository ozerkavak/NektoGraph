# Universal RDF I/O: The Comprehensive Tutorial

This guide provides an exhaustive look at the `universal-rdf-io` library, covering advanced configurations, performance tuning, and cross-format workflows.

---

## Table of Contents
1. [Core Philosophy](#philosophy)
2. [The Universal Parser](#parser)
   - [Basic Parsing](#basic-parsing)
   - [Advanced Options (Prefixes & BaseIRI)](#advanced-parsing)
   - [Format Specific Notes (RDF/XML Fix)](#format-notes)
3. [The Universal Serializer](#serializer)
   - [Conversion Example](#conversion)
   - [Serialization Options](#serialization-options)
4. [Using in a Web Worker (Recommended)](#web-worker)
5. [RDF-star (SPARQL-star) Workflows](#rdf-star)
6. [Format Support Matrix](#matrix)

---

<a name="philosophy"></a>
## 1. Core Philosophy

`universal-rdf-io` is built on three pillars:
- **RDF/JS Compliance:** All emitted quads follow the [RDF/JS Data Model](https://rdf.js.org/data-model-spec/).
- **Streaming Internalization:** We use streams internally to handle large datasets WITHOUT blocking the main thread more than necessary.
- **Independence:** The library can be dropped into any project without requiring `@triplestore/core`.

---

<a name="parser"></a>
## 2. The Universal Parser

### Basic Parsing
The `parse` method is `async` and uses a callback-based approach to emit quads as soon as they are found.

```javascript
import { UniversalParser } from 'universal-rdf-io';

const parser = new UniversalParser();
await parser.parse(content, 'Turtle', (quad) => {
    // Process quad
});
```

### Advanced Options
The fourth parameter is a `ParseOptions` object:

| Option | Type | Description |
| :--- | :--- | :--- |
| `baseIRI` | `string` | The base URI to resolve relative IRIs against. |
| `onPrefix` | `(prefix, iri) => void` | Triggered every time a `@prefix` or `PREFIX` is encountered. |
| `onBase` | `(iri) => void` | Triggered when a `@base` or `BASE` directive is encountered. |

**Example discovering prefixes:**
```javascript
const prefixes = {};
await parser.parse(content, 'TriG', (q) => store.add(q), {
    onPrefix: (p, iri) => { prefixes[p] = iri; },
    baseIRI: 'http://my-project.org/'
});
```

### Format Specific Notes (RDF/XML Fix)
Traditional RDF/XML parsers often fail to extract `xml:lang` attributes when a redundant `rdf:datatype="...#langString"` is explicitly present in the data. `UniversalParser` includes an automated pre-processor for RDF/XML that cleans these directives, ensuring your language tags are correctly preserved.

---

<a name="serializer"></a>
## 3. The Universal Serializer

The `UniversalSerializer` takes an array or iterator of quads and converts them back to text.

### Conversion Example (Turtle to JSON-LD)
```javascript
import { UniversalParser, UniversalSerializer } from 'universal-rdf-io';

const quads = [];
const parser = new UniversalParser();
const serializer = new UniversalSerializer();

// 1. Read Turtle
await parser.parse(turtleTxt, 'Turtle', (q) => quads.push(q));

// 2. Write JSON-LD
const jsonLdTxt = await serializer.serialize(quads, { format: 'JSON-LD' });
```

### Serialization Options

| Option | Type | Description |
| :--- | :--- | :--- |
| `format` | `string` | One of: `Turtle`, `N-Triples`, `N-Quads`, `TriG`, `JSON-LD`, `RDF/XML`. |
| `prefixes` | `object` | Map of `{ 'prefix': 'IRI' }` to use for shortening IRIs. |
| `baseIRI` | `string` | If provided, the output will use relative IRIs. For Turtle/TriG, an `@base` directive is automatically injected. |

---

<a name="web-worker"></a>
## 4. Using in a Web Worker (Recommended)

To keep your UI at 60fps, always run parsing in a worker.

**worker.js**
```javascript
import { UniversalParser } from 'universal-rdf-io';

self.onmessage = async (e) => {
    const { content, format } = e.data;
    const parser = new UniversalParser();
    
    await parser.parse(content, format, (quad) => {
        // Send quad back or store in worker-side database
        self.postMessage({ type: 'QUAD', quad });
    });
    
    self.postMessage({ type: 'DONE' });
};
```

---

<a name="matrix"></a>
## 5. Format Support Matrix

| **RDF/XML** | ✅ | ⚠️ | *Serialization currently experimental.* |
| **RDF-star** | ✅ | ✅ | Quoted triples (`<<s p o>>`) in Turtle/TriG/N-Quads. |

---

<a name="rdf-star"></a>
## 6. RDF-star (SPARQL-star) Workflows

The library natively supports **RDF-star** (quoted triples).

### Permissive N-Quads
Standard N-Quads parsers are often too strict to handle `<< >>` tokens. `UniversalParser` includes a proprietary shim that detects RDF-star in N-Quads and automatically wraps them in TriG blocks:

- **Source:** `<<s> <p> <o>> <p2> <o2> <g1> .`
- **Internal:** `<g1> { <<<s> <p> <o>>> <p2> <o2> . }`

This allows for seamless migration of annotated datasets across standard quad streams.

### Serialization
When serializing to Turtle or TriG, ensure you pass the `rdfStar: true` flag (set by default in `UniversalSerializer`) to generate native `<< >>` syntax instead of verbose reification.

---
**Warning:** Since this library processes Large RDF datasets, quads may contain `BigInt` identifiers if used in conjunction with high-performance stores. Ensure your data pipeline supports `BigInt` serialization.

