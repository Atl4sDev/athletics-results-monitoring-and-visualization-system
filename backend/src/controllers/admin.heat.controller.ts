import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/async.handler';
import { AdminHeatService } from '../services/admin.heat.service';
import { AddAthleteToHeatDto, HeatAdminListQueryDto } from '../schemas/admin.heat.schema';

export const AdminHeatController = {
    listHeats: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const result = await AdminHeatService.listHeats(req.query as HeatAdminListQueryDto);
        res.status(200).json({ status: 'success', data: result });
    }),

    getHeat: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const heat = await AdminHeatService.getHeat(req.params.id as string);
        res.status(200).json({ status: 'success', data: heat });
    }),

    confirmHeat: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const heat = await AdminHeatService.confirmHeat(req.params.id as string);
        res.status(200).json({ status: 'success', data: heat });
    }),

    unconfirmHeat: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const heat = await AdminHeatService.unconfirmHeat(req.params.id as string);
        res.status(200).json({ status: 'success', data: heat });
    }),

    addAthlete: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const result = await AdminHeatService.addAthleteToHeat(req.params.id as string, req.body as AddAthleteToHeatDto);
        res.status(201).json({ status: 'success', data: result });
    }),
};
