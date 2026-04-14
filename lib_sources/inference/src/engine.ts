import { IQuadStore, DataEvent, Quad } from '@triplestore/core';
import { InferenceModule } from './types';

export class InferenceEngine {
    private modules = new Map<string, InferenceModule>();
    private enabledModules = new Set<string>();
    private boundHandler: (event: DataEvent) => void;

    constructor(
        private store: IQuadStore
    ) {
        this.boundHandler = this.handleEvent.bind(this);
        this.store.on('data', this.boundHandler);
    }

    /**
     * register a new inference module.
     * By default, modules are disabled until enabled.
     */
    register(module: InferenceModule) {
        this.modules.set(module.name, module);
    }

    getModules() {
        return this.modules;
    }

    /**
     * Enable a registered module.
     * Triggers a full recompute for that module.
     */
    enable(name: string) {
        const mod = this.modules.get(name);
        if (mod && !this.enabledModules.has(name)) {
            this.enabledModules.add(name);
            const quads = mod.recompute();
            this.writeInferences(quads);
        }
    }

    /**
     * Disable an active module.
     * Clears the module's target graph and internal state.
     */
    disable(name: string) {
        if (this.enabledModules.has(name)) {
            const mod = this.modules.get(name)!;
            this.enabledModules.delete(name);

            // Drop the graph associated with this inference module
            this.store.clearGraph(mod.targetGraphID, 'inference');

            // Clear internal state
            mod.clear();
        }
    }

    dispose() {
        this.store.off('data', this.boundHandler);
    }

    /**
     * Clear all inferences and module states, then recompute everything for the Main store.
     */
    recompute() {
        for (const name of this.enabledModules) {
            const mod = this.modules.get(name)!;
            // Clear Main Store graph managed by this module
            this.store.clearGraph(mod.targetGraphID, 'inference');
            // Clear module internal state (hierarchy, etc.)
            mod.clear();
            // Perform fresh recompute based on current Main Store data
            const quads = mod.recompute();
            this.writeInferences(quads);
        }
    }

    /**
     * Check if a module is currently enabled.
     */
    isEnabled(name: string): boolean {
        return this.enabledModules.has(name);
    }

    pause() {
        this.store.off('data', this.boundHandler);
    }

    resume() {
        if (this.store.on) this.store.on('data', this.boundHandler);
    }

    private handleEvent(event: DataEvent) {
        // Fast exit if paused or own event
        if (event.source === 'inference') return;

        // Fast exit if no modules enabled (Assume cleared state)
        if (this.enabledModules.size === 0) return;


        // Rule: If User adds (s,p,o), remove any existing (s,p,o) from Inference Graphs.
        if (event.type === 'add') {
            for (const q of event.quads) {
                // Find if this triple exists in ANY inference graph
                // We use match(s,p,o, null) to find all occurrences
                const occurrences = this.store.match(q.subject, q.predicate, q.object, null);

                for (const quad of occurrences) {
                    const g = quad[3];
                    // Check if 'g' is an inference graph we manage
                    // We can check if it's in our modules map? 
                    // Or simpler: check exact specific graph IDs of enabled modules using a Set/Map lookup?
                    // Implementation: Loop enabled modules is O(M). M is small.
                    // But faster: Map<GraphID, ModuleName> lookup?
                    // For now, let's keep it simple: checking if the graph ID matches any enabled module.

                    for (const modName of this.enabledModules) {
                        const mod = this.modules.get(modName)!;
                        if (mod.targetGraphID === g) {
                            // Conflict! User added it, but it was also here inferred.
                            // Remove the inferred one.
                            try {
                                this.store.delete(quad[0], quad[1], quad[2], quad[3], 'inference');
                            } catch (e) { } // Ignore errors
                        }
                    }
                }
            }
        }

        // Delegate to all enabled modules to produce NEW inferences or REMOVALS
        for (const name of this.enabledModules) {
            const mod = this.modules.get(name);
            if (mod) {
                const result = mod.process(event);

                // Process Removals First
                if (result.remove.length > 0) {
                    for (const q of result.remove) {
                        try {
                            this.store.delete(q.subject, q.predicate, q.object, q.graph, 'inference');
                        } catch { }
                    }
                }

                // Process Additions
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
    private writeInferences(quads: Quad[]) {
        const toAdd: Quad[] = [];

        for (const q of quads) {
            // Global Existence Check (Rule 1: Don't produce if exists anywhere)
            if (!this.store.hasAny(q.subject, q.predicate, q.object)) {
                toAdd.push(q);
            }
        }

        if (toAdd.length > 0) {
            this.store.addQuads(toAdd, 'inference');
        }
    }

    /**
     * Process an event from an external source (e.g. Session Draft)
     * and write the resulting inferences to a target store (e.g. Session Draft).
     * 
     * @param event The data event from the external source
     * @param targetStore The store to write inferences to
     */
    inferForSession(event: DataEvent, targetStore: IQuadStore) {
        // Delegate to all enabled modules
        for (const name of this.enabledModules) {
            const mod = this.modules.get(name);
            if (mod) {
                const result = mod.process(event);

                // 1. Process Removals (from Session)
                if (result.remove.length > 0) {
                    for (const q of result.remove) {
                        try {
                            targetStore.delete(q.subject, q.predicate, q.object, q.graph, 'inference');
                        } catch { }
                    }
                }

                // 2. Process Additions (to Session)
                if (result.add.length > 0) {
                    const toAdd: Quad[] = [];
                    for (const q of result.add) {
                        // Deduplication: Check TARGET STORE (Session) and MAIN STORE
                        // We assume targetStore (Draft) does NOT check MainStore automatically?
                        // Actually, for optimal dedup, we should check if it exists in EITHER.
                        // But verifying MainStore again might be redundant if Module did it?
                        // Module checks THIS.STORE (Main). 
                        // So we only need to check TargetStore (Session) to avoid session duplicates.

                        if (!targetStore.hasAny(q.subject, q.predicate, q.object)) {
                            toAdd.push(q);
                        }
                    }
                    if (toAdd.length > 0) {
                        targetStore.addQuads(toAdd, 'inference');
                    }
                }
            }
        }
    }
}
