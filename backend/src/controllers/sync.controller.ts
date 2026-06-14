import { Request, Response } from 'express';
import { SyncMeetDto, SyncResultsDto } from '../schemas/sync.schema';
import { ResolutionService } from '../services/resolution.service';
import { MeetService } from '../services/meet.service';
import { ResultService } from '../services/result.service';
import { asyncHandler } from '../middlewares/async.handler';

export const initMeet = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { athletes, schedule } = req.body as SyncMeetDto;
    const competitionId = res.locals.competitionId as string;

    const athleteMap = await ResolutionService.resolveAthletes(athletes);
    const stats = await MeetService.syncSchedule(competitionId, schedule, athleteMap);

    res.status(200).json({
        status: 'success',
        message: 'Competition and start lists synchronized successfully',
        data: {
            athletesResolved: athleteMap.size,
            eventsProcessed: stats.eventsProcessed,
            heatsProcessed: stats.heatsProcessed,
        },
    });
});

export const syncResults = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const payload = req.body as SyncResultsDto;
    const competitionId = res.locals.competitionId as string;

    await ResultService.processResults(competitionId, payload);

    res.status(200).json({
        status: 'success',
        message: 'Results saved and broadcast successfully',
    });
});
