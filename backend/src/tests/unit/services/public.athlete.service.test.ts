import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAthleteFindUnique = vi.hoisted(() => vi.fn());
const mockResultFindFirst = vi.hoisted(() => vi.fn());
const mockResultFindMany = vi.hoisted(() => vi.fn());
const mockAthleteFindMany = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function (this: any) {
        this.athlete = {
            findUnique: mockAthleteFindUnique,
            findMany: mockAthleteFindMany,
        };
        this.result = {
            findFirst: mockResultFindFirst,
            findMany: mockResultFindMany,
        };
    }),
}));

const { PublicAthleteService } = await import('../../../services/public.athlete.service');

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

const makeCompetitionCtx = (env: string = 'OUTDOOR', dateStart = new Date('2025-07-01')) => ({
    id: 'comp-1',
    name: 'Test Competition',
    environment: env,
    dateStart,
});

const makeEventCtx = (disciplineId = 1, overrides: Record<string, unknown> = {}) => ({
    disciplineId,
    customName: null,
    scheduledTime: new Date('2025-07-01T10:00:00Z'),
    gender: 'MALE',
    ageCategory: 'SENIOR',
    discipline: { name: '100m' },
    competition: makeCompetitionCtx(),
    ...overrides,
});

const makeHeatCtx = (status = 'OFFICIAL', overrides: Record<string, unknown> = {}) => ({
    status,
    event: makeEventCtx(),
    ...overrides,
});

const makeResult = (overrides: Record<string, unknown> = {}) => ({
    id: 'result-1',
    athleteId: 'athlete-1',
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
    heat: makeHeatCtx(),
    athlete: makeAthlete(),
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
    mockResultFindFirst.mockResolvedValue(null);
    mockResultFindMany.mockResolvedValue([]);
});

// ===========================================================================
// searchAthletes
// ===========================================================================

describe('PublicAthleteService.searchAthletes', () => {
    it('TEST-012: returns empty data immediately for empty q — no Prisma call', async () => {
        const result = await PublicAthleteService.searchAthletes({ q: '', take: 20 });
        expect(result).toEqual({ data: [], nextCursor: null, hasMore: false });
        expect(mockAthleteFindMany).not.toHaveBeenCalled();
    });

    it('returns empty data for whitespace-only q — no Prisma call', async () => {
        const result = await PublicAthleteService.searchAthletes({ q: '   ', take: 20 });
        expect(result).toEqual({ data: [], nextCursor: null, hasMore: false });
        expect(mockAthleteFindMany).not.toHaveBeenCalled();
    });

    it('TEST-013: single token "Smith" builds OR on firstName and lastName', async () => {
        mockAthleteFindMany.mockResolvedValue([]);
        await PublicAthleteService.searchAthletes({ q: 'Smith', take: 20 });
        expect(mockAthleteFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    OR: expect.arrayContaining([
                        expect.objectContaining({ firstName: expect.objectContaining({ contains: 'Smith' }) }),
                        expect.objectContaining({ lastName: expect.objectContaining({ contains: 'Smith' }) }),
                    ]),
                }),
            }),
        );
    });

    it('TEST-014: two-token "John Doe" adds AND branch firstName=John, lastName=Doe', async () => {
        mockAthleteFindMany.mockResolvedValue([]);
        await PublicAthleteService.searchAthletes({ q: 'John Doe', take: 20 });
        const call = mockAthleteFindMany.mock.calls[0][0];
        const orClauses = call.where.OR;
        const andBranch = orClauses.find((c: any) => c.AND);
        expect(andBranch).toBeDefined();
        expect(andBranch.AND).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ firstName: expect.objectContaining({ contains: 'John' }) }),
                expect.objectContaining({ lastName: expect.objectContaining({ contains: 'Doe' }) }),
            ]),
        );
    });

    it('gender filter is forwarded to Prisma where', async () => {
        mockAthleteFindMany.mockResolvedValue([]);
        await PublicAthleteService.searchAthletes({ q: 'Smith', gender: 'FEMALE', take: 20 });
        expect(mockAthleteFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ gender: 'FEMALE' }),
            }),
        );
    });

    it('lastTeam is populated from most recent OFFICIAL result via batch query', async () => {
        const athlete = makeAthlete();
        mockAthleteFindMany.mockResolvedValue([athlete]);
        mockResultFindMany.mockResolvedValue([
            { athleteId: 'athlete-1', team: 'Alpha Club' },
        ]);
        const result = await PublicAthleteService.searchAthletes({ q: 'John', take: 20 });
        expect(result.data[0].lastTeam).toBe('Alpha Club');
    });

    it('lastTeam is null when athlete has no eligible OFFICIAL results', async () => {
        mockAthleteFindMany.mockResolvedValue([makeAthlete()]);
        mockResultFindMany.mockResolvedValue([]);
        const result = await PublicAthleteService.searchAthletes({ q: 'John', take: 20 });
        expect(result.data[0].lastTeam).toBeNull();
    });

    it('batch result query is skipped entirely when athlete page is empty', async () => {
        mockAthleteFindMany.mockResolvedValue([]);
        await PublicAthleteService.searchAthletes({ q: 'John', take: 20 });
        expect(mockResultFindMany).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// getAthleteProfile
// ===========================================================================

describe('PublicAthleteService.getAthleteProfile', () => {
    it('TEST-015: throws AppError 404 ATHLETE_NOT_FOUND for unknown license', async () => {
        mockAthleteFindUnique.mockResolvedValue(null);
        await expect(PublicAthleteService.getAthleteProfile('UNKNOWN')).rejects.toMatchObject({
            statusCode: 404,
            code: 'ATHLETE_NOT_FOUND',
        });
    });

    it('returns records: [] when athlete has no PB/SB results', async () => {
        mockAthleteFindUnique.mockResolvedValue(makeAthlete());
        mockResultFindMany.mockResolvedValue([]);
        const result = await PublicAthleteService.getAthleteProfile('LIC001');
        expect(result.records).toEqual([]);
    });

    it('TEST-017: records are grouped by disciplineId:environment — one entry per unique pair', async () => {
        mockAthleteFindUnique.mockResolvedValue(makeAthlete());
        mockResultFindMany.mockResolvedValue([
            makeResult({ isPB: true, heat: makeHeatCtx('OFFICIAL', { event: makeEventCtx(1, { competition: makeCompetitionCtx('OUTDOOR') }) }) }),
            makeResult({ id: 'r2', isPB: true, heat: makeHeatCtx('OFFICIAL', { event: makeEventCtx(1, { competition: makeCompetitionCtx('INDOOR') }) }) }),
            makeResult({ id: 'r3', isPB: true, heat: makeHeatCtx('OFFICIAL', { event: makeEventCtx(2, { competition: makeCompetitionCtx('OUTDOOR') }) }) }),
        ]);
        const result = await PublicAthleteService.getAthleteProfile('LIC001');
        expect(result.records).toHaveLength(3);
        const keys = result.records.map((r: any) => `${r.disciplineId}:${r.environment}`);
        expect(keys).toContain('1:OUTDOOR');
        expect(keys).toContain('1:INDOOR');
        expect(keys).toContain('2:OUTDOOR');
    });

    it('TEST-016: UNCONFIRMED heat results are excluded even if isPB=true', async () => {
        mockAthleteFindUnique.mockResolvedValue(makeAthlete());
        // The service query already filters heat.status = OFFICIAL, so mock returns empty
        mockResultFindMany.mockResolvedValue([]);
        const result = await PublicAthleteService.getAthleteProfile('LIC001');
        expect(result.records).toEqual([]);
        // Verify the Prisma call includes OFFICIAL heat filter
        expect(mockResultFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    heat: expect.objectContaining({ status: 'OFFICIAL' }),
                }),
            }),
        );
    });

    it('only rows with isPB=true contribute to personalBest', async () => {
        mockAthleteFindUnique.mockResolvedValue(makeAthlete());
        // Use today's date — it is always within the current season by definition
        const currentSeasonDate = new Date();
        const sbHeat = makeHeatCtx('OFFICIAL', {
            event: makeEventCtx(1, {
                scheduledTime: currentSeasonDate,
                competition: makeCompetitionCtx('OUTDOOR', currentSeasonDate),
            }),
        });
        mockResultFindMany.mockResolvedValue([
            makeResult({ isPB: false, isSB: true, heat: sbHeat }),
        ]);
        const result = await PublicAthleteService.getAthleteProfile('LIC001');
        expect(result.records[0].personalBest).toBeNull();
        expect(result.records[0].seasonBest).not.toBeNull();
    });

    it('lastTeam is populated from findFirst result', async () => {
        mockAthleteFindUnique.mockResolvedValue(makeAthlete());
        mockResultFindFirst.mockResolvedValue({ team: 'Beta SC' });
        const result = await PublicAthleteService.getAthleteProfile('LIC001');
        expect(result.athlete.lastTeam).toBe('Beta SC');
    });

    it('lastTeam is null when findFirst returns null', async () => {
        mockAthleteFindUnique.mockResolvedValue(makeAthlete());
        mockResultFindFirst.mockResolvedValue(null);
        const result = await PublicAthleteService.getAthleteProfile('LIC001');
        expect(result.athlete.lastTeam).toBeNull();
    });

    it('findFirst is called with OFFICIAL/OK filter ordered by scheduledTime desc', async () => {
        mockAthleteFindUnique.mockResolvedValue(makeAthlete());
        await PublicAthleteService.getAthleteProfile('LIC001');
        expect(mockResultFindFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    athleteId: 'athlete-1',
                    status: 'OK',
                    heat: expect.objectContaining({ status: 'OFFICIAL' }),
                }),
                orderBy: [{ heat: { event: { scheduledTime: 'desc' } } }],
            }),
        );
    });
});

// ===========================================================================
// getAthleteResults
// ===========================================================================

describe('PublicAthleteService.getAthleteResults', () => {
    it('TEST-018: returns only OK results from OFFICIAL heats (Prisma where clause)', async () => {
        mockAthleteFindUnique.mockResolvedValue({ id: 'athlete-1' });
        mockResultFindMany.mockResolvedValue([]);
        await PublicAthleteService.getAthleteResults('LIC001', { take: 20 });
        expect(mockResultFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    status: 'OK',
                    heat: expect.objectContaining({ status: 'OFFICIAL' }),
                }),
            }),
        );
    });

    it('throws 404 ATHLETE_NOT_FOUND for unknown license', async () => {
        mockAthleteFindUnique.mockResolvedValue(null);
        await expect(PublicAthleteService.getAthleteResults('UNKNOWN', {})).rejects.toMatchObject({
            statusCode: 404,
            code: 'ATHLETE_NOT_FOUND',
        });
    });

    it('TEST-019: disciplineId filter adds event discipline condition to query', async () => {
        mockAthleteFindUnique.mockResolvedValue({ id: 'athlete-1' });
        mockResultFindMany.mockResolvedValue([]);
        await PublicAthleteService.getAthleteResults('LIC001', { disciplineId: 5, take: 20 });
        const where = mockResultFindMany.mock.calls[0][0].where;
        expect(where.heat.event).toEqual(
            expect.objectContaining({ disciplineId: 5 }),
        );
    });

    it('year filter builds dateStart bounds on competition', async () => {
        mockAthleteFindUnique.mockResolvedValue({ id: 'athlete-1' });
        mockResultFindMany.mockResolvedValue([]);
        await PublicAthleteService.getAthleteResults('LIC001', { year: 2025, take: 20 });
        const where = mockResultFindMany.mock.calls[0][0].where;
        expect(where.heat.event.competition.dateStart).toEqual({
            gte: new Date(Date.UTC(2025, 0, 1)),
            lt: new Date(Date.UTC(2026, 0, 1)),
        });
    });
});

// ===========================================================================
// getAthleteProgression
// ===========================================================================

describe('PublicAthleteService.getAthleteProgression', () => {
    it('throws 404 ATHLETE_NOT_FOUND for unknown license', async () => {
        mockAthleteFindUnique.mockResolvedValue(null);
        await expect(
            PublicAthleteService.getAthleteProgression('UNKNOWN', { disciplineId: 1 }),
        ).rejects.toMatchObject({ statusCode: 404, code: 'ATHLETE_NOT_FOUND' });
    });

    it('TEST-021: returns results in ascending scheduledTime order (preserves Prisma order)', async () => {
        mockAthleteFindUnique.mockResolvedValue({ id: 'athlete-1' });
        const r1 = makeResult({ id: 'r1', sortValue: 10.5, heat: makeHeatCtx('OFFICIAL', { event: makeEventCtx(1, { scheduledTime: new Date('2025-04-01T10:00:00Z'), competition: makeCompetitionCtx() }) }) });
        const r2 = makeResult({ id: 'r2', sortValue: 10.3, heat: makeHeatCtx('OFFICIAL', { event: makeEventCtx(1, { scheduledTime: new Date('2025-07-01T10:00:00Z'), competition: makeCompetitionCtx() }) }) });
        mockResultFindMany.mockResolvedValue([r1, r2]);
        const result = await PublicAthleteService.getAthleteProgression('LIC001', { disciplineId: 1 });
        expect(result).toHaveLength(2);
        expect(result[0].sortValue).toBe(10.5);
        expect(result[1].sortValue).toBe(10.3);
    });

    it('sortValue: null results are excluded by Prisma where clause', async () => {
        mockAthleteFindUnique.mockResolvedValue({ id: 'athlete-1' });
        mockResultFindMany.mockResolvedValue([]);
        await PublicAthleteService.getAthleteProgression('LIC001', { disciplineId: 1 });
        expect(mockResultFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ sortValue: { not: null } }),
            }),
        );
    });

    it('year and environment filters narrow results via Prisma where', async () => {
        mockAthleteFindUnique.mockResolvedValue({ id: 'athlete-1' });
        mockResultFindMany.mockResolvedValue([]);
        await PublicAthleteService.getAthleteProgression('LIC001', {
            disciplineId: 1,
            year: 2025,
            environment: 'OUTDOOR',
        });
        const where = mockResultFindMany.mock.calls[0][0].where;
        expect(where.heat.event.competition.environment).toBe('OUTDOOR');
        expect(where.heat.event.competition.dateStart).toEqual({
            gte: new Date(Date.UTC(2025, 0, 1)),
            lt: new Date(Date.UTC(2026, 0, 1)),
        });
    });
});
