import { prisma } from '../config/prisma';
import { getSeasonBounds } from '../utils/season.util';


export class PbSbService {
    /**
     * Evaluates PB/SB flags for all OK results in the given heat.
     * Compares each result's sortValue against the athlete's all-time minimum (PB)
     * and the season minimum (SB) across OFFICIAL heats for the same discipline and environment.
     * Ties (sortValue <=) count as a PB/SB.
     * Called by ResultService immediately after a sync transaction commits.
     */
    static async evaluateForHeat(heatId: string): Promise<void> {
        const heat = await prisma.heat.findUnique({
            where: { id: heatId },
            include: {
                results: { where: { status: 'OK' } },
                event: {
                    include: {
                        discipline: { select: { id: true } },
                        competition: { select: { environment: true, dateStart: true } },
                    },
                },
            },
        });

        if (!heat || heat.results.length === 0) return;

        const disciplineId = heat.event.disciplineId;
        const environment = heat.event.competition.environment;
        const seasonBounds = getSeasonBounds(new Date(heat.event.competition.dateStart));

        const baselineWhere = {
            status: 'OK' as const,
            sortValue: { not: null },
            heat: {
                status: 'OFFICIAL' as const,
                event: {
                    disciplineId,
                    competition: { environment },
                },
            },
        };

        const updateOps = [];

        for (const result of heat.results) {
            if (result.sortValue === null) {
                updateOps.push(
                    prisma.result.update({ where: { id: result.id }, data: { isPB: false, isSB: false } })
                );
                continue;
            }

            const [pbAgg, sbAgg] = await Promise.all([
                prisma.result.aggregate({
                    _min: { sortValue: true },
                    where: { athleteId: result.athleteId, ...baselineWhere },
                }),
                prisma.result.aggregate({
                    _min: { sortValue: true },
                    where: {
                        athleteId: result.athleteId,
                        ...baselineWhere,
                        heat: {
                            status: 'OFFICIAL' as const,
                            event: {
                                disciplineId,
                                competition: {
                                    environment,
                                    dateStart: { gte: seasonBounds.start, lte: seasonBounds.end },
                                },
                            },
                        },
                    },
                }),
            ]);

            const pbMin = pbAgg._min.sortValue;
            const sbMin = sbAgg._min.sortValue;

            updateOps.push(
                prisma.result.update({
                    where: { id: result.id },
                    data: {
                        isPB: result.sortValue <= (pbMin ?? Infinity),
                        isSB: result.sortValue <= (sbMin ?? Infinity),
                    },
                })
            );
        }

        if (updateOps.length > 0) {
            await prisma.$transaction(updateOps);
        }
    }

    /**
     * Full PB/SB recalculation for all athletes who have OK results in the given heat.
     * Unlike evaluateForHeat, this re-derives the thresholds from the complete OFFICIAL history,
     * ensuring correctness after a heat status change (UNCONFIRMED → OFFICIAL) or a result edit.
     * Called by admin.heat.service after confirming a heat.
     */
    static async recalculateForHeat(heatId: string): Promise<void> {
        const heat = await prisma.heat.findUnique({
            where: { id: heatId },
            include: {
                results: {
                    where: { status: 'OK', sortValue: { not: null } },
                    select: { athleteId: true },
                },
                event: {
                    include: {
                        discipline: { select: { id: true } },
                        competition: { select: { environment: true, dateStart: true } },
                    },
                },
            },
        });

        if (!heat || heat.results.length === 0) return;

        const disciplineId = heat.event.disciplineId;
        const environment = heat.event.competition.environment;
        const seasonBounds = getSeasonBounds(new Date(heat.event.competition.dateStart));
        const athleteIds = [...new Set(heat.results.map((r) => r.athleteId))];

        const allOps = [];

        for (const athleteId of athleteIds) {
            const results = await prisma.result.findMany({
                where: {
                    athleteId,
                    status: 'OK',
                    sortValue: { not: null },
                    heat: {
                        status: 'OFFICIAL',
                        event: {
                            disciplineId,
                            competition: { environment },
                        },
                    },
                },
                select: {
                    id: true,
                    sortValue: true,
                    heat: {
                        select: {
                            event: {
                                select: {
                                    competition: { select: { dateStart: true } },
                                },
                            },
                        },
                    },
                },
            });

            if (results.length === 0) continue;

            const pbThreshold = Math.min(...results.map((r) => r.sortValue!));

            const sbResults = results.filter((r) => {
                const compDate = new Date(r.heat.event.competition.dateStart);
                return compDate >= seasonBounds.start && compDate <= seasonBounds.end;
            });

            const sbThreshold = sbResults.length > 0
                ? Math.min(...sbResults.map((r) => r.sortValue!))
                : null;

            const sbResultIds = new Set(sbResults.map((r) => r.id));

            for (const result of results) {
                const inSeason = sbResultIds.has(result.id);
                allOps.push(
                    prisma.result.update({
                        where: { id: result.id },
                        data: {
                            isPB: result.sortValue! <= pbThreshold,
                            isSB: sbThreshold !== null && inSeason && result.sortValue! <= sbThreshold,
                        },
                    })
                );
            }
        }

        if (allOps.length > 0) {
            await prisma.$transaction(allOps);
        }
    }
}
