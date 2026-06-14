import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/app.error';

/**
 * Payload embedded in every admin JWT.
 */
export interface JwtAdminPayload {
    /** Admin record UUID. */
    sub: string;
    email: string;
    role: string;
}

/**
 * Signs a JWT for the given admin payload using HS256 with an 8-hour TTL.
 *
 * @param payload - Admin identity data to encode in the token.
 * @returns Signed JWT string.
 */
export function signAdminToken(payload: JwtAdminPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '8h' });
}

/**
 * Verifies a JWT and returns the decoded admin payload.
 *
 * @param token - Raw JWT string from the Authorization header.
 * @returns Decoded {@link JwtAdminPayload}.
 * @throws {AppError} 401 UNAUTHORIZED when the token is expired, malformed, or signed with the wrong secret.
 */
export function verifyAdminToken(token: string): JwtAdminPayload {
    try {
        return jwt.verify(token, env.JWT_SECRET) as JwtAdminPayload;
    } catch (err) {
        if (err instanceof TokenExpiredError || err instanceof JsonWebTokenError) {
            throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
        }
        throw err;
    }
}
