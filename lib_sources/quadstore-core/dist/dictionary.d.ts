/**
 * A bidirectional dictionary for mapping Strings to numeric IDs (indices).
 * Note: The IDs returned here are internal indices, NOT the final NodeIDs.
 * The Factory will shift these indices into the correct bit-range.
 */
export declare class StringPool {
    private strToId;
    private idToStr;
    constructor();
    /**
     * Gets the existing ID or creates a new one.
     */
    getOrCreate(value: string): number;
    /**
     * Retrieves string by ID.
     */
    get(id: number): string | undefined;
    get size(): number;
}
