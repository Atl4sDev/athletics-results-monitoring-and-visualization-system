import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/async.handler';
import { CompetitionAdminService } from '../services/admin.competition.service';
import { ListCompetitionsQueryDto } from '../schemas/admin.competition.schema';

export const CompetitionAdminController = {
    list: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const result = await CompetitionAdminService.list(req.query as ListCompetitionsQueryDto);
        res.status(200).json({ status: 'success', data: result });
    }),

    getById: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const result = await CompetitionAdminService.getById(req.params.id as string);
        res.status(200).json({ status: 'success', data: result });
    }),

    create: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const result = await CompetitionAdminService.create(req.body);
        res.status(201).json({ status: 'success', data: result });
    }),

    update: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const result = await CompetitionAdminService.update(req.params.id as string, req.body);
        res.status(200).json({ status: 'success', data: result });
    }),

    delete: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        await CompetitionAdminService.delete(req.params.id as string);
        res.status(204).send();
    }),

    regenerateToken: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const result = await CompetitionAdminService.regenerateToken(req.params.id as string);
        res.status(200).json({ status: 'success', data: result });
    }),
};
