import type { HeatAdmin } from '@/api/admin'
import type { PublicHeatRow } from '@/api/public'

export function formatMark(mark: string | null | undefined): string {
  return mark || '—'
}

/** Formats a wind reading with an explicit `+` sign for positive values. */
export function formatWind(wind: number): string {
  return `${wind > 0 ? '+' : ''}${wind.toFixed(1)}`
}

/**
 * Converts an admin heat (as returned by `GET /admin/heats/:id`) to the public
 * `PublicHeatRow` shape used by `HeatTable`. Sets `isPreliminary` to `true`
 * whenever `heat.status === 'UNCONFIRMED'` — the public endpoint derives this
 * server-side, but the admin path does not include the flag directly.
 */
export function adminHeatToPublic(heat: HeatAdmin): PublicHeatRow {
  return {
    id: heat.id,
    status: heat.status,
    isPreliminary: heat.status === 'UNCONFIRMED',
    wind: heat.wind ?? undefined,
    results: heat.results.map(r => ({
      id: r.id,
      place: r.place,
      lane: r.lane,
      bibNumber: r.bibNumber,
      team: r.team,
      status: r.status,
      mark: r.mark,
      sortValue: r.sortValue,
      reacTime: r.reacTime ?? undefined,
      isPB: r.isPB,
      isSB: r.isSB,
      isPreliminary: heat.status === 'UNCONFIRMED',
      athlete: {
        licenseNumber: r.athlete.licenseNumber,
        firstName: r.athlete.firstName,
        lastName: r.athlete.lastName,
        gender: r.athlete.gender,
        birthDate: r.athlete.birthDate,
        lastTeam: r.team,
      },
    })),
  }
}
