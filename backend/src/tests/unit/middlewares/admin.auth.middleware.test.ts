import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../../errors/app.error';

const mockVerifyAdminToken = vi.hoisted(() => vi.fn());

vi.mock('../../../utils/jwt.util', () => ({
    verifyAdminToken: mockVerifyAdminToken,
}));

const { adminAuth } = await import('../../../middlewares/admin.auth.middleware');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildReq(authHeader?: string): any {
    return { headers: { authorization: authHeader } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('adminAuth', () => {
    let next: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        next = vi.fn();
        vi.clearAllMocks();
    });

    it('calls next with AppError 401 UNAUTHORIZED when Authorization header is missing', () => {
        adminAuth(buildReq(), {} as any, next);

        expect(next).toHaveBeenCalledOnce();
        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(401);
        expect(err.code).toBe('UNAUTHORIZED');
    });

    it('calls next with AppError 401 when Authorization header does not start with Bearer', () => {
        adminAuth(buildReq('Token abc123'), {} as any, next);

        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(401);
        expect(err.code).toBe('UNAUTHORIZED');
    });

    it('calls next with AppError 401 when Authorization header is empty string', () => {
        adminAuth(buildReq(''), {} as any, next);

        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(401);
    });

    it('injects decoded payload into req.admin and calls next() with no arguments on a valid token', () => {
        const payload = { sub: 'admin-1', email: 'admin@test.com', role: 'ADMIN' };
        mockVerifyAdminToken.mockReturnValue(payload);
        const req = buildReq('Bearer valid.jwt.token');

        adminAuth(req, {} as any, next);

        expect(req.admin).toEqual(payload);
        expect(next).toHaveBeenCalledWith();
    });

    it('extracts the token string after Bearer and passes it to verifyAdminToken', () => {
        mockVerifyAdminToken.mockReturnValue({ sub: 'admin-1', email: 'a@b.com', role: 'ADMIN' });

        adminAuth(buildReq('Bearer my.specific.token'), {} as any, next);

        expect(mockVerifyAdminToken).toHaveBeenCalledWith('my.specific.token');
    });

    it('propagates the AppError thrown by verifyAdminToken when the token is invalid', () => {
        const authError = new AppError('Unauthorized', 401, 'UNAUTHORIZED');
        mockVerifyAdminToken.mockImplementation(() => { throw authError; });

        expect(() => adminAuth(buildReq('Bearer bad.token'), {} as any, next)).toThrow(authError);
    });

    it('does not call verifyAdminToken when the header is missing', () => {
        adminAuth(buildReq(), {} as any, next);
        expect(mockVerifyAdminToken).not.toHaveBeenCalled();
    });
});
