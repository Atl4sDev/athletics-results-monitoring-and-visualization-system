import { Router } from 'express';
import syncRoutes from './sync.routes';
import adminAuthRoutes from './admin.auth.routes';
import adminCompetitionRouter from './admin.competition.routes';
import adminDisciplineRouter from './admin.discipline.routes';
import adminHeatRouter from './admin.heat.routes';
import adminResultRouter from './admin.result.routes';
import adminAthleteRouter from './admin.athlete.routes';
import publicAthleteRouter from './public.athlete.routes';
import publicRankingRouter from './public.ranking.routes';
import publicCompetitionRouter from './public.competition.routes';
import publicDisciplineRouter from './public.discipline.routes';

const router = Router();

router.use('/sync', syncRoutes);
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin/competitions', adminCompetitionRouter);
router.use('/admin/disciplines', adminDisciplineRouter);
router.use('/admin/heats', adminHeatRouter);
router.use('/admin/results', adminResultRouter);
router.use('/admin/athletes', adminAthleteRouter);
router.use('/athletes', publicAthleteRouter);
router.use('/rankings', publicRankingRouter);
router.use('/disciplines', publicDisciplineRouter);
router.use('/', publicCompetitionRouter);

export default router;