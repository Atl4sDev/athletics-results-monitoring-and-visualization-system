import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { validateDto } from '../../../middlewares/validate.dto.middleware';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        age: z.number().optional(),
    }),
    query: z.object({
        page: z.string().optional(),
    }),
    params: z.object({
        id: z.string().optional(),
    }),
});

function buildReq(body: any = {}, query: any = {}, params: any = {}): any {
    return { body, query, params };
}

function buildRes(): any {
    const json = vi.fn();
    return { status: vi.fn().mockReturnValue({ json }) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateDto', () => {
    it('calls next() with no arguments when the payload is valid', () => {
        const next = vi.fn();
        validateDto(testSchema)(buildReq({ name: 'Alice' }), buildRes(), next);
        expect(next).toHaveBeenCalledWith();
    });

    it('assigns parsed body to req.body', () => {
        const next = vi.fn();
        const req = buildReq({ name: 'Alice' });
        validateDto(testSchema)(req, buildRes(), next);
        expect(req.body).toEqual({ name: 'Alice' });
    });

    it('strips extra body fields not in the schema', () => {
        const next = vi.fn();
        const req = buildReq({ name: 'Alice', unknownField: 'ignored' });
        validateDto(testSchema)(req, buildRes(), next);
        expect(req.body).not.toHaveProperty('unknownField');
    });

    it('returns 400 with status=error when body validation fails', () => {
        const next = vi.fn();
        const res = buildRes();
        validateDto(testSchema)(buildReq({}), res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.status().json).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'error', message: 'Request validation failed' })
        );
    });

    it('does not call next() when validation fails', () => {
        const next = vi.fn();
        validateDto(testSchema)(buildReq({}), buildRes(), next);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns errors as an array of { path, message } objects', () => {
        const next = vi.fn();
        const res = buildRes();
        validateDto(testSchema)(buildReq({}), res, next);
        const { errors } = res.status().json.mock.calls[0][0];
        expect(Array.isArray(errors)).toBe(true);
        expect(errors.length).toBeGreaterThan(0);
        for (const err of errors) {
            expect(err).toHaveProperty('path');
            expect(err).toHaveProperty('message');
            expect(typeof err.path).toBe('string');
            expect(typeof err.message).toBe('string');
        }
    });

    it('includes the path to the invalid field in the error', () => {
        const next = vi.fn();
        const res = buildRes();
        validateDto(testSchema)(buildReq({}), res, next); // missing required body.name
        const { errors } = res.status().json.mock.calls[0][0];
        const paths = errors.map((e: any) => e.path);
        expect(paths.some((p: string) => p.includes('name'))).toBe(true);
    });

    it('applies coerced query values to req.query via Object.defineProperty', () => {
        const next = vi.fn();
        const coercingSchema = z.object({
            body: z.object({}),
            query: z.object({ page: z.coerce.number().default(1) }),
            params: z.object({}),
        });
        const req = buildReq({}, { page: '3' });
        validateDto(coercingSchema)(req, buildRes(), next);
        expect(req.query.page).toBe(3);
        expect(next).toHaveBeenCalledWith();
    });

    it('applies coerced params to req.params', () => {
        const next = vi.fn();
        const paramsSchema = z.object({
            body: z.object({}),
            query: z.object({}),
            params: z.object({ id: z.string().transform((v) => v.toUpperCase()) }),
        });
        const req = buildReq({}, {}, { id: 'abc' });
        validateDto(paramsSchema)(req, buildRes(), next);
        expect(req.params.id).toBe('ABC');
        expect(next).toHaveBeenCalledWith();
    });

    it('calls next(error) for non-ZodError exceptions thrown by schema.parse', () => {
        const next = vi.fn();
        const unexpectedError = new TypeError('Unexpected schema error');
        const throwingSchema = { parse: () => { throw unexpectedError; } } as any;
        validateDto(throwingSchema)(buildReq(), buildRes(), next);
        expect(next).toHaveBeenCalledWith(unexpectedError);
    });

    it('returns errors for all invalid fields, not just the first one', () => {
        const multiFieldSchema = z.object({
            body: z.object({
                firstName: z.string().min(1),
                lastName: z.string().min(1),
            }),
            query: z.object({}),
            params: z.object({}),
        });
        const next = vi.fn();
        const res = buildRes();
        validateDto(multiFieldSchema)(buildReq({}), res, next);
        const { errors } = res.status().json.mock.calls[0][0];
        expect(errors.length).toBeGreaterThanOrEqual(2);
    });
});
