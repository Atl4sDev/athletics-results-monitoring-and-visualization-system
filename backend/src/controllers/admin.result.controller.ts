import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/async.handler';
import { AdminResultService } from '../services/admin.result.service';
import { EditResultDto } from '../schemas/admin.result.schema';

export const AdminResultController = {
    editResult: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const result = await AdminResultService.editResult(req.params.id as string, req.body as EditResultDto);
        res.status(200).json({ status: 'success', data: result });
    }),

    removeAthlete: asyncHandler(async (req: Request, res: Response): Promise<void> => {
        await AdminResultService.removeAthleteFromHeat(req.params.id as string);
        res.status(204).send();
    }),
};
