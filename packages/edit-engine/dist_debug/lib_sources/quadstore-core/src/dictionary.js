/**
 * A bidirectional dictionary for mapping Strings to numeric IDs (indices).
 * Note: The IDs returned here are internal indices, NOT the final NodeIDs.
 * The Factory will shift these indices into the correct bit-range.
 */
export class StringPool {
    strToId;
    idToStr;
    constructor() {
        this.strToId = new Map();
        this.idToStr = [];
    }
    /**
     * Gets the existing ID or creates a new one.
     */
    getOrCreate(value) {
        let id = this.strToId.get(value);
        if (id !== undefined) {
            return id;
        }
        id = this.idToStr.length;
        this.idToStr.push(value);
        this.strToId.set(value, id);
        return id;
    }
    /**
     * Retrieves string by ID.
     */
    get(id) {
        return this.idToStr[id];
    }
    get size() {
        return this.idToStr.length;
    }
}
//# sourceMappingURL=dictionary.js.map
