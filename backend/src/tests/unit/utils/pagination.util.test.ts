import { describe, it, expect } from 'vitest';
import {
    encodeCursor,
    decodeCursor,
    buildPrismaPage,
    buildPaginatedResult,
} from '../../../utils/pagination.util';
import { AppError } from '../../../errors/app.error';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('encodeCursor', () => {
    it('returns a non-empty string different from the input', () => {
        const encoded = encodeCursor(VALID_UUID);
        expect(encoded).toBeTruthy();
        expect(encoded).not.toBe(VALID_UUID);
    });
});

describe('decodeCursor', () => {
    it('round-trips a UUID', () => {
        expect(decodeCursor(encodeCursor(VALID_UUID))).toBe(VALID_UUID);
    });

    it('throws AppError 400 INVALID_CURSOR for a non-UUID decoded value', () => {
        const invalidCursor = Buffer.from('not-a-uuid').toString('base64url');
        expect(() => decodeCursor(invalidCursor)).toThrow(AppError);
        try {
            decodeCursor(invalidCursor);
        } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            expect((err as AppError).statusCode).toBe(400);
            expect((err as AppError).code).toBe('INVALID_CURSOR');
        }
    });
});

describe('buildPrismaPage', () => {
    it('returns { take: 20, skip: 0 } with no cursor key when cursor is absent', () => {
        const result = buildPrismaPage();
        expect(result.take).toBe(20);
        expect(result.skip).toBe(0);
        expect(result).not.toHaveProperty('cursor');
    });

    it('returns { take, skip: 1, cursor: { id } } when cursor is provided', () => {
        const encoded = encodeCursor(VALID_UUID);
        const result = buildPrismaPage(encoded, 10);
        expect(result.take).toBe(10);
        expect(result.skip).toBe(1);
        expect(result.cursor).toEqual({ id: VALID_UUID });
    });
});

describe('buildPaginatedResult', () => {
    it('sets hasMore=true and encodes nextCursor when items.length === take', () => {
        const items = [{ id: VALID_UUID }];
        const result = buildPaginatedResult(items, 1);
        expect(result.hasMore).toBe(true);
        expect(result.nextCursor).toBe(encodeCursor(VALID_UUID));
        expect(result.data).toBe(items);
    });

    it('sets hasMore=false and nextCursor=null when items.length < take', () => {
        const items = [{ id: VALID_UUID }];
        const result = buildPaginatedResult(items, 5);
        expect(result.hasMore).toBe(false);
        expect(result.nextCursor).toBeNull();
    });
});
