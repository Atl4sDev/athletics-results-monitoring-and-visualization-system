import { z } from 'zod';

export const RankingQuerySchema = z.object({
    query: z.object({
        disciplineId: z.coerce.number().int().positive(),
        gender: z.enum(['MALE', 'FEMALE', 'MIXED']).optional(),
        ageCategory: z.string().trim().optional(),
        environment: z.enum(['INDOOR', 'OUTDOOR']).optional(),
        season: z.coerce.number().int().min(2000).max(2100).optional(),
        cursor: z.string().optional(),
        take: z.coerce.number().int().min(1).max(100).default(20).optional(),
    }),
});

export type RankingQueryDto = z.infer<typeof RankingQuerySchema>['query'];
