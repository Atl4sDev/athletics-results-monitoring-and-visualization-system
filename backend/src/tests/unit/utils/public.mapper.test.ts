import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDeriveStatus = vi.hoisted(() => vi.fn());
vi.mock('../../../utils/competition.util', () => ({
    deriveStatus: mockDeriveStatus,
}));

const {
    mapDisciplinePublic,
    mapCompetitionCard,
    mapAthleteRow,
    mapResultRow,
    mapHeatRow,
    mapEventRow,
} = await import('../../../utils/public.mapper');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeAthlete = (overrides: Record<string, any> = {}) => ({
    licenseNumber: 'LIC-001',
    firstName: 'John',
    lastName: 'Doe',
    gender: 'MALE',
    birthDate: new Date('2000-01-15'),
    ...overrides,
});

const makeResult = (overrides: Record<string, any> = {}) => ({
    id: 'r-1',
    place: 1,
    lane: 3,
    bibNumber: '101',
    team: 'Team A',
    status: 'OK',
    mark: '10.50',
    sortValue: 10.5,
    reacTime: 0.15,
    isPB: true,
    isSB: true,
    athlete: makeAthlete(),
    ...overrides,
});

const makeHeat = (overrides: Record<string, any> = {}) => ({
    id: 'heat-1',
    status: 'OFFICIAL' as const,
    wind: 1.2,
    results: [] as ReturnType<typeof makeResult>[],
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
    mockDeriveStatus.mockReturnValue('UPCOMING');
});

// ---------------------------------------------------------------------------
// mapDisciplinePublic
// ---------------------------------------------------------------------------

describe('mapDisciplinePublic', () => {
    it('passes through all fields unchanged', () => {
        const result = mapDisciplinePublic({ id: 1, code: '100M', name: '100 Metres', type: 'TRACK' });
        expect(result).toEqual({ id: 1, code: '100M', name: '100 Metres', type: 'TRACK' });
    });
});

// ---------------------------------------------------------------------------
// mapCompetitionCard
// ---------------------------------------------------------------------------

describe('mapCompetitionCard', () => {
    const baseComp = {
        id: 'c-1',
        name: 'Test Cup',
        dateStart: new Date('2025-06-01'),
        dateEnd: new Date('2025-06-02'),
        location: 'Kyiv',
        environment: 'OUTDOOR',
    };

    it('includes the status returned by deriveStatus', () => {
        mockDeriveStatus.mockReturnValue('ONGOING');
        const result = mapCompetitionCard(baseComp);
        expect(result.status).toBe('ONGOING');
    });

    it('passes dateStart and dateEnd to deriveStatus', () => {
        mapCompetitionCard(baseComp);
        expect(mockDeriveStatus).toHaveBeenCalledWith(baseComp.dateStart, baseComp.dateEnd);
    });

    it('includes all scalar fields', () => {
        const result = mapCompetitionCard(baseComp);
        expect(result).toMatchObject({
            id: 'c-1',
            name: 'Test Cup',
            location: 'Kyiv',
            environment: 'OUTDOOR',
            dateStart: baseComp.dateStart,
            dateEnd: baseComp.dateEnd,
        });
    });
});

// ---------------------------------------------------------------------------
// mapAthleteRow
// ---------------------------------------------------------------------------

describe('mapAthleteRow', () => {
    it('includes lastTeam when provided', () => {
        const result = mapAthleteRow(makeAthlete(), 'Club X');
        expect(result.lastTeam).toBe('Club X');
    });

    it('sets lastTeam to null when not provided', () => {
        const result = mapAthleteRow(makeAthlete());
        expect(result.lastTeam).toBeNull();
    });

    it('sets lastTeam to null when explicitly passed null', () => {
        const result = mapAthleteRow(makeAthlete(), null);
        expect(result.lastTeam).toBeNull();
    });

    it('maps all athlete identity fields', () => {
        const athlete = makeAthlete();
        const result = mapAthleteRow(athlete);
        expect(result).toMatchObject({
            licenseNumber: athlete.licenseNumber,
            firstName: athlete.firstName,
            lastName: athlete.lastName,
            gender: athlete.gender,
            birthDate: athlete.birthDate,
        });
    });
});

// ---------------------------------------------------------------------------
// mapResultRow
// ---------------------------------------------------------------------------

describe('mapResultRow', () => {
    it('includes reacTime in the output when non-null', () => {
        const result = mapResultRow(makeResult({ reacTime: 0.15 }), 'OFFICIAL');
        expect(result).toHaveProperty('reacTime', 0.15);
    });

    it('omits reacTime from the output when null', () => {
        const result = mapResultRow(makeResult({ reacTime: null }), 'OFFICIAL');
        expect(result).not.toHaveProperty('reacTime');
    });

    it('forces isPB and isSB to false when heatStatus is SCHEDULED', () => {
        const result = mapResultRow(makeResult({ isPB: true, isSB: true }), 'SCHEDULED');
        expect(result.isPB).toBe(false);
        expect(result.isSB).toBe(false);
    });

    it('passes through isPB and isSB from result when heatStatus is OFFICIAL', () => {
        const result = mapResultRow(makeResult({ isPB: true, isSB: false }), 'OFFICIAL');
        expect(result.isPB).toBe(true);
        expect(result.isSB).toBe(false);
    });

    it('passes through isPB and isSB from result when heatStatus is UNCONFIRMED', () => {
        const result = mapResultRow(makeResult({ isPB: false, isSB: true }), 'UNCONFIRMED');
        expect(result.isPB).toBe(false);
        expect(result.isSB).toBe(true);
    });

    it('sets isPreliminary to true when heatStatus is UNCONFIRMED', () => {
        expect(mapResultRow(makeResult(), 'UNCONFIRMED').isPreliminary).toBe(true);
    });

    it('sets isPreliminary to false when heatStatus is OFFICIAL', () => {
        expect(mapResultRow(makeResult(), 'OFFICIAL').isPreliminary).toBe(false);
    });

    it('sets isPreliminary to false when heatStatus is SCHEDULED', () => {
        expect(mapResultRow(makeResult(), 'SCHEDULED').isPreliminary).toBe(false);
    });

    it('sets athlete.lastTeam from result.team', () => {
        const result = mapResultRow(makeResult({ team: 'Club X' }), 'OFFICIAL');
        expect(result.athlete.lastTeam).toBe('Club X');
    });
});

// ---------------------------------------------------------------------------
// mapHeatRow — structure flags and wind
// ---------------------------------------------------------------------------

describe('mapHeatRow', () => {
    it('sets isPreliminary to true when status is UNCONFIRMED', () => {
        expect(mapHeatRow(makeHeat({ status: 'UNCONFIRMED' })).isPreliminary).toBe(true);
    });

    it('sets isPreliminary to false when status is OFFICIAL', () => {
        expect(mapHeatRow(makeHeat({ status: 'OFFICIAL' })).isPreliminary).toBe(false);
    });

    it('sets isPreliminary to false when status is SCHEDULED', () => {
        expect(mapHeatRow(makeHeat({ status: 'SCHEDULED' })).isPreliminary).toBe(false);
    });

    it('includes wind in the output when non-null', () => {
        expect(mapHeatRow(makeHeat({ wind: 2.3 }))).toHaveProperty('wind', 2.3);
    });

    it('omits wind from the output when null', () => {
        expect(mapHeatRow(makeHeat({ wind: null }))).not.toHaveProperty('wind');
    });
});

// ---------------------------------------------------------------------------
// mapHeatRow — result sorting
// ---------------------------------------------------------------------------

describe('mapHeatRow result sorting', () => {
    it('sorts SCHEDULED results by lane ascending', () => {
        const results = [
            makeResult({ id: 'r3', lane: 3 }),
            makeResult({ id: 'r1', lane: 1 }),
            makeResult({ id: 'r2', lane: 2 }),
        ];
        const mapped = mapHeatRow(makeHeat({ status: 'SCHEDULED', results }));
        expect(mapped.results.map((r) => r.lane)).toEqual([1, 2, 3]);
    });

    it('sorts OFFICIAL results: OK results appear before non-OK results', () => {
        const results = [
            makeResult({ id: 'r-dns', status: 'DNS', place: null, sortValue: null }),
            makeResult({ id: 'r-ok', status: 'OK', place: 1, sortValue: 10.5 }),
        ];
        const mapped = mapHeatRow(makeHeat({ status: 'OFFICIAL', results }));
        expect(mapped.results[0].status).toBe('OK');
        expect(mapped.results[1].status).toBe('DNS');
    });

    it('sorts OFFICIAL OK results by place, then by sortValue', () => {
        const results = [
            makeResult({ id: 'r2', status: 'OK', place: 2, sortValue: 11.0 }),
            makeResult({ id: 'r1b', status: 'OK', place: 1, sortValue: 10.8 }),
            makeResult({ id: 'r1a', status: 'OK', place: 1, sortValue: 10.5 }),
        ];
        const mapped = mapHeatRow(makeHeat({ status: 'OFFICIAL', results }));
        expect(mapped.results.map((r) => r.id)).toEqual(['r1a', 'r1b', 'r2']);
    });

    it('sorts UNCONFIRMED results the same way as OFFICIAL (not by lane)', () => {
        const results = [
            makeResult({ id: 'r-dq', status: 'DQ', place: null, sortValue: null }),
            makeResult({ id: 'r1', status: 'OK', place: 1, sortValue: 10.0 }),
        ];
        const mapped = mapHeatRow(makeHeat({ status: 'UNCONFIRMED', results }));
        expect(mapped.results[0].status).toBe('OK');
        expect(mapped.results[1].status).toBe('DQ');
    });

    it('does not mutate the original results array', () => {
        const results = [
            makeResult({ id: 'r2', lane: 2 }),
            makeResult({ id: 'r1', lane: 1 }),
        ];
        const originalOrder = results.map((r) => r.id);
        mapHeatRow(makeHeat({ status: 'SCHEDULED', results }));
        expect(results.map((r) => r.id)).toEqual(originalOrder);
    });
});

// ---------------------------------------------------------------------------
// mapEventRow
// ---------------------------------------------------------------------------

describe('mapEventRow', () => {
    const makeEvent = (overrides: Record<string, any> = {}) => ({
        id: 'ev-1',
        discipline: { name: '100 Metres' } as { name: string } | null,
        customName: null as string | null,
        scheduledTime: null as Date | null,
        roundName: 'Final',
        gender: 'MALE',
        ageCategory: 'SENIOR',
        eventType: 'TRACK',
        heats: [] as ReturnType<typeof makeHeat>[],
        ...overrides,
    });

    it('uses discipline.name as disciplineName when discipline is present', () => {
        const result = mapEventRow(makeEvent({ discipline: { name: '100 Metres' }, customName: null }));
        expect(result.disciplineName).toBe('100 Metres');
    });

    it('uses customName as disciplineName when discipline is null', () => {
        const result = mapEventRow(makeEvent({ discipline: null, customName: 'Mixed 4x100' }));
        expect(result.disciplineName).toBe('Mixed 4x100');
    });

    it('maps all heats', () => {
        const event = makeEvent({
            heats: [makeHeat(), makeHeat({ id: 'heat-2' })],
        });
        expect(mapEventRow(event).heats).toHaveLength(2);
    });

    it('includes core event fields', () => {
        const event = makeEvent({ gender: 'FEMALE', ageCategory: 'U20', roundName: 'Semifinal' });
        const result = mapEventRow(event);
        expect(result).toMatchObject({
            id: 'ev-1',
            gender: 'FEMALE',
            ageCategory: 'U20',
            roundName: 'Semifinal',
            eventType: 'TRACK',
        });
    });
});
