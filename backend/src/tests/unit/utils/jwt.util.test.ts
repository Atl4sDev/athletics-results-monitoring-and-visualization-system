import { describe, it, expect, vi, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { AppError } from '../../../errors/app.error';

vi.mock('../../../config/env', () => ({
    env: { JWT_SECRET: 'test-secret-key-at-least-10-chars' },
}));

const { signAdminToken, verifyAdminToken } = await import('../../../utils/jwt.util');

const payload = { sub: 'admin-uuid-1', email: 'admin@example.com', role: 'admin' };

describe('signAdminToken', () => {
    it('returns a non-empty string', () => {
        const token = signAdminToken(payload);
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);
    });
});

describe('verifyAdminToken', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns the original payload fields for a freshly signed token', () => {
        const token = signAdminToken(payload);
        const decoded = verifyAdminToken(token);
        expect(decoded.sub).toBe(payload.sub);
        expect(decoded.email).toBe(payload.email);
        expect(decoded.role).toBe(payload.role);
    });

    it('throws AppError 401 for a token that has elapsed its TTL', () => {
        vi.useFakeTimers();
        const token = signAdminToken(payload);
        // advance past the 8h TTL
        vi.advanceTimersByTime(8 * 60 * 60 * 1000 + 1000);
        expect(() => verifyAdminToken(token)).toThrow(AppError);
        try {
            verifyAdminToken(token);
        } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            expect((err as AppError).statusCode).toBe(401);
        }
    });

    it('throws AppError 401 for a malformed token string', () => {
        expect(() => verifyAdminToken('not.a.valid.jwt')).toThrow(AppError);
        try {
            verifyAdminToken('not.a.valid.jwt');
        } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            expect((err as AppError).statusCode).toBe(401);
        }
    });

    it('throws AppError 401 for a token signed with a different secret', () => {
        const wrongToken = jwt.sign(payload, 'completely-different-secret-key', { algorithm: 'HS256' });
        expect(() => verifyAdminToken(wrongToken)).toThrow(AppError);
        try {
            verifyAdminToken(wrongToken);
        } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            expect((err as AppError).statusCode).toBe(401);
        }
    });
});
