import { Router } from 'express';
import { publicApiLimiter } from '../../middlewares/rate.limiter.middleware';
import { validateDto } from '../../middlewares/validate.dto.middleware';
import { RankingQuerySchema } from '../../schemas/public.ranking.schema';
import { getRankings } from '../../controllers/public.ranking.controller';

const router = Router();

router.get('/', publicApiLimiter, validateDto(RankingQuerySchema), getRankings);

export default router;
