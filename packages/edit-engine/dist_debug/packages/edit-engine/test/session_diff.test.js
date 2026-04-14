import { describe, it, expect, beforeEach } from 'vitest';
import { QuadStore, IDFactory, DEFAULT_GRAPH } from '@triplestore/core';
import { SessionManager, DefaultCommitStrategy, DIFF_GRAPH_URI, TYPE_DELETION } from '../src/session';
describe('Session Diff & Persistence', () => {
    let store;
    let factory;
    let manager;
    // Data
    const s1 = BigInt(10);
    const p1 = BigInt(11);
    const o1 = BigInt(12);
    const s2 = BigInt(20);
    const p2 = BigInt(21);
    const o2 = BigInt(22);
    const diffGraph = BigInt(999); // Mock ID for diff graph loc
    let diffStore;
    let strategy;
    beforeEach(() => {
        store = new QuadStore();
        diffStore = new QuadStore();
        factory = new IDFactory();
        strategy = new DefaultCommitStrategy(store, factory, diffStore);
        manager = new SessionManager(strategy);
    });
    it('Scenario: Delete in Session 1, Add in Session 2, Export Diff', async () => {
        const diffGraphID = factory.namedNode(DIFF_GRAPH_URI);
        const deletionType = factory.namedNode(TYPE_DELETION);
        // --- PRE-CONDITION ---
        // Store has s1 p1 o1 (User Data)
        store.add(s1, p1, o1, DEFAULT_GRAPH);
        expect(store.size).toBe(1);
        // --- SESSION 1: DELETE ---
        const session1 = manager.createSession('user1');
        session1.delete(s1, p1, o1, DEFAULT_GRAPH);
        // Verify internal state before save
        expect(session1.deletions.size).toBe(1);
        expect(session1.has(s1, p1, o1, DEFAULT_GRAPH)).toBe(false); // Should appear deleted in session overlay logic
        // SAVE
        await manager.commitSession(session1.id);
        // Verify Main Store Update
        const match1 = [...store.match(s1, p1, o1, null)];
        expect(match1.length).toBe(0);
        // Verify Diff repository (System)
        // Should contain a Reified Deletion in DiffStore
        const diffMatches = [...diffStore.match(null, null, null, DEFAULT_GRAPH)];
        expect(diffMatches.length).toBeGreaterThan(0);
        // Find the Deletion Node
        // ?x a ag:Deletion
        let deletionNode = null;
        for (const q of diffMatches) {
            if (q[1] === factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type') &&
                q[2] === deletionType) {
                deletionNode = q[0];
            }
        }
        expect(deletionNode).toBeDefined();
        // --- SESSION 2: ADD ---
        const session2 = manager.createSession('user1');
        session2.add(s2, p2, o2, DEFAULT_GRAPH);
        await manager.commitSession(session2.id);
        // Verify Main Store
        const match2 = [...store.match(s2, p2, o2, null)];
        expect(match2.length).toBe(1);
        // --- VERIFY HISTORY (DIFF) ---
        // Instead of an export method on the session, we directly verify the Diff repository
        const exportedQuads = [...diffStore.match(null, null, null, null)];
        // Should have:
        // 5 quads for Deletion in Session 1 (Type, S, P, O, Time)
        // 1 quad for Insertion in Session 2
        expect(exportedQuads.length).toBe(6);
    });
});
//# sourceMappingURL=session_diff.test.js.map
