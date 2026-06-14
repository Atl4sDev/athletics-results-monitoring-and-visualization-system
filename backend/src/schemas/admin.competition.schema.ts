import { z } from 'zod';

export const CreateCompetitionSchema = z.object({
    body: z
        .object({
            name: z.string().min(1).max(200),
            dateStart: z.coerce.date(),
            dateEnd: z.coerce.date(),
            location: z.string().min(1).max(200),
            environment: z.enum(['INDOOR', 'OUTDOOR']),
        })
        .refine((d) => d.dateEnd >= d.dateStart, {
            message: 'dateEnd must be on or after dateStart',
            path: ['dateEnd'],
        }),
});

export type CreateCompetitionDto = z.infer<typeof CreateCompetitionSchema>['body'];

export const UpdateCompetitionSchema = z.object({
    body: z
        .object({
            name: z.string().min(1).max(200).optional(),
            dateStart: z.coerce.date().optional(),
            dateEnd: z.coerce.date().optional(),
            location: z.string().min(1).max(200).optional(),
            environment: z.enum(['INDOOR', 'OUTDOOR']).optional(),
        })
        .refine((d) => (d.dateStart && d.dateEnd ? d.dateEnd >= d.dateStart : true), {
            message: 'dateEnd must be on or after dateStart',
            path: ['dateEnd'],
        }),
});

export type UpdateCompetitionDto = z.infer<typeof UpdateCompetitionSchema>['body'];

export const ListCompetitionsQuerySchema = z.object({
    query: z.object({
        year: z.coerce.number().int().min(2000).max(2100).optional(),
        status: z.enum(['UPCOMING', 'ONGOING', 'COMPLETED']).optional(),
        cursor: z.string().optional(),
        take: z.coerce.number().int().min(1).max(100).default(20).optional(),
    }),
});

export type ListCompetitionsQueryDto = z.infer<typeof ListCompetitionsQuerySchema>['query'];
