import { describe, it, expect, beforeEach } from 'vitest';
import { DraftStore } from '../src/session';
describe('DraftStore Logic (formerly Session Engine)', () => {
    let session;
    const s = 1n;
    const p = 2n;
    const o = 3n;
    const g = 4n;
    beforeEach(() => {
        session = new DraftStore('test_session');
    });
    describe('State Management', () => {
        it('should add a quad', () => {
            session.add(s, p, o, g);
            expect(session.size).toBe(1);
            expect(session.has(s, p, o, g)).toBe(true);
        });
        it('should cancel addition if deleted (A -> D = Empty)', () => {
            session.add(s, p, o, g);
            session.delete(s, p, o, g);
            expect(session.size).toBe(0);
            expect(session.deletions.has(`${s}_${p}_${o}_${g}`)).toBe(true);
            expect(session.has(s, p, o, g)).toBe(false);
        });
        it('should mark deletion if not added (D)', () => {
            session.delete(s, p, o, g);
            expect(session.deletions.size).toBe(1);
            expect(session.size).toBe(0);
            expect(session.has(s, p, o, g)).toBe(false);
        });
        it('should restore deletion if added (D -> A = Result: Added)', () => {
            session.delete(s, p, o, g);
            session.add(s, p, o, g);
            expect(session.deletions.has(`${s}_${p}_${o}_${g}`)).toBe(false);
            expect(session.has(s, p, o, g)).toBe(true);
            expect(session.size).toBe(1);
        });
    });
    describe('Value Checking', () => {
        it('should handle match correctly', () => {
            session.add(s, p, o, g);
            const results = Array.from(session.match(s, null, null, null));
            expect(results).toHaveLength(1);
            expect(results[0][0]).toBe(s);
        });
    });
});
//# sourceMappingURL=session.test.js.map
