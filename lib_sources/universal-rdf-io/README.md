# Universal RDF I/O

**A high-performance, zero-dependency RDF processing toolkit for modern JavaScript environments.**

Universal RDF I/O is a standalone library that provides a unified interface for parsing and serializing RDF data across multiple formats. Whether you are building a browser-based knowledge graph editor, a high-speed Node.js data pipeline, or a background worker, this library simplifies your RDF data flow.

[![npm version](https://img.shields.io/badge/npm-Beta v1.0-blue.svg)](https://www.npmjs.com/package/universal-rdf-io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Key Features

- **Unified Interface:** One API for Turtle, TriG, N-Triples, N-Quads, JSON-LD, and RDF/XML.
- **✨ RDF-star (RDF-star) Support:** Full compatibility with quoted triples (`<<s p o>>`) across all N3-based formats.
- **🚀 Permissive N-Quads:** Proprietary shim that converts RDF-star N-Quads into TriG blocks, enabling "star" support in standard N-Quad streams.
- **Environment Agnostic:** Optimized for Browser, Web Workers, and Node.js.
- **Streaming Ready:** Internally utilizes streaming parsers for memory efficiency.
- **Smart RDF/XML:** Native workarounds for common `rdf:langString` encoding issues in external tools.
- **BaseIRI Management:** Automated `@base` directive injection and relativization.
- **Zero App-State Dependency:** Completely decoupled from any specific triple store or database engine.

## 📦 Installation

### Via npm
```bash
npm install @triplestore/universal-rdf-io
```

### Direct Browser Usage
Include the UMD bundle from the `dist-browser` folder. This exposes the library under the `UniversalRDF` global namespace.

```html
<script src="path/to/universal-rdf-io.browser.js"></script>
```

## 🛠 Quick Start

### Parsing RDF Data
```javascript
import { UniversalParser } from '@triplestore/universal-rdf-io';

const parser = new UniversalParser();
const turtleContent = '@prefix ex: <http://example.org/> . ex:Alice ex:knows ex:Bob .';

await parser.parse(turtleContent, 'Turtle', (quad) => {
    console.log(`Subject: ${quad.subject.value}`);
    console.log(`Predicate: ${quad.predicate.value}`);
    console.log(`Object: ${quad.object.value}`);
}, {
    onPrefix: (prefix, iri) => console.log(`Discovered prefix: ${prefix} -> ${iri}`)
});
```

### Serializing to RDF/XML or JSON-LD
```javascript
import { UniversalSerializer } from '@triplestore/universal-rdf-io';

const serializer = new UniversalSerializer();
const quads = [ /* RDF/JS compliant quads */ ];

const rdfXml = await serializer.serialize(quads, { 
    format: 'RDF/XML',
    baseIRI: 'http://example.org/project/',
    prefixes: { 'ex': 'http://example.org/ns#' }
});

console.log(rdfXml);
```

## 📖 Documentation

Detailed guides and advanced usage examples can be found in our [Comprehensive Tutorial](./TUTORIAL.md).

- [Architecture Overview](./TUTORIAL.md#architecture)
- [Handling Prefixes and BaseIRIs](./TUTORIAL.md#prefixes-and-base)
- [Format Compatibility Matrix](./TUTORIAL.md#formats)
- [Performance Best Practices](./TUTORIAL.md#performance)

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

