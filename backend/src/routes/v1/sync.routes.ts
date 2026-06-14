import { Router, Request, Response } from 'express';
import { validateDto } from '../../middlewares/validate.dto.middleware';
import { SyncMeetSchema, SyncResultsSchema } from '../../schemas/sync.schema';
import { syncAuth } from '../../middlewares/sync.auth.middleware';
import { initMeet, syncResults } from '../../controllers/sync.controller';

const router = Router();

router.post('/meet', syncAuth, validateDto(SyncMeetSchema), initMeet);
router.post('/results', syncAuth, validateDto(SyncResultsSchema), syncResults);

export default router;
