import { prisma } from '../config/prisma';
import { getSeasonBounds, getSeasonBoundsForYear } from '../utils/season.util';
import { encodeCursor, decodeCursor } from '../utils/pagination.util';
import { mapAthleteRow } from '../utils/public.mapper';
import { RankingQueryDto } from '../schemas/public.ranking.schema';


export class PublicRankingService {
    static async getRankings(query: RankingQueryDto) {
        const take = query.take ?? 20;

        // Step 1: season bounds
        let bounds;
        if (query.season !== undefined && query.environment !== undefined) {
            bounds = getSeasonBoundsForYear(query.season, query.environment);
        } else if (query.season !== undefined) {
            bounds = getSeasonBoundsForYear(query.season, 'OUTDOOR');
        } else {
            bounds = getSeasonBounds(new Date());
        }

        // Step 2: build where and fetch
        const eventFilter: Record<string, unknown> = {
            disciplineId: query.disciplineId,
        };
        if (query.gender) eventFilter.gender = query.gender;
        if (query.ageCategory) eventFilter.ageCategory = query.ageCategory;

        const competitionFilter: Record<string, unknown> = {
            dateStart: { gte: bounds.start, lte: bounds.end },
        };
        if (query.environment) competitionFilter.environment = query.environment;

        const results = await prisma.result.findMany({
            where: {
                status: 'OK',
                sortValue: { not: null },
                heat: {
                    status: 'OFFICIAL',
                    event: {
                        ...eventFilter,
                        competition: competitionFilter,
                    },
                },
            },
            include: {
                athlete: true,
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
            },
        });

        // Step 3: deduplicate by athleteId — keep best sortValue (earliest date breaks ties)
        const best = new Map<string, typeof results[0]>();
        for (const result of results) {
            const existing = best.get(result.athleteId);
            if (!existing) {
                best.set(result.athleteId, result);
            } else if (result.sortValue! < existing.sortValue!) {
                best.set(result.athleteId, result);
            } else if (result.sortValue! === existing.sortValue!) {
                const newDate = result.heat.event.competition.dateStart;
                const existingDate = existing.heat.event.competition.dateStart;
                if (newDate < existingDate) {
                    best.set(result.athleteId, result);
                }
            }
        }

        // Step 4: sort by sortValue ASC, then dateStart ASC for ties
        const sorted = [...best.values()].sort((a, b) => {
            const diff = a.sortValue! - b.sortValue!;
            if (diff !== 0) return diff;
            return (
                a.heat.event.competition.dateStart.getTime() -
                b.heat.event.competition.dateStart.getTime()
            );
        });

        // Step 5: assign display ranks (shared-rank-then-skip)
        type RankedEntry = { rank: number; result: typeof sorted[0] };
        const ranked: RankedEntry[] = [];
        let currentRank = 1;
        let lastSortValue: number | null = null;
        for (let i = 0; i < sorted.length; i++) {
            const sv = sorted[i].sortValue!;
            if (sv !== lastSortValue) {
                currentRank = i + 1;
                lastSortValue = sv;
            }
            ranked.push({ rank: currentRank, result: sorted[i] });
        }

        // Step 6: in-app cursor pagination
        let startIndex = 0;
        if (query.cursor) {
            const cursorId = decodeCursor(query.cursor);
            const idx = ranked.findIndex(e => e.result.id === cursorId);
            if (idx !== -1) startIndex = idx + 1;
        }

        const slice = ranked.slice(startIndex, startIndex + take);
        const hasMore = startIndex + take < ranked.length;
        const nextCursor = hasMore ? encodeCursor(slice[slice.length - 1].result.id) : null;

        const data = slice.map(e => ({
            rank: e.rank,
            result: {
                id: e.result.id,
                mark: e.result.mark,
                sortValue: e.result.sortValue,
                isPB: e.result.isPB,
                isSB: e.result.isSB,
                competition: {
                    id: e.result.heat.event.competition.id,
                    name: e.result.heat.event.competition.name,
                    dateStart: e.result.heat.event.competition.dateStart,
                    environment: e.result.heat.event.competition.environment,
                },
                disciplineName: e.result.heat.event.discipline?.name ?? e.result.heat.event.customName,
                gender: e.result.heat.event.gender,
                ageCategory: e.result.heat.event.ageCategory,
            },
            athlete: mapAthleteRow(e.result.athlete, e.result.team),
        }));

        return {
            data,
            nextCursor,
            hasMore,
            seasonBounds: { start: bounds.start, end: bounds.end },
        };
    }
}
