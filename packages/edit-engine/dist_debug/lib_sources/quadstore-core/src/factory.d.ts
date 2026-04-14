import { IDataFactory, NodeID, Token } from './types';
export declare class IDFactory implements IDataFactory {
    private uriPool;
    private bnodePool;
    private literalMap;
    private literalArray;
    constructor();
    /**
     * Creates or retrieves a canonical ID for a Named Node (URI).
     * @param uri - The absolute URI string.
     */
    namedNode(uri: string): NodeID;
    /**
     * Creates or retrieves a canonical ID for a Blank Node.
     * @param label - Optional label. If omitted, a fresh label is generated.
     */
    blankNode(label?: string): NodeID;
    /**
     * Creates a canonical ID for a Literal.
     * Attempts to inline small integers (56-bit signed) into the ID itself.
     * Otherwise, interns the complex literal in a registry.
     *
     * @param value - The lexical form.
     * @param datatype - Absolute URI of the datatype (defaults to xsd:string).
     * @param language - Language tag (if applicable).
     */
    literal(value: string, datatype?: string, language?: string): NodeID;
    decode(id: NodeID): Token;
}
