import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDisciplineFindMany = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function (this: any) {
        this.discipline = {
            findMany: mockDisciplineFindMany,
        };
    }),
}));

const { PublicDisciplineService } = await import('../../../services/public.discipline.service');
const { mapDisciplinePublic } = await import('../../../utils/public.mapper');

beforeEach(() => {
    vi.clearAllMocks();
});

// ===========================================================================
// PublicDisciplineService.listAll
// ===========================================================================

describe('PublicDisciplineService.listAll', () => {
    it('TEST-001: maps rows to { id, code, name, type } and strips isStandard', async () => {
        mockDisciplineFindMany.mockResolvedValue([
            { id: 1, code: '100m', name: '100 Metres', type: 'TRACK' },
        ]);
        const result = await PublicDisciplineService.listAll();
        expect(result).toEqual([{ id: 1, code: '100m', name: '100 Metres', type: 'TRACK' }]);
        expect(result[0]).not.toHaveProperty('isStandard');
    });

    it('TEST-002: returns [] when table is empty', async () => {
        mockDisciplineFindMany.mockResolvedValue([]);
        const result = await PublicDisciplineService.listAll();
        expect(result).toEqual([]);
    });

    it('TEST-001c: findMany is called with name asc orderBy and restricted select', async () => {
        mockDisciplineFindMany.mockResolvedValue([]);
        await PublicDisciplineService.listAll();
        expect(mockDisciplineFindMany).toHaveBeenCalledWith({
            select: { id: true, code: true, name: true, type: true },
            orderBy: { name: 'asc' },
        });
    });
});

// ===========================================================================
// mapDisciplinePublic (TEST-003)
// ===========================================================================

describe('mapDisciplinePublic', () => {
    it('TEST-003: output keys are exactly id, code, name, type — isStandard absent', () => {
        const input = { id: 42, code: '100m', name: '100 Metres', type: 'TRACK' };
        const result = mapDisciplinePublic(input);
        expect(Object.keys(result).sort()).toEqual(['code', 'id', 'name', 'type']);
        expect(result).toEqual({ id: 42, code: '100m', name: '100 Metres', type: 'TRACK' });
        expect(result).not.toHaveProperty('isStandard');
    });
});
