import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResultFindMany = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function (this: any) {
        this.result = {
            findMany: mockResultFindMany,
        };
    }),
}));

const { PublicRankingService } = await import('../../../services/public.ranking.service');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeAthlete = (id: string, name: string) => ({
    id,
    licenseNumber: `LIC-${id}`,
    firstName: name,
    lastName: 'Surname',
    gender: 'MALE',
    birthDate: null,
});

const makeCompCtx = (dateStart: Date = new Date('2025-07-01')) => ({
    id: 'comp-1',
    name: 'Test Competition',
    dateStart,
    environment: 'OUTDOOR',
});

const makeEventCtx = (overrides: Record<string, unknown> = {}) => ({
    disciplineId: 1,
    gender: 'MALE',
    ageCategory: 'SENIOR',
    customName: null,
    discipline: { name: '100m' },
    competition: makeCompCtx(),
    ...overrides,
});

const makeHeatCtx = (overrides: Record<string, unknown> = {}) => ({
    status: 'OFFICIAL',
    event: makeEventCtx(),
    ...overrides,
});

const uuid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

const makeResult = (
    id: string,
    athleteId: string,
    sortValue: number,
    compDateStart: Date = new Date('2025-07-01'),
) => ({
    id: uuid(parseInt(id.replace(/\D/g, ''), 10) || 0),
    athleteId,
    sortValue,
    mark: `${sortValue}`,
    status: 'OK',
    isPB: false,
    isSB: false,
    team: 'Test Club',
    athlete: makeAthlete(athleteId, `Athlete${athleteId}`),
    heat: makeHeatCtx({ event: makeEventCtx({ competition: makeCompCtx(compDateStart) }) }),
});

beforeEach(() => {
    vi.clearAllMocks();
});

const baseQuery = { disciplineId: 1, take: 20 };

// ===========================================================================
// Deduplication
// ===========================================================================

describe('PublicRankingService.getRankings — deduplication', () => {
    it('TEST-022: keeps one result per athlete with the lowest sortValue', async () => {
        mockResultFindMany.mockResolvedValue([
            makeResult('r1', 'a1', 10.5),
            makeResult('r2', 'a1', 10.8),
        ]);
        const result = await PublicRankingService.getRankings(baseQuery);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].result.sortValue).toBe(10.5);
    });

    it('TEST-023: when two athletes share sortValue, earliest competition.dateStart appears first', async () => {
        mockResultFindMany.mockResolvedValue([
            makeResult('r1', 'a1', 10.5, new Date('2025-07-15')),
            makeResult('r2', 'a2', 10.5, new Date('2025-04-01')),
        ]);
        const result = await PublicRankingService.getRankings(baseQuery);
        expect(result.data[0].athlete.licenseNumber).toBe('LIC-a2');
        expect(result.data[1].athlete.licenseNumber).toBe('LIC-a1');
    });
});

// ===========================================================================
// Display ranks
// ===========================================================================

describe('PublicRankingService.getRankings — display rank assignment', () => {
    it('TEST-024: two athletes tied at rank 1 both get rank=1; next athlete gets rank=3', async () => {
        mockResultFindMany.mockResolvedValue([
            makeResult('r1', 'a1', 10.5),
            makeResult('r2', 'a2', 10.5),
            makeResult('r3', 'a3', 11.0),
        ]);
        const result = await PublicRankingService.getRankings(baseQuery);
        expect(result.data[0].rank).toBe(1);
        expect(result.data[1].rank).toBe(1);
        expect(result.data[2].rank).toBe(3);
    });

    it('single athlete gets rank=1', async () => {
        mockResultFindMany.mockResolvedValue([makeResult('r1', 'a1', 10.5)]);
        const result = await PublicRankingService.getRankings(baseQuery);
        expect(result.data[0].rank).toBe(1);
    });

    it('athlete.lastTeam is set from result.team', async () => {
        mockResultFindMany.mockResolvedValue([makeResult('r1', 'a1', 10.5)]);
        const result = await PublicRankingService.getRankings(baseQuery);
        expect(result.data[0].athlete.lastTeam).toBe('Test Club');
    });
});

// ===========================================================================
// Season bounds
// ===========================================================================

describe('PublicRankingService.getRankings — season bounds', () => {
    it('TEST-025: no season param → current season bounds applied to Prisma where', async () => {
        mockResultFindMany.mockResolvedValue([]);
        await PublicRankingService.getRankings(baseQuery);
        const where = mockResultFindMany.mock.calls[0][0].where;
        expect(where.heat.event.competition.dateStart).toHaveProperty('gte');
        expect(where.heat.event.competition.dateStart).toHaveProperty('lte');
    });

    it('TEST-026: season=2025, environment=INDOOR → Oct 2025 – Mar 2026 bounds applied', async () => {
        mockResultFindMany.mockResolvedValue([]);
        await PublicRankingService.getRankings({ ...baseQuery, season: 2025, environment: 'INDOOR' });
        const where = mockResultFindMany.mock.calls[0][0].where;
        const dateFilter = where.heat.event.competition.dateStart;
        expect(dateFilter.gte).toEqual(new Date(Date.UTC(2025, 9, 1)));
        expect(dateFilter.lte).toEqual(new Date(Date.UTC(2026, 2, 31)));
    });
});

// ===========================================================================
// Cursor pagination
// ===========================================================================

describe('PublicRankingService.getRankings — cursor pagination', () => {
    it('empty result set returns { data: [], nextCursor: null, hasMore: false }', async () => {
        mockResultFindMany.mockResolvedValue([]);
        const result = await PublicRankingService.getRankings(baseQuery);
        expect(result).toEqual(
            expect.objectContaining({ data: [], nextCursor: null, hasMore: false }),
        );
    });

    it('TEST-029: last page has nextCursor=null and hasMore=false', async () => {
        mockResultFindMany.mockResolvedValue([makeResult('r1', 'a1', 10.5)]);
        const result = await PublicRankingService.getRankings({ ...baseQuery, take: 20 });
        expect(result.nextCursor).toBeNull();
        expect(result.hasMore).toBe(false);
    });

    it('TEST-028: cursor at index 2 of 10-entry list with take=3 returns entries [3,4,5] and hasMore=true', async () => {
        const results = Array.from({ length: 10 }, (_, i) =>
            makeResult(`r${i}`, `a${i}`, 10 + i * 0.1),
        );
        mockResultFindMany.mockResolvedValue(results);

        // First get all without cursor to find the cursor id at index 2
        const first = await PublicRankingService.getRankings({ ...baseQuery, take: 20 });
        const cursorAtIndex2 = first.data[2].result.id;

        // Encode cursor (simulate what client would have)
        const { encodeCursor } = await import('../../../utils/pagination.util');
        const cursor = encodeCursor(cursorAtIndex2);

        // Now fetch with cursor
        mockResultFindMany.mockResolvedValue(results);
        const paged = await PublicRankingService.getRankings({ ...baseQuery, take: 3, cursor });
        expect(paged.data).toHaveLength(3);
        expect(paged.data[0].result.id).toBe(results[3].id);
        expect(paged.hasMore).toBe(true);
    });

    it('UNCONFIRMED heat results are excluded (Prisma where enforces heat.status=OFFICIAL)', async () => {
        mockResultFindMany.mockResolvedValue([]);
        await PublicRankingService.getRankings(baseQuery);
        const where = mockResultFindMany.mock.calls[0][0].where;
        expect(where.heat.status).toBe('OFFICIAL');
    });
});
