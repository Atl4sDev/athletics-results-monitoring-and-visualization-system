import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/async.handler';
import { PublicCompetitionService } from '../services/public.competition.service';
import { CalendarQueryDto } from '../schemas/public.competition.schema';

export const getCalendar = asyncHandler(async (req: Request, res: Response) => {
    const result = await PublicCompetitionService.getCalendar(req.query as CalendarQueryDto);
    res.json({ status: 'success', data: result });
});

export const getCompetitionDetail = asyncHandler(async (req: Request, res: Response) => {
    const result = await PublicCompetitionService.getCompetitionDetail(req.params.id as string);
    res.json({ status: 'success', data: result });
});

export const getAvailableYears = asyncHandler(async (req: Request, res: Response) => {
    res.set('Cache-Control', 'public, max-age=60');
    const data = await PublicCompetitionService.getAvailableYears();
    res.json({ status: 'success', data });
});
