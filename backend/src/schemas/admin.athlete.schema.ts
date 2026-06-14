import { z } from 'zod';
import { Gender } from '@prisma/client';

export const CreateAthleteSchema = z.object({
    body: z.object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        gender: z.nativeEnum(Gender),
        birthDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .nullable(),
        licenseNumber: z.string().min(1).max(50),
    }),
});

export type CreateAthleteDto = z.infer<typeof CreateAthleteSchema>['body'];

export const UpdateAthleteSchema = z.object({
    body: z.object({
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        gender: z.nativeEnum(Gender).optional(),
        birthDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .nullable(),
    }),
});

export type UpdateAthleteDto = z.infer<typeof UpdateAthleteSchema>['body'];

export const AthleteAdminListQuerySchema = z.object({
    query: z.object({
        q: z.string().optional(),
        gender: z.nativeEnum(Gender).optional(),
        cursor: z.string().optional(),
        take: z.coerce.number().int().min(1).max(100).optional(),
    }),
});

export type AthleteAdminListQueryDto = z.infer<typeof AthleteAdminListQuerySchema>['query'];

export const MergeAthleteSchema = z.object({
    body: z.object({
        sourceId: z.string().uuid(),
    }),
});

export type MergeAthleteDto = z.infer<typeof MergeAthleteSchema>['body'];
