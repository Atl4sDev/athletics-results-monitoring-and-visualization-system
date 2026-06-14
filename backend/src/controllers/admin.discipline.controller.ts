import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/async.handler';
import { DisciplineAdminService } from '../services/admin.discipline.service';
import { DisciplineListQuery } from '../schemas/admin.discipline.schema';

export const DisciplineAdminController = {
    list: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const result = await DisciplineAdminService.list(req.query as DisciplineListQuery);
        res.status(200).json({ status: 'success', data: result });
    }),

    getById: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const id = parseInt(req.params.id as string, 10);
        const result = await DisciplineAdminService.getById(id);
        res.status(200).json({ status: 'success', data: result });
    }),

    create: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const result = await DisciplineAdminService.create(req.body);
        res.status(201).json({ status: 'success', data: result });
    }),

    update: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const id = parseInt(req.params.id as string, 10);
        const result = await DisciplineAdminService.update(id, req.body);
        res.status(200).json({ status: 'success', data: result });
    }),

    delete: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const id = parseInt(req.params.id as string, 10);
        await DisciplineAdminService.delete(id);
        res.status(204).send();
    }),
};
