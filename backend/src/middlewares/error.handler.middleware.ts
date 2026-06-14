import { Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AppError } from '../errors/app.error';

export const globalErrorHandler = (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (err instanceof SyntaxError && 'body' in err) {
        res.status(400).json({ status: 'error', code: 'MALFORMED_JSON', message: 'Malformed JSON in request body.' });
        return;
    }

    if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2025') {
            res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'The requested record was not found.' });
            return;
        }
        if (err.code === 'P2002') {
            res.status(409).json({ status: 'error', code: 'CONFLICT', message: 'A record with this value already exists.' });
            return;
        }
    }

    if (err instanceof AppError && err.isOperational) {
        res.status(err.statusCode).json({ status: 'error', code: err.code, message: err.message });
        return;
    }

    console.error('[unhandled error]', err);
    res.status(500).json({ status: 'error', code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' });
};
