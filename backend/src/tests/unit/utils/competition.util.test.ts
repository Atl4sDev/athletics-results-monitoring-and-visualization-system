import { describe, it, expect, vi, afterEach } from 'vitest';
import { CompetitionStatus } from '@prisma/client';

vi.mock('@prisma/client', () => ({
    CompetitionStatus: {
        UPCOMING: 'UPCOMING',
        ONGOING: 'ONGOING',
        COMPLETED: 'COMPLETED',
    },
}));

const { deriveStatus } = await import('../../../utils/competition.util');

const NOW = new Date('2026-05-24T12:00:00.000Z');

afterEach(() => {
    vi.useRealTimers();
});

describe('deriveStatus', () => {
    it('returns UPCOMING when dateStart is in the future', () => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);

        const dateStart = new Date(NOW.getTime() + 1000);
        const dateEnd = new Date(NOW.getTime() + 86400000);

        expect(deriveStatus(dateStart, dateEnd)).toBe(CompetitionStatus.UPCOMING);
    });

    it('returns COMPLETED when dateEnd is in the past', () => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);

        const dateStart = new Date(NOW.getTime() - 86400000);
        const dateEnd = new Date(NOW.getTime() - 1000);

        expect(deriveStatus(dateStart, dateEnd)).toBe(CompetitionStatus.COMPLETED);
    });

    it('returns ONGOING when now is strictly between dateStart and dateEnd', () => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);

        const dateStart = new Date(NOW.getTime() - 3600000);
        const dateEnd = new Date(NOW.getTime() + 3600000);

        expect(deriveStatus(dateStart, dateEnd)).toBe(CompetitionStatus.ONGOING);
    });

    it('returns ONGOING when dateStart === dateEnd === now (exact boundary)', () => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);

        expect(deriveStatus(new Date(NOW), new Date(NOW))).toBe(CompetitionStatus.ONGOING);
    });

    it('returns ONGOING when dateStart is now and dateEnd is in the future', () => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);

        const dateStart = new Date(NOW);
        const dateEnd = new Date(NOW.getTime() + 86400000);

        expect(deriveStatus(dateStart, dateEnd)).toBe(CompetitionStatus.ONGOING);
    });

    it('returns COMPLETED when dateEnd is exactly 1ms in the past', () => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);

        const dateStart = new Date(NOW.getTime() - 86400000);
        const dateEnd = new Date(NOW.getTime() - 1);

        expect(deriveStatus(dateStart, dateEnd)).toBe(CompetitionStatus.COMPLETED);
    });
});
