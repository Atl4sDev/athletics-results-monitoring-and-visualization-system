import { Router } from 'express';
import { publicApiLimiter } from '../../middlewares/rate.limiter.middleware';
import { validateDto } from '../../middlewares/validate.dto.middleware';
import { CalendarQuerySchema } from '../../schemas/public.competition.schema';
import { getCalendar, getCompetitionDetail, getAvailableYears } from '../../controllers/public.competition.controller';

const router = Router();

router.get('/calendar/years', publicApiLimiter, getAvailableYears);
router.get('/calendar', publicApiLimiter, validateDto(CalendarQuerySchema), getCalendar);
router.get('/competitions/:id', publicApiLimiter, getCompetitionDetail);

export default router;
