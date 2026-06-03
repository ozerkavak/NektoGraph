import { QuadStore, IDFactory, NodeID } from '@triplestore/core';
import { UnifiedSearch } from '@triplestore/search';
import { InferenceEngine } from '@triplestore/inference';
import { QuadLoader } from '@triplestore/io';
import { SPARQLEngine, QueryParser } from '@triplestore/sparql';
import { serializeStore, deserializeStore } from './serializer';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const store = new QuadStore();
const factory = new IDFactory();
const searchEngine = new UnifiedSearch({ store, factory });
const inferenceEngine = new InferenceEngine(store);
const loader = new QuadLoader(store, factory);

// A map to store the aligned dictionary from the client
const customDictionary = new Map<bigint, any>();

// Dynamically override IDFactory decode to resolve custom BigInt IDs
const originalDecode = factory.decode.bind(factory);
factory.decode = function (id: NodeID) {
  const bigId = BigInt(id);
  if (customDictionary.has(bigId)) {
    return customDictionary.get(bigId);
  }
  return originalDecode(id);
};

// SSE connection pool
const connections = new Set<http.ServerResponse>();

// Monitor mutations and broadcast to SSE listeners
store.on('data', (event) => {
  const payload = JSON.stringify({
    type: event.type,
    source: event.source,
    quads: event.quads.map(q => ({
      subject: q.subject.toString(),
      predicate: q.predicate.toString(),
      object: q.object.toString(),
      graph: q.graph.toString()
    }))
  });

  for (const connection of connections) {
    try {
      connection.write(`data: ${payload}\n\n`);
    } catch {
      connections.delete(connection);
    }
  }
});

const PORT = 3001;

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || '', `http://localhost:${PORT}`);

  // Handle CORS preflight options
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-format'
    });
    res.end();
    return;
  }

  // 1. Ingest/Export String Pool Dictionary
  if (parsedUrl.pathname === '/api/v1/store/dictionary') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const dict = JSON.parse(body);
          let count = 0;
          for (const [idStr, token] of Object.entries(dict)) {
            customDictionary.set(BigInt(idStr), token);
            count++;
          }

          // Rebuild search index to align tokens
          searchEngine.invalidateIndex();
          searchEngine.buildIndex();

          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ status: 'success', count }));
        } catch (e: any) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ status: 'error', message: e.message }));
        }
      });
      return;
    }

    if (req.method === 'GET') {
      const obj: Record<string, any> = {};
      for (const [id, token] of customDictionary.entries()) {
        obj[id.toString()] = token;
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(obj));
      return;
    }
  }

  // 2. Binary Ingest & Export (Zero-Copy Transfer)
  if (parsedUrl.pathname === '/api/v1/store/binary') {
    if (req.method === 'GET') {
      const binaryData = serializeStore(store);
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(Buffer.from(binaryData.buffer));
      return;
    }

    if (req.method === 'POST') {
      const chunks: Buffer[] = [];
      req.on('data', chunk => { chunks.push(chunk); });
      req.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
          const imported = deserializeStore(arrayBuffer, store);

          // Trigger inference and search index rebuild
          inferenceEngine.recompute();
          searchEngine.invalidateIndex();
          searchEngine.buildIndex();

          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ status: 'success', imported }));
        } catch (e: any) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ status: 'error', message: e.message }));
        }
      });
      return;
    }
  }

  // 3. SPARQL Query Endpoint
  if (parsedUrl.pathname === '/api/v1/sparql' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { query } = JSON.parse(body);
        const parsed = new QueryParser().parse(query);
        const engine = new SPARQLEngine(store, factory);
        const execResult = await engine.execute(parsed);

        if (typeof execResult === 'boolean') {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ type: 'ask', boolean: execResult }));
          return;
        }

        const varNames = engine.getVariableNames(parsed as any);
        const results: any[] = [];

        if (typeof execResult === 'object' && execResult !== null && Symbol.asyncIterator in execResult) {
          for await (const row of execResult as any) {
            if (!Array.isArray(row)) continue;
            const r: Record<string, any> = {};
            varNames.forEach((v, idx) => {
              const val = row[idx];
              r[v] = val !== 0n ? factory.decode(val) : null;
            });
            results.push(r);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ type: 'select', variables: varNames, results }));
      } catch (e: any) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ status: 'error', message: e.message }));
      }
    });
    return;
  }

  // 4. Turkish-Aware Search & Polysemy Resolution (UnifiedSearch)
  if (parsedUrl.pathname === '/api/v1/search' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { query, preferredClass, language } = JSON.parse(body);
        searchEngine.buildIndex();

        const classNode = preferredClass ? factory.namedNode(preferredClass) : undefined;
        const results = await searchEngine.search(store, query, {
          preferredClass: classNode,
          strictTypes: !!preferredClass,
          language: language || 'tr'
        });

        const serializedResults = results.map(r => ({
          id: r.id.toString(),
          labels: r.labels,
          description: r.description,
          score: r.score,
          reason: r.debugReason
        }));

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(serializedResults));
      } catch (e: any) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ status: 'error', message: e.message }));
      }
    });
    return;
  }

  // 5. Server-Sent Events (SSE) stream for UI reactivity
  if (parsedUrl.pathname === '/api/v1/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    connections.add(res);
    req.on('close', () => {
      connections.delete(res);
    });
    return;
  }

  // Serve static files from the publish directory (one level up from Server folder)
  if (!parsedUrl.pathname.startsWith('/api/')) {
    const relativePath = parsedUrl.pathname === '/' || parsedUrl.pathname === '' ? '/index.html' : parsedUrl.pathname;
    const cleanPath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(__dirname, '..', cleanPath);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        const indexPath = path.join(__dirname, '..', 'index.html');
        fs.readFile(indexPath, (errIndex, dataIndex) => {
          if (errIndex) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(dataIndex);
          }
        });
      } else {
        fs.readFile(filePath, (errFile, dataFile) => {
          if (errFile) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
          } else {
            let contentType = 'text/plain';
            if (filePath.endsWith('.html')) contentType = 'text/html';
            else if (filePath.endsWith('.js')) contentType = 'application/javascript';
            else if (filePath.endsWith('.css')) contentType = 'text/css';
            else if (filePath.endsWith('.json')) contentType = 'application/json';
            else if (filePath.endsWith('.png')) contentType = 'image/png';
            else if (filePath.endsWith('.jpg')) contentType = 'image/jpeg';
            else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';

            res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
            res.end(dataFile);
          }
        });
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`NektoGraph API Server running on http://localhost:${PORT}`);
});
