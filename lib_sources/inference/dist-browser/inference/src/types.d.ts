import { NodeID, DataEvent, Quad } from '../../quadstore-core/src/index.ts';

export interface InferenceProcessResult {
    add: Quad[];
    remove: Quad[];
}
export interface InferenceModule {
    /**
     * Unique name of the module (e.g., 'rdfs-subclass').
     */
    readonly name: string;
    /**
     * The named graph ID where this module writes inferred quads.
     */
    readonly targetGraphID: NodeID;
    /**
     * Handle a data change event from the store.
     * @param event The data event (add/delete).
     * @returns Object containing quads to add and remove.
     */
    process(event: DataEvent): InferenceProcessResult;
    /**
     * Clear all state and caches.
     */
    clear(): void;
    /**
     * Full re-computation (e.g. on enable).
     * @returns All inferred quads.
     */
    recompute(): Quad[];
}
