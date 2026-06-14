import { Router } from 'express';
import { adminAuth } from '../../middlewares/admin.auth.middleware';
import { validateDto } from '../../middlewares/validate.dto.middleware';
import { AddAthleteToHeatSchema } from '../../schemas/admin.heat.schema';
import { AdminHeatController } from '../../controllers/admin.heat.controller';

const router = Router();

router.use(adminAuth);

router.get('/', AdminHeatController.listHeats);
router.get('/:id', AdminHeatController.getHeat);
router.patch('/:id/confirm', AdminHeatController.confirmHeat);
router.patch('/:id/unconfirm', AdminHeatController.unconfirmHeat);
router.post('/:id/results', validateDto(AddAthleteToHeatSchema), AdminHeatController.addAthlete);

export default router;
