import { Gender } from '@prisma/client';
import { prisma } from '../config/prisma';
import { SyncMeetDto } from '../schemas/sync.schema';


export class ResolutionService {
    /**
     * Entity resolution: identifies athletes by license number.
     * Uses upsert to guarantee idempotency across repeated sync calls.
     *
     * @param athletes Array of athletes from the incoming sync payload.
     * @returns Map of license number to internal athlete UUID.
     */
    static async resolveAthletes(athletes: SyncMeetDto['athletes']): Promise<Map<string, string>> {
        const resolutionMap = new Map<string, string>();

        const upsertPromises = athletes.map((athlete) => {
            // Convert DD.MM.YYYY (DTO format) to a Date the database expects.
            let birthDateObj: Date | null = null;
            if (athlete.birthDate) {
                const [day, month, year] = athlete.birthDate.split('.');
                birthDateObj = new Date(`${year}-${month}-${day}T00:00:00Z`);
            }

            return prisma.athlete.upsert({
                where: { licenseNumber: athlete.license },
                update: {
                    firstName: athlete.firstName,
                    lastName: athlete.lastName,
                    gender: athlete.gender as Gender,
                    birthDate: birthDateObj,
                },
                create: {
                    licenseNumber: athlete.license,
                    firstName: athlete.firstName,
                    lastName: athlete.lastName,
                    gender: athlete.gender as Gender,
                    birthDate: birthDateObj,
                },
            });
        });

        // Batch all upserts atomically — protects against partial writes on failure and reduces I/O.
        const resolvedAthletes = await prisma.$transaction(upsertPromises);

        resolvedAthletes.forEach((dbAthlete) => {
            resolutionMap.set(dbAthlete.licenseNumber, dbAthlete.id);
        });

        return resolutionMap;
    }
}