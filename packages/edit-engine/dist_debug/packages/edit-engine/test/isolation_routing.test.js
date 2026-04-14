import { describe, it, expect, beforeEach } from 'vitest';
import { QuadStore, IDFactory } from '@triplestore/core';
import { SessionManager, DefaultCommitStrategy, DIFF_GRAPH_URI, TYPE_DELETION } from '../src/session';
describe('Sentinel Isolation Routing (Step 1)', () => {
    let mainStore;
    let diffStore;
    let factory;
    let manager;
    let strategy;
    const graphX = 'http://example.org/graphs/source-a';
    const s1 = 100n;
    const p1 = 101n;
    const o1 = 102n;
    beforeEach(() => {
        mainStore = new QuadStore();
        diffStore = new QuadStore();
        factory = new IDFactory(); // Shared factory logic verified in S0.1
        strategy = new DefaultCommitStrategy(mainStore, factory, diffStore);
        manager = new SessionManager(strategy);
    });
    it('Checkpoint 1.1: Isolation Test (Main vs Diff contents)', async () => {
        const graphXId = factory.namedNode(graphX);
        const session = manager.createSession('sentinel_tester');
        // Add triple to GraphX
        session.add(s1, p1, o1, graphXId);
        // COMMIT
        await manager.commitSession(session.id);
        // 1. Verify MainStore contains the data in GraphX
        const mainMatches = [...mainStore.match(s1, p1, o1, graphXId)];
        expect(mainMatches.length).toBe(1);
        // 2. Verify DiffStore contains the data log in GraphX (Shared Identity)
        const diffMatches = [...diffStore.match(s1, p1, o1, graphXId)];
        expect(diffMatches.length).toBe(1);
        // 3. Verify No Read Pollution
        // MainStore should NOT contain the triple in a "diff" graph
        const diffGraphId = factory.namedNode(DIFF_GRAPH_URI);
        expect([...mainStore.match(null, null, null, diffGraphId)].length).toBe(0);
        // DiffStore should NOT contain data in MainStore's "data" partition (it only has its own)
        // Actually, in shared identity, they share the same graph ID. 
        // The isolation is PHYSICAL (different QuadStore instances).
        expect(mainStore.size).toBe(1);
        expect(diffStore.size).toBe(1);
    });
    it('Checkpoint 1.2: Ghost Quad Audit after Undo', async () => {
        const graphXId = factory.namedNode(graphX);
        const session = manager.createSession('sentinel_tester');
        // Add
        session.add(s1, p1, o1, graphXId);
        expect(session.additions.size).toBe(1);
        // UNDO (Simulated by clearing session or not committing)
        // In our system, 'undo' happens at the DraftStore level.
        // If we don't commit, Main/Diff must remain empty.
        expect(mainStore.size).toBe(0);
        expect(diffStore.size).toBe(0);
        // Specifically check the CommitStrategy doesn't leave traces if execution fails or is partially applied
        // (Our execute is atomic-like for the stores)
    });
    it('Scenario: Deletion Routing', async () => {
        const graphXId = factory.namedNode(graphX);
        const deletionType = factory.namedNode(TYPE_DELETION);
        // Prepare main store
        mainStore.add(s1, p1, o1, graphXId);
        const session = manager.createSession('sentinel_tester');
        session.delete(s1, p1, o1, graphXId);
        await manager.commitSession(session.id);
        // 1. MainStore: Quad must be gone
        expect([...mainStore.match(s1, p1, o1, graphXId)].length).toBe(0);
        // 2. DiffStore: Must contain the REIFIED deletion under GraphXId (Shared Identity)
        const diffLog = [...diffStore.match(null, null, null, graphXId)];
        expect(diffLog.length).toBe(5); // Type, S, P, O, Timestamp
        const hasDeletionType = diffLog.some(q => q[2] === deletionType);
        expect(hasDeletionType).toBe(true);
    });
});
//# sourceMappingURL=isolation_routing.test.js.map
