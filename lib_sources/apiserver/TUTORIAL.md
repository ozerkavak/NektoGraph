# APIServer Integration Tutorial (Python & FastAPI)

This guide documents how to integrate your Python AI/LLM Orchestrator with the NektoGraph API Server (running on port `3001`).

---

## 1. Zero-Copy Binary Ingestion in Python

Instead of parsing slow string formats, Python can read the entire knowledge graph binary stream in $O(1)$ complexity using NumPy. 

### API Request
Fetch the binary data stream from `GET http://localhost:3001/api/v1/store/binary`.

### Python Code Example (FastAPI/NumPy)

```python
import urllib.request
import numpy as np

def fetch_binary_graph():
    url = "http://localhost:3001/api/v1/store/binary"
    
    # 1. Fetch raw binary response (each quad occupies 32 bytes)
    with urllib.request.urlopen(url) as response:
        raw_bytes = response.read()
        
    # 2. Map directly to a 2D uint64 matrix in O(1) complexity (zero-copy)
    # Column layout: Subject, Predicate, Object, Graph (8 bytes each)
    quads_matrix = np.frombuffer(raw_bytes, dtype=np.uint64).reshape(-1, 4)
    
    print(f"Loaded {len(quads_matrix)} quads directly into memory.")
    
    subjects   = quads_matrix[:, 0]
    predicates = quads_matrix[:, 1]
    objects    = quads_matrix[:, 2]
    graphs     = quads_matrix[:, 3]
    
    return quads_matrix
```

---

## 2. Resolving BigInt NodeIDs to Strings (String Pool Dictionary)

Since the `BigInt` IDs are generated in the browser/server string pool, Python must map these numeric IDs to actual URI strings or literals when preparing text inputs for LLMs.

### API Request
Fetch the dictionary JSON map from `GET http://localhost:3001/api/v1/store/dictionary`.

### Python Code Example

```python
import urllib.request
import json

def fetch_string_dictionary():
    url = "http://localhost:3001/api/v1/store/dictionary"
    
    with urllib.request.urlopen(url) as response:
        dictionary = json.loads(response.read().decode("utf-8"))
        
    # Example format of the dictionary:
    # {
    #   "104928": {"termType": "NamedNode", "value": "http://example.org/John"},
    #   "104929": {"termType": "Literal", "value": "NGO Core Ontology", "language": "en"}
    # }
    return dictionary

def resolve_node_value(node_id: int, dictionary: dict) -> str:
    node_str = str(node_id)
    if node_str in dictionary:
        token = dictionary[node_str]
        return token.get("value", "")
    return f"NodeID_{node_id}"
```

---

## 3. Querying the Server via SPARQL over HTTP

The Python orchestrator can execute rich semantic searches and structural queries on the server's memory store via the HTTP SPARQL endpoint.

### Python Code Example

```python
import urllib.request
import json

def execute_sparql_query(query_str: str):
    url = "http://localhost:3001/api/v1/sparql"
    payload = json.dumps({"query": query_str}).encode("utf-8")
    
    req = urllib.request.Request(
        url, 
        data=payload, 
        headers={"Content-Type": "application/json"}
    )
    
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode("utf-8"))
        
    # Result format:
    # {
    #   "type": "select",
    #   "variables": ["s", "p", "o"],
    #   "results": [ ... ]
    # }
    return result
```
