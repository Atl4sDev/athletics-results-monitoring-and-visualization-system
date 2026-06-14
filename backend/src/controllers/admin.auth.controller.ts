import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/async.handler';
import { AdminAuthService } from '../services/admin.auth.service';
import { AdminLoginDto } from '../schemas/admin.auth.schema';

/**
 * Controller handlers for admin authentication routes.
 * Each handler is wrapped with `asyncHandler` so async errors propagate to
 * the global error handler without explicit try/catch.
 */
export const AdminAuthController = {
    /**
     * Authenticates an admin and returns a signed JWT.
     *
     * @param req - Request whose body has been validated as {@link AdminLoginDto}.
     * @param res - Response; returns HTTP 200 `{ token, expiresIn }` on success.
     */
    login: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const result = await AdminAuthService.login(req.body as AdminLoginDto);
        res.status(200).json(result);
    }),

    /**
     * Stateless logout — instructs the client to discard its token.
     * No server-side state is modified.
     *
     * @param _req - Request (unused).
     * @param res - Response; returns HTTP 200 `{ message: 'Logged out' }`.
     */
    logout: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
        res.status(200).json({ message: 'Logged out' });
    }),
};
