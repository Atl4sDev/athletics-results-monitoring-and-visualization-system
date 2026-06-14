import { Router } from 'express';
import { adminAuth } from '../../middlewares/admin.auth.middleware';
import { validateDto } from '../../middlewares/validate.dto.middleware';
import {
    CreateAthleteSchema,
    UpdateAthleteSchema,
    MergeAthleteSchema,
} from '../../schemas/admin.athlete.schema';
import { AdminAthleteController } from '../../controllers/admin.athlete.controller';

const router = Router();

router.get('/', adminAuth, AdminAthleteController.listAthletes);
router.get('/:id', adminAuth, AdminAthleteController.getAthleteById);
router.post('/', adminAuth, validateDto(CreateAthleteSchema), AdminAthleteController.createAthlete);
router.patch('/:id', adminAuth, validateDto(UpdateAthleteSchema), AdminAthleteController.updateAthlete);
router.delete('/:id', adminAuth, AdminAthleteController.deleteAthlete);
router.post('/:id/merge', adminAuth, validateDto(MergeAthleteSchema), AdminAthleteController.mergeAthletes);

export default router;
