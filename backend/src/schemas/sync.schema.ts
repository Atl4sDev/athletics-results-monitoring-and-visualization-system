import { z } from 'zod';

// --- Nested object schemas ---

const AthleteSchema = z.object({
    license: z.string().min(1, 'License is required'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    gender: z.enum(['MALE', 'FEMALE', 'MIXED'], {
        message: 'Gender must be MALE, FEMALE, or MIXED',
    }),
    birthDate: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/, 'Date must be in DD.MM.YYYY format').optional().nullable(),
});

const HeatEntrySchema = z.object({
    license: z.string().min(1, 'License is required'),
    lane: z.number().int().positive('Lane must be a positive integer'),
    bibNumber: z.string().min(1, 'Bib number is required'),
    team: z.string().min(1, 'Team name is required'),
});

const HeatSchema = z.object({
    heatNumber: z.number().int().positive('Heat number must be a positive integer'),
    entries: z.array(HeatEntrySchema),
});

const ScheduleSchema = z.object({
    localEventId: z.string().min(1),
    localRoundId: z.string().min(1),
    eventName: z.string().min(1),
    disciplineCode: z.string().min(1),
    gender: z.enum(['MALE', 'FEMALE', 'MIXED'], {
        message: 'Gender must be MALE, FEMALE, or MIXED',
    }),
    ageCategory: z.enum(['U14', 'U16', 'U18', 'U20', 'U23', 'SENIOR', 'MASTERS']),
    roundName: z.string().min(1),
    date: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/, 'Date must be in DD.MM.YYYY format'),
    time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Time must be in HH:MM:SS format'),
    heats: z.array(HeatSchema),
});

const ResultRowSchema = z.object({
    license: z.string().min(1),
    place: z.number().int().positive().nullable().optional(),
    status: z.enum(['OK', 'DNS', 'DNF', 'DQ', 'FS', 'PENDING']),
    mark: z.string().nullable().optional(),
    reacTime: z.number().nullable().optional(),
});

// --- Request validation schemas (sync API contracts) ---

export const SyncMeetSchema = z.object({
    body: z.object({
        athletes: z.array(AthleteSchema),
        schedule: z.array(ScheduleSchema),
    }),
});

export const SyncResultsSchema = z.object({
    body: z.object({
        localEventId: z.string().min(1),
        localRoundId: z.string().min(1),
        heatNumber: z.number().int().positive(),
        wind: z.number().nullable().optional(),
        results: z.array(ResultRowSchema),
    }),
});

export type SyncMeetDto = z.infer<typeof SyncMeetSchema>['body'];
export type SyncResultsDto = z.infer<typeof SyncResultsSchema>['body'];
