import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Prisma mock ---
const mockHeatFindUnique = vi.hoisted(() => vi.fn());
const mockHeatFindMany = vi.hoisted(() => vi.fn());
const mockHeatUpdate = vi.hoisted(() => vi.fn());
const mockAthleteFindUnique = vi.hoisted(() => vi.fn());
const mockResultFindFirst = vi.hoisted(() => vi.fn());
const mockResultCreate = vi.hoisted(() => vi.fn());
const mockResultFindUniqueOrThrow = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function (this: any) {
        this.heat = {
            findUnique: mockHeatFindUnique,
            findMany: mockHeatFindMany,
            update: mockHeatUpdate,
        };
        this.athlete = { findUnique: mockAthleteFindUnique };
        this.result = {
            findFirst: mockResultFindFirst,
            create: mockResultCreate,
            findUniqueOrThrow: mockResultFindUniqueOrThrow,
        };
    }),
    HeatStatus: { SCHEDULED: 'SCHEDULED', UNCONFIRMED: 'UNCONFIRMED', OFFICIAL: 'OFFICIAL' },
    ResultStatus: { PENDING: 'PENDING', OK: 'OK', DNS: 'DNS', DNF: 'DNF', DQ: 'DQ', FS: 'FS' },
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

// --- parseMarkToSortValue mock ---
const mockParseMarkToSortValue = vi.hoisted(() => vi.fn());

vi.mock('../../../utils/time.util', () => ({
    parseMarkToSortValue: mockParseMarkToSortValue,
}));

const { AdminHeatService } = await import('../../../services/admin.heat.service');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeHeat = (status: string, overrides: Record<string, any> = {}) => ({
    id: 'heat-1',
    status,
    confirmedAt: null,
    event: {
        competition: { id: 'comp-1' },
        discipline: { id: 1 },
    },
    results: [],
    ...overrides,
});

const makeFullHeat = (status: string) => ({
    ...makeHeat(status),
    results: [{ id: 'r-1', athlete: { id: 'a-1', licenseNumber: 'LIC001' } }],
});

beforeEach(() => {
    vi.clearAllMocks();
    mockRecalculateForHeat.mockResolvedValue(undefined);
    mockHeatUpdate.mockResolvedValue({});
    mockResultCreate.mockResolvedValue({ id: 'r-new' });
    mockResultFindUniqueOrThrow.mockResolvedValue({ id: 'r-new', athlete: {} });
});

// ===========================================================================
// getHeat
// ===========================================================================

describe('AdminHeatService.getHeat', () => {
    it('(a) happy path — returns heat when found', async () => {
        const heat = makeFullHeat('UNCONFIRMED');
        mockHeatFindUnique.mockResolvedValue(heat);

        const result = await AdminHeatService.getHeat('heat-1');

        expect(result).toEqual(heat);
        expect(mockHeatFindUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'heat-1' } })
        );
    });

    it('(b) 404 — throws HEAT_NOT_FOUND when null', async () => {
        mockHeatFindUnique.mockResolvedValue(null);

        await expect(AdminHeatService.getHeat('heat-1')).rejects.toMatchObject({
            code: 'HEAT_NOT_FOUND',
            statusCode: 404,
        });
    });
});

// ===========================================================================
// confirmHeat
// ===========================================================================

describe('AdminHeatService.confirmHeat', () => {
    it('(a) happy path — updates status to OFFICIAL, calls recalculate, emits event', async () => {
        const heat = makeHeat('UNCONFIRMED');
        mockHeatFindUnique
            .mockResolvedValueOnce(heat)
            .mockResolvedValueOnce(makeFullHeat('OFFICIAL'));

        await AdminHeatService.confirmHeat('heat-1');

        expect(mockHeatUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'heat-1' },
                data: expect.objectContaining({ status: 'OFFICIAL', confirmedAt: expect.any(Date) }),
            })
        );
        expect(mockRecalculateForHeat).toHaveBeenCalledOnce();
        expect(mockRecalculateForHeat).toHaveBeenCalledWith('heat-1');
        expect(mockEmit).toHaveBeenCalledWith('RESULTS_UPDATED', { competitionId: 'comp-1', heat: makeFullHeat('OFFICIAL') });
    });

    it('(b) 404 — throws HEAT_NOT_FOUND', async () => {
        mockHeatFindUnique.mockResolvedValue(null);

        await expect(AdminHeatService.confirmHeat('heat-1')).rejects.toMatchObject({
            code: 'HEAT_NOT_FOUND',
            statusCode: 404,
        });
        expect(mockHeatUpdate).not.toHaveBeenCalled();
    });

    it('(c) 409 — throws HEAT_NOT_UNCONFIRMED when status is OFFICIAL', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat('OFFICIAL'));

        await expect(AdminHeatService.confirmHeat('heat-1')).rejects.toMatchObject({
            code: 'HEAT_NOT_UNCONFIRMED',
            statusCode: 409,
        });
        expect(mockHeatUpdate).not.toHaveBeenCalled();
    });

    it('(d) 409 — throws HEAT_NOT_UNCONFIRMED when status is SCHEDULED', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat('SCHEDULED'));

        await expect(AdminHeatService.confirmHeat('heat-1')).rejects.toMatchObject({
            code: 'HEAT_NOT_UNCONFIRMED',
            statusCode: 409,
        });
    });
});

// ===========================================================================
// unconfirmHeat
// ===========================================================================

describe('AdminHeatService.unconfirmHeat', () => {
    it('(a) happy path — updates status to UNCONFIRMED, clears confirmedAt, calls recalculate, emits event', async () => {
        const heat = makeHeat('OFFICIAL', { confirmedAt: new Date() });
        mockHeatFindUnique
            .mockResolvedValueOnce(heat)
            .mockResolvedValueOnce(makeFullHeat('UNCONFIRMED'));

        await AdminHeatService.unconfirmHeat('heat-1');

        expect(mockHeatUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'heat-1' },
                data: { status: 'UNCONFIRMED', confirmedAt: null },
            })
        );
        expect(mockRecalculateForHeat).toHaveBeenCalledWith('heat-1');
        expect(mockEmit).toHaveBeenCalledWith('RESULTS_UPDATED', { competitionId: 'comp-1', heat: makeFullHeat('UNCONFIRMED') });
    });

    it('(b) 404 — throws HEAT_NOT_FOUND', async () => {
        mockHeatFindUnique.mockResolvedValue(null);

        await expect(AdminHeatService.unconfirmHeat('heat-1')).rejects.toMatchObject({
            code: 'HEAT_NOT_FOUND',
            statusCode: 404,
        });
    });

    it('(c) 409 — throws HEAT_NOT_OFFICIAL when status is UNCONFIRMED', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat('UNCONFIRMED'));

        await expect(AdminHeatService.unconfirmHeat('heat-1')).rejects.toMatchObject({
            code: 'HEAT_NOT_OFFICIAL',
            statusCode: 409,
        });
    });

    it('(d) 409 — throws HEAT_NOT_OFFICIAL when status is SCHEDULED', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat('SCHEDULED'));

        await expect(AdminHeatService.unconfirmHeat('heat-1')).rejects.toMatchObject({
            code: 'HEAT_NOT_OFFICIAL',
            statusCode: 409,
        });
    });
});

// ===========================================================================
// addAthleteToHeat
// ===========================================================================

describe('AdminHeatService.addAthleteToHeat', () => {
    const baseDto = {
        licenseNumber: 'LIC001',
        lane: 3,
        bibNumber: '42',
        team: 'Team A',
        status: 'OK' as const,
    };

    it('(a) happy path with mark — parseMarkToSortValue called, result created with sortValue', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat('UNCONFIRMED'));
        mockAthleteFindUnique.mockResolvedValue({ id: 'a-1', licenseNumber: 'LIC001' });
        mockResultFindFirst.mockResolvedValue(null);
        mockParseMarkToSortValue.mockReturnValue(10.45);

        const dto = { ...baseDto, mark: '10.45' };
        await AdminHeatService.addAthleteToHeat('heat-1', dto);

        expect(mockParseMarkToSortValue).toHaveBeenCalledWith('10.45');
        expect(mockResultCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ sortValue: 10.45, mark: '10.45' }),
            })
        );
        expect(mockRecalculateForHeat).toHaveBeenCalledWith('heat-1');
        expect(mockEmit).toHaveBeenCalledWith('RESULTS_UPDATED', { competitionId: 'comp-1', heat: makeHeat('UNCONFIRMED') });
    });

    it('(b) happy path without mark — sortValue is null, parseMarkToSortValue not called', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat('UNCONFIRMED'));
        mockAthleteFindUnique.mockResolvedValue({ id: 'a-1', licenseNumber: 'LIC001' });
        mockResultFindFirst.mockResolvedValue(null);

        await AdminHeatService.addAthleteToHeat('heat-1', baseDto);

        expect(mockParseMarkToSortValue).not.toHaveBeenCalled();
        expect(mockResultCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ sortValue: null, mark: null }),
            })
        );
    });

    it('(c) 404 heat — throws HEAT_NOT_FOUND', async () => {
        mockHeatFindUnique.mockResolvedValue(null);

        await expect(AdminHeatService.addAthleteToHeat('heat-1', baseDto)).rejects.toMatchObject({
            code: 'HEAT_NOT_FOUND',
            statusCode: 404,
        });
    });

    it('(d) 404 athlete — throws ATHLETE_NOT_FOUND', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat('UNCONFIRMED'));
        mockAthleteFindUnique.mockResolvedValue(null);

        await expect(AdminHeatService.addAthleteToHeat('heat-1', baseDto)).rejects.toMatchObject({
            code: 'ATHLETE_NOT_FOUND',
            statusCode: 404,
        });
    });

    it('(e) 409 duplicate — throws ATHLETE_ALREADY_IN_HEAT', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat('UNCONFIRMED'));
        mockAthleteFindUnique.mockResolvedValue({ id: 'a-1', licenseNumber: 'LIC001' });
        mockResultFindFirst.mockResolvedValue({ id: 'r-existing' });

        await expect(AdminHeatService.addAthleteToHeat('heat-1', baseDto)).rejects.toMatchObject({
            code: 'ATHLETE_ALREADY_IN_HEAT',
            statusCode: 409,
        });
        expect(mockResultCreate).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// listHeats
// ===========================================================================

const makeListHeat = (id: string, overrides: Record<string, any> = {}) => ({
    id,
    status: 'UNCONFIRMED',
    lynxHeatId: 1,
    _count: { results: 3 },
    event: {
        id: 'event-1',
        scheduledTime: new Date('2026-06-01T10:00:00Z'),
        roundName: 'Final',
        gender: 'MALE',
        ageCategory: 'SENIOR',
        discipline: { id: 1, name: '100m', code: '100M', type: 'TRACK' },
        competition: {
            id: 'comp-1',
            name: 'Test Competition',
            dateStart: new Date('2026-06-01T00:00:00Z'),
        },
    },
    ...overrides,
});

describe('AdminHeatService.listHeats', () => {
    it('(a) happy path — defaults to UNCONFIRMED status, maps resultCount from _count.results', async () => {
        const heat = makeListHeat('heat-1');
        mockHeatFindMany.mockResolvedValue([heat]);

        const result = await AdminHeatService.listHeats({});

        expect(mockHeatFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { status: 'UNCONFIRMED' },
                include: expect.objectContaining({
                    _count: { select: { results: true } },
                }),
                orderBy: [
                    { event: { competition: { dateStart: 'asc' } } },
                    { event: { scheduledTime: 'asc' } },
                ],
            })
        );
        expect(result.data[0].resultCount).toBe(3);
        expect(result.data[0].id).toBe('heat-1');
    });

    it('(b) competitionId filter — where.event.competitionId equals passed UUID', async () => {
        const uuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
        mockHeatFindMany.mockResolvedValue([]);

        await AdminHeatService.listHeats({ competitionId: uuid });

        expect(mockHeatFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { status: 'UNCONFIRMED', event: { competitionId: uuid } },
            })
        );
    });

    it('(c) custom status — where.status matches passed value', async () => {
        mockHeatFindMany.mockResolvedValue([]);

        await AdminHeatService.listHeats({ status: 'OFFICIAL' as any });

        expect(mockHeatFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { status: 'OFFICIAL' } })
        );
    });

    it('(d) hasMore=true — findMany returns exactly take items, nextCursor is non-null', async () => {
        const take = 20;
        const heats = Array.from({ length: take }, (_, i) => makeListHeat(`heat-${i}`));
        mockHeatFindMany.mockResolvedValue(heats);

        const result = await AdminHeatService.listHeats({});

        expect(result.hasMore).toBe(true);
        expect(result.nextCursor).not.toBeNull();
        expect(result.data).toHaveLength(take);
    });

    it('(e) hasMore=false — findMany returns fewer than take items', async () => {
        mockHeatFindMany.mockResolvedValue([makeListHeat('heat-1'), makeListHeat('heat-2')]);

        const result = await AdminHeatService.listHeats({});

        expect(result.hasMore).toBe(false);
        expect(result.nextCursor).toBeNull();
    });

    it('(f) empty result — data: [], nextCursor: null, hasMore: false', async () => {
        mockHeatFindMany.mockResolvedValue([]);

        const result = await AdminHeatService.listHeats({});

        expect(result).toEqual({ data: [], nextCursor: null, hasMore: false });
    });

    it('(g) take override — Prisma call uses the custom take value', async () => {
        mockHeatFindMany.mockResolvedValue([]);

        await AdminHeatService.listHeats({ take: 5 });

        expect(mockHeatFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 5 })
        );
    });

    it('(h) orderBy correctness — includes cross-table sort on dateStart then scheduledTime', async () => {
        mockHeatFindMany.mockResolvedValue([]);

        await AdminHeatService.listHeats({});

        expect(mockHeatFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: [
                    { event: { competition: { dateStart: 'asc' } } },
                    { event: { scheduledTime: 'asc' } },
                ],
            })
        );
    });
});
