import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDisciplineFindMany = vi.hoisted(() => vi.fn());
const mockEventFindFirst = vi.hoisted(() => vi.fn());
const mockEventCreate = vi.hoisted(() => vi.fn());
const mockEventUpdate = vi.hoisted(() => vi.fn());
const mockHeatFindFirst = vi.hoisted(() => vi.fn());
const mockHeatCreate = vi.hoisted(() => vi.fn());
const mockResultFindFirst = vi.hoisted(() => vi.fn());
const mockResultCreate = vi.hoisted(() => vi.fn());
const mockResultUpdate = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function (this: any) {
        this.discipline = { findMany: mockDisciplineFindMany };
        this.event = {
            findFirst: mockEventFindFirst,
            create: mockEventCreate,
            update: mockEventUpdate,
        };
        this.heat = {
            findFirst: mockHeatFindFirst,
            create: mockHeatCreate,
        };
        this.result = {
            findFirst: mockResultFindFirst,
            create: mockResultCreate,
            update: mockResultUpdate,
        };
    }),
    DisciplineType: { TRACK: 'TRACK', FIELD: 'FIELD', COMBINED: 'COMBINED' },
    Gender: { MALE: 'MALE', FEMALE: 'FEMALE', MIXED: 'MIXED' },
    AgeCategory: { U14: 'U14', U16: 'U16', U18: 'U18', U20: 'U20', U23: 'U23', SENIOR: 'SENIOR', MASTERS: 'MASTERS' },
    HeatStatus: { SCHEDULED: 'SCHEDULED', UNCONFIRMED: 'UNCONFIRMED', OFFICIAL: 'OFFICIAL' },
    ResultStatus: { PENDING: 'PENDING', OK: 'OK' },
}));

const mockSyncEmit = vi.hoisted(() => vi.fn());
vi.mock('../../../events/sync.events', () => ({
    syncEmitter: { emit: mockSyncEmit },
    EVENTS: { RESULTS_UPDATED: 'RESULTS_UPDATED', SCHEDULE_UPDATED: 'SCHEDULE_UPDATED' },
}));

const { MeetService } = await import('../../../services/meet.service');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMPETITION_ID = 'comp-1';
const ATHLETE_MAP = new Map([['LIC-001', 'athlete-uuid-1']]);

const makeEventDto = (overrides: Record<string, any> = {}) => ({
    localEventId: '1',
    localRoundId: '1',
    eventName: '100m Sprint',
    disciplineCode: '100M',
    gender: 'MALE',
    ageCategory: 'SENIOR',
    roundName: 'Final',
    date: '15.06.2025',
    time: '10:30:00',
    heats: [
        {
            heatNumber: 1,
            entries: [{ license: 'LIC-001', lane: 3, bibNumber: '101', team: 'Team A' }],
        },
    ],
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
    mockDisciplineFindMany.mockResolvedValue([{ code: '100M', id: 5, type: 'TRACK' }]);
    mockEventFindFirst.mockResolvedValue(null);
    mockEventCreate.mockResolvedValue({ id: 'event-1' });
    mockEventUpdate.mockResolvedValue({ id: 'event-1' });
    mockHeatFindFirst.mockResolvedValue(null);
    mockHeatCreate.mockResolvedValue({ id: 'heat-1' });
    mockResultFindFirst.mockResolvedValue(null);
    mockResultCreate.mockResolvedValue({});
    mockResultUpdate.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MeetService.syncSchedule', () => {
    it('creates a new event when one does not exist', async () => {
        mockEventFindFirst.mockResolvedValue(null);

        await MeetService.syncSchedule(COMPETITION_ID, [makeEventDto()], ATHLETE_MAP);

        expect(mockEventCreate).toHaveBeenCalledOnce();
        expect(mockEventUpdate).not.toHaveBeenCalled();
    });

    it('updates existing event instead of creating a new one', async () => {
        mockEventFindFirst.mockResolvedValue({ id: 'event-1' });

        await MeetService.syncSchedule(COMPETITION_ID, [makeEventDto()], ATHLETE_MAP);

        expect(mockEventUpdate).toHaveBeenCalledOnce();
        expect(mockEventCreate).not.toHaveBeenCalled();
    });

    it('creates a new heat with SCHEDULED status when one does not exist', async () => {
        mockHeatFindFirst.mockResolvedValue(null);

        await MeetService.syncSchedule(COMPETITION_ID, [makeEventDto()], ATHLETE_MAP);

        expect(mockHeatCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'SCHEDULED' }),
            })
        );
    });

    it('skips heat creation when heat already exists', async () => {
        mockHeatFindFirst.mockResolvedValue({ id: 'heat-existing' });

        await MeetService.syncSchedule(COMPETITION_ID, [makeEventDto()], ATHLETE_MAP);

        expect(mockHeatCreate).not.toHaveBeenCalled();
    });

    it('creates a PENDING placeholder result for a new start-list entry', async () => {
        mockResultFindFirst.mockResolvedValue(null);

        await MeetService.syncSchedule(COMPETITION_ID, [makeEventDto()], ATHLETE_MAP);

        expect(mockResultCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    athleteId: 'athlete-uuid-1',
                    status: 'PENDING',
                    lane: 3,
                    bibNumber: '101',
                    team: 'Team A',
                }),
            })
        );
    });

    it('updates lane, bibNumber, and team only when start-list entry already exists', async () => {
        mockResultFindFirst.mockResolvedValue({ id: 'result-existing' });

        await MeetService.syncSchedule(COMPETITION_ID, [makeEventDto()], ATHLETE_MAP);

        expect(mockResultUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'result-existing' },
                data: { lane: 3, bibNumber: '101', team: 'Team A' },
            })
        );
        expect(mockResultCreate).not.toHaveBeenCalled();
    });

    it('skips entry when athlete license is not in the athleteMap', async () => {
        const emptyAthleteMap = new Map<string, string>();

        await MeetService.syncSchedule(COMPETITION_ID, [makeEventDto()], emptyAthleteMap);

        expect(mockResultCreate).not.toHaveBeenCalled();
        expect(mockResultUpdate).not.toHaveBeenCalled();
    });

    it('sets disciplineId and customName=null when discipline code is found in reference table', async () => {
        mockDisciplineFindMany.mockResolvedValue([{ code: '100M', id: 5, type: 'TRACK' }]);

        await MeetService.syncSchedule(COMPETITION_ID, [makeEventDto({ disciplineCode: '100M' })], ATHLETE_MAP);

        expect(mockEventCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ disciplineId: 5, customName: null }),
            })
        );
    });

    it('sets disciplineId=null and customName to the LynxPad name when discipline code is unknown', async () => {
        mockDisciplineFindMany.mockResolvedValue([]);

        await MeetService.syncSchedule(
            COMPETITION_ID,
            [makeEventDto({ disciplineCode: 'UNKNOWN', eventName: 'Special Race' })],
            ATHLETE_MAP
        );

        expect(mockEventCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ disciplineId: null, customName: 'Special Race' }),
            })
        );
    });

    it('parses DD.MM.YYYY + HH:MM:SS into the correct UTC scheduledTime', async () => {
        await MeetService.syncSchedule(
            COMPETITION_ID,
            [makeEventDto({ date: '15.06.2025', time: '10:30:00' })],
            ATHLETE_MAP
        );

        expect(mockEventCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    scheduledTime: new Date('2025-06-15T10:30:00.000Z'),
                }),
            })
        );
    });

    it('sets scheduledTime to null when the date string cannot be parsed', async () => {
        await MeetService.syncSchedule(
            COMPETITION_ID,
            [makeEventDto({ date: 'bad-date', time: '10:30:00' })],
            ATHLETE_MAP
        );

        expect(mockEventCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ scheduledTime: null }),
            })
        );
    });

    it('returns eventsProcessed and heatsProcessed counts matching the schedule shape', async () => {
        const schedule = [
            makeEventDto({
                localEventId: '1',
                localRoundId: '1',
                heats: [
                    { heatNumber: 1, entries: [] },
                    { heatNumber: 2, entries: [] },
                ],
            }),
            makeEventDto({
                localEventId: '2',
                localRoundId: '1',
                heats: [{ heatNumber: 1, entries: [] }],
            }),
        ];
        mockEventCreate
            .mockResolvedValueOnce({ id: 'event-1' })
            .mockResolvedValueOnce({ id: 'event-2' });

        const result = await MeetService.syncSchedule(COMPETITION_ID, schedule, ATHLETE_MAP);

        expect(result.eventsProcessed).toBe(2);
        expect(result.heatsProcessed).toBe(3);
    });

    it('emits SCHEDULE_UPDATED with competitionId after processing', async () => {
        await MeetService.syncSchedule(COMPETITION_ID, [makeEventDto()], ATHLETE_MAP);

        expect(mockSyncEmit).toHaveBeenCalledWith('SCHEDULE_UPDATED', { competitionId: COMPETITION_ID });
    });

    it('returns zero counts for an empty schedule', async () => {
        const result = await MeetService.syncSchedule(COMPETITION_ID, [], ATHLETE_MAP);

        expect(result.eventsProcessed).toBe(0);
        expect(result.heatsProcessed).toBe(0);
    });
});
