import { z } from 'zod';

export const CalendarQuerySchema = z.object({
    query: z.object({
        status: z.enum(['UPCOMING', 'ONGOING', 'COMPLETED']).optional(),
        year: z.coerce.number().int().min(2000).max(2100).optional(),
        environment: z.enum(['INDOOR', 'OUTDOOR']).optional(),
        cursor: z.string().optional(),
        take: z.coerce.number().int().min(1).max(100).default(20).optional(),
    }),
});

export type CalendarQueryDto = z.infer<typeof CalendarQuerySchema>['query'];
