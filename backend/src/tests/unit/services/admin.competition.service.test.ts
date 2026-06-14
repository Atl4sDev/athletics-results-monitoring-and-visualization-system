import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppError } from '../../../errors/app.error';

// --- Prisma mock ---
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockFindMany = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function (this: any) {
        this.competition = {
            findUnique: mockFindUnique,
            findMany: mockFindMany,
            create: mockCreate,
            update: mockUpdate,
            delete: mockDelete,
        };
        this.result = { deleteMany: vi.fn().mockResolvedValue({}) };
        this.heat = { deleteMany: vi.fn().mockResolvedValue({}) };
        this.event = { deleteMany: vi.fn().mockResolvedValue({}) };
        this.$transaction = vi.fn(async (fn: (tx: any) => Promise<any>) => fn(this));
    }),
    CompetitionStatus: {
        UPCOMING: 'UPCOMING',
        ONGOING: 'ONGOING',
        COMPLETED: 'COMPLETED',
    },
    CompetitionEnvironment: {
        INDOOR: 'INDOOR',
        OUTDOOR: 'OUTDOOR',
    },
}));

// --- crypto mock: always returns 32 bytes of 0x61 → '6161...61' (64 chars) ---
const FIXED_TOKEN = '61'.repeat(32); // hex encoding of 0x61 repeated 32 times
vi.mock('node:crypto', () => ({
    randomBytes: vi.fn(() => Buffer.alloc(32, 0x61)),
}));

// --- pagination helpers (real implementations are simple enough to use directly) ---
vi.mock('../../../utils/pagination.util', () => ({
    buildPrismaPage: vi.fn((cursor?: string, take = 20) => {
        if (cursor) return { take, skip: 1, cursor: { id: Buffer.from(cursor, 'base64url').toString('utf8') } };
        return { take, skip: 0 };
    }),
    buildPaginatedResult: vi.fn(<T extends { id: string }>(items: T[], take: number) => ({
        data: items,
        nextCursor: items.length === take ? Buffer.from(items[items.length - 1].id).toString('base64url') : null,
        hasMore: items.length === take,
    })),
}));

// --- syncEmitter mock ---
const mockSyncEmit = vi.hoisted(() => vi.fn());

vi.mock('../../../events/sync.events', () => ({
    syncEmitter: { emit: mockSyncEmit },
    EVENTS: { RESULTS_UPDATED: 'RESULTS_UPDATED', SCHEDULE_UPDATED: 'SCHEDULE_UPDATED' },
}));

// --- env mock to prevent import failures ---
vi.mock('../../../config/env', () => ({
    env: { JWT_SECRET: 'test-secret-key' },
}));

const { CompetitionAdminService } = await import('../../../services/admin.competition.service');

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const NOW = new Date('2026-05-24T12:00:00.000Z');

const baseCompetition = {
    id: 'comp-uuid-1',
    name: 'Test Championship',
    dateStart: new Date('2026-06-01T00:00:00.000Z'),
    dateEnd: new Date('2026-06-03T00:00:00.000Z'),
    location: 'Kyiv',
    status: 'UPCOMING' as const,
    environment: 'OUTDOOR' as const,
    documents: null,
    syncToken: FIXED_TOKEN,
};

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mockFindUnique.mockReset();
    mockFindMany.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();
    mockSyncEmit.mockReset();
});

afterEach(() => {
    vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// list()
// ---------------------------------------------------------------------------
describe('CompetitionAdminService.list', () => {
    const listItem = { ...baseCompetition };
    delete (listItem as any).syncToken;

    it('no filters: findMany called with empty where, returns paginated data without syncToken', async () => {
        const itemWithoutToken = { ...baseCompetition };
        delete (itemWithoutToken as any).syncToken;
        mockFindMany.mockResolvedValue([itemWithoutToken]);

        const result = await CompetitionAdminService.list({});

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: {} })
        );
        expect(result.data[0]).not.toHaveProperty('syncToken');
    });

    it('year=2026: where.dateStart contains correct gte/lt boundaries', async () => {
        mockFindMany.mockResolvedValue([]);

        await CompetitionAdminService.list({ year: 2026 });

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    dateStart: {
                        gte: new Date('2026-01-01'),
                        lt: new Date('2027-01-01'),
                    },
                },
            })
        );
    });

    it('status=ONGOING: where contains { status: "ONGOING" }', async () => {
        mockFindMany.mockResolvedValue([]);

        await CompetitionAdminService.list({ status: 'ONGOING' });

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { status: 'ONGOING' } })
        );
    });

    it('cursor provided: buildPrismaPage receives the cursor value', async () => {
        const cursorId = 'comp-uuid-1';
        const encoded = Buffer.from(cursorId).toString('base64url');
        mockFindMany.mockResolvedValue([]);

        const { buildPrismaPage } = await import('../../../utils/pagination.util');
        await CompetitionAdminService.list({ cursor: encoded });

        expect(buildPrismaPage).toHaveBeenCalledWith(encoded, 20);
    });

    it('status drift: prisma.update called fire-and-forget when stored status differs from derived', async () => {
        const pastStart = new Date(NOW.getTime() - 86400000);
        const futureEnd = new Date(NOW.getTime() + 86400000);
        const driftedItem = {
            ...baseCompetition,
            dateStart: pastStart,
            dateEnd: futureEnd,
            status: 'UPCOMING' as const, // stored says UPCOMING but now is ONGOING
        };
        delete (driftedItem as any).syncToken;
        mockFindMany.mockResolvedValue([driftedItem]);
        mockUpdate.mockResolvedValue({});

        await CompetitionAdminService.list({});

        // Allow micro-task queue to flush so the fire-and-forget update runs
        await Promise.resolve();
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: driftedItem.id }, data: { status: 'ONGOING' } })
        );
    });
});

// ---------------------------------------------------------------------------
// getById()
// ---------------------------------------------------------------------------
describe('CompetitionAdminService.getById', () => {
    it('found: returned object includes syncToken and derived status', async () => {
        mockFindUnique.mockResolvedValue({ ...baseCompetition });

        const result = await CompetitionAdminService.getById('comp-uuid-1');

        expect(result).toHaveProperty('syncToken', FIXED_TOKEN);
        expect(result.status).toBe('UPCOMING');
    });

    it('not found: throws AppError 404 NOT_FOUND', async () => {
        mockFindUnique.mockResolvedValue(null);

        await expect(CompetitionAdminService.getById('missing-id')).rejects.toMatchObject({
            statusCode: 404,
            code: 'NOT_FOUND',
        });
    });

    it('status drift: prisma.update called fire-and-forget', async () => {
        const drifted = {
            ...baseCompetition,
            dateStart: new Date(NOW.getTime() - 86400000),
            dateEnd: new Date(NOW.getTime() + 86400000),
            status: 'UPCOMING' as const,
        };
        mockFindUnique.mockResolvedValue(drifted);
        mockUpdate.mockResolvedValue({});

        await CompetitionAdminService.getById(drifted.id);

        await Promise.resolve();
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: drifted.id }, data: { status: 'ONGOING' } })
        );
    });
});

// ---------------------------------------------------------------------------
// create()
// ---------------------------------------------------------------------------
describe('CompetitionAdminService.create', () => {
    const futureDateStart = new Date(NOW.getTime() + 86400000);
    const futureDateEnd = new Date(NOW.getTime() + 2 * 86400000);

    it('syncToken in Prisma create call equals the expected 64-char hex', async () => {
        mockCreate.mockResolvedValue({ ...baseCompetition, dateStart: futureDateStart, dateEnd: futureDateEnd });

        await CompetitionAdminService.create({
            name: 'Test',
            dateStart: futureDateStart,
            dateEnd: futureDateEnd,
            location: 'Kyiv',
            environment: 'OUTDOOR',
        });

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ syncToken: FIXED_TOKEN }) })
        );
    });

    it('future dateStart: status UPCOMING stored', async () => {
        mockCreate.mockResolvedValue({});

        await CompetitionAdminService.create({
            name: 'Test',
            dateStart: futureDateStart,
            dateEnd: futureDateEnd,
            location: 'Kyiv',
            environment: 'OUTDOOR',
        });

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: 'UPCOMING' }) })
        );
    });

    it('dateStart in past, dateEnd in future: status ONGOING stored', async () => {
        mockCreate.mockResolvedValue({});

        await CompetitionAdminService.create({
            name: 'Test',
            dateStart: new Date(NOW.getTime() - 86400000),
            dateEnd: new Date(NOW.getTime() + 86400000),
            location: 'Kyiv',
            environment: 'OUTDOOR',
        });

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: 'ONGOING' }) })
        );
    });

    it('past dateEnd: status COMPLETED stored', async () => {
        mockCreate.mockResolvedValue({});

        await CompetitionAdminService.create({
            name: 'Test',
            dateStart: new Date(NOW.getTime() - 2 * 86400000),
            dateEnd: new Date(NOW.getTime() - 86400000),
            location: 'Kyiv',
            environment: 'OUTDOOR',
        });

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) })
        );
    });
});

// ---------------------------------------------------------------------------
// update()
// ---------------------------------------------------------------------------
describe('CompetitionAdminService.update', () => {
    it('not found: throws AppError 404', async () => {
        mockFindUnique.mockResolvedValue(null);

        await expect(CompetitionAdminService.update('missing-id', { name: 'X' })).rejects.toMatchObject({
            statusCode: 404,
            code: 'NOT_FOUND',
        });
    });

    it('DTO includes new dates: effective dates computed correctly, status recomputed, SCHEDULE_UPDATED emitted', async () => {
        mockFindUnique.mockResolvedValue({ ...baseCompetition });
        mockUpdate.mockResolvedValue({});

        const newStart = new Date(NOW.getTime() - 86400000);
        const newEnd = new Date(NOW.getTime() + 86400000);

        await CompetitionAdminService.update('comp-uuid-1', { dateStart: newStart, dateEnd: newEnd });

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'ONGOING' }),
            })
        );
        expect(mockSyncEmit).toHaveBeenCalledWith('SCHEDULE_UPDATED', { competitionId: 'comp-uuid-1' });
    });

    it('DTO contains only name: existing dates used for status recompute, SCHEDULE_UPDATED emitted', async () => {
        const existing = {
            ...baseCompetition,
            dateStart: new Date(NOW.getTime() + 86400000),
            dateEnd: new Date(NOW.getTime() + 2 * 86400000),
            status: 'UPCOMING' as const,
        };
        mockFindUnique.mockResolvedValue(existing);
        mockUpdate.mockResolvedValue({});

        await CompetitionAdminService.update('comp-uuid-1', { name: 'Updated Name' });

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ name: 'Updated Name', status: 'UPCOMING' }),
            })
        );
        expect(mockSyncEmit).toHaveBeenCalledWith('SCHEDULE_UPDATED', { competitionId: 'comp-uuid-1' });
    });

    it('not found: syncEmitter.emit NOT called', async () => {
        mockFindUnique.mockResolvedValue(null);

        await expect(CompetitionAdminService.update('missing-id', { name: 'X' })).rejects.toMatchObject({
            statusCode: 404,
            code: 'NOT_FOUND',
        });
        expect(mockSyncEmit).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// delete()
// ---------------------------------------------------------------------------
describe('CompetitionAdminService.delete', () => {
    it('not found: throws AppError 404', async () => {
        mockFindUnique.mockResolvedValue(null);

        await expect(CompetitionAdminService.delete('missing-id')).rejects.toMatchObject({
            statusCode: 404,
            code: 'NOT_FOUND',
        });
    });

    it('deriveStatus returns ONGOING: throws AppError 409 COMPETITION_ONGOING', async () => {
        const ongoing = {
            ...baseCompetition,
            dateStart: new Date(NOW.getTime() - 3600000),
            dateEnd: new Date(NOW.getTime() + 3600000),
            status: 'ONGOING' as const,
        };
        mockFindUnique.mockResolvedValue(ongoing);

        await expect(CompetitionAdminService.delete(ongoing.id)).rejects.toMatchObject({
            statusCode: 409,
            code: 'COMPETITION_ONGOING',
        });
        expect(mockDelete).not.toHaveBeenCalled();
    });

    it('deriveStatus returns UPCOMING: prisma.competition.delete called', async () => {
        const upcoming = {
            ...baseCompetition,
            dateStart: new Date(NOW.getTime() + 86400000),
            dateEnd: new Date(NOW.getTime() + 2 * 86400000),
            status: 'UPCOMING' as const,
        };
        mockFindUnique.mockResolvedValue(upcoming);
        mockDelete.mockResolvedValue(upcoming);

        await CompetitionAdminService.delete(upcoming.id);

        expect(mockDelete).toHaveBeenCalledWith({ where: { id: upcoming.id } });
    });

    it('deriveStatus returns COMPLETED: prisma.competition.delete called', async () => {
        const completed = {
            ...baseCompetition,
            dateStart: new Date(NOW.getTime() - 2 * 86400000),
            dateEnd: new Date(NOW.getTime() - 86400000),
            status: 'COMPLETED' as const,
        };
        mockFindUnique.mockResolvedValue(completed);
        mockDelete.mockResolvedValue(completed);

        await CompetitionAdminService.delete(completed.id);

        expect(mockDelete).toHaveBeenCalledWith({ where: { id: completed.id } });
    });
});

// ---------------------------------------------------------------------------
// regenerateToken()
// ---------------------------------------------------------------------------
describe('CompetitionAdminService.regenerateToken', () => {
    it('not found: throws AppError 404', async () => {
        mockFindUnique.mockResolvedValue(null);

        await expect(CompetitionAdminService.regenerateToken('missing-id')).rejects.toMatchObject({
            statusCode: 404,
            code: 'NOT_FOUND',
        });
    });

    it('found: prisma.update called with new syncToken, method returns { syncToken }', async () => {
        mockFindUnique.mockResolvedValue({ ...baseCompetition });
        mockUpdate.mockResolvedValue({});

        const result = await CompetitionAdminService.regenerateToken('comp-uuid-1');

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ syncToken: FIXED_TOKEN }) })
        );
        expect(result).toEqual({ syncToken: FIXED_TOKEN });
        expect(result.syncToken).toHaveLength(64);
    });
});
