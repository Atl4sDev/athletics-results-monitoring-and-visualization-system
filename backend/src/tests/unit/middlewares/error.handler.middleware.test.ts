import { describe, it, expect, vi } from 'vitest';

const { MockPrismaKnownError } = vi.hoisted(() => {
    class MockPrismaKnownError extends Error {
        code: string;
        constructor(code: string) {
            super('prisma error');
            this.name = 'PrismaClientKnownRequestError';
            this.code = code;
            Object.setPrototypeOf(this, MockPrismaKnownError.prototype);
        }
    }
    return { MockPrismaKnownError };
});

vi.mock('@prisma/client/runtime/library', () => ({
    PrismaClientKnownRequestError: MockPrismaKnownError,
}));

import { globalErrorHandler } from '../../../middlewares/error.handler.middleware';
import { AppError } from '../../../errors/app.error';

function buildRes() {
    const json = vi.fn();
    const res: any = { status: vi.fn().mockReturnValue({ json }) };
    return res;
}

const req: any = {};
const next: any = vi.fn();

describe('globalErrorHandler', () => {
    it('returns 400 MALFORMED_JSON for SyntaxError with body property', () => {
        const err = Object.assign(new SyntaxError('bad json'), { body: true });
        const res = buildRes();
        globalErrorHandler(err, req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.status().json).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'error', code: 'MALFORMED_JSON' })
        );
    });

    it('returns 404 NOT_FOUND for Prisma P2025', () => {
        const err = new MockPrismaKnownError('P2025');
        const res = buildRes();
        globalErrorHandler(err, req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.status().json).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'error', code: 'NOT_FOUND' })
        );
    });

    it('returns 409 CONFLICT for Prisma P2002', () => {
        const err = new MockPrismaKnownError('P2002');
        const res = buildRes();
        globalErrorHandler(err, req, res, next);
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.status().json).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'error', code: 'CONFLICT' })
        );
    });

    it('returns AppError statusCode and code for operational AppError', () => {
        const err = new AppError('Not allowed', 403, 'FORBIDDEN');
        const res = buildRes();
        globalErrorHandler(err, req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.status().json).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'error', code: 'FORBIDDEN', message: 'Not allowed' })
        );
    });

    it('returns 500 INTERNAL_SERVER_ERROR with generic message for unknown Error', () => {
        const err = new Error('secret internal detail');
        const res = buildRes();
        globalErrorHandler(err, req, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
        const body = res.status().json.mock.calls[0][0];
        expect(body.code).toBe('INTERNAL_SERVER_ERROR');
        expect(body.message).not.toBe('secret internal detail');
    });

    it('always responds with { status, code, message } shape', () => {
        const cases = [
            Object.assign(new SyntaxError('x'), { body: true }),
            new MockPrismaKnownError('P2025'),
            new MockPrismaKnownError('P2002'),
            new AppError('msg', 400, 'BAD'),
            new Error('raw'),
        ];
        for (const err of cases) {
            const res = buildRes();
            globalErrorHandler(err, req, res, next);
            const body = res.status().json.mock.calls[0][0];
            expect(body).toHaveProperty('status', 'error');
            expect(body).toHaveProperty('code');
            expect(body).toHaveProperty('message');
        }
    });
});
