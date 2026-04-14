import { NodeID } from '@triplestore/core';
import { KGTriple } from './KGTriple';

/**
 * Ensures that for any given Triple BigInt ID, only one KGTriple instance exists in memory.
 * Preserves reference equality and optimizes memory for deeply nested RDF-star.
 */
export class IdentityMap {
    private static cache = new Map<bigint, KGTriple>();

    static get(id: NodeID): KGTriple | undefined {
        const key = typeof id === 'bigint' ? id : (id as any).id;
        return this.cache.get(key);
    }

    static set(id: NodeID, triple: KGTriple): void {
        const key = typeof id === 'bigint' ? id : (id as any).id;
        this.cache.set(key, triple);
    }

    static clear(): void {
        this.cache.clear();
    }
    
    static invalidateAll(): void {
        this.cache.forEach(t => t.invalidate());
    }
}
