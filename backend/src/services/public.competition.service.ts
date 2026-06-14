import { prisma } from '../config/prisma';
import { AppError } from '../errors/app.error';
import { buildPrismaPage, buildPaginatedResult } from '../utils/pagination.util';
import { deriveStatus } from '../utils/competition.util';
import { mapCompetitionCard, mapEventRow } from '../utils/public.mapper';
import { CalendarQueryDto } from '../schemas/public.competition.schema';


export class PublicCompetitionService {
    static async getCalendar(query: CalendarQueryDto) {
        const take = query.take ?? 20;
        const now = new Date();
        const where: Record<string, unknown> = {};

        if (query.status === 'UPCOMING') {
            where.dateStart = { gt: now };
        } else if (query.status === 'ONGOING') {
            where.dateStart = { lte: now };
            where.dateEnd = { gte: now };
        } else if (query.status === 'COMPLETED') {
            where.dateEnd = { lt: now };
        }

        if (query.year !== undefined) {
            where.dateStart = {
                ...((where.dateStart as Record<string, unknown>) ?? {}),
                gte: new Date(Date.UTC(query.year, 0, 1)),
                lt: new Date(Date.UTC(query.year + 1, 0, 1)),
            };
        }

        if (query.environment !== undefined) {
            where.environment = query.environment;
        }

        const pageArgs = buildPrismaPage(query.cursor, take);
        const items = await prisma.competition.findMany({
            where,
            ...pageArgs,
            orderBy: [{ dateStart: 'asc' }, { id: 'asc' }],
            select: {
                id: true,
                name: true,
                dateStart: true,
                dateEnd: true,
                location: true,
                environment: true,
            },
        });

        return buildPaginatedResult(items.map(mapCompetitionCard), take);
    }

    static async getAvailableYears(): Promise<number[]> {
        const rows = await prisma.competition.findMany({ select: { dateStart: true } });
        const years = [...new Set(rows.map(r => r.dateStart.getFullYear()))];
        return years.sort((a, b) => b - a);
    }

    static async getCompetitionDetail(id: string) {
        const competition = await prisma.competition.findUnique({
            where: { id },
            include: {
                events: {
                    orderBy: [{ scheduledTime: 'asc' }, { id: 'asc' }],
                    include: {
                        discipline: { select: { name: true } },
                        heats: {
                            orderBy: { lynxHeatId: 'asc' },
                            include: {
                                results: {
                                    include: { athlete: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!competition) {
            throw new AppError('Competition not found', 404, 'COMPETITION_NOT_FOUND');
        }

        const schedule: Record<string, ReturnType<typeof mapEventRow>[]> = {};
        for (const event of competition.events) {
            const key = event.scheduledTime?.toISOString().slice(0, 10) ?? 'unscheduled';
            if (!schedule[key]) schedule[key] = [];
            schedule[key].push(mapEventRow(event));
        }

        return {
            id: competition.id,
            name: competition.name,
            dateStart: competition.dateStart,
            dateEnd: competition.dateEnd,
            location: competition.location,
            environment: competition.environment,
            status: deriveStatus(competition.dateStart, competition.dateEnd),
            schedule,
        };
    }
}
