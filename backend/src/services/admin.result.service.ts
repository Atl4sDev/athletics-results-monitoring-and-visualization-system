import { prisma } from '../config/prisma';
import { AppError } from '../errors/app.error';
import { syncEmitter, EVENTS } from '../events/sync.events';
import { PbSbService } from './pbsb.service';
import { AdminHeatService } from './admin.heat.service';
import { parseMarkToSortValue } from '../utils/time.util';
import { EditResultDto } from '../schemas/admin.result.schema';


export class AdminResultService {
    static async editResult(resultId: string, dto: EditResultDto) {
        const result = await prisma.result.findUnique({
            where: { id: resultId },
            include: { heat: { include: { event: { include: { competition: true } } } } },
        });

        if (!result) {
            throw new AppError('Result not found', 404, 'RESULT_NOT_FOUND');
        }

        const updateData: Record<string, unknown> = {};

        if (dto.status !== undefined) updateData.status = dto.status;
        if (dto.place !== undefined) updateData.place = dto.place;
        if (dto.lane !== undefined) updateData.lane = dto.lane;
        if (dto.bibNumber !== undefined) updateData.bibNumber = dto.bibNumber;
        if (dto.team !== undefined) updateData.team = dto.team;
        if (dto.reacTime !== undefined) updateData.reacTime = dto.reacTime;

        if (dto.mark !== undefined) {
            updateData.mark = dto.mark;
            updateData.sortValue = dto.mark !== null ? parseMarkToSortValue(dto.mark) : null;
        }

        await prisma.result.update({ where: { id: resultId }, data: updateData });

        await PbSbService.recalculateForHeat(result.heatId);

        const updatedHeat = await AdminHeatService.getHeat(result.heatId);

        syncEmitter.emit(EVENTS.RESULTS_UPDATED, {
            competitionId: result.heat.event.competition.id,
            heat: updatedHeat,
        });

        return prisma.result.findUniqueOrThrow({
            where: { id: resultId },
            include: { athlete: true },
        });
    }

    static async removeAthleteFromHeat(resultId: string): Promise<void> {
        const result = await prisma.result.findUnique({
            where: { id: resultId },
            include: { heat: { include: { event: { include: { competition: true } } } } },
        });

        if (!result) {
            throw new AppError('Result not found', 404, 'RESULT_NOT_FOUND');
        }

        const heatId = result.heatId;
        const competitionId = result.heat.event.competition.id;

        await prisma.result.delete({ where: { id: resultId } });

        await PbSbService.recalculateForHeat(heatId);

        const updatedHeat = await AdminHeatService.getHeat(heatId);

        syncEmitter.emit(EVENTS.RESULTS_UPDATED, { competitionId, heat: updatedHeat });
    }
}
