import { describe, it, expect } from 'vitest';
import {
    encodeCursorInt,
    decodeCursorInt,
    buildPrismaPageInt,
} from '../../../utils/pagination.util';
import { AppError } from '../../../errors/app.error';

describe('encodeCursorInt / decodeCursorInt round-trip', () => {
    it('encodes then decodes back to the original integer', () => {
        expect(decodeCursorInt(encodeCursorInt(1))).toBe(1);
        expect(decodeCursorInt(encodeCursorInt(42))).toBe(42);
        expect(decodeCursorInt(encodeCursorInt(99999))).toBe(99999);
    });

    it('encoded value is different from the original number string', () => {
        const encoded = encodeCursorInt(7);
        expect(encoded).not.toBe('7');
        expect(typeof encoded).toBe('string');
    });
});

describe('decodeCursorInt', () => {
    it('throws AppError 400 INVALID_CURSOR for a non-numeric base64url string', () => {
        const invalid = Buffer.from('not-a-number').toString('base64url');
        expect(() => decodeCursorInt(invalid)).toThrow(AppError);
        try {
            decodeCursorInt(invalid);
        } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            expect((err as AppError).statusCode).toBe(400);
            expect((err as AppError).code).toBe('INVALID_CURSOR');
        }
    });
});

describe('buildPrismaPageInt', () => {
    it('returns { take, skip: 0 } with no cursor key when cursor is absent', () => {
        const result = buildPrismaPageInt(undefined, 20);
        expect(result.take).toBe(20);
        expect(result.skip).toBe(0);
        expect(result).not.toHaveProperty('cursor');
    });

    it('uses default take of 20 when take is omitted', () => {
        const result = buildPrismaPageInt();
        expect(result.take).toBe(20);
    });

    it('returns { take, skip: 1, cursor: { id } } when a valid cursor is provided', () => {
        const encoded = encodeCursorInt(5);
        const result = buildPrismaPageInt(encoded, 10);
        expect(result.take).toBe(10);
        expect(result.skip).toBe(1);
        expect(result.cursor).toEqual({ id: 5 });
    });
});
