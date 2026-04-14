import { IQuadStore, NodeID, IDataFactory, DataEvent } from '@triplestore/core';
import { DraftStore } from '@triplestore/session';

export interface GraphStats {
    uri: string;
    mainCount: number;
    draftCount: number;
    totalCount: number; // Derived
}

/**
 * InferenceMonitor
 * Encapsulates logic for tracking inference graph sizes across
 * the Main Store (Persistent) and Active Session (Draft).
 */
export class InferenceMonitor {
    private mainCounts = new Map<string, number>();
    private draftCounts = new Map<string, number>();
    private graphURIs = new Set<string>();

    private activeSession: DraftStore | null = null;
    private sessionListener: ((e: DataEvent) => void) | null = null;

    constructor(
        private store: IQuadStore,
        private factory: IDataFactory
    ) {
        // Initial Scan of Main Store
        this.bindMainStore();
    }

    private bindMainStore() {
        this.store.on('data', (event: DataEvent) => {
            // Filter: Only care about Inference Graphs
            if (event.type === 'add') {
                event.quads.forEach(q => this.updateMainCount(q.graph, 1));
            } else if (event.type === 'delete') {
                if (event.quads) {
                    event.quads.forEach(q => this.updateMainCount(q.graph, -1));
                }
            }
        });
    }

    public registerGraph(uri: string) {
        this.graphURIs.add(uri);
        // Initial Count
        const gNode = this.factory.namedNode(uri);
        let count = 0;
        for (const _ of this.store.match(null, null, null, gNode)) {
            count++;
        }
        this.mainCounts.set(uri, count);
    }

    private updateMainCount(graph: NodeID, delta: number) {
        if (!graph) return;
        try {
            const uri = this.factory.decode(graph).value;
            if (this.graphURIs.has(uri) || uri.includes('/inference/')) {
                const current = this.mainCounts.get(uri) || 0;
                this.mainCounts.set(uri, Math.max(0, current + delta));
            }
        } catch { } // Ignore decode errors
    }

    // --- Session Binding ---

    public bindSession(session: DraftStore | null) {
        // 1. Unbind old session listener
        if (this.activeSession && this.sessionListener) {
            this.activeSession.off('data', this.sessionListener);
        }

        // 2. Clear Draft Counts
        this.draftCounts.clear();
        this.activeSession = session;

        if (session) {
            // 3. Re-scan session additions
            for (const q of session.additions.match(null, null, null, null)) {
                this.updateDraftCount(q[3], 1); // q[3] is graph
            }

            // 4. Bind New Listener
            this.sessionListener = (event: DataEvent) => {
                if (event.type === 'add') {
                    event.quads.forEach(q => this.updateDraftCount(q.graph, 1));
                } else if (event.type === 'delete') {
                    event.quads.forEach(q => this.updateDraftCount(q.graph, -1));
                }
            };
            session.on('data', this.sessionListener);
        }
    }


    private updateDraftCount(graph: NodeID, delta: number) {
        if (!graph) return;
        try {
            const uri = this.factory.decode(graph).value;
            if (this.graphURIs.has(uri) || uri.includes('/inference/')) {
                const current = this.draftCounts.get(uri) || 0;
                this.draftCounts.set(uri, Math.max(0, current + delta));
            }
        } catch { }
    }

    // --- API ---

    public getStats(uri: string): GraphStats {
        const result = {
            uri,
            mainCount: this.mainCounts.get(uri) || 0,
            draftCount: this.draftCounts.get(uri) || 0,
            totalCount: 0
        };
        result.totalCount = result.mainCount + result.draftCount;
        return result;
    }
}
