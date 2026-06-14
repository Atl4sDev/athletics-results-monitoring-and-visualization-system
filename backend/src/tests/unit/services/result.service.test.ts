import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEventFindFirst = vi.hoisted(() => vi.fn());
const mockHeatFindFirst = vi.hoisted(() => vi.fn());
const mockHeatFindUnique = vi.hoisted(() => vi.fn());
const mockHeatUpdate = vi.hoisted(() => vi.fn());
const mockResultFindMany = vi.hoisted(() => vi.fn());
const mockResultUpdate = vi.hoisted(() => vi.fn());
const mockResultCreate = vi.hoisted(() => vi.fn());
const mockAthleteFindMany = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function (this: any) {
        this.event = { findFirst: mockEventFindFirst };
        this.heat = {
            findFirst: mockHeatFindFirst,
            findUnique: mockHeatFindUnique,
            update: mockHeatUpdate,
        };
        this.result = {
            findMany: mockResultFindMany,
            update: mockResultUpdate,
            create: mockResultCreate,
        };
        this.athlete = { findMany: mockAthleteFindMany };
        this.$transaction = mockTransaction;
    }),
    HeatStatus: { SCHEDULED: 'SCHEDULED', UNCONFIRMED: 'UNCONFIRMED', OFFICIAL: 'OFFICIAL' },
    ResultStatus: { PENDING: 'PENDING', OK: 'OK', DNS: 'DNS', DNF: 'DNF', DQ: 'DQ', FS: 'FS' },
}));

const mockEvaluateForHeat = vi.hoisted(() => vi.fn());
vi.mock('../../../services/pbsb.service', () => ({
    PbSbService: { evaluateForHeat: mockEvaluateForHeat },
}));

const mockSyncEmit = vi.hoisted(() => vi.fn());
vi.mock('../../../events/sync.events', () => ({
    syncEmitter: { emit: mockSyncEmit },
    EVENTS: { RESULTS_UPDATED: 'RESULTS_UPDATED', SCHEDULE_UPDATED: 'SCHEDULE_UPDATED' },
}));

const mockParseMarkToSortValue = vi.hoisted(() => vi.fn());
vi.mock('../../../utils/time.util', () => ({
    parseMarkToSortValue: mockParseMarkToSortValue,
}));

const { ResultService } = await import('../../../services/result.service');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMPETITION_ID = 'comp-1';
const EVENT_ID = 'event-1';
const HEAT_ID = 'heat-1';

const baseDto = {
    localEventId: '10',
    localRoundId: '1',
    heatNumber: 1,
    wind: 1.2,
    results: [
        { license: 'LIC-001', place: 1, status: 'OK' as const, mark: '10.50', reacTime: 0.15 },
    ],
};

const mockUpdatedHeat = {
    id: HEAT_ID,
    event: {
        competitionId: COMPETITION_ID,
        customName: null,
        roundName: 'Final',
        discipline: { name: '100m' },
    },
    results: [],
};

beforeEach(() => {
    vi.clearAllMocks();
    mockParseMarkToSortValue.mockReturnValue(10.5);
    mockResultUpdate.mockResolvedValue({});
    mockResultCreate.mockResolvedValue({});
    mockHeatUpdate.mockResolvedValue({});
    mockTransaction.mockImplementation((ops: Promise<any>[]) => Promise.all(ops));
    mockEvaluateForHeat.mockResolvedValue(undefined);
    mockHeatFindUnique.mockResolvedValue(mockUpdatedHeat);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ResultService.processResults', () => {
    it('throws when event is not found', async () => {
        mockEventFindFirst.mockResolvedValue(null);

        await expect(
            ResultService.processResults(COMPETITION_ID, baseDto)
        ).rejects.toThrow(
            `Event (lynxEventId: ${baseDto.localEventId}, lynxRoundId: ${baseDto.localRoundId}) not found.`
        );
    });

    it('throws when heat is not found for the event', async () => {
        mockEventFindFirst.mockResolvedValue({ id: EVENT_ID });
        mockHeatFindFirst.mockResolvedValue(null);

        await expect(
            ResultService.processResults(COMPETITION_ID, baseDto)
        ).rejects.toThrow(`Heat (heatNumber: ${baseDto.heatNumber}) not found`);
    });

    it('updates existing result when athlete is on the start list', async () => {
        mockEventFindFirst.mockResolvedValue({ id: EVENT_ID });
        mockHeatFindFirst.mockResolvedValue({ id: HEAT_ID });
        mockResultFindMany.mockResolvedValue([
            { id: 'result-1', athlete: { licenseNumber: 'LIC-001' } },
        ]);

        await ResultService.processResults(COMPETITION_ID, baseDto);

        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'result-1' } })
        );
        expect(mockResultCreate).not.toHaveBeenCalled();
    });

    it('creates a late-entry result when athlete is in DB but not on start list', async () => {
        mockEventFindFirst.mockResolvedValue({ id: EVENT_ID });
        mockHeatFindFirst.mockResolvedValue({ id: HEAT_ID });
        mockResultFindMany.mockResolvedValue([]);
        mockAthleteFindMany.mockResolvedValue([{ id: 'athlete-99', licenseNumber: 'LIC-001' }]);

        await ResultService.processResults(COMPETITION_ID, baseDto);

        expect(mockResultCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    heatId: HEAT_ID,
                    athleteId: 'athlete-99',
                    lane: 0,
                    bibNumber: 'N/A',
                    team: 'Late Entry',
                }),
            })
        );
    });

    it('skips result silently when athlete is completely unknown', async () => {
        mockEventFindFirst.mockResolvedValue({ id: EVENT_ID });
        mockHeatFindFirst.mockResolvedValue({ id: HEAT_ID });
        mockResultFindMany.mockResolvedValue([]);
        mockAthleteFindMany.mockResolvedValue([]);

        await ResultService.processResults(COMPETITION_ID, baseDto);

        expect(mockResultCreate).not.toHaveBeenCalled();
        expect(mockResultUpdate).not.toHaveBeenCalled();
    });

    it('does not call athlete.findMany when all athletes are already on the start list', async () => {
        mockEventFindFirst.mockResolvedValue({ id: EVENT_ID });
        mockHeatFindFirst.mockResolvedValue({ id: HEAT_ID });
        mockResultFindMany.mockResolvedValue([
            { id: 'result-1', athlete: { licenseNumber: 'LIC-001' } },
        ]);

        await ResultService.processResults(COMPETITION_ID, baseDto);

        expect(mockAthleteFindMany).not.toHaveBeenCalled();
    });

    it('calls parseMarkToSortValue for each result mark', async () => {
        mockEventFindFirst.mockResolvedValue({ id: EVENT_ID });
        mockHeatFindFirst.mockResolvedValue({ id: HEAT_ID });
        mockResultFindMany.mockResolvedValue([
            { id: 'r1', athlete: { licenseNumber: 'LIC-001' } },
        ]);

        await ResultService.processResults(COMPETITION_ID, baseDto);

        expect(mockParseMarkToSortValue).toHaveBeenCalledWith(baseDto.results[0].mark);
    });

    it('sets heat status to UNCONFIRMED and updates wind from DTO', async () => {
        mockEventFindFirst.mockResolvedValue({ id: EVENT_ID });
        mockHeatFindFirst.mockResolvedValue({ id: HEAT_ID });
        mockResultFindMany.mockResolvedValue([
            { id: 'r1', athlete: { licenseNumber: 'LIC-001' } },
        ]);

        await ResultService.processResults(COMPETITION_ID, baseDto);

        expect(mockHeatUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: HEAT_ID },
                data: { wind: 1.2, status: 'UNCONFIRMED' },
            })
        );
    });

    it('calls $transaction exactly once', async () => {
        mockEventFindFirst.mockResolvedValue({ id: EVENT_ID });
        mockHeatFindFirst.mockResolvedValue({ id: HEAT_ID });
        mockResultFindMany.mockResolvedValue([
            { id: 'r1', athlete: { licenseNumber: 'LIC-001' } },
        ]);

        await ResultService.processResults(COMPETITION_ID, baseDto);

        expect(mockTransaction).toHaveBeenCalledOnce();
    });

    it('calls PbSbService.evaluateForHeat with the heat id after the transaction', async () => {
        mockEventFindFirst.mockResolvedValue({ id: EVENT_ID });
        mockHeatFindFirst.mockResolvedValue({ id: HEAT_ID });
        mockResultFindMany.mockResolvedValue([
            { id: 'r1', athlete: { licenseNumber: 'LIC-001' } },
        ]);

        await ResultService.processResults(COMPETITION_ID, baseDto);

        expect(mockEvaluateForHeat).toHaveBeenCalledWith(HEAT_ID);
    });

    it('emits RESULTS_UPDATED with competitionId and the updated heat', async () => {
        mockEventFindFirst.mockResolvedValue({ id: EVENT_ID });
        mockHeatFindFirst.mockResolvedValue({ id: HEAT_ID });
        mockResultFindMany.mockResolvedValue([
            { id: 'r1', athlete: { licenseNumber: 'LIC-001' } },
        ]);

        await ResultService.processResults(COMPETITION_ID, baseDto);

        expect(mockSyncEmit).toHaveBeenCalledWith('RESULTS_UPDATED', {
            competitionId: COMPETITION_ID,
            heat: mockUpdatedHeat,
        });
    });

    it('returns the updated heat fetched after PB/SB evaluation', async () => {
        mockEventFindFirst.mockResolvedValue({ id: EVENT_ID });
        mockHeatFindFirst.mockResolvedValue({ id: HEAT_ID });
        mockResultFindMany.mockResolvedValue([
            { id: 'r1', athlete: { licenseNumber: 'LIC-001' } },
        ]);

        const result = await ResultService.processResults(COMPETITION_ID, baseDto);

        expect(result).toBe(mockUpdatedHeat);
    });

    it('does not emit RESULTS_UPDATED when post-evaluation heat findUnique returns null', async () => {
        mockEventFindFirst.mockResolvedValue({ id: EVENT_ID });
        mockHeatFindFirst.mockResolvedValue({ id: HEAT_ID });
        mockResultFindMany.mockResolvedValue([
            { id: 'r1', athlete: { licenseNumber: 'LIC-001' } },
        ]);
        mockHeatFindUnique.mockResolvedValue(null);

        await ResultService.processResults(COMPETITION_ID, baseDto);

        expect(mockSyncEmit).not.toHaveBeenCalled();
    });

    it('writes sortValue returned by parseMarkToSortValue into the result update', async () => {
        mockParseMarkToSortValue.mockReturnValue(9.58);
        mockEventFindFirst.mockResolvedValue({ id: EVENT_ID });
        mockHeatFindFirst.mockResolvedValue({ id: HEAT_ID });
        mockResultFindMany.mockResolvedValue([
            { id: 'r1', athlete: { licenseNumber: 'LIC-001' } },
        ]);

        await ResultService.processResults(COMPETITION_ID, baseDto);

        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ sortValue: 9.58 }),
            })
        );
    });
});
