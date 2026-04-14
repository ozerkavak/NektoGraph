# SPARQL Functions Library Documentation

The `@triplestore/sparql` package includes an extensive library of functions for string manipulation, mathematical operations, and logical tests. This document details the supported functions, their input types, and return values.

## Overview

Functions are evaluated within `FILTER` or `BIND`  clauses. All functions operate on RDF Terms (`NamedNode`, `Literal`, `Variable`) and return valid RDF Terms or `null` if the operation is invalid for the given inputs.

**Engine Behavior:**
- Function names are **case-insensitive** (e.g., `UCASE` is same as `ucase`).
- Invalid inputs (e.g., `ABS("text")`) result in `null` (unbound) or `false` depending on context (BIND vs FILTER).
- Numeric functions support `xsd:integer`, `xsd:decimal`, and `xsd:double`.

---

## String Functions

Operate on `xsd:string` or literals with simple values.

| Function | Signature | Description | Return Type | Example |
| :--- | :--- | :--- | :--- | :--- |
| **UCASE** | `UCASE(str: Literal)` | Converts string to uppercase. Preserves language tag and datatype. | `Literal` | `UCASE("Apple"@en)` → `"APPLE"@en` |
| **LCASE** | `LCASE(str: Literal)` | Converts string to lowercase. Preserves language tag and datatype. | `Literal` | `LCASE("Apple")` → `"apple"` |
| **CONCAT** | `CONCAT(str1, str2, ...)` | Concatenates multiple string literals. Note: Currently returns simple literal. | `Literal` | `CONCAT("A", "B")` → `"AB"` |
| **SUBSTR** | `SUBSTR(str, start, [length])` | Returns substring. **1-based** index. | `Literal` | `SUBSTR("bar", 2)` → `"ar"` |
| **STRLEN** | `STRLEN(str: Literal)` | Returns length of string. | `xsd:integer` | `STRLEN("foo")` → `3` |
| **STRSTARTS**| `STRSTARTS(str, prefix)` | Checks if string starts with prefix. | `xsd:boolean` | `STRSTARTS("foobar", "foo")` → `true` |
| **STRENDS** | `STRENDS(str, suffix)` | Checks if string ends with suffix. | `xsd:boolean` | `STRENDS("foobar", "bar")` → `true` |
| **CONTAINS** | `CONTAINS(str, search)` | Checks if string contains substring. | `xsd:boolean` | `CONTAINS("apple", "pp")` → `true` |
| **REPLACE** | `REPLACE(str, pattern, replacement, [flags])` | Replaces matches of regex `pattern` with `replacement`. | `Literal` | `REPLACE("banana", "a", "o")` → `"bonono"` |
| **REGEX** | `REGEX(str, pattern, [flags])` | Tests string against regex `pattern`. | `xsd:boolean` | `REGEX("test", "^t")` → `true` |

> **Note on Regex:** `REGEX` and `REPLACE` use JavaScript's `RegExp`. Flags supported are standard (e.g., `"i"` for case-insensitive).

---

## Math Functions

Operate on numeric literals. Returns original datatype if possible.

| Function | Signature | Description | Return Type | Example |
| :--- | :--- | :--- | :--- | :--- |
| **ABS** | `ABS(num)` | Absolute value. | Numeric (`same as input`) | `ABS(-5)` → `5` |
| **ROUND** | `ROUND(num)` | Rounds to nearest integer. | Numeric (`same as input`) | `ROUND(10.6)` → `11` |
| **CEIL** | `CEIL(num)` | Rounds up to nearest integer. | Numeric (`same as input`) | `CEIL(10.1)` → `11` |
| **FLOOR** | `FLOOR(num)` | Rounds down to nearest integer. | Numeric (`same as input`) | `FLOOR(10.9)` → `10` |
| **RAND** | `RAND()` | Random number between 0 and 1. | `xsd:double` | `RAND()` → `0.548...` |

---

## Logical Functions

> **Note:** Logical functions `BOUND`, `IF`, `COALESCE` are currently **planned** but not yet implemented.

