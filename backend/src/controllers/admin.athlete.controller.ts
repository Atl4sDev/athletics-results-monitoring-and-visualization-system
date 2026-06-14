import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/async.handler';
import { AdminAthleteService } from '../services/admin.athlete.service';
import {
    AthleteAdminListQueryDto,
    CreateAthleteDto,
    UpdateAthleteDto,
    MergeAthleteDto,
} from '../schemas/admin.athlete.schema';

export const AdminAthleteController = {
    listAthletes: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const result = await AdminAthleteService.listAthletes(req.query as AthleteAdminListQueryDto);
        res.status(200).json({ status: 'success', data: result });
    }),

    getAthleteById: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const result = await AdminAthleteService.getAthleteById(req.params.id as string);
        res.status(200).json({ status: 'success', data: result });
    }),

    createAthlete: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const result = await AdminAthleteService.createAthlete(req.body as CreateAthleteDto);
        res.status(201).json({ status: 'success', data: result });
    }),

    updateAthlete: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const result = await AdminAthleteService.updateAthlete(req.params.id as string, req.body as UpdateAthleteDto);
        res.status(200).json({ status: 'success', data: result });
    }),

    deleteAthlete: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const result = await AdminAthleteService.deleteAthlete(req.params.id as string);
        res.status(200).json({ status: 'success', data: result });
    }),

    mergeAthletes: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const result = await AdminAthleteService.mergeAthletes(req.params.id as string, req.body as MergeAthleteDto);
        res.status(200).json({ status: 'success', data: result });
    }),
};
