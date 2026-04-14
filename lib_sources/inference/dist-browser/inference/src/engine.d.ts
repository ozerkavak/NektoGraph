import { IQuadStore, DataEvent } from '../../quadstore-core/src/index.ts';
import { InferenceModule } from './types';

export declare class InferenceEngine {
    private store;
    private modules;
    private enabledModules;
    private boundHandler;
    constructor(store: IQuadStore);
    /**
     * register a new inference module.
     * By default, modules are disabled until enabled.
     */
    register(module: InferenceModule): void;
    getModules(): Map<string, InferenceModule>;
    /**
     * Enable a registered module.
     * Triggers a full recompute for that module.
     */
    enable(name: string): void;
    /**
     * Disable an active module.
     * Clears the module's target graph and internal state.
     */
    disable(name: string): void;
    dispose(): void;
    /**
     * Clear all inferences and module states, then recompute everything for the Main store.
     */
    recompute(): void;
    /**
     * Check if a module is currently enabled.
     */
    isEnabled(name: string): boolean;
    pause(): void;
    resume(): void;
    private handleEvent;
    /**
     * Writes inferred quads to the store, BUT only if they don't already exist.
     * (Deduplication)
     */
    private writeInferences;
    /**
     * Process an event from an external source (e.g. Session Draft)
     * and write the resulting inferences to a target store (e.g. Session Draft).
     *
     * @param event The data event from the external source
     * @param targetStore The store to write inferences to
     */
    inferForSession(event: DataEvent, targetStore: IQuadStore): void;
}
