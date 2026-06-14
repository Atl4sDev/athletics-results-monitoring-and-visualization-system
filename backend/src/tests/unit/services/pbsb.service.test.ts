import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Prisma mock ---
const mockHeatFindUnique = vi.hoisted(() => vi.fn());
const mockResultAggregate = vi.hoisted(() => vi.fn());
const mockResultUpdate = vi.hoisted(() => vi.fn());
const mockResultFindMany = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function (this: any) {
        this.heat = { findUnique: mockHeatFindUnique };
        this.result = {
            aggregate: mockResultAggregate,
            update: mockResultUpdate,
            findMany: mockResultFindMany,
        };
        this.$transaction = mockTransaction;
    }),
    HeatStatus: { SCHEDULED: 'SCHEDULED', UNCONFIRMED: 'UNCONFIRMED', OFFICIAL: 'OFFICIAL' },
    ResultStatus: { PENDING: 'PENDING', OK: 'OK', DNS: 'DNS', DNF: 'DNF', DQ: 'DQ', FS: 'FS' },
}));

const { PbSbService } = await import('../../../services/pbsb.service');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeHeat = (overrides: Record<string, any> = {}) => ({
    id: 'heat-1',
    results: [],
    event: {
        disciplineId: 1,
        discipline: { id: 1 },
        competition: { environment: 'OUTDOOR', dateStart: new Date(Date.UTC(2025, 6, 1)) }, // Jul 1 2025
    },
    ...overrides,
});

const makeResult = (id: string, athleteId: string, sortValue: number | null) => ({
    id,
    athleteId,
    sortValue,
    status: 'OK',
});

const noMinAgg = { _min: { sortValue: null } };
const minAgg = (v: number) => ({ _min: { sortValue: v } });

beforeEach(() => {
    vi.clearAllMocks();
    // Default: transaction executes all ops and returns them
    mockTransaction.mockImplementation((ops: any[]) => Promise.resolve(ops));
    // Default update returns a stub
    mockResultUpdate.mockResolvedValue({});
});

// ===========================================================================
// evaluateForHeat
// ===========================================================================

describe('PbSbService.evaluateForHeat', () => {
    it('(a) heat not found → returns without calling transaction', async () => {
        mockHeatFindUnique.mockResolvedValue(null);

        await PbSbService.evaluateForHeat('heat-1');

        expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('(f) heat has no OK results → returns without calling transaction', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat({ results: [] }));

        await PbSbService.evaluateForHeat('heat-1');

        expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('(g) result with sortValue = null → isPB=false, isSB=false, no aggregate called', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat({
            results: [makeResult('r1', 'a1', null)],
        }));

        await PbSbService.evaluateForHeat('heat-1');

        expect(mockResultAggregate).not.toHaveBeenCalled();
        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'r1' }, data: { isPB: false, isSB: false } })
        );
        expect(mockTransaction).toHaveBeenCalledOnce();
    });

    it('(a) no prior OFFICIAL results → pbMin=null, sbMin=null → isPB=true, isSB=true', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat({
            results: [makeResult('r1', 'a1', 10.5)],
        }));
        mockResultAggregate.mockResolvedValue(noMinAgg);

        await PbSbService.evaluateForHeat('heat-1');

        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ data: { isPB: true, isSB: true } })
        );
    });

    it('(b) existing result is worse (higher sortValue) → isPB=true, isSB=true', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat({
            results: [makeResult('r1', 'a1', 10.5)],
        }));
        // prior best is 11.0 — incoming 10.5 is better
        mockResultAggregate.mockResolvedValue(minAgg(11.0));

        await PbSbService.evaluateForHeat('heat-1');

        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ data: { isPB: true, isSB: true } })
        );
    });

    it('(c) existing result is better (lower sortValue) → isPB=false, isSB=false', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat({
            results: [makeResult('r1', 'a1', 10.5)],
        }));
        // prior best is 10.0 — incoming 10.5 is worse
        mockResultAggregate.mockResolvedValue(minAgg(10.0));

        await PbSbService.evaluateForHeat('heat-1');

        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ data: { isPB: false, isSB: false } })
        );
    });

    it('(d) exact tie (sortValue === existingBest) → isPB=true, isSB=true', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat({
            results: [makeResult('r1', 'a1', 10.5)],
        }));
        mockResultAggregate.mockResolvedValue(minAgg(10.5));

        await PbSbService.evaluateForHeat('heat-1');

        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ data: { isPB: true, isSB: true } })
        );
    });

    it('(e) prior result in different season → isSB=true (no same-season prior), isPB=false (worse overall)', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat({
            results: [makeResult('r1', 'a1', 10.5)],
        }));
        // PB aggregate: prior season result with better time → isPB=false
        // SB aggregate: no in-season result → sbMin=null → isSB=true
        mockResultAggregate
            .mockResolvedValueOnce(minAgg(10.0)) // PB call
            .mockResolvedValueOnce(noMinAgg);    // SB call

        await PbSbService.evaluateForHeat('heat-1');

        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ data: { isPB: false, isSB: true } })
        );
    });

    it('two OK results in heat → two update ops, transaction called once', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat({
            results: [makeResult('r1', 'a1', 10.5), makeResult('r2', 'a2', 11.0)],
        }));
        mockResultAggregate.mockResolvedValue(noMinAgg);

        await PbSbService.evaluateForHeat('heat-1');

        expect(mockResultUpdate).toHaveBeenCalledTimes(2);
        expect(mockTransaction).toHaveBeenCalledOnce();
    });
});

// ===========================================================================
// recalculateForHeat
// ===========================================================================

describe('PbSbService.recalculateForHeat', () => {
    it('(e) heat not found → no DB writes', async () => {
        mockHeatFindUnique.mockResolvedValue(null);

        await PbSbService.recalculateForHeat('heat-1');

        expect(mockResultFindMany).not.toHaveBeenCalled();
        expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('(e) heat has no OK+non-null results → no DB writes', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat({ results: [] }));

        await PbSbService.recalculateForHeat('heat-1');

        expect(mockResultFindMany).not.toHaveBeenCalled();
        expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('(a) two OFFICIAL results, newer is better → new isPB=true, old isPB=false', async () => {
        // Heat being confirmed: outdoor Jul 2025
        mockHeatFindUnique.mockResolvedValue(makeHeat({
            results: [{ athleteId: 'a1' }],
        }));

        const oldResult = {
            id: 'r-old',
            sortValue: 11.0,
            heat: { event: { competition: { dateStart: new Date(Date.UTC(2025, 4, 1)) } } }, // May 2025 outdoor
        };
        const newResult = {
            id: 'r-new',
            sortValue: 10.5,
            heat: { event: { competition: { dateStart: new Date(Date.UTC(2025, 6, 1)) } } }, // Jul 2025 outdoor
        };

        mockResultFindMany.mockResolvedValue([oldResult, newResult]);

        await PbSbService.recalculateForHeat('heat-1');

        // pbThreshold = 10.5 (min), sbThreshold = 10.5 (both in outdoor 2025)
        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'r-old' }, data: { isPB: false, isSB: false } })
        );
        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'r-new' }, data: { isPB: true, isSB: true } })
        );
        expect(mockTransaction).toHaveBeenCalledOnce();
    });

    it('(b) exact tie → both isPB=true', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat({
            results: [{ athleteId: 'a1' }],
        }));

        const r1 = {
            id: 'r1',
            sortValue: 10.5,
            heat: { event: { competition: { dateStart: new Date(Date.UTC(2025, 4, 1)) } } },
        };
        const r2 = {
            id: 'r2',
            sortValue: 10.5,
            heat: { event: { competition: { dateStart: new Date(Date.UTC(2025, 6, 1)) } } },
        };

        mockResultFindMany.mockResolvedValue([r1, r2]);

        await PbSbService.recalculateForHeat('heat-1');

        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'r1' }, data: { isPB: true, isSB: true } })
        );
        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'r2' }, data: { isPB: true, isSB: true } })
        );
    });

    it('(c) prior-season result loses isSB, current-season result gains isSB', async () => {
        // Heat confirmed: outdoor Jul 2025 season (Apr–Sep 2025)
        mockHeatFindUnique.mockResolvedValue(makeHeat({
            results: [{ athleteId: 'a1' }],
        }));

        const priorSeasonResult = {
            id: 'r-prior',
            sortValue: 10.0, // better overall
            heat: { event: { competition: { dateStart: new Date(Date.UTC(2024, 6, 1)) } } }, // Jul 2024 outdoor
        };
        const currentSeasonResult = {
            id: 'r-current',
            sortValue: 10.5, // worse overall
            heat: { event: { competition: { dateStart: new Date(Date.UTC(2025, 6, 1)) } } }, // Jul 2025 outdoor
        };

        mockResultFindMany.mockResolvedValue([priorSeasonResult, currentSeasonResult]);

        await PbSbService.recalculateForHeat('heat-1');

        // pbThreshold = 10.0; prior result wins PB, current does not
        // sbThreshold = 10.5 (only current-season result in Apr–Sep 2025)
        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'r-prior' }, data: { isPB: true, isSB: false } })
        );
        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'r-current' }, data: { isPB: false, isSB: true } })
        );
    });

    it('(d) two athletes in heat → each evaluated independently', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat({
            results: [{ athleteId: 'a1' }, { athleteId: 'a2' }],
        }));

        const a1Result = {
            id: 'r-a1',
            sortValue: 10.0,
            heat: { event: { competition: { dateStart: new Date(Date.UTC(2025, 6, 1)) } } },
        };
        const a2Result = {
            id: 'r-a2',
            sortValue: 12.0,
            heat: { event: { competition: { dateStart: new Date(Date.UTC(2025, 6, 1)) } } },
        };

        mockResultFindMany
            .mockResolvedValueOnce([a1Result])
            .mockResolvedValueOnce([a2Result]);

        await PbSbService.recalculateForHeat('heat-1');

        expect(mockResultFindMany).toHaveBeenCalledTimes(2);
        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'r-a1' }, data: { isPB: true, isSB: true } })
        );
        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'r-a2' }, data: { isPB: true, isSB: true } })
        );
        expect(mockTransaction).toHaveBeenCalledOnce();
    });

    it('no OFFICIAL results for athlete after cascade load → transaction not called', async () => {
        mockHeatFindUnique.mockResolvedValue(makeHeat({
            results: [{ athleteId: 'a1' }],
        }));
        mockResultFindMany.mockResolvedValue([]);

        await PbSbService.recalculateForHeat('heat-1');

        expect(mockTransaction).not.toHaveBeenCalled();
    });
});
