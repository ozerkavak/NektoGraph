import { IQuadStore, Quad } from '@triplestore/core';

export function serializeStore(store: IQuadStore): Uint8Array {
    const size = store.size;
    const buffer = new ArrayBuffer(size * 32);
    const view = new BigUint64Array(buffer);
    
    let i = 0;
    for (const [s, p, o, g] of store.match(null, null, null, null)) {
        view[i++] = s;
        view[i++] = p;
        view[i++] = o;
        view[i++] = g;
    }
    
    return new Uint8Array(buffer);
}

export function deserializeStore(buffer: ArrayBuffer, store: IQuadStore): number {
    let alignedBuffer = buffer;
    if (buffer.byteLength % 8 !== 0) {
        const alignedLength = buffer.byteLength - (buffer.byteLength % 8);
        alignedBuffer = buffer.slice(0, alignedLength);
    }
    const view = new BigUint64Array(alignedBuffer);
    const quadCount = Math.floor(view.length / 4);
    
    const quads: Quad[] = [];
    for (let i = 0; i < quadCount; i++) {
        quads.push({
            subject: view[i * 4],
            predicate: view[i * 4 + 1],
            object: view[i * 4 + 2],
            graph: view[i * 4 + 3]
        });
    }
    
    if (quads.length > 0) {
        return store.addQuads(quads, 'system');
    }
    return 0;
}
