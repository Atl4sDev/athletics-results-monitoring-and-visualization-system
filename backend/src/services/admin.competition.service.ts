import { CompetitionStatus, CompetitionEnvironment } from '@prisma/client';
import { prisma } from '../config/prisma';
import { randomBytes } from 'node:crypto';
import { AppError } from '../errors/app.error';
import { syncEmitter, EVENTS } from '../events/sync.events';
import { deriveStatus } from '../utils/competition.util';
import { buildPrismaPage, buildPaginatedResult } from '../utils/pagination.util';
import {
    CreateCompetitionDto,
    UpdateCompetitionDto,
    ListCompetitionsQueryDto,
} from '../schemas/admin.competition.schema';


const competitionListSelect = {
    id: true,
    name: true,
    dateStart: true,
    dateEnd: true,
    location: true,
    status: true,
    environment: true,
    documents: true,
} as const;

export class CompetitionAdminService {
    static async list(dto: ListCompetitionsQueryDto) {
        const take = dto.take ?? 20;
        const where: Record<string, unknown> = {};

        if (dto.year !== undefined) {
            where.dateStart = {
                gte: new Date(`${dto.year}-01-01`),
                lt: new Date(`${dto.year + 1}-01-01`),
            };
        }

        if (dto.status !== undefined) {
            where.status = dto.status as CompetitionStatus;
        }

        const pageArgs = buildPrismaPage(dto.cursor, take);

        const items = await prisma.competition.findMany({
            where,
            ...pageArgs,
            orderBy: { dateStart: 'desc' },
            select: competitionListSelect,
        });

        const mapped = items.map((item) => {
            const derived = deriveStatus(item.dateStart, item.dateEnd);
            if (item.status !== derived) {
                prisma.competition
                    .update({ where: { id: item.id }, data: { status: derived } })
                    .catch(() => {});
            }
            return { ...item, status: derived };
        });

        return buildPaginatedResult(mapped, take);
    }

    static async getById(id: string) {
        const competition = await prisma.competition.findUnique({ where: { id } });

        if (!competition) {
            throw new AppError('Competition not found', 404, 'NOT_FOUND');
        }

        const derived = deriveStatus(competition.dateStart, competition.dateEnd);
        if (competition.status !== derived) {
            prisma.competition
                .update({ where: { id }, data: { status: derived } })
                .catch(() => {});
        }

        return { ...competition, status: derived };
    }

    static async create(dto: CreateCompetitionDto) {
        const syncToken = randomBytes(32).toString('hex');
        const status = deriveStatus(dto.dateStart, dto.dateEnd);

        return prisma.competition.create({
            data: {
                name: dto.name,
                dateStart: dto.dateStart,
                dateEnd: dto.dateEnd,
                location: dto.location,
                environment: dto.environment as CompetitionEnvironment,
                syncToken,
                status,
            },
        });
    }

    static async update(id: string, dto: UpdateCompetitionDto) {
        const existing = await prisma.competition.findUnique({ where: { id } });

        if (!existing) {
            throw new AppError('Competition not found', 404, 'NOT_FOUND');
        }

        const effectiveDateStart = dto.dateStart ?? existing.dateStart;
        const effectiveDateEnd = dto.dateEnd ?? existing.dateEnd;
        const status = deriveStatus(effectiveDateStart, effectiveDateEnd);

        const updated = await prisma.competition.update({
            where: { id },
            data: { ...dto, status },
            select: competitionListSelect,
        });

        syncEmitter.emit(EVENTS.SCHEDULE_UPDATED, { competitionId: id });

        return updated;
    }

    static async delete(id: string): Promise<void> {
        const competition = await prisma.competition.findUnique({ where: { id } });

        if (!competition) {
            throw new AppError('Competition not found', 404, 'NOT_FOUND');
        }

        const derived = deriveStatus(competition.dateStart, competition.dateEnd);
        if (derived === CompetitionStatus.ONGOING) {
            throw new AppError('Cannot delete an ongoing competition', 409, 'COMPETITION_ONGOING');
        }

        await prisma.$transaction(async (tx) => {
            await tx.result.deleteMany({ where: { heat: { event: { competitionId: id } } } });
            await tx.heat.deleteMany({ where: { event: { competitionId: id } } });
            await tx.event.deleteMany({ where: { competitionId: id } });
            await tx.competition.delete({ where: { id } });
        });
    }

    static async regenerateToken(id: string): Promise<{ syncToken: string }> {
        const competition = await prisma.competition.findUnique({ where: { id } });

        if (!competition) {
            throw new AppError('Competition not found', 404, 'NOT_FOUND');
        }

        const newToken = randomBytes(32).toString('hex');
        await prisma.competition.update({ where: { id }, data: { syncToken: newToken } });

        return { syncToken: newToken };
    }
}
