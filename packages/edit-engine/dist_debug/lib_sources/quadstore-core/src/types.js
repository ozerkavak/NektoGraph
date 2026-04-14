export const NodeType = {
    URI: 0x1n,
    BNODE: 0x2n,
    LITERAL: 0x3n
};
// Total 64 bits: [Type: 4 bits] [Partition: 4 bits] [Value: 56 bits]
export const MASK_TYPE = 0xf000000000000000n;
export const SHIFT_TYPE = 60n;
export const DEFAULT_GRAPH = 0n;
//# sourceMappingURL=types.js.map
