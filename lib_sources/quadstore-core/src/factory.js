import { NodeType, MASK_TYPE, SHIFT_TYPE } from './types';
import { StringPool } from './dictionary';
import { StarInvertedIndex } from './star_idx';
const XSD_INTEGER = 'http://www.w3.org/2001/XMLSchema#integer';
const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';
const RDF_LANGSTRING = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString';
const TYPE_INLINE_INT = 0x4n;
export class IDFactory {
    uriPool = new StringPool();
    bnodePool = new StringPool();
    literalMap = new Map();
    literalArray = [];
    tripleMap = new Map();
    tripleArray = [];
    // Star Inverted Indices (Constituent NodeID -> List of Triple NodeIDs)
    starIdxS = new StarInvertedIndex();
    starIdxP = new StarInvertedIndex();
    starIdxO = new StarInvertedIndex();
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
        // ... (previous implementation remains)
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
            catch (e) { }
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
    /**
     * Interns a Quoted Triple as a NodeID.
     */
    triple(subject, predicate, object) {
        const key = `${subject}:${predicate}:${object}`;
        let id = this.tripleMap.get(key);
        if (id === undefined) {
            id = this.tripleArray.length;
            // Generate a human-readable representation for Quoted Triples
            const sStr = this.decode(subject).value || subject.toString();
            const pStr = this.decode(predicate).value || predicate.toString();
            const oStr = this.decode(object).value || object.toString();
            const displayValue = `<< ${sStr} ${pStr} ${oStr} >>`;
            this.tripleArray.push({ termType: 'Triple', subject, predicate, object, value: displayValue });
            this.tripleMap.set(key, id);
            // Populate Star Inverted Indices
            const tripleId = (NodeType.TRIPLE << SHIFT_TYPE) | BigInt(id);
            this.starIdxS.add(subject, tripleId);
            this.starIdxP.add(predicate, tripleId);
            this.starIdxO.add(object, tripleId);
            return tripleId;
        }
        return (NodeType.TRIPLE << SHIFT_TYPE) | BigInt(id);
    }
    /**
     * Efficiently find all Quoted Triples where 'constituent' is the subject, predicate, or object.
     * This is an O(1) operation using the Star Inverted Indices.
     */
    findQuotedTriples(constituent, role) {
        if (role === 'S')
            return this.starIdxS.get(constituent) || [];
        if (role === 'P')
            return this.starIdxP.get(constituent) || [];
        if (role === 'O')
            return this.starIdxO.get(constituent) || [];
        const s = this.starIdxS.get(constituent) || [];
        const p = this.starIdxP.get(constituent) || [];
        const o = this.starIdxO.get(constituent) || [];
        // Return unique set of Triple IDs
        return Array.from(new Set([...s, ...p, ...o]));
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
        else if (type === NodeType.TRIPLE) {
            return this.tripleArray[Number(valueRaw)];
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
