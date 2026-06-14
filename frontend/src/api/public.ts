import { apiFetch, apiFetchPaginated } from './client'

// ── Enums ────────────────────────────────────────────────────────────────────

export type CompetitionStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED'
export type CompetitionEnvironment = 'INDOOR' | 'OUTDOOR'
export type DisciplineType = 'TRACK' | 'FIELD'
export type Gender = 'MALE' | 'FEMALE' | 'MIXED'
export type AgeCategory = 'U14' | 'U16' | 'U18' | 'U20' | 'U23' | 'SENIOR' | 'MASTERS'
export type ResultStatus = 'OK' | 'DNS' | 'DNF' | 'DQ' | 'FS' | 'PENDING'
export type HeatStatus = 'SCHEDULED' | 'UNCONFIRMED' | 'OFFICIAL'

// ── Shared objects ───────────────────────────────────────────────────────────

export interface DisciplinePublic {
  id: number
  code: string
  name: string
  type: DisciplineType
}

export interface PublicAthleteRow {
  licenseNumber: string
  firstName: string
  lastName: string
  gender: Gender
  birthDate: string | null
  lastTeam: string | null
}

export interface CompetitionContext {
  id: string
  name: string
  dateStart: string
  environment: CompetitionEnvironment
}

// ── Calendar ─────────────────────────────────────────────────────────────────

export interface CompetitionCard {
  id: string
  name: string
  dateStart: string
  dateEnd: string
  location: string
  environment: CompetitionEnvironment
  status: CompetitionStatus
}

export interface CalendarParams {
  year?: number
  status?: CompetitionStatus
  environment?: CompetitionEnvironment
  cursor?: string
  take?: number
}

export function getCalendar(params: CalendarParams = {}) {
  return apiFetchPaginated<CompetitionCard>('/calendar', params)
}

export function getCalendarYears() {
  return apiFetch<number[]>('/calendar/years')
}

// ── Competition detail ────────────────────────────────────────────────────────

export interface PublicResultRow {
  id: string
  place: number | null
  lane: number
  bibNumber: string
  team: string
  status: ResultStatus
  mark: string | null
  sortValue: number | null
  reacTime?: number
  isPB: boolean
  isSB: boolean
  isPreliminary: boolean
  athlete: PublicAthleteRow
}

export interface PublicHeatRow {
  id: string
  status: HeatStatus
  isPreliminary: boolean
  wind?: number
  results: PublicResultRow[]
}

export interface PublicEventRow {
  id: string
  disciplineName: string | null
  gender: Gender
  ageCategory: AgeCategory
  eventType: DisciplineType
  roundName: string
  scheduledTime: string | null
  heats: PublicHeatRow[]
}

export interface CompetitionDetailPublic {
  id: string
  name: string
  dateStart: string
  dateEnd: string
  location: string
  environment: CompetitionEnvironment
  status: CompetitionStatus
  /** Keys are `YYYY-MM-DD` dates plus the literal key `"unscheduled"` for events without a scheduled day. */
  schedule: Record<string, PublicEventRow[]>
}

export function getCompetition(id: number | string) {
  return apiFetch<CompetitionDetailPublic>(`/competitions/${id}`, { cache: 'no-store' })
}

// ── Disciplines ───────────────────────────────────────────────────────────────

export function getDisciplines() {
  return apiFetch<DisciplinePublic[]>('/disciplines')
}

// ── Athletes ──────────────────────────────────────────────────────────────────

export interface AthleteSearchParams {
  q: string
  cursor?: string
  take?: number
}

export function searchAthletes(params: AthleteSearchParams) {
  return apiFetchPaginated<PublicAthleteRow>('/athletes', params)
}

export interface PbSbPoint {
  mark: string | null
  sortValue: number | null
  date: string | null
}

export interface PbSbRecord {
  disciplineId: number
  disciplineName: string | null
  environment: CompetitionEnvironment
  personalBest: PbSbPoint | null
  seasonBest: PbSbPoint | null
}

export interface AthleteProfile {
  athlete: PublicAthleteRow
  records: PbSbRecord[]
}

export function getAthlete(license: string) {
  return apiFetch<AthleteProfile>(`/athletes/${license}`)
}

export interface ResultsParams {
  environment?: CompetitionEnvironment
  disciplineId?: number
  cursor?: string
  take?: number
}

export interface AthleteResult {
  id: string
  mark: string | null
  sortValue: number | null
  reacTime: number | null
  place: number | null
  isPB: boolean
  isSB: boolean
  competition: CompetitionContext
  disciplineName: string | null
  gender: Gender
  ageCategory: AgeCategory
}

export function getAthleteResults(license: string, params: ResultsParams = {}) {
  return apiFetchPaginated<AthleteResult>(`/athletes/${license}/results`, params)
}

export interface ProgressionParams {
  disciplineId: number
  environment?: CompetitionEnvironment
}

export interface ProgressionPoint {
  date: string | null
  sortValue: number
  mark: string
  isPB: boolean
  isSB: boolean
  competitionId: string
  competitionName: string
}

/**
 * Returns all progression points for a discipline/environment pair.
 * Uses a manual query string (not `apiFetchPaginated`) because the response
 * is a flat array, not a cursor-paginated page.
 */
export function getAthleteProgression(license: string, params: ProgressionParams) {
  const qs = new URLSearchParams()
  qs.set('disciplineId', String(params.disciplineId))
  if (params.environment) qs.set('environment', params.environment)
  return apiFetch<ProgressionPoint[]>(`/athletes/${license}/progression?${qs}`)
}

// ── Rankings ──────────────────────────────────────────────────────────────────

export interface SeasonBounds {
  start: string
  end: string
}

export interface RankingsParams {
  disciplineId: number
  gender?: Gender
  ageCategory?: AgeCategory
  environment?: CompetitionEnvironment
  season?: number
  cursor?: string
  take?: number
}

export interface RankingResultRow {
  id: string
  mark: string | null
  sortValue: number | null
  isPB: boolean
  isSB: boolean
  competition: CompetitionContext
  disciplineName: string | null
  gender: Gender
  ageCategory: AgeCategory
}

export interface RankingRow {
  rank: number
  result: RankingResultRow
  athlete: PublicAthleteRow
}

interface RankingsPage {
  data: RankingRow[]
  nextCursor: string | null
  hasMore: boolean
  seasonBounds: SeasonBounds
}

/**
 * Fetches a cursor-paginated rankings page and also returns `seasonBounds`.
 * Uses a manual query string because `disciplineId` is required — the call
 * must never be made without it (enforced by `useRankings`).
 */
export async function getRankings(params: RankingsParams): Promise<{
  items: RankingRow[]
  nextCursor: string | null
  hasMore: boolean
  seasonBounds: SeasonBounds
}> {
  const qs = new URLSearchParams()
  qs.set('disciplineId', String(params.disciplineId))
  if (params.gender) qs.set('gender', params.gender)
  if (params.ageCategory) qs.set('ageCategory', params.ageCategory)
  if (params.environment) qs.set('environment', params.environment)
  if (params.season !== undefined) qs.set('season', String(params.season))
  if (params.cursor) qs.set('cursor', params.cursor)
  if (params.take !== undefined) qs.set('take', String(params.take))
  const page = await apiFetch<RankingsPage>(`/rankings?${qs}`)
  return {
    items: page.data,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    seasonBounds: page.seasonBounds,
  }
}
