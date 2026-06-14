import { deriveStatus } from './competition.util';

export interface DisciplinePublicInput {
    id: number;
    code: string;
    name: string;
    type: string;
}

export function mapDisciplinePublic(input: DisciplinePublicInput) {
    return { id: input.id, code: input.code, name: input.name, type: input.type };
}

type HeatStatusString = 'SCHEDULED' | 'UNCONFIRMED' | 'OFFICIAL';

export interface AthleteRow {
    licenseNumber: string;
    firstName: string;
    lastName: string;
    gender: string;
    birthDate: Date | null;
}

interface CompetitionCardInput {
    id: string;
    name: string;
    dateStart: Date;
    dateEnd: Date;
    location: string;
    environment: string;
}

interface ResultInput {
    id: string;
    place: number | null;
    lane: number;
    bibNumber: string;
    team: string;
    status: string;
    mark: string | null;
    sortValue: number | null;
    reacTime: number | null;
    isPB: boolean;
    isSB: boolean;
    athlete: AthleteRow;
}

interface HeatInput {
    id: string;
    status: HeatStatusString;
    wind: number | null;
    results: ResultInput[];
}

interface EventInput {
    id: string;
    discipline?: { name: string } | null;
    customName?: string | null;
    scheduledTime?: Date | null;
    roundName: string;
    gender: string;
    ageCategory: string;
    eventType: string;
    heats: HeatInput[];
}

export function mapCompetitionCard(comp: CompetitionCardInput) {
    return {
        id: comp.id,
        name: comp.name,
        dateStart: comp.dateStart,
        dateEnd: comp.dateEnd,
        location: comp.location,
        environment: comp.environment,
        status: deriveStatus(comp.dateStart, comp.dateEnd),
    };
}

export function mapAthleteRow(athlete: AthleteRow, lastTeam?: string | null) {
    return {
        licenseNumber: athlete.licenseNumber,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        gender: athlete.gender,
        birthDate: athlete.birthDate,
        lastTeam: lastTeam ?? null,
    };
}

function sortResultsForHeat(heat: HeatInput): ResultInput[] {
    if (heat.status === 'SCHEDULED') {
        return [...heat.results].sort((a, b) => (a.lane ?? 999) - (b.lane ?? 999));
    }
    return [...heat.results].sort((a, b) => {
        const statusDiff = (a.status !== 'OK' ? 1 : 0) - (b.status !== 'OK' ? 1 : 0);
        if (statusDiff !== 0) return statusDiff;
        const placeDiff = (a.place ?? 999) - (b.place ?? 999);
        if (placeDiff !== 0) return placeDiff;
        return (a.sortValue ?? 999999) - (b.sortValue ?? 999999);
    });
}

export function mapResultRow(result: ResultInput, heatStatus: HeatStatusString) {
    return {
        id: result.id,
        place: result.place,
        lane: result.lane,
        bibNumber: result.bibNumber,
        team: result.team,
        status: result.status,
        mark: result.mark,
        sortValue: result.sortValue,
        ...(result.reacTime !== null ? { reacTime: result.reacTime } : {}),
        isPB: heatStatus !== 'SCHEDULED' ? result.isPB : false,
        isSB: heatStatus !== 'SCHEDULED' ? result.isSB : false,
        isPreliminary: heatStatus === 'UNCONFIRMED',
        athlete: mapAthleteRow(result.athlete, result.team),
    };
}

export function mapHeatRow(heat: HeatInput) {
    return {
        id: heat.id,
        status: heat.status,
        isPreliminary: heat.status === 'UNCONFIRMED',
        ...(heat.wind !== null ? { wind: heat.wind } : {}),
        results: sortResultsForHeat(heat).map(r => mapResultRow(r, heat.status)),
    };
}

export function mapEventRow(event: EventInput) {
    return {
        id: event.id,
        disciplineName: event.discipline?.name ?? event.customName,
        gender: event.gender,
        ageCategory: event.ageCategory,
        eventType: event.eventType,
        roundName: event.roundName,
        scheduledTime: event.scheduledTime,
        heats: event.heats.map(mapHeatRow),
    };
}
