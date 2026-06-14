import { describe, it, expect } from 'vitest';
import { AppError } from '../../../errors/app.error';

describe('AppError', () => {
    it('sets message, statusCode, code, and isOperational', () => {
        const err = new AppError('Not found', 404, 'NOT_FOUND');
        expect(err.message).toBe('Not found');
        expect(err.statusCode).toBe(404);
        expect(err.code).toBe('NOT_FOUND');
        expect(err.isOperational).toBe(true);
    });

    it('defaults code to INTERNAL_ERROR', () => {
        const err = new AppError('Oops', 500);
        expect(err.code).toBe('INTERNAL_ERROR');
    });

    it('is instanceof AppError and instanceof Error', () => {
        const err = new AppError('test', 400);
        expect(err).toBeInstanceOf(AppError);
        expect(err).toBeInstanceOf(Error);
    });

    it('preserves a custom code', () => {
        const err = new AppError('Conflict', 409, 'CONFLICT');
        expect(err.code).toBe('CONFLICT');
    });
});
