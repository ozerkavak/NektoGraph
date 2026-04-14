import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from '../../session/src/manager';
describe('Sentinel: Session Lifecycle Consistency Audit', () => {
    let manager;
    let mockStrategy;
    beforeEach(() => {
        mockStrategy = {
            execute: vi.fn().mockResolvedValue(undefined)
        };
        manager = new SessionManager(mockStrategy);
    });
    it('AUDIT: closeSession MUST reject non-string IDs to prevent PointerEvent leaks', () => {
        const session = manager.createSession('test-user');
        const sessionId = session.id;
        expect(manager.activeSession).toBeDefined();
        expect(manager.activeSession?.id).toBe(sessionId);
        // Simulate the "PointerEvent" bug: UI calls closeSession(event)
        // Architect's finding: If id is an object (PointerEvent), manager.sessions.delete(id) fails silently.
        const fakeEvent = { type: 'click', target: {} };
        manager.closeSession(fakeEvent);
        // SENTINEL CHECK: The session MUST still be active if the ID was invalid, 
        // OR the system should have failed gracefully.
        // But if closeSession(fakeEvent) was intended to close the "current" session, 
        // it failed to do so in the previous implementation because Map.delete(event) is valid JS but returns false.
        // Architect's fix was in AppState, but let's check Manager's robustness.
        const sessions = manager.listSessions();
        expect(sessions).toContain(sessionId); // It was NOT deleted because ID mismatch
        expect(manager.activeSession).toBeDefined(); // Still active
    });
    it('AUDIT: cancelSession logic wrap (Simulation of AppState bug)', () => {
        // This simulates the behavior in AppState before the fix.
        let currentSession = manager.createSession('test-user');
        const sessionId = currentSession.id;
        const cancelSession = (id) => {
            // Pre-fix logic in AppState:
            // this.sessionManager.closeSession(id);
            // this.currentSession = null;
            manager.closeSession(id);
            currentSession = null;
        };
        // Simulate UI call with PointerEvent
        cancelSession({ type: 'click' });
        // SENTINEL FINDING: Zombie Session!
        expect(currentSession).toBeNull(); // AppState thinks it's closed
        expect(manager.getSession(sessionId)).toBeDefined(); // BUT MANAGER STILL HAS IT!
    });
});
//# sourceMappingURL=session_lifecycle_audit.test.js.map
