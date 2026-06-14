import { prisma } from '../config/prisma';
import { AppError } from '../errors/app.error';
import { buildPrismaPage, buildPaginatedResult } from '../utils/pagination.util';
import { PbSbService } from './pbsb.service';
import { syncEmitter, EVENTS } from '../events/sync.events';
import {
    AthleteAdminListQueryDto,
    CreateAthleteDto,
    UpdateAthleteDto,
    MergeAthleteDto,
} from '../schemas/admin.athlete.schema';


export class AdminAthleteService {
    static async listAthletes(query: AthleteAdminListQueryDto) {
        const take = query.take !== undefined ? Number(query.take) : 20;
        const where: Record<string, unknown> = {};

        if (query.q) {
            const q = query.q.trim();
            if (q) {
                const tokens = q.split(/\s+/);
                const orClauses: Record<string, unknown>[] = [
                    { firstName: { contains: tokens[0], mode: 'insensitive' } },
                    { lastName: { contains: tokens[0], mode: 'insensitive' } },
                ];
                if (tokens.length >= 2) {
                    orClauses.push({
                        AND: [
                            { firstName: { contains: tokens[0], mode: 'insensitive' } },
                            { lastName: { contains: tokens[1], mode: 'insensitive' } },
                        ],
                    });
                }
                where.OR = orClauses;
            }
        }

        if (query.gender !== undefined) {
            where.gender = query.gender;
        }

        const pageArgs = buildPrismaPage(query.cursor, take);
        const items = await prisma.athlete.findMany({
            where,
            ...pageArgs,
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
        });

        return buildPaginatedResult(items, take);
    }

    static async getAthleteById(id: string) {
        const athlete = await prisma.athlete.findUnique({
            where: { id },
            include: { _count: { select: { results: true } } },
        });

        if (!athlete) {
            throw new AppError('Athlete not found', 404, 'ATHLETE_NOT_FOUND');
        }

        const { _count, ...rest } = athlete;
        return { ...rest, resultCount: _count.results };
    }

    static async createAthlete(dto: CreateAthleteDto) {
        const birthDate = dto.birthDate
            ? new Date(dto.birthDate + 'T00:00:00Z')
            : null;

        return prisma.athlete.create({
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                gender: dto.gender,
                birthDate,
                licenseNumber: dto.licenseNumber,
            },
        });
    }

    /**
     * Updates mutable athlete fields. When gender changes, triggers a full PB/SB
     * recalculation for every heat the athlete has results in and emits RESULTS_UPDATED
     * so connected clients receive refreshed flags without polling.
     */
    static async updateAthlete(id: string, dto: UpdateAthleteDto) {
        const existing = await prisma.athlete.findUnique({ where: { id } });
        if (!existing) {
            throw new AppError('Athlete not found', 404, 'ATHLETE_NOT_FOUND');
        }

        const data: Record<string, unknown> = {};
        if (dto.firstName !== undefined) data.firstName = dto.firstName;
        if (dto.lastName !== undefined) data.lastName = dto.lastName;
        if (dto.gender !== undefined) data.gender = dto.gender;
        if (dto.birthDate !== undefined) {
            data.birthDate = dto.birthDate === null ? null : new Date(dto.birthDate + 'T00:00:00Z');
        }

        const updated = await prisma.athlete.update({ where: { id }, data });

        if (dto.gender !== undefined && dto.gender !== existing.gender) {
            const rawHeats = await prisma.result.findMany({
                where: { athleteId: id },
                select: {
                    heatId: true,
                    heat: { select: { event: { select: { competitionId: true } } } },
                },
            });

            const seen = new Set<string>();
            const affectedHeats = rawHeats.filter(h => {
                if (seen.has(h.heatId)) return false;
                seen.add(h.heatId);
                return true;
            });

            await Promise.all(affectedHeats.map(h => PbSbService.recalculateForHeat(h.heatId)));
            affectedHeats.forEach(h =>
                syncEmitter.emit(EVENTS.RESULTS_UPDATED, {
                    competitionId: h.heat.event.competitionId,
                    heatId: h.heatId,
                })
            );
        }

        return updated;
    }

    static async deleteAthlete(id: string) {
        const athlete = await prisma.athlete.findUnique({
            where: { id },
            select: { id: true, _count: { select: { results: true } } },
        });

        if (!athlete) {
            throw new AppError('Athlete not found', 404, 'ATHLETE_NOT_FOUND');
        }

        if (athlete._count.results > 0) {
            throw new AppError(
                'Athlete has existing results and cannot be deleted',
                409,
                'ATHLETE_HAS_RESULTS'
            );
        }

        await prisma.athlete.delete({ where: { id } });
        return { success: true };
    }

    /**
     * Re-assigns all results from sourceId to targetId, then deletes the source athlete.
     * Aborts with MERGE_CONFLICT if both athletes share a heat (would create duplicate rows).
     * After the transaction, recalculates PB/SB for all affected heats and broadcasts updates.
     */
    static async mergeAthletes(targetId: string, dto: MergeAthleteDto) {
        const { sourceId } = dto;

        if (targetId === sourceId) {
            throw new AppError('Cannot merge an athlete into itself', 400, 'INVALID_MERGE_SELF');
        }

        const [target, source] = await Promise.all([
            prisma.athlete.findUnique({ where: { id: targetId } }),
            prisma.athlete.findUnique({ where: { id: sourceId } }),
        ]);

        if (!target) {
            throw new AppError('Athlete not found', 404, 'ATHLETE_NOT_FOUND');
        }
        if (!source) {
            throw new AppError('Athlete not found', 404, 'ATHLETE_NOT_FOUND');
        }

        const sourceResults = await prisma.result.findMany({
            where: { athleteId: sourceId },
            select: {
                heatId: true,
                heat: { select: { event: { select: { competitionId: true } } } },
            },
        });

        const targetHeatRows = await prisma.result.findMany({
            where: { athleteId: targetId },
            select: { heatId: true },
        });
        const targetHeatIds = new Set(targetHeatRows.map(r => r.heatId));

        const overlap = sourceResults.filter(r => targetHeatIds.has(r.heatId));
        if (overlap.length > 0) {
            throw new AppError(
                'Athletes share results in the same heat; resolve conflicts first',
                409,
                'MERGE_CONFLICT'
            );
        }

        await prisma.$transaction([
            prisma.result.updateMany({
                where: { athleteId: sourceId },
                data: { athleteId: targetId },
            }),
            prisma.athlete.delete({ where: { id: sourceId } }),
        ]);

        const seen = new Set<string>();
        const affectedHeats = sourceResults.filter(h => {
            if (seen.has(h.heatId)) return false;
            seen.add(h.heatId);
            return true;
        });

        await Promise.all(affectedHeats.map(h => PbSbService.recalculateForHeat(h.heatId)));
        affectedHeats.forEach(h =>
            syncEmitter.emit(EVENTS.RESULTS_UPDATED, {
                competitionId: h.heat.event.competitionId,
                heatId: h.heatId,
            })
        );

        return { targetId, mergedResultCount: sourceResults.length };
    }
}
