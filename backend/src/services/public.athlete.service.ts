import { prisma } from '../config/prisma';
import { AppError } from '../errors/app.error';
import { buildPrismaPage, buildPaginatedResult } from '../utils/pagination.util';
import { getSeasonBounds } from '../utils/season.util';
import { mapAthleteRow } from '../utils/public.mapper';
import {
    AthleteSearchQueryDto,
    AthleteResultsQueryDto,
    AthleteProgressionQueryDto,
} from '../schemas/public.athlete.schema';


export class PublicAthleteService {
    static async searchAthletes(query: AthleteSearchQueryDto) {
        const take = query.take ?? 20;
        const q = query.q.trim();

        if (!q) {
            return { data: [], nextCursor: null, hasMore: false };
        }

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

        const where: Record<string, unknown> = { OR: orClauses };
        if (query.gender) {
            where.gender = query.gender;
        }

        const pageArgs = buildPrismaPage(query.cursor, take);
        const items = await prisma.athlete.findMany({
            where,
            ...pageArgs,
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
        });

        const teamByAthleteId = new Map<string, string>();
        if (items.length > 0) {
            const lastTeamRows = await prisma.result.findMany({
                where: {
                    athleteId: { in: items.map(a => a.id) },
                    status: 'OK',
                    heat: { status: 'OFFICIAL' },
                },
                orderBy: [{ heat: { event: { scheduledTime: 'desc' } } }],
                select: { athleteId: true, team: true },
            });
            for (const r of lastTeamRows) {
                if (!teamByAthleteId.has(r.athleteId)) {
                    teamByAthleteId.set(r.athleteId, r.team);
                }
            }
        }

        const paginated = buildPaginatedResult(items, take);
        return {
            ...paginated,
            data: paginated.data.map(item =>
                mapAthleteRow(item, teamByAthleteId.get(item.id) ?? null),
            ),
        };
    }

    static async getAthleteProfile(license: string) {
        const athlete = await prisma.athlete.findUnique({
            where: { licenseNumber: license },
        });

        if (!athlete) {
            throw new AppError('Athlete not found', 404, 'ATHLETE_NOT_FOUND');
        }

        const lastTeamResult = await prisma.result.findFirst({
            where: {
                athleteId: athlete.id,
                status: 'OK',
                heat: { status: 'OFFICIAL' },
            },
            orderBy: [{ heat: { event: { scheduledTime: 'desc' } } }],
            select: { team: true },
        });
        const lastTeam = lastTeamResult?.team ?? null;

        const pbsbResults = await prisma.result.findMany({
            where: {
                athleteId: athlete.id,
                OR: [{ isPB: true }, { isSB: true }],
                status: 'OK',
                heat: {
                    status: 'OFFICIAL',
                    event: { disciplineId: { not: null } },
                },
            },
            include: {
                heat: {
                    include: {
                        event: {
                            include: {
                                discipline: { select: { name: true } },
                                competition: { select: { environment: true, dateStart: true } },
                            },
                        },
                    },
                },
            },
        });

        const groups = new Map<string, typeof pbsbResults>();
        for (const result of pbsbResults) {
            const disciplineId = result.heat.event.disciplineId;
            const environment = result.heat.event.competition.environment;
            const key = `${disciplineId}:${environment}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(result);
        }

        const currentSeasonBounds = getSeasonBounds(new Date());

        const records = [];
        for (const [key, groupResults] of groups) {
            const [disciplineIdStr, environment] = key.split(':');
            const disciplineId = parseInt(disciplineIdStr, 10);
            const sample = groupResults[0];
            const disciplineName = sample.heat.event.discipline?.name ?? sample.heat.event.customName;

            const pbResults = groupResults.filter(r => r.isPB);
            let personalBest: { mark: string | null; sortValue: number | null; date: Date | null } | null = null;
            if (pbResults.length > 0) {
                pbResults.sort((a, b) => (a.sortValue ?? Infinity) - (b.sortValue ?? Infinity));
                const pb = pbResults[0];
                personalBest = {
                    mark: pb.mark,
                    sortValue: pb.sortValue,
                    date: pb.heat.event.scheduledTime ?? pb.heat.event.competition.dateStart,
                };
            }

            const sbResults = groupResults.filter(r => {
                if (!r.isSB) return false;
                const resultDate = r.heat.event.scheduledTime ?? r.heat.event.competition.dateStart;
                return resultDate >= currentSeasonBounds.start && resultDate <= currentSeasonBounds.end;
            });
            let seasonBest: { mark: string | null; sortValue: number | null; date: Date | null } | null = null;
            if (sbResults.length > 0) {
                sbResults.sort((a, b) => (a.sortValue ?? Infinity) - (b.sortValue ?? Infinity));
                const sb = sbResults[0];
                seasonBest = {
                    mark: sb.mark,
                    sortValue: sb.sortValue,
                    date: sb.heat.event.scheduledTime ?? sb.heat.event.competition.dateStart,
                };
            }

            records.push({ disciplineId, disciplineName, environment, personalBest, seasonBest });
        }

        return { athlete: mapAthleteRow(athlete, lastTeam), records };
    }

    static async getAthleteResults(license: string, query: AthleteResultsQueryDto) {
        const take = query.take ?? 20;

        const athlete = await prisma.athlete.findUnique({
            where: { licenseNumber: license },
            select: { id: true },
        });
        if (!athlete) {
            throw new AppError('Athlete not found', 404, 'ATHLETE_NOT_FOUND');
        }

        const competitionFilter: Record<string, unknown> = {};
        if (query.environment) {
            competitionFilter.environment = query.environment;
        }
        if (query.year !== undefined) {
            competitionFilter.dateStart = {
                gte: new Date(Date.UTC(query.year, 0, 1)),
                lt: new Date(Date.UTC(query.year + 1, 0, 1)),
            };
        }

        const eventFilter: Record<string, unknown> = {};
        if (query.disciplineId !== undefined) {
            eventFilter.disciplineId = query.disciplineId;
        }
        if (Object.keys(competitionFilter).length > 0) {
            eventFilter.competition = competitionFilter;
        }

        const heatFilter: Record<string, unknown> = { status: 'OFFICIAL' };
        if (Object.keys(eventFilter).length > 0) {
            heatFilter.event = eventFilter;
        }

        const pageArgs = buildPrismaPage(query.cursor, take);
        const items = await prisma.result.findMany({
            where: {
                athleteId: athlete.id,
                status: 'OK',
                heat: heatFilter,
            },
            ...pageArgs,
            orderBy: [{ heat: { event: { scheduledTime: 'asc' } } }, { id: 'asc' }],
            include: {
                heat: {
                    include: {
                        event: {
                            include: {
                                discipline: { select: { name: true } },
                                competition: {
                                    select: { id: true, name: true, dateStart: true, environment: true },
                                },
                            },
                        },
                    },
                },
                athlete: true,
            },
        });

        const mapped = items.map(r => ({
            id: r.id,
            mark: r.mark,
            sortValue: r.sortValue,
            reacTime: r.reacTime,
            place: r.place,
            isPB: r.isPB,
            isSB: r.isSB,
            competition: {
                id: r.heat.event.competition.id,
                name: r.heat.event.competition.name,
                dateStart: r.heat.event.competition.dateStart,
                environment: r.heat.event.competition.environment,
            },
            disciplineName: r.heat.event.discipline?.name ?? r.heat.event.customName,
            gender: r.heat.event.gender,
            ageCategory: r.heat.event.ageCategory,
        }));

        return buildPaginatedResult(mapped, take);
    }

    static async getAthleteProgression(license: string, query: AthleteProgressionQueryDto) {
        const athlete = await prisma.athlete.findUnique({
            where: { licenseNumber: license },
            select: { id: true },
        });
        if (!athlete) {
            throw new AppError('Athlete not found', 404, 'ATHLETE_NOT_FOUND');
        }

        const competitionFilter: Record<string, unknown> = {};
        if (query.environment) {
            competitionFilter.environment = query.environment;
        }
        if (query.year !== undefined) {
            competitionFilter.dateStart = {
                gte: new Date(Date.UTC(query.year, 0, 1)),
                lt: new Date(Date.UTC(query.year + 1, 0, 1)),
            };
        }

        const eventFilter: Record<string, unknown> = {
            disciplineId: query.disciplineId,
        };
        if (Object.keys(competitionFilter).length > 0) {
            eventFilter.competition = competitionFilter;
        }

        const items = await prisma.result.findMany({
            where: {
                athleteId: athlete.id,
                status: 'OK',
                sortValue: { not: null },
                heat: {
                    status: 'OFFICIAL',
                    event: eventFilter,
                },
            },
            orderBy: [{ heat: { event: { scheduledTime: 'asc' } } }, { id: 'asc' }],
            include: {
                heat: {
                    include: {
                        event: {
                            include: {
                                competition: { select: { id: true, name: true, dateStart: true } },
                            },
                        },
                    },
                },
            },
        });

        return items.map(r => ({
            date: r.heat.event.scheduledTime ?? r.heat.event.competition.dateStart,
            sortValue: r.sortValue!,
            mark: r.mark ?? '',
            isPB: r.isPB,
            isSB: r.isSB,
            competitionId: r.heat.event.competition.id,
            competitionName: r.heat.event.competition.name,
        }));
    }
}
