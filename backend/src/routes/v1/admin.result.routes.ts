import { Router } from 'express';
import { adminAuth } from '../../middlewares/admin.auth.middleware';
import { validateDto } from '../../middlewares/validate.dto.middleware';
import { EditResultSchema } from '../../schemas/admin.result.schema';
import { AdminResultController } from '../../controllers/admin.result.controller';

const router = Router();

router.use(adminAuth);

router.patch('/:id', validateDto(EditResultSchema), AdminResultController.editResult);
router.delete('/:id', AdminResultController.removeAthlete);

export default router;
