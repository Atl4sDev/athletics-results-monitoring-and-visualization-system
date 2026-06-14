import { describe, it, expect } from 'vitest';
import { getSeasonBounds, getSeasonBoundsForYear } from '../../../utils/season.util';

describe('getSeasonBounds', () => {
    // Indoor season (Oct–Mar)

    it('Oct 15 2024 → indoor {2024-10-01, 2025-03-31}', () => {
        const bounds = getSeasonBounds(new Date(Date.UTC(2024, 9, 15)));
        expect(bounds.start).toEqual(new Date(Date.UTC(2024, 9, 1)));
        expect(bounds.end).toEqual(new Date(Date.UTC(2025, 2, 31)));
    });

    it('Dec 31 2024 → same indoor season {2024-10-01, 2025-03-31}', () => {
        const bounds = getSeasonBounds(new Date(Date.UTC(2024, 11, 31)));
        expect(bounds.start).toEqual(new Date(Date.UTC(2024, 9, 1)));
        expect(bounds.end).toEqual(new Date(Date.UTC(2025, 2, 31)));
    });

    it('Jan 10 2025 → same indoor season as Oct 2024 {2024-10-01, 2025-03-31}', () => {
        const bounds = getSeasonBounds(new Date(Date.UTC(2025, 0, 10)));
        expect(bounds.start).toEqual(new Date(Date.UTC(2024, 9, 1)));
        expect(bounds.end).toEqual(new Date(Date.UTC(2025, 2, 31)));
    });

    it('Mar 31 2025 → indoor boundary end {2025-03-31}', () => {
        const bounds = getSeasonBounds(new Date(Date.UTC(2025, 2, 31)));
        expect(bounds.start).toEqual(new Date(Date.UTC(2024, 9, 1)));
        expect(bounds.end).toEqual(new Date(Date.UTC(2025, 2, 31)));
    });

    // Outdoor season (Apr–Sep)

    it('Apr 1 2025 → outdoor boundary start {2025-04-01, 2025-09-30}', () => {
        const bounds = getSeasonBounds(new Date(Date.UTC(2025, 3, 1)));
        expect(bounds.start).toEqual(new Date(Date.UTC(2025, 3, 1)));
        expect(bounds.end).toEqual(new Date(Date.UTC(2025, 8, 30)));
    });

    it('Jul 4 2025 → outdoor season {2025-04-01, 2025-09-30}', () => {
        const bounds = getSeasonBounds(new Date(Date.UTC(2025, 6, 4)));
        expect(bounds.start).toEqual(new Date(Date.UTC(2025, 3, 1)));
        expect(bounds.end).toEqual(new Date(Date.UTC(2025, 8, 30)));
    });

    it('Sep 30 2025 → outdoor boundary end {2025-09-30}', () => {
        const bounds = getSeasonBounds(new Date(Date.UTC(2025, 8, 30)));
        expect(bounds.start).toEqual(new Date(Date.UTC(2025, 3, 1)));
        expect(bounds.end).toEqual(new Date(Date.UTC(2025, 8, 30)));
    });

    it('Oct 1 2025 → start of next indoor season {2025-10-01, 2026-03-31}', () => {
        const bounds = getSeasonBounds(new Date(Date.UTC(2025, 9, 1)));
        expect(bounds.start).toEqual(new Date(Date.UTC(2025, 9, 1)));
        expect(bounds.end).toEqual(new Date(Date.UTC(2026, 2, 31)));
    });
});

describe('getSeasonBoundsForYear', () => {
    it('TEST-030: (2025, INDOOR) → {2025-10-01, 2026-03-31}', () => {
        const bounds = getSeasonBoundsForYear(2025, 'INDOOR');
        expect(bounds.start).toEqual(new Date(Date.UTC(2025, 9, 1)));
        expect(bounds.end).toEqual(new Date(Date.UTC(2026, 2, 31)));
    });

    it('TEST-031: (2025, OUTDOOR) → {2025-04-01, 2025-09-30}', () => {
        const bounds = getSeasonBoundsForYear(2025, 'OUTDOOR');
        expect(bounds.start).toEqual(new Date(Date.UTC(2025, 3, 1)));
        expect(bounds.end).toEqual(new Date(Date.UTC(2025, 8, 30)));
    });

    it('(2024, INDOOR) → {2024-10-01, 2025-03-31}', () => {
        const bounds = getSeasonBoundsForYear(2024, 'INDOOR');
        expect(bounds.start).toEqual(new Date(Date.UTC(2024, 9, 1)));
        expect(bounds.end).toEqual(new Date(Date.UTC(2025, 2, 31)));
    });

    it('(2024, OUTDOOR) → {2024-04-01, 2024-09-30}', () => {
        const bounds = getSeasonBoundsForYear(2024, 'OUTDOOR');
        expect(bounds.start).toEqual(new Date(Date.UTC(2024, 3, 1)));
        expect(bounds.end).toEqual(new Date(Date.UTC(2024, 8, 30)));
    });
});
