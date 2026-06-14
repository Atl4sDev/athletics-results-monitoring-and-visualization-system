import { DisciplineType, Gender, AgeCategory, HeatStatus, ResultStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { SyncMeetDto } from '../schemas/sync.schema';
import { syncEmitter, EVENTS } from '../events/sync.events';


export class MeetService {
    /**
     * Processes the competition schedule and creates PENDING start-list entries for each heat.
     * Guarantees idempotency by checking for existing records before inserting.
     */
    static async syncSchedule(
        competitionId: string,
        schedule: SyncMeetDto['schedule'],
        athleteMap: Map<string, string>
    ): Promise<{ eventsProcessed: number; heatsProcessed: number }> {
        let eventsProcessed = 0;
        let heatsProcessed = 0;

        // Load all disciplines once for O(1) lookup during event iteration.
        const disciplines = await prisma.discipline.findMany();
        const disciplineMap = new Map(disciplines.map((d) => [d.code, d.id]));
        const disciplineTypeMap = new Map(disciplines.map((d) => [d.code, d.type]));

        for (const eventDto of schedule) {
            const disciplineId = disciplineMap.get(eventDto.disciplineCode) || null;
            // Store the LynxPad name verbatim when the discipline code is not in the reference table.
            const customName = disciplineId ? null : eventDto.eventName;
            const eventType = disciplineTypeMap.get(eventDto.disciplineCode) || DisciplineType.TRACK;

            let scheduledTime: Date | null = null;

            try {
                const [day, month, year] = eventDto.date.split('.');
                const [hours, minutes, seconds] = eventDto.time.split(':');

                // Ensure padding (e.g. 5 -> 05) to meet ISO format requirements
                const paddedDay = day.padStart(2, '0');
                const paddedMonth = month.padStart(2, '0');
                const paddedHours = hours ? hours.padStart(2, '0') : '00';
                const paddedMinutes = minutes ? minutes.padStart(2, '0') : '00';
                const paddedSeconds = seconds ? seconds.padStart(2, '0') : '00';

                // Construct valid ISO string: YYYY-MM-DDTHH:mm:ss.000Z
                const isoString = `${year}-${paddedMonth}-${paddedDay}T${paddedHours}:${paddedMinutes}:${paddedSeconds}.000Z`;
                const parsedDate = new Date(isoString);

                // Verify it didn't evaluate to Invalid Date
                if (!isNaN(parsedDate.getTime())) {
                    scheduledTime = parsedDate;
                } else {
                    console.warn(`[MeetService] Invalid constructed date: ${isoString}`);
                }
            } catch (e) {
                console.warn(`[MeetService] Failed to parse date/time: ${eventDto.date} ${eventDto.time}`);
            }

            let event = await prisma.event.findFirst({
                where: {
                    competitionId,
                    lynxEventId: parseInt(eventDto.localEventId),
                    lynxRoundId: parseInt(eventDto.localRoundId),
                },
            });

            const eventData = {
                competitionId,
                disciplineId,
                customName,
                scheduledTime,
                roundName: eventDto.roundName,
                gender: eventDto.gender as Gender,
                ageCategory: eventDto.ageCategory as AgeCategory,
                eventType: eventType,
            };

            if (event) {
                event = await prisma.event.update({ where: { id: event.id }, data: eventData });
            } else {
                event = await prisma.event.create({
                    data: {
                        ...eventData,
                        lynxEventId: parseInt(eventDto.localEventId),
                        lynxRoundId: parseInt(eventDto.localRoundId),
                    },
                });
            }
            eventsProcessed++;

            for (const heatDto of eventDto.heats) {
                let heat = await prisma.heat.findFirst({
                    where: {
                        eventId: event.id,
                        lynxHeatId: heatDto.heatNumber,
                    },
                });

                if (!heat) {
                    heat = await prisma.heat.create({
                        data: {
                            eventId: event.id,
                            status: HeatStatus.SCHEDULED,
                            lynxHeatId: heatDto.heatNumber,
                        },
                    });
                }
                heatsProcessed++;

                // Create PENDING placeholder results that will be filled in when result data arrives.
                for (const entryDto of heatDto.entries) {
                    const athleteId = athleteMap.get(entryDto.license);
                    if (!athleteId) continue;

                    const existingResult = await prisma.result.findFirst({
                        where: { heatId: heat.id, athleteId: athleteId },
                    });

                    if (existingResult) {
                        // Update lane/bib only — never touch status on a heat that has already run.
                        await prisma.result.update({
                            where: { id: existingResult.id },
                            data: {
                                lane: entryDto.lane,
                                bibNumber: entryDto.bibNumber,
                                team: entryDto.team,
                            },
                        });
                    } else {
                        await prisma.result.create({
                            data: {
                                heatId: heat.id,
                                athleteId: athleteId,
                                lane: entryDto.lane,
                                bibNumber: entryDto.bibNumber,
                                team: entryDto.team,
                                status: ResultStatus.PENDING,
                            },
                        });
                    }
                }
            }
        }
        console.info(`[MeetService] Schedule updated for competition ${competitionId}.`);

        syncEmitter.emit(EVENTS.SCHEDULE_UPDATED, { competitionId });

        return { eventsProcessed, heatsProcessed };
    }
}