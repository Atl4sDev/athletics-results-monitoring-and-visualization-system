import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Prisma mock ---
const mockResultFindUnique = vi.hoisted(() => vi.fn());
const mockResultUpdate = vi.hoisted(() => vi.fn());
const mockResultDelete = vi.hoisted(() => vi.fn());
const mockResultFindUniqueOrThrow = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function (this: any) {
        this.result = {
            findUnique: mockResultFindUnique,
            update: mockResultUpdate,
            delete: mockResultDelete,
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

// --- AdminHeatService mock ---
const mockAdminHeatGetHeat = vi.hoisted(() => vi.fn());

vi.mock('../../../services/admin.heat.service', () => ({
    AdminHeatService: { getHeat: mockAdminHeatGetHeat },
}));

// --- parseMarkToSortValue mock ---
const mockParseMarkToSortValue = vi.hoisted(() => vi.fn());

vi.mock('../../../utils/time.util', () => ({
    parseMarkToSortValue: mockParseMarkToSortValue,
}));

const { AdminResultService } = await import('../../../services/admin.result.service');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeResult = (overrides: Record<string, any> = {}) => ({
    id: 'r-1',
    heatId: 'heat-1',
    heat: {
        event: {
            competition: { id: 'comp-1' },
        },
    },
    ...overrides,
});

const mockUpdatedHeat = { id: 'heat-1', event: { competition: { id: 'comp-1' } }, results: [] };

beforeEach(() => {
    vi.clearAllMocks();
    mockRecalculateForHeat.mockResolvedValue(undefined);
    mockResultUpdate.mockResolvedValue({});
    mockResultDelete.mockResolvedValue({});
    mockResultFindUniqueOrThrow.mockResolvedValue({ id: 'r-1', athlete: {} });
    mockAdminHeatGetHeat.mockResolvedValue(mockUpdatedHeat);
});

// ===========================================================================
// editResult
// ===========================================================================

describe('AdminResultService.editResult', () => {
    it('(a) mark provided as string — parseMarkToSortValue called, sortValue included in update', async () => {
        mockResultFindUnique.mockResolvedValue(makeResult());
        mockParseMarkToSortValue.mockReturnValue(10.45);

        await AdminResultService.editResult('r-1', { mark: '10.45' });

        expect(mockParseMarkToSortValue).toHaveBeenCalledWith('10.45');
        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ mark: '10.45', sortValue: 10.45 }),
            })
        );
    });

    it('(b) mark provided as null — sortValue: null in update payload', async () => {
        mockResultFindUnique.mockResolvedValue(makeResult());

        await AdminResultService.editResult('r-1', { mark: null });

        expect(mockParseMarkToSortValue).not.toHaveBeenCalled();
        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ mark: null, sortValue: null }),
            })
        );
    });

    it('(c) mark not in dto — sortValue key absent from update payload', async () => {
        mockResultFindUnique.mockResolvedValue(makeResult());

        await AdminResultService.editResult('r-1', { status: 'OK' });

        expect(mockParseMarkToSortValue).not.toHaveBeenCalled();
        const updateCall = mockResultUpdate.mock.calls[0][0];
        expect(updateCall.data).not.toHaveProperty('sortValue');
        expect(updateCall.data).not.toHaveProperty('mark');
    });

    it('(d) 404 — throws RESULT_NOT_FOUND when result is null', async () => {
        mockResultFindUnique.mockResolvedValue(null);

        await expect(AdminResultService.editResult('r-1', { status: 'OK' })).rejects.toMatchObject({
            code: 'RESULT_NOT_FOUND',
            statusCode: 404,
        });
        expect(mockResultUpdate).not.toHaveBeenCalled();
    });

    it('(e) success — recalculate called with heatId, emit called with competitionId', async () => {
        mockResultFindUnique.mockResolvedValue(makeResult());

        await AdminResultService.editResult('r-1', { status: 'DNS' });

        expect(mockRecalculateForHeat).toHaveBeenCalledWith('heat-1');
        expect(mockAdminHeatGetHeat).toHaveBeenCalledWith('heat-1');
        expect(mockEmit).toHaveBeenCalledWith('RESULTS_UPDATED', { competitionId: 'comp-1', heat: mockUpdatedHeat });
    });
});

// ===========================================================================
// removeAthleteFromHeat
// ===========================================================================

describe('AdminResultService.removeAthleteFromHeat', () => {
    it('(a) happy path — result deleted, recalculate called, event emitted', async () => {
        mockResultFindUnique.mockResolvedValue(makeResult());

        await AdminResultService.removeAthleteFromHeat('r-1');

        expect(mockResultDelete).toHaveBeenCalledWith({ where: { id: 'r-1' } });
        expect(mockRecalculateForHeat).toHaveBeenCalledWith('heat-1');
        expect(mockAdminHeatGetHeat).toHaveBeenCalledWith('heat-1');
        expect(mockEmit).toHaveBeenCalledWith('RESULTS_UPDATED', { competitionId: 'comp-1', heat: mockUpdatedHeat });
    });

    it('(b) 404 — throws RESULT_NOT_FOUND, delete never called', async () => {
        mockResultFindUnique.mockResolvedValue(null);

        await expect(AdminResultService.removeAthleteFromHeat('r-1')).rejects.toMatchObject({
            code: 'RESULT_NOT_FOUND',
            statusCode: 404,
        });
        expect(mockResultDelete).not.toHaveBeenCalled();
    });
});
