
import { Term, Literal } from './ast';
import { IDataFactory } from '@triplestore/core';

// Helper to create a Literal Term from value using factory
function makeLiteral(factory: IDataFactory, value: string, language?: string, datatype?: { value: string }): Term {
    // factory.literal returns NodeID (bigint). We decode it to get the Term object.
    const dt = datatype ? datatype.value : undefined; // factory.literal expects string datatype
    const id = factory.literal(value, dt, language);
    return factory.decode(id) as unknown as Term; // Cast as Token matches Term shape roughly
}

export function evaluateFunction(op: string, args: Term[], factory: IDataFactory): Term | null {
    // RDF Term Functions
    if (op === 'isiri' || op === 'isuri') {
        const b = args[0]?.termType === 'NamedNode';
        return makeLiteral(factory, b ? "true" : "false", undefined, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
    }
    if (op === 'isblank') {
        const b = args[0]?.termType === 'BlankNode';
        return makeLiteral(factory, b ? "true" : "false", undefined, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
    }
    if (op === 'isliteral') {
        const b = args[0]?.termType === 'Literal';
        return makeLiteral(factory, b ? "true" : "false", undefined, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
    }
    
    // --- RDF-star (SPARQL 1.2) Functions ---
    if (op === 'istriple') {
        const arg = args[0] as any;
        const b = arg?.termType === 'Triple' || (typeof arg === 'bigint' && (arg & (0x3n << 60n)) !== 0n); // Sample check if ID represents a Triple
        return makeLiteral(factory, b ? "true" : "false", undefined, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
    }
    
    const getResolvedTriple = (t: any): any => {
        if (!t) return null;
        if (typeof t === 'bigint') return factory.decode(t);
        return t;
    };

    /** 
     * Ensures the result is a fully decoded Term object. 
     * If the factory.decode resulted in a TripleToken with bigint fields, 
     * this will ensure we don't return raw bigints to the UI.
     */
    const ensureDecoded = (t: any): any => {
        if (typeof t === 'bigint') return factory.decode(t);
        return t;
    };

    if (op === 'subject') {
        const arg = getResolvedTriple(args[0]);
        if (arg?.subject !== undefined) return ensureDecoded(arg.subject) as Term;
    }
    if (op === 'predicate') {
        const arg = getResolvedTriple(args[0]);
        if (arg?.predicate !== undefined) return ensureDecoded(arg.predicate) as Term;
    }
    if (op === 'object') {
        const arg = getResolvedTriple(args[0]);
        if (arg?.object !== undefined) return ensureDecoded(arg.object) as Term;
    }
    // ---------------------------------------

    if (op === 'datatype') {
        if (args[0]?.termType === 'Literal') {
            const lit = args[0] as Literal;
            const dt = lit.datatype ? lit.datatype.value : 'http://www.w3.org/2001/XMLSchema#string';
            return factory.decode(factory.namedNode(dt)) as unknown as Term;
        }
    }
    if (op === 'lang') {
        if (args[0]?.termType === 'Literal') {
            const lit = args[0] as Literal;
            return makeLiteral(factory, lit.language || "");
        }
    }

    // String Functions
    if (op === 'ucase') {
        const arg = args[0];
        if (arg?.termType === 'Literal') {
            return makeLiteral(factory, arg.value.toUpperCase(), arg.language, arg.datatype);
        }
    }
    if (op === 'lcase') {
        const arg = args[0];
        if (arg?.termType === 'Literal') {
            return makeLiteral(factory, arg.value.toLowerCase(), arg.language, arg.datatype);
        }
    }
    if (op === 'concat') {
        let val = "";
        for (const arg of args) {
            if (arg?.termType === 'Literal') val += arg.value;
        }
        return makeLiteral(factory, val);
    }
    if (op === 'contains') {
        if (args[0]?.termType === 'Literal' && args[1]?.termType === 'Literal') {
            const b = args[0].value.includes(args[1].value);
            return makeLiteral(factory, b ? "true" : "false", undefined, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
        }
    }
    if (op === 'strstarts') {
        if (args[0]?.termType === 'Literal' && args[1]?.termType === 'Literal') {
            const b = args[0].value.startsWith(args[1].value);
            return makeLiteral(factory, b ? "true" : "false", undefined, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
        }
    }
    if (op === 'strends') {
        if (args[0]?.termType === 'Literal' && args[1]?.termType === 'Literal') {
            const b = args[0].value.endsWith(args[1].value);
            return makeLiteral(factory, b ? "true" : "false", undefined, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
        }
    }
    if (op === 'regex') {
        const text = args[0];
        const pattern = args[1];
        const flags = args[2];
        if (text?.termType === 'Literal' && pattern?.termType === 'Literal') {
            const f = flags?.termType === 'Literal' ? flags.value : undefined;
            try {
                const re = new RegExp(pattern.value, f);
                const b = re.test(text.value);
                return makeLiteral(factory, b ? "true" : "false", undefined, { value: "http://www.w3.org/2001/XMLSchema#boolean" });
            } catch (e) { return null; }
        }
    }
    if (op === 'replace') {
        const text = args[0];
        const pattern = args[1];
        const replacement = args[2];
        const flags = args[3];
        if (text?.termType === 'Literal' && pattern?.termType === 'Literal' && replacement?.termType === 'Literal') {
            const f = flags?.termType === 'Literal' ? flags.value : 'g';
            try {
                const re = new RegExp(pattern.value, f);
                const val = text.value.replace(re, replacement.value);
                return makeLiteral(factory, val, text.language, text.datatype);
            } catch (e) { return null; }
        }
    }
    if (op === 'substr') {
        const str = args[0];
        const start = args[1];
        const len = args[2];
        if (str?.termType === 'Literal' && start?.termType === 'Literal') {
            let s = parseInt(start.value) - 1; // SPARQL is 1-based
            if (s < 0) s = 0;
            let l = len?.termType === 'Literal' ? parseInt(len.value) : undefined;
            let val = "";
            if (l !== undefined) val = str.value.substr(s, l);
            else val = str.value.substring(s);

            return makeLiteral(factory, val, str.language, str.datatype);
        }
    }
    if (op === 'strlen') {
        const str = args[0];
        if (str?.termType === 'Literal') {
            return makeLiteral(factory, str.value.length.toString(), undefined, { value: "http://www.w3.org/2001/XMLSchema#integer" });
        }
    }

    // Math Functions
    if (op === 'abs') {
        const val = getNumeric(args[0]);
        if (val !== null) return makeLiteral(factory, Math.abs(val).toString(), undefined, (args[0] as Literal).datatype);
    }
    if (op === 'round') {
        const val = getNumeric(args[0]);
        if (val !== null) return makeLiteral(factory, Math.round(val).toString(), undefined, (args[0] as Literal).datatype);
    }
    if (op === 'ceil') {
        const val = getNumeric(args[0]);
        if (val !== null) return makeLiteral(factory, Math.ceil(val).toString(), undefined, (args[0] as Literal).datatype);
    }
    if (op === 'floor') {
        const val = getNumeric(args[0]);
        if (val !== null) return makeLiteral(factory, Math.floor(val).toString(), undefined, (args[0] as Literal).datatype);
    }
    if (op === 'rand') {
        return makeLiteral(factory, Math.random().toString(), undefined, { value: "http://www.w3.org/2001/XMLSchema#double" });
    }

    return null;
}

function getNumeric(term: Term): number | null {
    if (term?.termType === 'Literal') {
        const n = parseFloat(term.value);
        return isNaN(n) ? null : n;
    }
    return null;
}
