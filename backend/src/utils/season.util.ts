export interface SeasonBounds {
    start: Date;
    end: Date;
}

// Indoor season spans two calendar years (Oct–Mar), so Oct–Dec uses current year for start
export function getSeasonBounds(date: Date): SeasonBounds {
    const month = date.getUTCMonth() + 1; // 1-based
    const year = date.getUTCFullYear();

    if (month >= 10) {
        return {
            start: new Date(Date.UTC(year, 9, 1)),     // Oct 1
            end: new Date(Date.UTC(year + 1, 2, 31)),  // Mar 31 next year
        };
    }

    if (month <= 3) {
        return {
            start: new Date(Date.UTC(year - 1, 9, 1)), // Oct 1 previous year
            end: new Date(Date.UTC(year, 2, 31)),       // Mar 31 current year
        };
    }

    return {
        start: new Date(Date.UTC(year, 3, 1)),  // Apr 1
        end: new Date(Date.UTC(year, 8, 30)),   // Sep 30
    };
}

export function getSeasonBoundsForYear(year: number, environment: 'INDOOR' | 'OUTDOOR'): SeasonBounds {
    if (environment === 'INDOOR') {
        return getSeasonBounds(new Date(Date.UTC(year, 10, 1))); // Nov 1 of year → Oct–Mar window
    }
    return getSeasonBounds(new Date(Date.UTC(year, 5, 1))); // Jun 1 of year → Apr–Sep window
}
