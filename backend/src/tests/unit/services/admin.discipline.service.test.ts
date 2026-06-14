import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../../errors/app.error';

// --- Prisma mock ---
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockFindMany = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function (this: any) {
        this.discipline = {
            findUnique: mockFindUnique,
            findMany: mockFindMany,
            create: mockCreate,
            update: mockUpdate,
            delete: mockDelete,
        };
    }),
    DisciplineType: {
        TRACK: 'TRACK',
        FIELD: 'FIELD',
    },
}));

vi.mock('../../../config/env', () => ({
    env: { JWT_SECRET: 'test-secret-key' },
}));

const { DisciplineAdminService } = await import('../../../services/admin.discipline.service');

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const baseDiscipline = {
    id: 1,
    code: '100',
    name: '100 Metres',
    type: 'TRACK' as const,
    isStandard: true,
};

const makeCountResult = (events: number) => ({
    _count: { events },
});

beforeEach(() => {
    mockFindUnique.mockReset();
    mockFindMany.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();
});

// ---------------------------------------------------------------------------
// list()
// ---------------------------------------------------------------------------
describe('DisciplineAdminService.list', () => {
    it('returns paginated result with data and nextCursor when rows fill a full page', async () => {
        mockFindMany.mockResolvedValue([baseDiscipline]);

        const result = await DisciplineAdminService.list({ take: 1 });

        expect(result.data).toHaveLength(1);
        expect(result.hasMore).toBe(true);
        expect(result.nextCursor).not.toBeNull();
    });

    it('returns empty data and hasMore false when no rows exist', async () => {
        mockFindMany.mockResolvedValue([]);

        const result = await DisciplineAdminService.list({});

        expect(result.data).toEqual([]);
        expect(result.hasMore).toBe(false);
        expect(result.nextCursor).toBeNull();
    });

    it('applies type filter to prisma where argument', async () => {
        mockFindMany.mockResolvedValue([]);

        await DisciplineAdminService.list({ type: 'TRACK' });

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ type: 'TRACK' }) })
        );
    });

    it('applies isStandard filter to prisma where argument', async () => {
        mockFindMany.mockResolvedValue([]);

        await DisciplineAdminService.list({ isStandard: false });

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ isStandard: false }) })
        );
    });
});

// ---------------------------------------------------------------------------
// getById()
// ---------------------------------------------------------------------------
describe('DisciplineAdminService.getById', () => {
    it('returns the discipline when found', async () => {
        mockFindUnique.mockResolvedValue(baseDiscipline);

        const result = await DisciplineAdminService.getById(1);

        expect(result).toEqual(baseDiscipline);
    });

    it('throws AppError 404 NOT_FOUND when findUnique returns null', async () => {
        mockFindUnique.mockResolvedValue(null);

        await expect(DisciplineAdminService.getById(99)).rejects.toMatchObject({
            statusCode: 404,
            code: 'NOT_FOUND',
        });
    });
});

// ---------------------------------------------------------------------------
// create()
// ---------------------------------------------------------------------------
describe('DisciplineAdminService.create', () => {
    it('returns the created discipline on success', async () => {
        mockCreate.mockResolvedValue(baseDiscipline);

        const result = await DisciplineAdminService.create({
            code: '100',
            name: '100 Metres',
            type: 'TRACK',
            isStandard: true,
        });

        expect(result).toEqual(baseDiscipline);
        expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('propagates Prisma P2002 error upward without swallowing it', async () => {
        const p2002 = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
        mockCreate.mockRejectedValue(p2002);

        await expect(
            DisciplineAdminService.create({ code: '100', name: '100 Metres', type: 'TRACK', isStandard: false })
        ).rejects.toMatchObject({ code: 'P2002' });
    });
});

// ---------------------------------------------------------------------------
// update()
// ---------------------------------------------------------------------------
describe('DisciplineAdminService.update', () => {
    it('returns the updated discipline on success', async () => {
        const updated = { ...baseDiscipline, name: 'Updated' };
        mockFindUnique.mockResolvedValue(baseDiscipline);
        mockUpdate.mockResolvedValue(updated);

        const result = await DisciplineAdminService.update(1, { name: 'Updated' });

        expect(result).toEqual(updated);
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 1 }, data: { name: 'Updated' } })
        );
    });

    it('throws NOT_FOUND AppError when getById finds nothing', async () => {
        mockFindUnique.mockResolvedValue(null);

        await expect(DisciplineAdminService.update(99, { name: 'X' })).rejects.toMatchObject({
            statusCode: 404,
            code: 'NOT_FOUND',
        });
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('propagates Prisma P2002 for duplicate code', async () => {
        const p2002 = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
        mockFindUnique.mockResolvedValue(baseDiscipline);
        mockUpdate.mockRejectedValue(p2002);

        await expect(DisciplineAdminService.update(1, { code: '200' })).rejects.toMatchObject({
            code: 'P2002',
        });
    });
});

// ---------------------------------------------------------------------------
// delete()
// ---------------------------------------------------------------------------
describe('DisciplineAdminService.delete', () => {
    it('calls prisma.discipline.delete when _count.events is 0', async () => {
        mockFindUnique
            .mockResolvedValueOnce(baseDiscipline)
            .mockResolvedValueOnce(makeCountResult(0));
        mockDelete.mockResolvedValue(baseDiscipline);

        await DisciplineAdminService.delete(1);

        expect(mockDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('throws AppError 409 DISCIPLINE_IN_USE when _count.events > 0', async () => {
        mockFindUnique
            .mockResolvedValueOnce(baseDiscipline)
            .mockResolvedValueOnce(makeCountResult(3));

        await expect(DisciplineAdminService.delete(1)).rejects.toMatchObject({
            statusCode: 409,
            code: 'DISCIPLINE_IN_USE',
        });
        expect(mockDelete).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND AppError when discipline does not exist', async () => {
        mockFindUnique.mockResolvedValue(null);

        await expect(DisciplineAdminService.delete(99)).rejects.toMatchObject({
            statusCode: 404,
            code: 'NOT_FOUND',
        });
        expect(mockDelete).not.toHaveBeenCalled();
    });
});
