import { Router } from 'express';
import { adminAuth } from '../../middlewares/admin.auth.middleware';
import { publicApiLimiter } from '../../middlewares/rate.limiter.middleware';
import { validateDto } from '../../middlewares/validate.dto.middleware';
import {
    DisciplineListQuerySchema,
    DisciplineCreateSchema,
    DisciplineUpdateSchema,
} from '../../schemas/admin.discipline.schema';
import { DisciplineAdminController } from '../../controllers/admin.discipline.controller';

const router = Router();

router.use(adminAuth);

router.get('/', publicApiLimiter, validateDto(DisciplineListQuerySchema), DisciplineAdminController.list);
router.post('/', validateDto(DisciplineCreateSchema), DisciplineAdminController.create);
router.get('/:id', DisciplineAdminController.getById);
router.patch('/:id', validateDto(DisciplineUpdateSchema), DisciplineAdminController.update);
router.delete('/:id', DisciplineAdminController.delete);

export default router;
