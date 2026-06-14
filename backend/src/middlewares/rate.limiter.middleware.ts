import rateLimit from 'express-rate-limit';

const rateLimitResponse = {
    status: 'error',
    code: 'RATE_LIMITED',
    message: 'Too many requests, please try again later.',
};

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitResponse,
});

export const publicApiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitResponse,
});
