import { state } from '../../runtime/State';
import { NodeID } from '@triplestore/core';
import { RichEntityStructured, PropertySource } from '@triplestore/edit-engine';

export type HydrationLevel = 'id' | 'metadata' | 'structured';

/**
 * KGEntity V2: Smart Active Record
 * Unifies Data Model and Hydration Logic.
 */
export class KGEntity {
    private static cache = new Map<bigint, KGEntity>();

    /**
     * Fully purges the Identity Map. 
     * Use when a graph is deleted or repository is reset.
     */
    static clearCache(): void {
        KGEntity.cache.clear();
    }

    /**
     * Flags all cached objects as stale.
     * Forces re-hydration on next access.
     */
    static invalidateAll(): void {
        KGEntity.cache.forEach(e => e.invalidate());
    }

    public id: NodeID;
    public uri: string;

    // Metadata (State: metadata)
    public label?: string;
    public description?: string;

    // Eager Load Maps
    public labels: Record<string, string> = {};
    public descriptions: Record<string, string> = {};

    // Metadata Properties (Available at any level >= metadata)
    public types: NodeID[] = [];
    public sources: PropertySource[] = [];

    // Full Data (State: structured)
    public structured: RichEntityStructured | null = null;
    public hydrationLevel: HydrationLevel = 'id';

    /**
     * Identity Map Accessor
     */
    static get(id: NodeID): KGEntity {
        const key = typeof id === 'bigint' ? id : (id as any).id;
        let entity = KGEntity.cache.get(key);
        if (!entity) {
            entity = new KGEntity(id);
            KGEntity.cache.set(key, entity);
        }
        return entity;
    }

    private constructor(id: NodeID) {
        this.id = id;
        const term = state.factory.decode(id);
        this.uri = (term as any).value || `<<triple:${id}>>`;
    }

    // --- Architectural Helpers ---

    /**
     * Returns the local ID part (after # or last /).
     */
    get localId(): string {
        if (this.uri.includes('#')) return this.uri.split('#').pop() || '';
        return this.uri.split('/').pop() || '';
    }

    /**
     * Returns the base URI part (before local ID).
     */
    get baseUri(): string {
        const local = this.localId;
        if (!local) return this.uri;
        return this.uri.substring(0, this.uri.length - local.length);
    }

    /**
     * Heuristic to check if entity has any meaningful data loaded.
     * Includes labels, comments, types, and properties.
     */
    get isEmpty(): boolean {
        // Basic Metadata check
        if (Object.keys(this.labels).length > 0) return false;
        if (Object.keys(this.descriptions).length > 0) return false;
        if (this.types.length > 0) return false;

        if (!this.structured) return true;

        // Structured Data check
        const hasProps = this.structured.classGroups.some(g =>
            g.dataProperties.length > 0 ||
            g.objectProperties.length > 0 ||
            g.unclassifiedProperties.length > 0
        );
        const hasOrphans = this.structured.orphanProperties.length > 0;
        return !hasProps && !hasOrphans;
    }

    /**
     * Checks if a specific predicate-value pair exists for this entity.
     * Searches both structured groups and orphans.
     */
    hasValue(predicate: string | NodeID, value: string | NodeID): boolean {
        if (!this.structured) return false;

        const termP = typeof predicate === 'string' ? null : state.factory.decode(predicate);
        const predStr = typeof predicate === 'string' ? predicate : (termP as any).value;
        const termV = typeof value === 'string' ? null : state.factory.decode(value);
        const valStr = typeof value === 'string' ? value : (termV as any).value;

        const checkList = (props: any[]) => props.some(p => {
            const tP = state.factory.decode(p.property);
            const pStr = (tP as any).value;
            if (pStr !== predStr) return false;
            return p.values.some((v: any) => {
                const tV = state.factory.decode(v.value);
                const vStr = (tV as any).value;
                return vStr === valStr;
            });
        });

        const inGroups = this.structured.classGroups.some(g =>
            checkList(g.dataProperties) ||
            checkList(g.objectProperties) ||
            checkList(g.unclassifiedProperties)
        );

        if (inGroups) return true;
        return checkList(this.structured.orphanProperties);
    }

    // --- Active Record API (V2) ---

    /**
     * Ensures the entity is hydrated to the requested level.
     */
    static async ensure(id: NodeID, level: HydrationLevel): Promise<KGEntity> {
        const entity = KGEntity.get(id);
        if (entity.isAtLeast(level)) return entity;

        if (level === 'metadata') {
            await this.fetchMetadata([entity]);
        } else if (level === 'structured') {
            await this.fetchStructure(entity);
        }
        return entity;
    }

    /**
     * Efficiently ensures metadata for a list of entities.
     * Useful for search results, lists, etc.
     */
    static async ensureMany(ids: NodeID[], level: HydrationLevel): Promise<KGEntity[]> {
        const entities = ids.map(id => KGEntity.get(id));
        const targets = entities.filter(e => !e.isAtLeast(level));

        if (targets.length === 0) return entities;

        if (level === 'metadata') {
            await this.fetchMetadata(targets);
        } else if (level === 'structured') {
            await Promise.all(targets.map(e => this.fetchStructure(e)));
        }

        return entities;
    }

    /**
     * "Deep Load" for Edit Windows.
     * Loads the entity structure AND prefetches metadata for all related entities (chips).
     * Solves the "Missing Label" issue.
     */
    static async loadForDisplay(id: NodeID): Promise<KGEntity> {
        // 1. Load Main Structure
        const entity = await this.ensure(id, 'structured');

        // 2. Scan & Prefetch Children
        if (entity.structured) {
            const childIds = new Set<NodeID>();

            const scanTerm = (term: any, id: NodeID) => {
                if (term.termType === 'NamedNode') {
                    childIds.add(id);
                } else if (term.termType === 'Triple') {
                    // RDF-star: Triple tokens in this factory already contain the BigInt NodeIDs 
                    // for their subject, predicate, and object.
                    const t = term as any;
                    if (t.subject) scanTerm(state.factory.decode(t.subject), t.subject);
                    if (t.predicate) scanTerm(state.factory.decode(t.predicate), t.predicate);
                    if (t.object) scanTerm(state.factory.decode(t.object), t.object);
                }
            };

            const collect = (props: any[]) => {
                props.forEach(p => {
                    p.values.forEach((v: any) => {
                        try {
                            const term = state.factory.decode(v.value);
                            scanTerm(term, v.value);
                        } catch { }
                    });
                });
            };

            entity.structured.classGroups.forEach(g => {
                collect(g.dataProperties);
                collect(g.objectProperties);
                collect(g.unclassifiedProperties);
            });
            collect(entity.structured.orphanProperties);
            collect(entity.structured.incomings || []);


            // 3. Batch Fetch Children Metadata
            if (childIds.size > 0) {
                await this.ensureMany(Array.from(childIds), 'metadata');
            }
        }
        return entity;
    }

    /**
     * Lazy Load for References (Mentions).
     * Specifically used for the "REFERENCED IN TRIPLES" section.
     */
    static async loadMentions(id: NodeID): Promise<KGEntity> {
        const entity = await this.ensure(id, 'structured');
        if (!entity.structured || !entity.structured.mentions) return entity;

        const childIds = new Set<NodeID>();
        const scanTerm = (term: any, nodeId: NodeID) => {
            if (term.termType === 'NamedNode') {
                childIds.add(nodeId);
            } else if (term.termType === 'Triple') {
                const t = term as any;
                if (t.subject) scanTerm(state.factory.decode(t.subject), t.subject);
                if (t.predicate) scanTerm(state.factory.decode(t.predicate), t.predicate);
                if (t.object) scanTerm(state.factory.decode(t.object), t.object);
            }
        };

        entity.structured.mentions.forEach(m => {
            scanTerm(state.factory.decode(m.subject), m.subject);
            scanTerm(state.factory.decode(m.predicate), m.predicate);
            scanTerm(state.factory.decode(m.object), m.object);
            
            // Fixed: Scan annotation values too (solving the URI display issue)
            m.annotations.forEach((a: any) => {
                a.values.forEach((v: any) => {
                    try {
                        const term = state.factory.decode(v.value);
                        scanTerm(term, v.value);
                    } catch {}
                });
            });
        });

        if (childIds.size > 0) {
            await this.ensureMany(Array.from(childIds), 'metadata');
        }

        return entity;
    }

    // --- Private Fetchers ---

    private static async fetchMetadata(entities: KGEntity[]) {
        const session = state.currentSession || undefined;

        await Promise.all(entities.map(async e => {
            // HIGH-PERFORMANCE: Use resolveMetadata instead of resolveStructured for search suggestions/lists
            const meta = state.entityResolver.resolveMetadata(e.id, session);

            e.labels = meta.labels;
            e.descriptions = meta.comments;
            e.types = meta.types;
            e.sources = meta.sources;

            e.hydrationLevel = 'metadata';
        }));
    }

    private static async fetchStructure(entity: KGEntity) {
        const session = state.currentSession || undefined;
        entity.structured = await state.entityResolver.resolveStructured(entity.id, state.language, session, { showAvailable: true });

        // Sync metadata
        entity.labels = entity.structured.labels;
        entity.descriptions = entity.structured.comments;
        entity.types = entity.structured.types;
        entity.sources = entity.structured.sources;
        entity.hydrationLevel = 'structured';
    }

    // --- Instance Methods ---

    /**
     * Utility to check hydration status.
     */
    public isAtLeast(level: HydrationLevel): boolean {
        const ranks: Record<HydrationLevel, number> = { 'id': 0, 'metadata': 1, 'structured': 2 };
        return ranks[this.hydrationLevel] >= ranks[level];
    }

    /**
     * Returns display name (Label -> URI fallback).
     */
    public getDisplayName(): string {
        const lang = state.language || 'en';

        // 1. Try Requested Language (Exact)
        if (this.labels[lang]) return this.labels[lang];

        // 1.5 Try Prefix Match (e.g. 'tr' matches 'tr-TR' or vice versa)
        // Check keys in labels
        const keys = Object.keys(this.labels);
        const prefixMatch = keys.find(k => k.toLowerCase().startsWith(lang.toLowerCase()) || lang.toLowerCase().startsWith(k.toLowerCase()));
        if (prefixMatch) return this.labels[prefixMatch];

        // 2. Try English Fallback (if requested was tr)
        if (this.labels['en']) return this.labels['en'];
        const enPrefix = keys.find(k => k.toLowerCase().startsWith('en'));
        if (enPrefix) return this.labels[enPrefix];

        if (this.labels['tr']) return this.labels['tr'];
        const trPrefix = keys.find(k => k.toLowerCase().startsWith('tr'));
        if (trPrefix) return this.labels[trPrefix];

        if (keys.length > 0) return this.labels[keys[0]];

        // 4. Fallback to legacy string (if exists)
        if (this.label) return this.label;

        // 5. Fallback to URI Fragment
        const uri = this.uri;
        if (uri.includes('#')) return uri.split('#').pop() || uri;
        return uri.split('/').pop() || uri;
    }

    public getDescription(): string {
        const lang = state.language || 'en';

        // 1. Try Requested Language
        if (this.descriptions[lang]) return this.descriptions[lang];

        // 1.5 Try Prefix Match
        const keys = Object.keys(this.descriptions);
        const prefixMatch = keys.find(k => k.toLowerCase().startsWith(lang.toLowerCase()) || lang.toLowerCase().startsWith(k.toLowerCase()));
        if (prefixMatch) return this.descriptions[prefixMatch];

        // 2. Try English Fallback
        if (this.descriptions['en']) return this.descriptions['en'];
        const enPrefix = keys.find(k => k.toLowerCase().startsWith('en'));
        if (enPrefix) return this.descriptions[enPrefix];

        if (this.descriptions['tr']) return this.descriptions['tr'];
        const trPrefix = keys.find(k => k.toLowerCase().startsWith('tr'));
        if (trPrefix) return this.descriptions[trPrefix];

        if (keys.length > 0) return this.descriptions[keys[0]];

        // 4. Fallback to legacy string
        return this.description || '';
    }

    public invalidate() {
        this.structured = null;
        this.types = [];
        this.sources = [];
        this.hydrationLevel = 'id';
    }

    /**
     * @deprecated Use KGEntity.ensure(id, level) instead.
     */
    async hydrate(level: HydrationLevel, force = false): Promise<void> {
        if (!force && this.isAtLeast(level)) return;

        // Bridge to new static logic
        if (level === 'metadata') {
            await KGEntity.fetchMetadata([this]);
        } else if (level === 'structured') {
            await KGEntity.fetchStructure(this);
        }
    }
}
