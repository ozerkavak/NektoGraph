import { EventEmitter } from '@triplestore/events';

export interface SyncDependencies {
    inference: { recompute: () => void };
    search: { 
        invalidateIndex: () => void; 
        buildIndex: () => void;
        updateEntityIndex?: (id: any, session?: any) => void;
    };
    schemaIndex: { buildIndex: () => void };
    windowManager: { 
        refreshAllWindows: () => void;
        refreshWindows: (entityId: string) => void;
    };
    resetStats: () => void;
    invalidateCache?: () => void;
    invalidateEntity?: (id: any) => void;
    factory: any;
}

/**
 * DataSyncEngine - Modular UI Synchronization Engine
 * Orchestrates discrete refresh procedures across the system.
 * 
 * @category Logic
 */
export class DataSyncEngine extends EventEmitter {
    /**
     * Operational mode for the sync engine.
     * 'on' - Automatic full refresh on granular updates
     * 'off' - Manual refresh or critical only
     */
    public mode: 'on' | 'off' = 'off';

    constructor(private deps: SyncDependencies) {
        super();
        
        // Listen for session commits and perform granular index updates
        this.on('session:committed', (ids: any[]) => {
            if (this.deps.search.updateEntityIndex) {
                ids.forEach(id => this.deps.search.updateEntityIndex!(id));
            }
        });
    }

    /**
     * Recompute Inference reasoning quads.
     * Essential before indexing to ensure inferred data is searchable.
     */
    public updateInference(): void {
        this.deps.inference.recompute();
    }

    /**
     * Rebuild the Unified Search Map.
     */
    public updateSearchIndex(): void {
        this.deps.search.invalidateIndex();
        this.deps.search.buildIndex();
    }

    /**
     * Update Schema Index (Classes/Properties).
     */
    public updateSchemaIndex(): void {
        this.deps.schemaIndex.buildIndex();
    }

    /**
     * Invalidate and Recount internal graph quads.
     */
    public resetStats(): void {
        this.deps.resetStats();
    }

    /**
     * Refresh all open UI windows and dispatch global render event.
     */
    public refreshUI(): void {
        if (this.deps.invalidateCache) {
            this.deps.invalidateCache();
        }
        this.deps.windowManager.refreshAllWindows();
        
        // Pure EventEmitter replaced DOM CustomEvent
        this.emit('sync:complete');
    }

    /**
     * Incrementally synchronizes specific entities across indices (Search, Schema).
     * If DataSync is OFF, it will still update 'Critical' indices (Search) but skip UI Refresh.
     */
    public syncDirtyEntities(ids: any | any[], priority: 'critical' | 'optional' = 'optional', session?: any): void {
        const idList = Array.isArray(ids) ? ids : [ids];

        // 1. Update Search Index (Always Critical for discovery)
        idList.forEach(id => {
            if (this.deps.search.updateEntityIndex) {
                this.deps.search.updateEntityIndex(id, session);
            }
            if (this.deps.invalidateEntity) {
                this.deps.invalidateEntity(id);
            }
        });

        // 2. UI Refresh Logic
        if (priority === 'optional' && this.mode === 'on') {
            this.refreshUI();
        } else if (priority === 'critical') {
            // Partial Refresh: Only refresh windows representing the dirty entities
            idList.forEach(id => {
                if (typeof id === 'string' || typeof id === 'bigint') {
                    const idStr = typeof id === 'bigint' ? this.deps.factory.decode(id).value : id;
                    this.deps.windowManager.refreshWindows(idStr);
                }
            });
            // Pure EventEmitter replaced DOM CustomEvent for search boosters
            this.emit('sync:granular', { ids: idList });
            this.emit('sync:complete'); // Still notify completion for progress bars
        }
    }

    /**
     * Orchestrates a full system-wide refresh in the optimal order.
     * Order: Inference -> Search -> Schema -> Stats -> UI
     */
    public fullRefresh(): void {
        this.emit('sync:start');
        
        try {
            this.updateInference();
            this.updateSearchIndex();
            this.updateSchemaIndex();
            this.resetStats();
            this.refreshUI();
        } catch (error) {
            this.emit('sync:error', error);
        }
    }
}

