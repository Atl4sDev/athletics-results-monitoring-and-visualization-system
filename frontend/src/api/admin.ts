import { apiFetch, apiFetchPaginated, ApiError } from './client'
import type {
  CompetitionStatus,
  CompetitionEnvironment,
  DisciplineType,
  Gender,
  AgeCategory,
  ResultStatus,
  HeatStatus,
} from './public'

// ── Interfaces ───────────────────────────────────────────────────────────────

export interface AdminCompetition {
  id: string
  name: string
  dateStart: string
  dateEnd: string
  location: string
  status: CompetitionStatus
  environment: CompetitionEnvironment
  syncToken: string
  documents: Record<string, unknown> | null
}

export type AdminCompetitionSummary = Omit<AdminCompetition, 'syncToken'>

export interface AdminCompetitionsParams {
  year?: number
  status?: CompetitionStatus
  environment?: CompetitionEnvironment
  cursor?: string
  take?: number
}

export interface CreateCompetitionBody {
  name: string
  dateStart: string
  dateEnd: string
  location: string
  environment: CompetitionEnvironment
}

export type UpdateCompetitionBody = Partial<CreateCompetitionBody>

export interface Discipline {
  id: number
  code: string
  name: string
  type: DisciplineType
  isStandard: boolean
}

export interface AdminDisciplinesParams {
  type?: DisciplineType
  isStandard?: boolean
  cursor?: string
  take?: number
}

export interface CreateDisciplineBody {
  code: string
  name: string
  type: DisciplineType
  isStandard?: boolean
}

export type UpdateDisciplineBody = Partial<CreateDisciplineBody>

export interface AdminAthlete {
  id: string
  licenseNumber: string
  firstName: string
  lastName: string
  gender: Gender
  birthDate: string | null
}

export interface AdminAthleteDetail extends AdminAthlete {
  resultCount: number
}

export interface AdminAthletesParams {
  q?: string
  cursor?: string
  take?: number
}

export interface CreateAthleteBody {
  licenseNumber: string
  firstName: string
  lastName: string
  gender: Gender
  birthDate?: string | null
}

export type UpdateAthleteBody = Omit<Partial<CreateAthleteBody>, 'licenseNumber'>

export interface AdminResultRow {
  id: string
  heatId: string
  athleteId: string
  athlete: AdminAthlete
  lane: number
  bibNumber: string
  team: string
  mark: string | null
  sortValue: number | null
  status: ResultStatus
  place: number | null
  reacTime: number | null
  isPB: boolean
  isSB: boolean
}

export interface HeatEvent {
  id: string
  customName: string
  roundName: string
  discipline: Discipline
  competition: AdminCompetitionSummary
}

export interface HeatAdmin {
  id: string
  status: HeatStatus
  confirmedAt: string | null
  wind: number | null
  lynxHeatId: number
  event: HeatEvent
  results: AdminResultRow[]
}

export interface AddResultBody {
  licenseNumber: string
  lane: number
  bibNumber: string
  team: string
  mark?: string
  status?: ResultStatus
  place?: number | null
  reacTime?: number | null
}

export interface PatchResultBody {
  mark?: string | null
  status?: ResultStatus
  place?: number | null
  reacTime?: number | null
  lane?: number
  bibNumber?: string
  team?: string
}

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Authenticates an admin user.
 * Unlike all other endpoints, `/admin/auth/login` returns a flat `{ token, expiresIn }`
 * body without the standard `{ status, data }` envelope, so this function
 * calls `fetch` directly instead of `apiFetch`.
 */
export async function loginAdmin(email: string, password: string): Promise<{ token: string; expiresIn: number }> {
  // /admin/auth/login returns a flat { token, expiresIn } body, not the standard { status, data } envelope.
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
  const res = await fetch(`${base}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await res.json()
  if (!res.ok) {
    throw new ApiError(body.code ?? String(res.status), body.message ?? 'Login failed')
  }
  return body
}

export function logoutAdmin() {
  return apiFetch<void>('/admin/auth/logout', { method: 'POST' })
}

// ── Competitions ──────────────────────────────────────────────────────────────

export function getAdminCompetitions(params: AdminCompetitionsParams = {}) {
  return apiFetchPaginated<AdminCompetitionSummary>('/admin/competitions', params)
}

export function getAdminCompetition(id: string) {
  return apiFetch<AdminCompetition>(`/admin/competitions/${id}`)
}

export function createCompetition(body: CreateCompetitionBody) {
  return apiFetch<AdminCompetition>('/admin/competitions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateCompetition(id: string, body: UpdateCompetitionBody) {
  return apiFetch<AdminCompetition>(`/admin/competitions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteCompetition(id: string) {
  return apiFetch<void>(`/admin/competitions/${id}`, { method: 'DELETE' })
}

/** Generates a new sync token for the competition, invalidating the previous one. */
export function rotateCompetitionToken(id: string) {
  return apiFetch<{ syncToken: string }>(`/admin/competitions/${id}/token`, { method: 'POST' })
}

// ── Heats ─────────────────────────────────────────────────────────────────────

export interface AdminHeatListItemEvent {
  id: string
  scheduledTime: string | null
  roundName: string
  gender: Gender
  ageCategory: AgeCategory
  discipline: { id: number; code: string; name: string; type: DisciplineType }
}

export interface AdminHeatListItem {
  id: string
  status: HeatStatus
  lynxHeatId: number
  resultCount: number
  event: AdminHeatListItemEvent
  competition: { id: string; name: string; dateStart: string }
}

export interface AdminHeatsParams {
  status?: HeatStatus
  competitionId?: string
  cursor?: string
  take?: number
}

export function getAdminHeats(params: AdminHeatsParams = {}) {
  return apiFetchPaginated<AdminHeatListItem>('/admin/heats', params)
}

export function getAdminHeat(id: string) {
  return apiFetch<HeatAdmin>(`/admin/heats/${id}`)
}

/** Transitions a heat from `UNCONFIRMED` to `OFFICIAL`. */
export function confirmHeat(id: string) {
  return apiFetch<HeatAdmin>(`/admin/heats/${id}/confirm`, { method: 'PATCH' })
}

/** Reverts a heat from `OFFICIAL` back to `UNCONFIRMED`. */
export function unconfirmHeat(id: string) {
  return apiFetch<HeatAdmin>(`/admin/heats/${id}/unconfirm`, { method: 'PATCH' })
}

// ── Results ───────────────────────────────────────────────────────────────────

export function patchResult(id: string, body: PatchResultBody) {
  return apiFetch<AdminResultRow>(`/admin/results/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteResult(id: string) {
  return apiFetch<void>(`/admin/results/${id}`, { method: 'DELETE' })
}

export function addResult(heatId: string, body: AddResultBody) {
  return apiFetch<AdminResultRow>(`/admin/heats/${heatId}/results`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// ── Athletes ──────────────────────────────────────────────────────────────────

export function getAdminAthletes(params: AdminAthletesParams = {}) {
  return apiFetchPaginated<AdminAthlete>('/admin/athletes', params)
}

export function getAdminAthlete(id: string) {
  return apiFetch<AdminAthleteDetail>(`/admin/athletes/${id}`)
}

export function createAthlete(body: CreateAthleteBody) {
  return apiFetch<AdminAthlete>('/admin/athletes', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateAthlete(id: string, body: UpdateAthleteBody) {
  return apiFetch<AdminAthlete>(`/admin/athletes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteAthlete(id: string) {
  return apiFetch<void>(`/admin/athletes/${id}`, { method: 'DELETE' })
}

/**
 * Merges `sourceId` into `targetId`: all results are re-assigned to the target
 * athlete and the source athlete record is deleted.
 */
export function mergeAthletes(targetId: string, sourceId: string) {
  return apiFetch<AdminAthleteDetail>(`/admin/athletes/${targetId}/merge`, {
    method: 'POST',
    body: JSON.stringify({ sourceId }),
  })
}

// ── Disciplines ───────────────────────────────────────────────────────────────

export function getAdminDisciplines(params: AdminDisciplinesParams = {}) {
  return apiFetchPaginated<Discipline>('/admin/disciplines', params)
}

export function createDiscipline(body: CreateDisciplineBody) {
  return apiFetch<Discipline>('/admin/disciplines', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateDiscipline(id: number, body: UpdateDisciplineBody) {
  return apiFetch<Discipline>(`/admin/disciplines/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteDiscipline(id: number) {
  return apiFetch<void>(`/admin/disciplines/${id}`, { method: 'DELETE' })
}
