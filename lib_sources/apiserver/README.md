# @triplestore/apiserver

A portable, zero-dependency Node.js HTTP/SSE server that hosts the NektoGraph in-memory `QuadStore`, `SPARQL` engine, `UnifiedSearch` index, and `InferenceEngine` rule processor. 

It is designed to serve as a high-performance backend database server that interfaces with Python AI orchestrators and serves the NektoGraph Workbench UI statically.

## Architecture & Packaging

- **Source Location:** `lib_sources/apiserver/src/`
- **Build Output:** Compiled via Vite into a single, self-contained CommonJS file at `publish/Server/server.js`.
- **Runtime:** Runs natively on standard Node.js (`node server.js`) with **zero npm dependencies** required at the execution environment.
- **Port:** Defaults to `3001`.

---

## API Endpoints

### 1. Dictionary Alignment
Used to align the browser UI's local string pool dictionary with the server so that the server can decode raw binary `BigInt` NodeIDs into original URIs/strings.

* **`POST /api/v1/store/dictionary`**
  - **Content-Type:** `application/json`
  - **Body:** `{ "104928": { "termType": "NamedNode", "value": "http://example.org/John" }, ... }`
  - **Returns:** `{ "status": "success", "count": 1420 }`

* **`GET /api/v1/store/dictionary`**
  - **Returns:** The currently registered string pool mappings.

### 2. Flat Binary Quad Stream
* **`POST /api/v1/store/binary`**
  - Ingests raw binary `BigUint64Array` quad streams (32 bytes per quad: Subject, Predicate, Object, Graph).
  - **Content-Type:** `application/octet-stream`
  - **Returns:** `{ "status": "success", "imported": 6103 }`

* **`GET /api/v1/store/binary`**
  - Returns the entire memory store as a flat 32-byte layout binary stream.
  - **Response Content-Type:** `application/octet-stream`

### 3. SPARQL Query
* **`POST /api/v1/sparql`**
  - Executes a standard SPARQL SELECT or ASK query.
  - **Content-Type:** `application/json`
  - **Body:** `{ "query": "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 5" }`
  - **Returns:** SPARQL JSON results (with NodeIDs resolved to terms via the dictionary).

### 4. Search
* **`POST /api/v1/search`**
  - Performs Turkish-aware text searches on indexed URIs and literals.
  - **Content-Type:** `application/json`
  - **Body:** `{ "query": "John", "preferredClass": "http://example.org/Person", "language": "tr" }`

### 5. SSE Event Stream
* **`GET /api/v1/events`**
  - Real-time Server-Sent Events (SSE) broadcaster for store mutations.

---

## Startup Batch Script

A pre-packaged `.bat` file is provided inside the `publish/Server/` directory to run the server with a single click:

```batch
@echo off
cd /d "%~dp0"
echo Starting NektoGraph API Server (Port 3001)...
start http://localhost:3001
node server.js
```
