import { DraftStore } from '@triplestore/edit-engine';
import { IDataFactory } from '@triplestore/core';
import { DataSyncEngine } from '@triplestore/data-sync';

/**
 * SessionMonitor
 * Tracks which entities have been modified within the active session.
 */
export class SessionMonitor {
    private modifiedEntities = new Set<string>();

    constructor(
        private factory: IDataFactory,
        private dataSync: DataSyncEngine
    ) {}

    /**
     * Binds to a new session and initializes tracking.
     */
    public trackSession(session: DraftStore | null) {
        this.modifiedEntities.clear();
        if (!session) {
            this.dataSync.refreshUI();
            return;
        }

        // 1. Immediate sync 
        this.sync(session);
        this.dataSync.refreshUI();

        // 2. Listen for subsequent updates
        session.on('data', () => {
            this.sync(session);
            this.dataSync.refreshUI();
        });
    }

    private sync(session: DraftStore) {
        const newSet = new Set<string>();
        
        // 1. Process Additions
        for (const raw of session.additions.match(null, null, null, null)) {
            try {
                const term = this.factory.decode(raw[0]);
                if (term.termType === 'NamedNode') {
                    newSet.add(term.value);
                } else if (term.termType === 'BlankNode' || term.termType === 'Triple') {
                    // For BNodes and Triples, we add a special entry to show something is happening
                    newSet.add(`[Refactored Data]`);
                }
            } catch(e) {}
        }

        // 2. Process Deletions
        session.deletions.forEach((key: string) => {
            try {
                const parts = key.split('_');
                const sid = BigInt(parts[0]);
                const term = this.factory.decode(sid);
                if (term.termType === 'NamedNode') {
                    newSet.add(term.value);
                } else {
                    newSet.add(`[Refactored Data]`);
                }
            } catch(e) {}
        });

        this.modifiedEntities = newSet;
    }

    /**
     * Returns a list of all entity URIs modified in the current session.
     */
    public getModifiedEntities(): string[] {
        return Array.from(this.modifiedEntities);
    }

    public getChangeCount(): { added: number, deleted: number } {
        // This would require reaching into session additions/deletions size
        // which might be better left to sessionManager.
        return { added: 0, deleted: 0 };
    }
}
