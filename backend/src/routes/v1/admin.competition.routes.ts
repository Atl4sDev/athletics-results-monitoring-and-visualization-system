import { Router } from 'express';
import { adminAuth } from '../../middlewares/admin.auth.middleware';
import { publicApiLimiter } from '../../middlewares/rate.limiter.middleware';
import { validateDto } from '../../middlewares/validate.dto.middleware';
import {
    ListCompetitionsQuerySchema,
    CreateCompetitionSchema,
    UpdateCompetitionSchema,
} from '../../schemas/admin.competition.schema';
import { CompetitionAdminController } from '../../controllers/admin.competition.controller';

const router = Router();

router.use(adminAuth);

router.get('/', publicApiLimiter, validateDto(ListCompetitionsQuerySchema), CompetitionAdminController.list);
router.post('/', validateDto(CreateCompetitionSchema), CompetitionAdminController.create);
router.get('/:id', CompetitionAdminController.getById);
router.patch('/:id', validateDto(UpdateCompetitionSchema), CompetitionAdminController.update);
router.delete('/:id', CompetitionAdminController.delete);
router.post('/:id/token', CompetitionAdminController.regenerateToken);

export default router;
