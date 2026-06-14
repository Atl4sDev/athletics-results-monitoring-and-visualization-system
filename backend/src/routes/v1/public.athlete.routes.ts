import { Router } from 'express';
import { publicApiLimiter } from '../../middlewares/rate.limiter.middleware';
import { validateDto } from '../../middlewares/validate.dto.middleware';
import {
    AthleteSearchQuerySchema,
    AthleteResultsQuerySchema,
    AthleteProgressionQuerySchema,
} from '../../schemas/public.athlete.schema';
import {
    searchAthletes,
    getAthleteProfile,
    getAthleteResults,
    getAthleteProgression,
} from '../../controllers/public.athlete.controller';

const router = Router();

router.get('/', publicApiLimiter, validateDto(AthleteSearchQuerySchema), searchAthletes);
router.get('/:license', publicApiLimiter, getAthleteProfile);
router.get('/:license/results', publicApiLimiter, validateDto(AthleteResultsQuerySchema), getAthleteResults);
router.get('/:license/progression', publicApiLimiter, validateDto(AthleteProgressionQuerySchema), getAthleteProgression);

export default router;
