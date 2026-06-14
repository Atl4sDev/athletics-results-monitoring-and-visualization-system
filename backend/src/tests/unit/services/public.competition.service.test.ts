import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCompetitionFindMany = vi.hoisted(() => vi.fn());
const mockCompetitionFindUnique = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function (this: any) {
        this.competition = {
            findMany: mockCompetitionFindMany,
            findUnique: mockCompetitionFindUnique,
        };
    }),
    CompetitionStatus: { UPCOMING: 'UPCOMING', ONGOING: 'ONGOING', COMPLETED: 'COMPLETED' },
    CompetitionEnvironment: { INDOOR: 'INDOOR', OUTDOOR: 'OUTDOOR' },
}));

const { PublicCompetitionService } = await import('../../../services/public.competition.service');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeAthlete = (overrides: Record<string, unknown> = {}) => ({
    id: 'athlete-1',
    licenseNumber: 'LIC001',
    firstName: 'John',
    lastName: 'Doe',
    gender: 'MALE',
    birthDate: null,
    ...overrides,
});

const makeResult = (overrides: Record<string, unknown> = {}) => ({
    id: 'result-1',
    place: 1,
    lane: 1,
    bibNumber: '100',
    team: 'Team A',
    status: 'OK',
    mark: '10.50',
    sortValue: 10.5,
    reacTime: null,
    isPB: false,
    isSB: false,
    athlete: makeAthlete(),
    ...overrides,
});

const makeHeat = (status: string, overrides: Record<string, unknown> = {}) => ({
    id: 'heat-1',
    status,
    wind: null,
    lynxHeatId: 1,
    results: [],
    ...overrides,
});

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
    id: 'event-1',
    disciplineId: 1,
    discipline: { name: '100m' },
    customName: null,
    scheduledTime: new Date('2025-07-01T10:00:00Z'),
    roundName: 'Final',
    gender: 'MALE',
    ageCategory: 'SENIOR',
    eventType: 'TRACK',
    lynxEventId: 1,
    lynxRoundId: 1,
    heats: [],
    ...overrides,
});

const makeCompetition = (overrides: Record<string, unknown> = {}) => ({
    id: 'comp-1',
    name: 'Test Competition',
    dateStart: new Date('2025-07-01'),
    dateEnd: new Date('2025-07-03'),
    location: 'Test City',
    environment: 'OUTDOOR',
    syncToken: 'secret-token',
    status: 'UPCOMING',
    events: [],
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
});

// ===========================================================================
// getCalendar
// ===========================================================================

describe('PublicCompetitionService.getCalendar', () => {
    it('TEST-001: response envelope has shape { data, nextCursor, hasMore }', async () => {
        mockCompetitionFindMany.mockResolvedValue([]);
        const result = await PublicCompetitionService.getCalendar({});
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('nextCursor');
        expect(result).toHaveProperty('hasMore');
    });

    it('TEST-002: UPCOMING filter builds dateStart: { gt: now } where clause', async () => {
        mockCompetitionFindMany.mockResolvedValue([]);
        await PublicCompetitionService.getCalendar({ status: 'UPCOMING' });
        expect(mockCompetitionFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    dateStart: expect.objectContaining({ gt: expect.any(Date) }),
                }),
            }),
        );
    });

    it('TEST-003: COMPLETED filter builds dateEnd: { lt: now } where clause', async () => {
        mockCompetitionFindMany.mockResolvedValue([]);
        await PublicCompetitionService.getCalendar({ status: 'COMPLETED' });
        expect(mockCompetitionFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    dateEnd: expect.objectContaining({ lt: expect.any(Date) }),
                }),
            }),
        );
    });

    it('TEST-004: year=2025 filter builds Jan 1 / Jan 1 next year dateStart bounds', async () => {
        mockCompetitionFindMany.mockResolvedValue([]);
        await PublicCompetitionService.getCalendar({ year: 2025 });
        expect(mockCompetitionFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    dateStart: expect.objectContaining({
                        gte: new Date(Date.UTC(2025, 0, 1)),
                        lt: new Date(Date.UTC(2026, 0, 1)),
                    }),
                }),
            }),
        );
    });

    it('TEST-005: environment filter is forwarded to Prisma where', async () => {
        mockCompetitionFindMany.mockResolvedValue([]);
        await PublicCompetitionService.getCalendar({ environment: 'INDOOR' });
        expect(mockCompetitionFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ environment: 'INDOOR' }),
            }),
        );
    });
});

// ===========================================================================
// getCompetitionDetail
// ===========================================================================

describe('PublicCompetitionService.getCompetitionDetail', () => {
    it('TEST-006: throws AppError 404 COMPETITION_NOT_FOUND for unknown id', async () => {
        mockCompetitionFindUnique.mockResolvedValue(null);
        await expect(PublicCompetitionService.getCompetitionDetail('unknown-id')).rejects.toMatchObject({
            statusCode: 404,
            code: 'COMPETITION_NOT_FOUND',
        });
    });

    it('TEST-010: syncToken is never in the response', async () => {
        mockCompetitionFindUnique.mockResolvedValue(makeCompetition());
        const result = await PublicCompetitionService.getCompetitionDetail('comp-1');
        expect(result).not.toHaveProperty('syncToken');
        const json = JSON.stringify(result);
        expect(json).not.toContain('syncToken');
        expect(json).not.toContain('secret-token');
    });

    it('TEST-011: events are grouped by day under schedule key', async () => {
        const comp = makeCompetition({
            events: [
                makeEvent({ id: 'e1', scheduledTime: new Date('2025-07-01T10:00:00Z') }),
                makeEvent({ id: 'e2', scheduledTime: new Date('2025-07-01T14:00:00Z') }),
                makeEvent({ id: 'e3', scheduledTime: new Date('2025-07-02T10:00:00Z') }),
                makeEvent({ id: 'e4', scheduledTime: null }),
            ],
        });
        mockCompetitionFindUnique.mockResolvedValue(comp);
        const result = await PublicCompetitionService.getCompetitionDetail('comp-1');
        expect(Object.keys(result.schedule)).toContain('2025-07-01');
        expect(Object.keys(result.schedule)).toContain('2025-07-02');
        expect(Object.keys(result.schedule)).toContain('unscheduled');
        expect(result.schedule['2025-07-01']).toHaveLength(2);
        expect(result.schedule['2025-07-02']).toHaveLength(1);
        expect(result.schedule['unscheduled']).toHaveLength(1);
    });

    it('TEST-008: UNCONFIRMED heat isPreliminary=true, OFFICIAL heat isPreliminary=false', async () => {
        const comp = makeCompetition({
            events: [
                makeEvent({
                    heats: [
                        makeHeat('UNCONFIRMED', { id: 'h-unconf' }),
                        makeHeat('OFFICIAL', { id: 'h-official' }),
                    ],
                }),
            ],
        });
        mockCompetitionFindUnique.mockResolvedValue(comp);
        const result = await PublicCompetitionService.getCompetitionDetail('comp-1');
        const heats = result.schedule['2025-07-01'][0].heats;
        const unconf = heats.find((h: any) => h.id === 'h-unconf');
        const official = heats.find((h: any) => h.id === 'h-official');
        expect(unconf!.isPreliminary).toBe(true);
        expect(official!.isPreliminary).toBe(false);
    });

    it('TEST-009: heat with wind=null has no wind field; heat with wind=1.5 has wind=1.5', async () => {
        const comp = makeCompetition({
            events: [
                makeEvent({
                    heats: [
                        makeHeat('OFFICIAL', { id: 'h-no-wind', wind: null }),
                        makeHeat('OFFICIAL', { id: 'h-with-wind', wind: 1.5 }),
                    ],
                }),
            ],
        });
        mockCompetitionFindUnique.mockResolvedValue(comp);
        const result = await PublicCompetitionService.getCompetitionDetail('comp-1');
        const heats = result.schedule['2025-07-01'][0].heats;
        const noWind = heats.find((h: any) => h.id === 'h-no-wind');
        const withWind = heats.find((h: any) => h.id === 'h-with-wind');
        expect(noWind).not.toHaveProperty('wind');
        expect(withWind).toHaveProperty('wind', 1.5);
    });

    it('TEST-007: SCHEDULED heat results sorted by lane; OFFICIAL heat results sorted by place', async () => {
        const scheduledResults = [
            makeResult({ id: 'r3', lane: 3 }),
            makeResult({ id: 'r1', lane: 1 }),
            makeResult({ id: 'r2', lane: 2 }),
        ];
        const officialResults = [
            makeResult({ id: 'r-2nd', place: 2, sortValue: 11.0, status: 'OK' }),
            makeResult({ id: 'r-dns', place: null, sortValue: null, status: 'DNS' }),
            makeResult({ id: 'r-1st', place: 1, sortValue: 10.5, status: 'OK' }),
        ];
        const comp = makeCompetition({
            events: [
                makeEvent({
                    heats: [
                        makeHeat('SCHEDULED', { id: 'h-sched', results: scheduledResults }),
                        makeHeat('OFFICIAL', { id: 'h-off', results: officialResults }),
                    ],
                }),
            ],
        });
        mockCompetitionFindUnique.mockResolvedValue(comp);
        const result = await PublicCompetitionService.getCompetitionDetail('comp-1');
        const heats = result.schedule['2025-07-01'][0].heats;
        const sched = heats.find((h: any) => h.id === 'h-sched');
        const off = heats.find((h: any) => h.id === 'h-off');
        expect(sched!.results.map((r: any) => r.id)).toEqual(['r1', 'r2', 'r3']);
        expect(off!.results[0].id).toBe('r-1st');
        expect(off!.results[1].id).toBe('r-2nd');
        expect(off!.results[2].id).toBe('r-dns');
    });

    it('isPB and isSB are passed through for UNCONFIRMED heats with isPreliminary=true', async () => {
        const comp = makeCompetition({
            events: [
                makeEvent({
                    heats: [
                        makeHeat('UNCONFIRMED', {
                            results: [makeResult({ isPB: true, isSB: true })],
                        }),
                    ],
                }),
            ],
        });
        mockCompetitionFindUnique.mockResolvedValue(comp);
        const result = await PublicCompetitionService.getCompetitionDetail('comp-1');
        const r = result.schedule['2025-07-01'][0].heats[0].results[0];
        expect(r.isPB).toBe(true);
        expect(r.isSB).toBe(true);
        expect(r.isPreliminary).toBe(true);
    });
});

// ===========================================================================
// getAvailableYears
// ===========================================================================

describe('PublicCompetitionService.getAvailableYears', () => {
    it('TEST-004: multiple years — returns distinct integers descending', async () => {
        mockCompetitionFindMany.mockResolvedValue([
            { dateStart: new Date('2024-06-01') },
            { dateStart: new Date('2025-03-15') },
            { dateStart: new Date('2026-09-20') },
        ]);
        const result = await PublicCompetitionService.getAvailableYears();
        expect(result).toEqual([2026, 2025, 2024]);
    });

    it('TEST-005: same-year deduplication — two rows in 2025 produce [2025]', async () => {
        mockCompetitionFindMany.mockResolvedValue([
            { dateStart: new Date('2025-01-10') },
            { dateStart: new Date('2025-08-20') },
        ]);
        const result = await PublicCompetitionService.getAvailableYears();
        expect(result).toEqual([2025]);
    });

    it('TEST-006: empty table — returns []', async () => {
        mockCompetitionFindMany.mockResolvedValue([]);
        const result = await PublicCompetitionService.getAvailableYears();
        expect(result).toEqual([]);
    });
});
