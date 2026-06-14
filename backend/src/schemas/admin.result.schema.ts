import { z } from 'zod';

export const EditResultSchema = z.object({
    body: z
        .object({
            mark: z.string().optional().nullable(),
            status: z.enum(['PENDING', 'OK', 'DNS', 'DNF', 'DQ', 'FS']).optional(),
            place: z.number().int().positive().optional().nullable(),
            lane: z.number().int().min(1).optional(),
            bibNumber: z.string().min(1).optional(),
            team: z.string().min(1).optional(),
            reacTime: z.number().optional().nullable(),
        })
        .refine(
            (data) => Object.keys(data).some((k) => data[k as keyof typeof data] !== undefined),
            { message: 'At least one field must be provided' }
        ),
});

export type EditResultDto = z.infer<typeof EditResultSchema>['body'];
