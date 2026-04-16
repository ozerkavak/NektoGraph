# TODO: Resolve 3rd-Party Dependency Duplication (Comunica)

## Urgency
**HIGH** - Critical architectural bloat affecting the standalone single-file distribution size.

## Source of the Problem
While the local monorepo code elegantly deduplicates itself using our new Vite Alias "Zero-Shim" policy, third-party libraries injected via `packages/sparql` are silently undermining the bundle size. 

Specifically, the **`@comunica/query-sparql-rdfjs-lite`** framework acts as a Trojan horse. Because it relies on outdated sub-dependencies, Vite/Rollup is forced by Semantic Versioning rules to package completely separate, duplicate instances of heavy parsing libraries into our final `index.html`.

Currently bundled twice:
* **N3 Parser**: `n3@2.0.3` (Our workspace) vs `n3@1.26.0` (Comunica's tree)
* **JSON-LD Parser**: `jsonld-streaming-parser@5.0.1` (Our workspace) vs `4.0.1` (Comunica's tree)
* **RDF/XML Parser**: `rdfxml-streaming-parser@3.2.0` (Our workspace) vs `2.4.0` (Comunica's tree)

This redundancy is the primary reason the standalone `index.html` file exceeds ~1.16MB (the `sparql` bundle alone consumes ~766KB).

## Required Actions

### Option A: The Migration (Ideal & Permanent)
According to the **Architect Protocol**, third-party RDF/SPARQL parsers are "temporary exceptions." The correct fix is to entirely decouple from `@comunica`.
1. Finalize the transition to `lib_sources/sparql-parser-lite` and `@traqula`.
2. Remove `@comunica` from `packages/sparql`.
3. Expected Outcome: The final standalone file drops to around ~400-500KB.

### Option B: The Override (Quick but Risky)
In the short term, you can forcibly resolve the dependency tree.
1. Add an `overrides` (NPM) or `resolutions` (Yarn) block to the root `package.json` to force the entire monorepo to use the newer parser versions (`n3@2.x`, etc.).
2. Run standard testing to verify that Comunica's query runner does not crash when executing against the API breaking changes of the newer parsers.

---

# TODO: Restore BNode-Centric Entity Editor (RDF-Star Reification)

## Urgency
**Medium/High** - The implementation was previously completed but lost during a rollback event in the codebase.

## Source of the Problem
The `EntityRenderer` was planned and implemented to act as an information-dense "Meta-data Card" for Blank Nodes that are used to represent structural triple grouping (RDF-star annotations). A recent `grep` of the codebase confirms that none of the implementation strings (`BNode Structural Context`, `Triple Mirroring Node`, `occurrenceOf`) currently exist in `apps/workbench/src/ui`. This means the code was rolled back or lost before permanence.

## Required Actions

### 1. Phase: Data Strategy & Detection
Modify the `EntityRenderer.ts` entry point to handle BNode identifiers uniquely.
- **Type Detection:** Use `state.factory.decode(entityId).termType === 'BlankNode'` to identify iseless nodes.
- **Draft Consistency:** Ensure triples are fetched via `CompositeStore` so that newly created BNode groups (active session drafts) appear immediately in the editor.

### 2. Phase: UI Transformation
Adapt the Entity Editor layout to be information-dense and appropriate for iseless nodes.
- **Header Optimization:**
    - **URI Field:** Keep it read-only, showing the internal BNode ID (e.g., `b_so47qr`).
    - **Labels/Title:** Replace default "Labels" section with "BNode Structural Context" since BNodes lack formal labels.
- **Contextual Side-panel:**
    - If the BNode has an `rdf-star:occurrenceOf` predicate, display a special badge: "Triple Mirroring Node".

### 3. Phase: Property Rendering (Core logic)
The "Direct Properties" area will be the primary view for BNode annotations.
- **Predicate Mapping:** List all predicates where BNode is the Subject (e.g., `Start Date`, `End Date`, `occurrenceOf`).
- **Triple-Term Value Renderer:**
    - Detect if a value is a Triple Term (`<<...>>`).
    - Use the high-fidelity 3-part pill renderer (S-P-O) from `TripleEditor` to show exactly which triple is being mirrored.
- **Navigation:** Deep-link the "mirror pill" back to the original triple using `state.openTripleEditor(tripleID)`.

### 4. Phase: Interaction
- **Edit Support:** Leverage existing Property-Chip buttons (delete, edit) to allow fine-grained modification of BNode-based annotation groups.
- **Provenance Link:** Ensure the `occurrenceOf` link is protected or clearly marked as a structural anchor.

---

# TODO: Ontology Refinement & Reasoning Support (OWL-Compliance)

## Urgency
**MEDIUM** - Affects data integrity, reasoner compatibility, and the semantic clarity of the knowledge graph.

## Source of the Problem
External ontology audit and internal architectural review identified gaps in how NektoGraph handles OWL axioms and how the core NGO ontology is structured.
1. **Technical Gap:** `SchemaIndex.ts` ignores `owl:AllDisjointClasses` (BNode + RDF List), preventing OWA (Open World Assumption) trap protection in the UI.
2. **Structural Gap:** Managed individuals (e.g., `OfficialLevel`, `Death`) lack `owl:NamedIndividual` markers, causing "punning" or ambiguity where they appear as both instances and potential classes.
3. **Partitioning Gap:** `State.ts` does not recognize advanced OWL terms, causing core schema metadata to bleed into "User Data" graphs during import.

## Required Actions

### 1. Technical: AllDisjointClasses Support
Upgrade the schema indexing engine to understand complex disjointness.
1. **Vocabulary:** Add `owl:AllDisjointClasses` and `owl:members` to `packages/edit-engine/src/schema/vocabulary.ts`.
2. **SchemaIndex:** Update `buildIndex()` to scan for `owl:AllDisjointClasses`, use `resolveList()` on members, and populate `disjointWith` maps bidirectionally for all listed classes.
3. **Partitioning:** Add these terms to `ontSchemaTypes` and `ontSchemaPredicates` in `apps/workbench/src/runtime/State.ts` to ensure integrity during import.

### 2. Structural: NGO Ontology Refinement
Apply "Best Practices" to `40nodesNGOont.ttl` to eliminate ambiguity.
1. **Individual Declarations:** Explicitly add `a owl:NamedIndividual` to all controlled vocabulary members (`OfficialLevel`, `UnofficialLevel`, and all subjects under `EndReason`).
2. **Ambiguity Cleanup:** Ensure `EndReason` sub-items (e.g., `Death`, `Resignation`) are consistently defined as individuals of their respective parent classes to prevent unintended class-punning.
3. **RACI Completion:** Add missing `:consulted` and `:informed` properties to fully support RACI matrix modeling.

### 3. Verification
- **Hover validation:** Ensure that adding `owl:AllDisjointClasses` to the TTL causes "Disjoint With" to appear in the Hover Card for all affected classes.
- **Inference consistency:** Check that individuals are correctly typed as instances only, avoiding reasoner conflicts.
