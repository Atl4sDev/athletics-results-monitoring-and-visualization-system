import { z } from 'zod';
import { DisciplineType } from '@prisma/client';

export const DisciplineListQuerySchema = z.object({
    query: z.object({
        type: z.nativeEnum(DisciplineType).optional(),
        isStandard: z.preprocess(
            (v) => (v === 'true' ? true : v === 'false' ? false : v),
            z.boolean().optional()
        ),
        cursor: z.string().optional(),
        take: z.preprocess(Number, z.number().int().min(1).max(100)).optional(),
    }),
});

export type DisciplineListQuery = z.infer<typeof DisciplineListQuerySchema>['query'];

export const DisciplineCreateSchema = z.object({
    body: z.object({
        code: z.string().min(1).max(20),
        name: z.string().min(1).max(100),
        type: z.nativeEnum(DisciplineType),
        isStandard: z.boolean().optional().default(false),
    }),
});

export type DisciplineCreateBody = z.infer<typeof DisciplineCreateSchema>['body'];

export const DisciplineUpdateSchema = z.object({
    body: z
        .object({
            code: z.string().min(1).max(20).optional(),
            name: z.string().min(1).max(100).optional(),
            type: z.nativeEnum(DisciplineType).optional(),
            isStandard: z.boolean().optional(),
        })
        .refine((data) => Object.keys(data).length > 0, {
            message: 'At least one field must be provided',
        }),
});

export type DisciplineUpdateBody = z.infer<typeof DisciplineUpdateSchema>['body'];
