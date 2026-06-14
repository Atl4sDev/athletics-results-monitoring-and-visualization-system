import { HeatStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/app.error';
import { syncEmitter, EVENTS } from '../events/sync.events';
import { PbSbService } from './pbsb.service';
import { parseMarkToSortValue } from '../utils/time.util';
import { AddAthleteToHeatDto, HeatAdminListQueryDto } from '../schemas/admin.heat.schema';
import { buildPrismaPage, buildPaginatedResult } from '../utils/pagination.util';


export class AdminHeatService {
    static async listHeats(query: HeatAdminListQueryDto) {
        const status = query.status ?? HeatStatus.UNCONFIRMED;
        const take = query.take !== undefined ? Number(query.take) : 20;

        const where: Record<string, unknown> = { status };
        if (query.competitionId !== undefined) {
            where.event = { competitionId: query.competitionId };
        }

        const heats = await prisma.heat.findMany({
            where,
            include: {
                event: {
                    include: {
                        competition: { select: { id: true, name: true, dateStart: true } },
                        discipline: true,
                    },
                },
                _count: { select: { results: true } },
            },
            orderBy: [
                { event: { competition: { dateStart: 'asc' } } },
                { event: { scheduledTime: 'asc' } },
            ],
            ...buildPrismaPage(query.cursor, take),
        });

        const items = heats.map(h => ({
            id: h.id,
            status: h.status,
            lynxHeatId: h.lynxHeatId,
            resultCount: h._count.results,
            event: {
                id: h.event.id,
                scheduledTime: h.event.scheduledTime,
                roundName: h.event.roundName,
                gender: h.event.gender,
                ageCategory: h.event.ageCategory,
                discipline: h.event.discipline,
            },
            competition: {
                id: h.event.competition.id,
                name: h.event.competition.name,
                dateStart: h.event.competition.dateStart,
            },
        }));

        return buildPaginatedResult(items, take);
    }

    static async getHeat(heatId: string) {
        const heat = await prisma.heat.findUnique({
            where: { id: heatId },
            include: {
                event: {
                    include: {
                        competition: true,
                        discipline: true,
                    },
                },
                results: {
                    include: { athlete: true },
                    orderBy: { place: 'asc' },
                },
            },
        });

        if (!heat) {
            throw new AppError('Heat not found', 404, 'HEAT_NOT_FOUND');
        }

        return heat;
    }

    static async confirmHeat(heatId: string) {
        const heat = await prisma.heat.findUnique({
            where: { id: heatId },
            include: { event: { include: { competition: true } } },
        });

        if (!heat) {
            throw new AppError('Heat not found', 404, 'HEAT_NOT_FOUND');
        }

        if (heat.status !== HeatStatus.UNCONFIRMED) {
            throw new AppError('Heat is not in UNCONFIRMED status', 409, 'HEAT_NOT_UNCONFIRMED');
        }

        await prisma.heat.update({
            where: { id: heatId },
            data: { status: HeatStatus.OFFICIAL, confirmedAt: new Date() },
        });

        await PbSbService.recalculateForHeat(heatId);

        const updatedHeat = await AdminHeatService.getHeat(heatId);

        syncEmitter.emit(EVENTS.RESULTS_UPDATED, {
            competitionId: heat.event.competition.id,
            heat: updatedHeat,
        });

        return updatedHeat;
    }

    static async unconfirmHeat(heatId: string) {
        const heat = await prisma.heat.findUnique({
            where: { id: heatId },
            include: { event: { include: { competition: true } } },
        });

        if (!heat) {
            throw new AppError('Heat not found', 404, 'HEAT_NOT_FOUND');
        }

        if (heat.status !== HeatStatus.OFFICIAL) {
            throw new AppError('Heat is not in OFFICIAL status', 409, 'HEAT_NOT_OFFICIAL');
        }

        await prisma.heat.update({
            where: { id: heatId },
            data: { status: HeatStatus.UNCONFIRMED, confirmedAt: null },
        });

        await PbSbService.recalculateForHeat(heatId);

        const updatedHeat = await AdminHeatService.getHeat(heatId);

        syncEmitter.emit(EVENTS.RESULTS_UPDATED, {
            competitionId: heat.event.competition.id,
            heat: updatedHeat,
        });

        return updatedHeat;
    }

    static async addAthleteToHeat(heatId: string, dto: AddAthleteToHeatDto) {
        const heat = await prisma.heat.findUnique({
            where: { id: heatId },
            include: { event: { include: { competition: true } } },
        });

        if (!heat) {
            throw new AppError('Heat not found', 404, 'HEAT_NOT_FOUND');
        }

        const athlete = await prisma.athlete.findUnique({
            where: { licenseNumber: dto.licenseNumber },
        });

        if (!athlete) {
            throw new AppError('Athlete not found', 404, 'ATHLETE_NOT_FOUND');
        }

        const duplicate = await prisma.result.findFirst({
            where: { heatId, athleteId: athlete.id },
        });

        if (duplicate) {
            throw new AppError('Athlete already in heat', 409, 'ATHLETE_ALREADY_IN_HEAT');
        }

        const sortValue = dto.mark ? parseMarkToSortValue(dto.mark) : null;

        const createdResult = await prisma.result.create({
            data: {
                heatId,
                athleteId: athlete.id,
                lane: dto.lane,
                bibNumber: dto.bibNumber,
                team: dto.team,
                mark: dto.mark ?? null,
                sortValue,
                status: dto.status,
                place: dto.place ?? null,
                reacTime: dto.reacTime ?? null,
            },
        });

        await PbSbService.recalculateForHeat(heatId);

        const updatedHeat = await AdminHeatService.getHeat(heatId);

        syncEmitter.emit(EVENTS.RESULTS_UPDATED, {
            competitionId: heat.event.competition.id,
            heat: updatedHeat,
        });

        return prisma.result.findUniqueOrThrow({
            where: { id: createdResult.id },
            include: { athlete: true },
        });
    }
}
