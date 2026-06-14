import { z } from 'zod';

export const AthleteSearchQuerySchema = z.object({
    query: z.object({
        q: z.string().trim().default(''),
        gender: z.enum(['MALE', 'FEMALE', 'MIXED']).optional(),
        cursor: z.string().optional(),
        take: z.coerce.number().int().min(1).max(100).default(20).optional(),
    }),
});

export type AthleteSearchQueryDto = z.infer<typeof AthleteSearchQuerySchema>['query'];

export const AthleteResultsQuerySchema = z.object({
    query: z.object({
        disciplineId: z.coerce.number().int().positive().optional(),
        environment: z.enum(['INDOOR', 'OUTDOOR']).optional(),
        year: z.coerce.number().int().min(2000).max(2100).optional(),
        cursor: z.string().optional(),
        take: z.coerce.number().int().min(1).max(100).default(20).optional(),
    }),
});

export type AthleteResultsQueryDto = z.infer<typeof AthleteResultsQuerySchema>['query'];

export const AthleteProgressionQuerySchema = z.object({
    query: z.object({
        disciplineId: z.coerce.number().int().positive(),
        environment: z.enum(['INDOOR', 'OUTDOOR']).optional(),
        year: z.coerce.number().int().min(2000).max(2100).optional(),
    }),
});

export type AthleteProgressionQueryDto = z.infer<typeof AthleteProgressionQuerySchema>['query'];
