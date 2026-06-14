import { Router } from 'express';
import { publicApiLimiter } from '../../middlewares/rate.limiter.middleware';
import { getDisciplines } from '../../controllers/public.discipline.controller';

const router = Router();

router.get('/', publicApiLimiter, getDisciplines);

export default router;
