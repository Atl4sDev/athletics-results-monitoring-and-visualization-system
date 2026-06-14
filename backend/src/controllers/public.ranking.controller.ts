import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/async.handler';
import { PublicRankingService } from '../services/public.ranking.service';
import { RankingQueryDto } from '../schemas/public.ranking.schema';

export const getRankings = asyncHandler(async (req: Request, res: Response) => {
    const result = await PublicRankingService.getRankings(req.query as unknown as RankingQueryDto);
    res.json({ status: 'success', data: result });
});
