import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '../errors/app.error';
import { verifyAdminToken, JwtAdminPayload } from '../utils/jwt.util';

declare global {
    namespace Express {
        interface Request {
            admin?: JwtAdminPayload;
        }
    }
}

/**
 * Express middleware that authenticates admin requests via a Bearer JWT.
 *
 * Expects the `Authorization` header in the format `Bearer <token>`.
 * On success, injects the decoded payload into `req.admin` and calls `next()`.
 *
 * @param req - Express request; must contain a valid `Authorization: Bearer <token>` header.
 * @param _res - Express response (unused).
 * @param next - Express next function; called with an {@link AppError} on failure.
 * @throws {AppError} 401 UNAUTHORIZED when the header is missing or the token is invalid.
 */
export const adminAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];

    const payload = verifyAdminToken(token);
    req.admin = payload;
    next();
};
