import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAthleteUpsert = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function (this: any) {
        this.athlete = { upsert: mockAthleteUpsert };
        this.$transaction = mockTransaction;
    }),
    Gender: { MALE: 'MALE', FEMALE: 'FEMALE', MIXED: 'MIXED' },
}));

const { ResolutionService } = await import('../../../services/resolution.service');

const makeAthlete = (overrides: Record<string, any> = {}) => ({
    license: 'LIC-001',
    firstName: 'John',
    lastName: 'Doe',
    gender: 'MALE',
    birthDate: '15.06.1990',
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((ops: Promise<any>[]) => Promise.all(ops));
});

describe('ResolutionService.resolveAthletes', () => {
    it('returns a map of licenseNumber to internal id for each athlete', async () => {
        mockAthleteUpsert
            .mockResolvedValueOnce({ id: 'uuid-1', licenseNumber: 'A1' })
            .mockResolvedValueOnce({ id: 'uuid-2', licenseNumber: 'A2' });

        const result = await ResolutionService.resolveAthletes([
            makeAthlete({ license: 'A1' }),
            makeAthlete({ license: 'A2' }),
        ]);

        expect(result.get('A1')).toBe('uuid-1');
        expect(result.get('A2')).toBe('uuid-2');
        expect(result.size).toBe(2);
    });

    it('calls upsert once per athlete', async () => {
        mockAthleteUpsert
            .mockResolvedValueOnce({ id: 'uuid-1', licenseNumber: 'A1' })
            .mockResolvedValueOnce({ id: 'uuid-2', licenseNumber: 'A2' });

        await ResolutionService.resolveAthletes([
            makeAthlete({ license: 'A1' }),
            makeAthlete({ license: 'A2' }),
        ]);

        expect(mockAthleteUpsert).toHaveBeenCalledTimes(2);
    });

    it('upserts using licenseNumber as the where key', async () => {
        mockAthleteUpsert.mockResolvedValueOnce({ id: 'uuid-1', licenseNumber: 'LIC-XYZ' });

        await ResolutionService.resolveAthletes([makeAthlete({ license: 'LIC-XYZ' })]);

        expect(mockAthleteUpsert).toHaveBeenCalledWith(
            expect.objectContaining({ where: { licenseNumber: 'LIC-XYZ' } })
        );
    });

    it('converts DD.MM.YYYY birthDate to a UTC Date object in both create and update', async () => {
        mockAthleteUpsert.mockResolvedValueOnce({ id: 'uuid-1', licenseNumber: 'LIC-001' });

        await ResolutionService.resolveAthletes([makeAthlete({ birthDate: '15.06.1990' })]);

        const call = mockAthleteUpsert.mock.calls[0][0];
        const expected = new Date('1990-06-15T00:00:00Z');
        expect(call.create.birthDate).toEqual(expected);
        expect(call.update.birthDate).toEqual(expected);
    });

    it('sets birthDate to null when birthDate is null in the DTO', async () => {
        mockAthleteUpsert.mockResolvedValueOnce({ id: 'uuid-1', licenseNumber: 'LIC-001' });

        await ResolutionService.resolveAthletes([makeAthlete({ birthDate: null })]);

        const call = mockAthleteUpsert.mock.calls[0][0];
        expect(call.create.birthDate).toBeNull();
        expect(call.update.birthDate).toBeNull();
    });

    it('returns an empty map and skips upsert for an empty athletes array', async () => {
        const result = await ResolutionService.resolveAthletes([]);

        expect(result.size).toBe(0);
        expect(mockAthleteUpsert).not.toHaveBeenCalled();
    });

    it('calls $transaction exactly once containing all upsert promises', async () => {
        mockAthleteUpsert
            .mockResolvedValueOnce({ id: 'uuid-1', licenseNumber: 'A1' })
            .mockResolvedValueOnce({ id: 'uuid-2', licenseNumber: 'A2' });

        await ResolutionService.resolveAthletes([
            makeAthlete({ license: 'A1' }),
            makeAthlete({ license: 'A2' }),
        ]);

        expect(mockTransaction).toHaveBeenCalledOnce();
        expect(mockTransaction.mock.calls[0][0]).toHaveLength(2);
    });

    it('propagates errors thrown by $transaction', async () => {
        mockAthleteUpsert.mockResolvedValueOnce({ id: 'uuid-1', licenseNumber: 'LIC-001' });
        mockTransaction.mockRejectedValue(new Error('DB connection lost'));

        await expect(
            ResolutionService.resolveAthletes([makeAthlete()])
        ).rejects.toThrow('DB connection lost');
    });
});
