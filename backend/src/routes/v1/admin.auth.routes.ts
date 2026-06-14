/**
 * Admin authentication routes.
 *
 * Mounted at `/api/v1/admin/auth` by the v1 router.
 *
 * POST /login  — rate-limited, validates body via AdminLoginSchema, handled by AdminAuthController.login
 * POST /logout — requires a valid admin Bearer token, handled by AdminAuthController.logout
 */
import { Router } from 'express';
import { authLimiter } from '../../middlewares/rate.limiter.middleware';
import { validateDto } from '../../middlewares/validate.dto.middleware';
import { adminAuth } from '../../middlewares/admin.auth.middleware';
import { AdminLoginSchema } from '../../schemas/admin.auth.schema';
import { AdminAuthController } from '../../controllers/admin.auth.controller';

const router = Router();

router.post('/login', authLimiter, validateDto(AdminLoginSchema), AdminAuthController.login);
router.post('/logout', adminAuth, AdminAuthController.logout);

export default router;
