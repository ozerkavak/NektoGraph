
import { NodeID, IDataFactory, IQuadStore } from '@triplestore/core';
import { InferenceMonitor } from './inference_monitor';

export interface GraphInfo {
    id: bigint;           // Physical NodeID in the store
    uri: string;          // Internal Unique ID (e.g., "A/remote1")
    logicalURI: string;   // User-facing URI (e.g., "http://example.org/A")
    remoteURI?: string;   // Original URI on the external server (usually same as logicalURI)

    type: 'default' | 'ontology' | 'data' | 'diff' | 'inference';
    filename?: string;    // If source is a local file
    metrics?: any;

    // Source Metadata
    sourceID?: string;    // Unique identifier for the source (e.g., "remote1", "file_alpha")
    sourceTitle?: string; // Human readable source name
    sourceURL?: string;   // Remote endpoint or file path
    sourceType?: 'local' | 'remote';
    canWrite?: boolean;
    auth?: { user: string; pass: string };

    // Multi-Repository Counts
    mainCount?: number;
    diffCount?: number;
    draftCount?: number;
    draftDeletions?: number;
}

/**
 * GraphMonitor
 * Manages the registry of named graphs and tracks quad counts/metadata.
 */
export class GraphMonitor {
    public graphs: Map<bigint, GraphInfo> = new Map();

    constructor(
        private store: IQuadStore,
        private diffStore: IQuadStore,
        private factory: IDataFactory,
        private inferenceMonitor: InferenceMonitor
    ) { }

    /**
     * Registers a graph in the system registry.
     */
    public registerGraph(logicalURI: string, type: GraphInfo['type'], sourceTitle?: string, metadata?: Partial<GraphInfo>): GraphInfo {
        const entries = Array.from(this.graphs.values());

        // Identify Existing Source-Match (Idempotency)
        const existingSourceMatch = entries.find(e =>
            e.logicalURI === logicalURI &&
            (
                (metadata?.sourceID && e.sourceID === metadata.sourceID) ||
                (metadata?.sourceURL && e.sourceURL === metadata.sourceURL) ||
                (metadata?.filename && e.filename === metadata.filename) ||
                (metadata?.id && e.id === metadata.id)
            )
        );

        if (existingSourceMatch) {
            if (metadata) Object.assign(existingSourceMatch, metadata);
            if (sourceTitle) existingSourceMatch.sourceTitle = sourceTitle;
            return existingSourceMatch;
        }

        // Determine Unique Internal URI
        const isSystem = type === 'default' || type === 'diff' || type === 'inference';
        const isOntology = type === 'ontology';

        let finalInternalURI = metadata?.uri;

        if (!finalInternalURI) {
            if (isSystem || isOntology) {
                finalInternalURI = logicalURI;
            } else {
                const DEFAULT_USER_GRAPH = 'http://example.org/graphs/user'; // Local constant fallback
                const isolationPrefix = DEFAULT_USER_GRAPH + '+' + metadata?.sourceID;
                const isAlreadyIsolated = metadata?.sourceID && logicalURI === isolationPrefix;

                const suffix = (metadata?.sourceID && !isAlreadyIsolated) ? `/${metadata.sourceID}` : '';
                finalInternalURI = logicalURI + suffix;
            }
        }

        let counter = 1;
        const baseInternalURI = finalInternalURI;
        while (entries.some(e => e.uri === finalInternalURI)) {
            finalInternalURI = `${baseInternalURI}_${counter++}`;
        }

        // Derive Physical NodeID
        const physicalID = metadata?.id || this.factory.namedNode(finalInternalURI);

        const info: GraphInfo = {
            id: physicalID,
            uri: finalInternalURI,
            logicalURI,
            remoteURI: metadata?.remoteURI || logicalURI,
            type,
            sourceTitle: sourceTitle || logicalURI.split('/').pop() || 'Untitled Graph',
            ...metadata
        };


        this.graphs.set(physicalID, info);
        return info;
    }

    /**
     * Returns stats for all registered graphs.
     */
    public getGraphStats(): GraphInfo[] {
        const stats: GraphInfo[] = [];
        for (const info of this.graphs.values()) {
            // Lazy Initialization for Physical Counts (Main & Diff)
            if (typeof info.mainCount !== 'number') {
                let mCount = 0;
                for (const _ of this.store.match(null, null, null, info.id)) mCount++;
                info.mainCount = mCount;
            }
            if (typeof info.diffCount !== 'number') {
                let dCount = 0;
                for (const _ of this.diffStore.match(null, null, null, info.id)) dCount++;
                info.diffCount = dCount;
            }

            // Inference Monitor Hook
            if (info.type === 'inference') {
                const infStats = this.inferenceMonitor.getStats(info.uri);
                info.mainCount = infStats.mainCount;
                info.draftCount = infStats.draftCount;
            }

            stats.push({ ...info });
        }
        return stats;
    }

    public getRepoStats() {
        return {
            main: (this.store as any).size || 0,
            diff: (this.diffStore as any).size || 0
        };
    }

    // Helpers to maintain counts
    public incrementGraphCount(g: NodeID, target: 'main' | 'diff' | 'draft' = 'main') {
        let info = this.graphs.get(g);
        
        if (!info) {
            // 🎯 Auto-Discovery of New Named Graphs
            try {
                const term = this.factory.decode(g);
                if (term.termType === 'NamedNode') {
                    const uri = term.value;
                    info = this.registerGraph(uri, 'data', uri.split('/').pop() || 'Dynamic Graph', { id: g, sourceType: 'local' });
                } else if (g === 0n) {
                    // Default graph fallback
                    return;
                }
            } catch(e) {
                return;
            }
        }

        if (!info) return;

        if (target === 'main') info.mainCount = (info.mainCount || 0) + 1;
        else if (target === 'diff') info.diffCount = (info.diffCount || 0) + 1;
        else if (target === 'draft') info.draftCount = (info.draftCount || 0) + 1;
    }

    public decrementGraphCount(g: NodeID, target: 'main' | 'diff' | 'draft' = 'main') {
        const info = this.graphs.get(g);
        if (!info) return;

        if (target === 'main') info.mainCount = Math.max(0, (info.mainCount || 0) - 1);
        else if (target === 'diff') info.diffCount = Math.max(0, (info.diffCount || 0) - 1);
        else if (target === 'draft') info.draftDeletions = (info.draftDeletions || 0) + 1;
    }


    public decrementDraftDeletion(g: NodeID) {
        const info = this.graphs.get(g);
        if (info && info.draftDeletions) {
            info.draftDeletions = Math.max(0, info.draftDeletions - 1);
        }
    }
}
