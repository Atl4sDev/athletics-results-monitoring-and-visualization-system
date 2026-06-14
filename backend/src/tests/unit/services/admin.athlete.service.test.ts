import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Prisma mock ---
const mockAthleteFindUnique = vi.hoisted(() => vi.fn());
const mockAthleteFindMany = vi.hoisted(() => vi.fn());
const mockAthleteCreate = vi.hoisted(() => vi.fn());
const mockAthleteUpdate = vi.hoisted(() => vi.fn());
const mockAthleteDelete = vi.hoisted(() => vi.fn());
const mockResultFindMany = vi.hoisted(() => vi.fn());
const mockResultUpdateMany = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function (this: any) {
        this.athlete = {
            findUnique: mockAthleteFindUnique,
            findMany: mockAthleteFindMany,
            create: mockAthleteCreate,
            update: mockAthleteUpdate,
            delete: mockAthleteDelete,
        };
        this.result = {
            findMany: mockResultFindMany,
            updateMany: mockResultUpdateMany,
        };
        this.$transaction = mockTransaction;
    }),
    Gender: { MALE: 'MALE', FEMALE: 'FEMALE' },
}));

// --- PbSbService mock ---
const mockRecalculateForHeat = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('../../../services/pbsb.service', () => ({
    PbSbService: { recalculateForHeat: mockRecalculateForHeat },
}));

// --- syncEmitter mock ---
const mockEmit = vi.hoisted(() => vi.fn());
vi.mock('../../../events/sync.events', () => ({
    syncEmitter: { emit: mockEmit },
    EVENTS: { RESULTS_UPDATED: 'RESULTS_UPDATED' },
}));

const { AdminAthleteService } = await import('../../../services/admin.athlete.service');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeAthlete = (overrides: Record<string, any> = {}) => ({
    id: 'athlete-1',
    firstName: 'John',
    lastName: 'Doe',
    gender: 'MALE',
    birthDate: null,
    licenseNumber: 'LIC-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const makeAthleteWithCount = (resultCount: number, overrides: Record<string, any> = {}) => ({
    ...makeAthlete(overrides),
    _count: { results: resultCount },
});

const makeHeatResult = (heatId: string, competitionId = 'comp-1') => ({
    heatId,
    heat: { event: { competitionId } },
});

beforeEach(() => {
    vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// listAthletes
// ---------------------------------------------------------------------------

describe('listAthletes', () => {
    it('no filters — returns paginated result', async () => {
        const athletes = [makeAthlete()];
        mockAthleteFindMany.mockResolvedValue(athletes);

        const result = await AdminAthleteService.listAthletes({});

        expect(mockAthleteFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: {}, take: 20, skip: 0 })
        );
        expect(result.data).toEqual(athletes);
        expect(result.hasMore).toBe(false);
    });

    it('single-token q — OR clause on firstName/lastName', async () => {
        mockAthleteFindMany.mockResolvedValue([]);

        await AdminAthleteService.listAthletes({ q: 'John' });

        const call = mockAthleteFindMany.mock.calls[0][0];
        expect(call.where.OR).toHaveLength(2);
        expect(call.where.OR[0]).toEqual({ firstName: { contains: 'John', mode: 'insensitive' } });
        expect(call.where.OR[1]).toEqual({ lastName: { contains: 'John', mode: 'insensitive' } });
    });

    it('two-token q — AND clause added', async () => {
        mockAthleteFindMany.mockResolvedValue([]);

        await AdminAthleteService.listAthletes({ q: 'John Doe' });

        const call = mockAthleteFindMany.mock.calls[0][0];
        expect(call.where.OR).toHaveLength(3);
        expect(call.where.OR[2]).toEqual({
            AND: [
                { firstName: { contains: 'John', mode: 'insensitive' } },
                { lastName: { contains: 'Doe', mode: 'insensitive' } },
            ],
        });
    });

    it('gender filter applied when provided', async () => {
        mockAthleteFindMany.mockResolvedValue([]);

        await AdminAthleteService.listAthletes({ gender: 'MALE' as any });

        const call = mockAthleteFindMany.mock.calls[0][0];
        expect(call.where.gender).toBe('MALE');
    });
});

// ---------------------------------------------------------------------------
// getAthleteById
// ---------------------------------------------------------------------------

describe('getAthleteById', () => {
    it('found — returns athlete with resultCount', async () => {
        mockAthleteFindUnique.mockResolvedValue(makeAthleteWithCount(3));

        const result = await AdminAthleteService.getAthleteById('athlete-1');

        expect(result.resultCount).toBe(3);
        expect(result).not.toHaveProperty('_count');
    });

    it('not found — throws 404 ATHLETE_NOT_FOUND', async () => {
        mockAthleteFindUnique.mockResolvedValue(null);

        await expect(AdminAthleteService.getAthleteById('missing')).rejects.toMatchObject({
            statusCode: 404,
            code: 'ATHLETE_NOT_FOUND',
        });
    });
});

// ---------------------------------------------------------------------------
// createAthlete
// ---------------------------------------------------------------------------

describe('createAthlete', () => {
    it('happy path — athlete created and returned', async () => {
        const created = makeAthlete();
        mockAthleteCreate.mockResolvedValue(created);

        const result = await AdminAthleteService.createAthlete({
            firstName: 'John',
            lastName: 'Doe',
            gender: 'MALE' as any,
            licenseNumber: 'LIC-001',
        });

        expect(mockAthleteCreate).toHaveBeenCalledOnce();
        expect(result).toEqual(created);
    });

    it('birthDate string parsed to UTC Date', async () => {
        mockAthleteCreate.mockResolvedValue(makeAthlete());

        await AdminAthleteService.createAthlete({
            firstName: 'John',
            lastName: 'Doe',
            gender: 'MALE' as any,
            licenseNumber: 'LIC-001',
            birthDate: '1990-06-15',
        });

        const data = mockAthleteCreate.mock.calls[0][0].data;
        expect(data.birthDate).toEqual(new Date('1990-06-15T00:00:00Z'));
    });

    it('birthDate omitted — null stored', async () => {
        mockAthleteCreate.mockResolvedValue(makeAthlete());

        await AdminAthleteService.createAthlete({
            firstName: 'John',
            lastName: 'Doe',
            gender: 'MALE' as any,
            licenseNumber: 'LIC-001',
        });

        const data = mockAthleteCreate.mock.calls[0][0].data;
        expect(data.birthDate).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// updateAthlete
// ---------------------------------------------------------------------------

describe('updateAthlete', () => {
    it('name-only change — updated, no recalculation, no emit', async () => {
        mockAthleteFindUnique.mockResolvedValue(makeAthlete({ gender: 'MALE' }));
        mockAthleteUpdate.mockResolvedValue(makeAthlete({ firstName: 'Jane' }));

        await AdminAthleteService.updateAthlete('athlete-1', { firstName: 'Jane' });

        expect(mockAthleteUpdate).toHaveBeenCalledOnce();
        expect(mockRecalculateForHeat).not.toHaveBeenCalled();
        expect(mockEmit).not.toHaveBeenCalled();
    });

    it('gender change — recalculateForHeat and emit called per heat', async () => {
        mockAthleteFindUnique.mockResolvedValue(makeAthlete({ gender: 'MALE' }));
        mockAthleteUpdate.mockResolvedValue(makeAthlete({ gender: 'FEMALE' }));
        mockResultFindMany.mockResolvedValue([
            makeHeatResult('heat-1', 'comp-1'),
            makeHeatResult('heat-2', 'comp-1'),
        ]);

        await AdminAthleteService.updateAthlete('athlete-1', { gender: 'FEMALE' as any });

        expect(mockRecalculateForHeat).toHaveBeenCalledTimes(2);
        expect(mockRecalculateForHeat).toHaveBeenCalledWith('heat-1');
        expect(mockRecalculateForHeat).toHaveBeenCalledWith('heat-2');
        expect(mockEmit).toHaveBeenCalledTimes(2);
        expect(mockEmit).toHaveBeenCalledWith('RESULTS_UPDATED', { competitionId: 'comp-1', heatId: 'heat-1' });
        expect(mockEmit).toHaveBeenCalledWith('RESULTS_UPDATED', { competitionId: 'comp-1', heatId: 'heat-2' });
    });

    it('gender same as existing — no recalculation, no emit', async () => {
        mockAthleteFindUnique.mockResolvedValue(makeAthlete({ gender: 'MALE' }));
        mockAthleteUpdate.mockResolvedValue(makeAthlete({ gender: 'MALE' }));

        await AdminAthleteService.updateAthlete('athlete-1', { gender: 'MALE' as any });

        expect(mockRecalculateForHeat).not.toHaveBeenCalled();
        expect(mockEmit).not.toHaveBeenCalled();
    });

    it('athlete not found — throws 404', async () => {
        mockAthleteFindUnique.mockResolvedValue(null);

        await expect(AdminAthleteService.updateAthlete('missing', { firstName: 'X' })).rejects.toMatchObject({
            statusCode: 404,
            code: 'ATHLETE_NOT_FOUND',
        });
    });

    it('birthDate null — stored as null', async () => {
        mockAthleteFindUnique.mockResolvedValue(makeAthlete());
        mockAthleteUpdate.mockResolvedValue(makeAthlete({ birthDate: null }));

        await AdminAthleteService.updateAthlete('athlete-1', { birthDate: null });

        const data = mockAthleteUpdate.mock.calls[0][0].data;
        expect(data.birthDate).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// deleteAthlete
// ---------------------------------------------------------------------------

describe('deleteAthlete', () => {
    it('no results — athlete deleted, returns success', async () => {
        mockAthleteFindUnique.mockResolvedValue(makeAthleteWithCount(0));
        mockAthleteDelete.mockResolvedValue(undefined);

        const result = await AdminAthleteService.deleteAthlete('athlete-1');

        expect(mockAthleteDelete).toHaveBeenCalledWith({ where: { id: 'athlete-1' } });
        expect(result).toEqual({ success: true });
    });

    it('has results — throws 409 ATHLETE_HAS_RESULTS', async () => {
        mockAthleteFindUnique.mockResolvedValue(makeAthleteWithCount(2));

        await expect(AdminAthleteService.deleteAthlete('athlete-1')).rejects.toMatchObject({
            statusCode: 409,
            code: 'ATHLETE_HAS_RESULTS',
        });
        expect(mockAthleteDelete).not.toHaveBeenCalled();
    });

    it('not found — throws 404 ATHLETE_NOT_FOUND', async () => {
        mockAthleteFindUnique.mockResolvedValue(null);

        await expect(AdminAthleteService.deleteAthlete('missing')).rejects.toMatchObject({
            statusCode: 404,
            code: 'ATHLETE_NOT_FOUND',
        });
    });
});

// ---------------------------------------------------------------------------
// mergeAthletes
// ---------------------------------------------------------------------------

describe('mergeAthletes', () => {
    it('targetId === sourceId — throws 400 INVALID_MERGE_SELF without DB call', async () => {
        await expect(
            AdminAthleteService.mergeAthletes('same-id', { sourceId: 'same-id' })
        ).rejects.toMatchObject({
            statusCode: 400,
            code: 'INVALID_MERGE_SELF',
        });
        expect(mockAthleteFindUnique).not.toHaveBeenCalled();
    });

    it('target not found — throws 404 ATHLETE_NOT_FOUND', async () => {
        mockAthleteFindUnique
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(makeAthlete({ id: 'source-1' }));

        await expect(
            AdminAthleteService.mergeAthletes('target-1', { sourceId: 'source-1' })
        ).rejects.toMatchObject({
            statusCode: 404,
            code: 'ATHLETE_NOT_FOUND',
        });
    });

    it('source not found — throws 404 ATHLETE_NOT_FOUND', async () => {
        mockAthleteFindUnique
            .mockResolvedValueOnce(makeAthlete({ id: 'target-1' }))
            .mockResolvedValueOnce(null);

        await expect(
            AdminAthleteService.mergeAthletes('target-1', { sourceId: 'source-1' })
        ).rejects.toMatchObject({
            statusCode: 404,
            code: 'ATHLETE_NOT_FOUND',
        });
    });

    it('overlapping heat — throws 409 MERGE_CONFLICT', async () => {
        mockAthleteFindUnique
            .mockResolvedValueOnce(makeAthlete({ id: 'target-1' }))
            .mockResolvedValueOnce(makeAthlete({ id: 'source-1' }));

        mockResultFindMany
            .mockResolvedValueOnce([makeHeatResult('heat-shared')])
            .mockResolvedValueOnce([{ heatId: 'heat-shared' }]);

        await expect(
            AdminAthleteService.mergeAthletes('target-1', { sourceId: 'source-1' })
        ).rejects.toMatchObject({
            statusCode: 409,
            code: 'MERGE_CONFLICT',
        });
        expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('happy path — transaction called, recalculate and emit per heat, returns result', async () => {
        mockAthleteFindUnique
            .mockResolvedValueOnce(makeAthlete({ id: 'target-1' }))
            .mockResolvedValueOnce(makeAthlete({ id: 'source-1' }));

        mockResultFindMany
            .mockResolvedValueOnce([
                makeHeatResult('heat-1', 'comp-1'),
                makeHeatResult('heat-2', 'comp-1'),
            ])
            .mockResolvedValueOnce([]);

        mockTransaction.mockResolvedValue([{ count: 2 }, { id: 'source-1' }]);

        const result = await AdminAthleteService.mergeAthletes('target-1', { sourceId: 'source-1' });

        expect(mockTransaction).toHaveBeenCalledOnce();
        expect(mockRecalculateForHeat).toHaveBeenCalledTimes(2);
        expect(mockRecalculateForHeat).toHaveBeenCalledWith('heat-1');
        expect(mockRecalculateForHeat).toHaveBeenCalledWith('heat-2');
        expect(mockEmit).toHaveBeenCalledTimes(2);
        expect(mockEmit).toHaveBeenCalledWith('RESULTS_UPDATED', { competitionId: 'comp-1', heatId: 'heat-1' });
        expect(mockEmit).toHaveBeenCalledWith('RESULTS_UPDATED', { competitionId: 'comp-1', heatId: 'heat-2' });
        expect(result).toEqual({ targetId: 'target-1', mergedResultCount: 2 });
    });

    it('source has zero results — transaction executes, returns mergedResultCount: 0', async () => {
        mockAthleteFindUnique
            .mockResolvedValueOnce(makeAthlete({ id: 'target-1' }))
            .mockResolvedValueOnce(makeAthlete({ id: 'source-1' }));

        mockResultFindMany
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);

        mockTransaction.mockResolvedValue([{ count: 0 }, { id: 'source-1' }]);

        const result = await AdminAthleteService.mergeAthletes('target-1', { sourceId: 'source-1' });

        expect(mockTransaction).toHaveBeenCalledOnce();
        expect(mockRecalculateForHeat).not.toHaveBeenCalled();
        expect(mockEmit).not.toHaveBeenCalled();
        expect(result).toEqual({ targetId: 'target-1', mergedResultCount: 0 });
    });
});
