import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/async.handler';
import { PublicDisciplineService } from '../services/public.discipline.service';

export const getDisciplines = asyncHandler(async (req: Request, res: Response) => {
    res.set('Cache-Control', 'public, max-age=60');
    const data = await PublicDisciplineService.listAll();
    res.json({ status: 'success', data });
});
