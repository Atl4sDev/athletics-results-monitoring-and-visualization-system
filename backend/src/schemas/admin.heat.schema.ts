import { z } from 'zod';
import { HeatStatus } from '@prisma/client';

export const AddAthleteToHeatSchema = z.object({
    body: z.object({
        licenseNumber: z.string().min(1),
        lane: z.number().int().min(1),
        bibNumber: z.string().min(1),
        team: z.string().min(1),
        mark: z.string().optional(),
        status: z.enum(['PENDING', 'OK', 'DNS', 'DNF', 'DQ', 'FS']).default('OK'),
        place: z.number().int().positive().optional().nullable(),
        reacTime: z.number().optional().nullable(),
    }),
});

export type AddAthleteToHeatDto = z.infer<typeof AddAthleteToHeatSchema>['body'];

export const HeatAdminListQuerySchema = z.object({
    query: z.object({
        status: z.nativeEnum(HeatStatus).optional(),
        competitionId: z.string().uuid().optional(),
        cursor: z.string().optional(),
        take: z.coerce.number().int().min(1).max(100).optional(),
    }),
});

export type HeatAdminListQueryDto = z.infer<typeof HeatAdminListQuerySchema>['query'];
