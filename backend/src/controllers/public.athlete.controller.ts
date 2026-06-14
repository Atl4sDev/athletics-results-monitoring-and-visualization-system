import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/async.handler';
import { PublicAthleteService } from '../services/public.athlete.service';
import { AthleteSearchQueryDto, AthleteResultsQueryDto, AthleteProgressionQueryDto } from '../schemas/public.athlete.schema';

export const searchAthletes = asyncHandler(async (req: Request, res: Response) => {
    const result = await PublicAthleteService.searchAthletes(req.query as unknown as AthleteSearchQueryDto);
    res.json({ status: 'success', data: result });
});

export const getAthleteProfile = asyncHandler(async (req: Request, res: Response) => {
    const result = await PublicAthleteService.getAthleteProfile(req.params.license as string);
    res.json({ status: 'success', data: result });
});

export const getAthleteResults = asyncHandler(async (req: Request, res: Response) => {
    const result = await PublicAthleteService.getAthleteResults(
        req.params.license as string,
        req.query as AthleteResultsQueryDto,
    );
    res.json({ status: 'success', data: result });
});

export const getAthleteProgression = asyncHandler(async (req: Request, res: Response) => {
    const result = await PublicAthleteService.getAthleteProgression(
        req.params.license as string,
        req.query as unknown as AthleteProgressionQueryDto,
    );
    res.json({ status: 'success', data: result });
});
