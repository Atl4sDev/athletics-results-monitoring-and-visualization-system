import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';

/**
 * Generic middleware for strict DTO validation using Zod.
 * Applies the fail-fast pattern: invalid requests are rejected immediately with a 400 response.
 */
export const validateDto = (schema: ZodType<any, any, any>) =>
    (req: Request, res: Response, next: NextFunction): void => {
        try {
            const parsed = schema.parse({
                body: req.body,
                query: { ...req.query },
                params: { ...req.params },
            });

            if (parsed.body !== undefined) req.body = parsed.body;
            // req.query is a recomputed getter-only in Express 5; shadow the prototype getter
            // with an own property on the instance so coerced values are visible downstream
            if (parsed.query !== undefined) {
                Object.defineProperty(req, 'query', {
                    configurable: true,
                    enumerable: true,
                    get: () => parsed.query,
                });
            }
            if (parsed.params !== undefined) Object.assign(req.params, parsed.params);

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                }));

                res.status(400).json({
                    status: 'error',
                    message: 'Request validation failed',
                    errors: formattedErrors,
                });
                return;
            }

            next(error);
        }
    };