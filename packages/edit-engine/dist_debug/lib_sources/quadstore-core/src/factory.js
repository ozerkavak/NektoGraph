import { NodeType, MASK_TYPE, SHIFT_TYPE } from './types';
import { StringPool } from './dictionary';
const XSD_INTEGER = 'http://www.w3.org/2001/XMLSchema#integer';
const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';
const RDF_LANGSTRING = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString';
const TYPE_INLINE_INT = 0x4n;
export class IDFactory {
    uriPool = new StringPool();
    bnodePool = new StringPool();
    literalMap = new Map();
    literalArray = [];
    constructor() { }
    /**
     * Creates or retrieves a canonical ID for a Named Node (URI).
     * @param uri - The absolute URI string.
     */
    namedNode(uri) {
        const id = BigInt(this.uriPool.getOrCreate(uri));
        return (NodeType.URI << SHIFT_TYPE) | id;
    }
    /**
     * Creates or retrieves a canonical ID for a Blank Node.
     * @param label - Optional label. If omitted, a fresh label is generated.
     */
    blankNode(label) {
        const actualLabel = label || `b${this.bnodePool.size}`;
        const id = BigInt(this.bnodePool.getOrCreate(actualLabel));
        return (NodeType.BNODE << SHIFT_TYPE) | id;
    }
    /**
     * Creates a canonical ID for a Literal.
     * Attempts to inline small integers (56-bit signed) into the ID itself.
     * Otherwise, interns the complex literal in a registry.
     *
     * @param value - The lexical form.
     * @param datatype - Absolute URI of the datatype (defaults to xsd:string).
     * @param language - Language tag (if applicable).
     */
    literal(value, datatype, language) {
        if (datatype === XSD_INTEGER && !language) {
            try {
                const bigVal = BigInt(value);
                const min = -(1n << 55n);
                const max = (1n << 55n) - 1n;
                if (bigVal >= min && bigVal <= max) {
                    const mask56 = (1n << 56n) - 1n;
                    const packed = bigVal & mask56;
                    return (TYPE_INLINE_INT << SHIFT_TYPE) | packed;
                }
            }
            catch (e) {
            }
        }
        const lang = language || '';
        const dt = datatype || (lang ? RDF_LANGSTRING : XSD_STRING);
        const key = `${value}|${dt}|${lang}`;
        let id = this.literalMap.get(key);
        if (id === undefined) {
            id = this.literalArray.length;
            this.literalArray.push({ termType: 'Literal', value, datatype: dt, language: lang });
            this.literalMap.set(key, id);
        }
        return (NodeType.LITERAL << SHIFT_TYPE) | BigInt(id);
    }
    decode(id) {
        const type = (id & MASK_TYPE) >> SHIFT_TYPE;
        const valueRaw = id & ~MASK_TYPE;
        if (type === NodeType.URI) {
            const uri = this.uriPool.get(Number(valueRaw));
            return { termType: 'NamedNode', value: uri || '' };
        }
        else if (type === NodeType.BNODE) {
            const label = this.bnodePool.get(Number(valueRaw));
            return { termType: 'BlankNode', value: label || '' };
        }
        else if (type === NodeType.LITERAL) {
            return this.literalArray[Number(valueRaw)];
        }
        else if (type === TYPE_INLINE_INT) {
            const isNegative = (valueRaw & (1n << 55n)) !== 0n;
            let val = valueRaw;
            if (isNegative) {
                val = valueRaw | (~((1n << 56n) - 1n));
            }
            return {
                termType: 'Literal',
                value: val.toString(),
                datatype: XSD_INTEGER
            };
        }
        throw new Error(`Unknown Node Type ID: ${type.toString(16)}`);
    }
}
//# sourceMappingURL=factory.js.map
