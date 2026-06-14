import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../../errors/app.error';

const mockFindUnique = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function (this: any) {
        this.competition = { findUnique: mockFindUnique };
    }),
}));

const { syncAuth } = await import('../../../middlewares/sync.auth.middleware');

function buildReq(authHeader?: string): any {
    return { headers: { authorization: authHeader }, body: {} };
}

describe('syncAuth', () => {
    let res: any;
    let next: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        res = { locals: {} };
        next = vi.fn();
        mockFindUnique.mockReset();
    });

    it('calls next with AppError 401 when Authorization header is missing', async () => {
        await syncAuth(buildReq(), res, next);
        expect(next).toHaveBeenCalledOnce();
        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(401);
        expect(err.code).toBe('UNAUTHORIZED');
    });

    it('calls next with AppError 401 when Authorization header is malformed', async () => {
        await syncAuth(buildReq('Token abc'), res, next);
        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(401);
    });

    it('calls next with AppError 403 when competition is not found', async () => {
        mockFindUnique.mockResolvedValue(null);
        await syncAuth(buildReq('Bearer validtoken'), res, next);
        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe('FORBIDDEN');
    });

    it('calls next with AppError 403 when competition is COMPLETED', async () => {
        mockFindUnique.mockResolvedValue({ id: 'comp-1', status: 'COMPLETED' });
        await syncAuth(buildReq('Bearer validtoken'), res, next);
        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe('FORBIDDEN');
    });

    it('injects competitionId and calls next() with no arguments for valid active competition', async () => {
        mockFindUnique.mockResolvedValue({ id: 'comp-123', status: 'ACTIVE' });
        const req = buildReq('Bearer validtoken');
        await syncAuth(req, res, next);
        expect(res.locals.competitionId).toBe('comp-123');
        expect(next).toHaveBeenCalledWith();
    });
});
