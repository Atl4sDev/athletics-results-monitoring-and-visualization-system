import { HeatStatus, ResultStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { SyncResultsDto } from '../schemas/sync.schema';
import { parseMarkToSortValue } from '../utils/time.util';
import { syncEmitter, EVENTS } from '../events/sync.events';
import { PbSbService } from './pbsb.service';


export class ResultService {
    /**
     * Processes a batch of results from a .lif file.
     * Uses transactions for data integrity and optimised queries to avoid N+1 issues.
     */
    static async processResults(
        competitionId: string,
        dto: SyncResultsDto
    ) {
        const event = await prisma.event.findFirst({
            where: {
                competitionId,
                lynxEventId: parseInt(dto.localEventId),
                lynxRoundId: parseInt(dto.localRoundId),
            },
        });

        if (!event) {
            throw new Error(`Event (lynxEventId: ${dto.localEventId}, lynxRoundId: ${dto.localRoundId}) not found.`);
        }

        const heat = await prisma.heat.findFirst({
            where: {
                eventId: event.id,
                lynxHeatId: dto.heatNumber,
            },
        });

        if (!heat) {
            throw new Error(`Heat (heatNumber: ${dto.heatNumber}) not found in event ${event.id}.`);
        }

        // Fetch all placeholder results for this heat in a single query to avoid N+1.
        const existingResults = await prisma.result.findMany({
            where: { heatId: heat.id },
            include: { athlete: true },
        });

        const existingResultsMap = new Map(
            existingResults.map((r) => [r.athlete.licenseNumber, r])
        );

        // Late-entry fallback: athletes who appear in the result file but had no start-list entry.
        const missingLicenses = dto.results
            .filter((r) => !existingResultsMap.has(r.license))
            .map((r) => r.license);

        let fallbackAthletesMap = new Map();
        if (missingLicenses.length > 0) {
            const fallbackAthletes = await prisma.athlete.findMany({
                where: { licenseNumber: { in: missingLicenses } },
            });
            fallbackAthletesMap = new Map(fallbackAthletes.map((a) => [a.licenseNumber, a]));
        }

        const transactionOperations: any[] = [];

        for (const resultDto of dto.results) {
            const sortValue = parseMarkToSortValue(resultDto.mark);
            const existingResult = existingResultsMap.get(resultDto.license);

            const resultData = {
                place: resultDto.place ?? null,
                status: resultDto.status as ResultStatus,
                mark: resultDto.mark ?? null,
                reacTime: resultDto.reacTime ?? null,
                sortValue: sortValue,
            };

            if (existingResult) {
                transactionOperations.push(
                    prisma.result.update({
                        where: { id: existingResult.id },
                        data: resultData,
                    })
                );
            } else {
                // Late entry: athlete exists in the database but was not on the start list for this heat.
                const fallbackAthlete = fallbackAthletesMap.get(resultDto.license);
                if (fallbackAthlete) {
                    transactionOperations.push(
                        prisma.result.create({
                            data: {
                                heatId: heat.id,
                                athleteId: fallbackAthlete.id,
                                lane: 0,
                                bibNumber: 'N/A',
                                team: 'Late Entry',
                                ...resultData,
                            },
                        })
                    );
                } else {
                    // Athlete is completely unknown — skip silently to avoid FK constraint violations.
                    console.warn(`[ResultService] Skipping result: license ${resultDto.license} not found in database.`);
                }
            }
        }

        transactionOperations.push(
            prisma.heat.update({
                where: { id: heat.id },
                data: {
                    wind: dto.wind ?? null,
                    status: HeatStatus.UNCONFIRMED,
                },
            })
        );

        await prisma.$transaction(transactionOperations);

        // 8. Evaluate PB/SB before broadcasting so the live payload carries fresh flags.
        await PbSbService.evaluateForHeat(heat.id);

        // 9. Fetch after evaluation so isPB/isSB reflect the just-written values.
        const updatedHeat = await prisma.heat.findUnique({
            where: { id: heat.id },
            include: {
                event: {
                    select: {
                        competitionId: true,
                        customName: true,
                        roundName: true,
                        discipline: { select: { name: true } }
                    }
                },
                results: {
                    include: {
                        athlete: { select: { firstName: true, lastName: true, licenseNumber: true, gender: true, birthDate: true } }
                    },
                    orderBy: [
                        { place: 'asc' },
                        { sortValue: 'asc' }
                    ]
                }
            }
        });

        if (updatedHeat) {
            console.info(`[ResultService] Heat ${heat.id} saved and evaluated. Broadcasting...`);
            syncEmitter.emit(EVENTS.RESULTS_UPDATED, {
                competitionId: updatedHeat.event.competitionId,
                heat: updatedHeat
            });
        }

        return updatedHeat;
    }
}