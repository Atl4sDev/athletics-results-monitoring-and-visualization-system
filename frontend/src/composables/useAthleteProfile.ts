import { ref, shallowRef, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAthlete, getAthleteResults, getAthleteProgression } from '@/api/public'
import type { AthleteProfile, ProgressionPoint, CompetitionEnvironment } from '@/api/public'
import { ApiError } from '@/api/client'
import { usePagination } from './usePagination'

/**
 * Orchestrates the three data calls for an athlete profile page.
 *
 * On mount:
 * 1. Fetches the athlete profile (PB/SB records by discipline + environment).
 * 2. Derives initial `activeEnv`: the environment with more records, defaulting
 *    to `OUTDOOR` on a tie. The `?env=` query param takes precedence.
 * 3. Derives `activeChartDiscipline` in priority order: `?discipline=` param →
 *    first discipline with a PB → first record discipline.
 * 4. Kicks off the first results page once env is resolved.
 *
 * `setEnv` and `setDiscipline` both update the URL so the selected state
 * survives a hard refresh.
 */
export function useAthleteProfile(license: string) {
  const route = useRoute()
  const router = useRouter()

  // ── Call 1: profile ────────────────────────────────────────────────────────
  const profile = ref<AthleteProfile | null>(null)
  const profileLoading = shallowRef(true)
  const profileError = shallowRef<ApiError | null>(null)

  // ── Environment state ──────────────────────────────────────────────────────
  const activeEnv = shallowRef<CompetitionEnvironment>('OUTDOOR')

  // ── Discipline state ───────────────────────────────────────────────────────
  const activeChartDiscipline = shallowRef<number | null>(null)

  // ── Derived: disciplines the athlete actually has records in ───────────────
  const athleteDisciplines = computed(() => {
    if (!profile.value) return []
    const seen = new Set<number>()
    const result: { id: number; name: string }[] = []
    for (const rec of profile.value.records) {
      if (!seen.has(rec.disciplineId)) {
        seen.add(rec.disciplineId)
        result.push({ id: rec.disciplineId, name: rec.disciplineName ?? String(rec.disciplineId) })
      }
    }
    return result
  })

  // ── Call 2: results (cursor-paginated, env-scoped) ────────────────────────
  const resultsPagination = usePagination((cursor) =>
    getAthleteResults(license, { environment: activeEnv.value, cursor: cursor ?? undefined }),
  )

  // ── Call 3: progression ────────────────────────────────────────────────────
  const progressionPoints = ref<ProgressionPoint[]>([])
  const progressionLoading = shallowRef(false)

  watch(
    [activeChartDiscipline, activeEnv],
    async () => {
      if (!activeChartDiscipline.value) return
      progressionLoading.value = true
      try {
        progressionPoints.value = await getAthleteProgression(license, {
          disciplineId: activeChartDiscipline.value,
          environment: activeEnv.value,
        })
      } finally {
        progressionLoading.value = false
      }
    },
    { immediate: true },
  )

  // ── URL sync ───────────────────────────────────────────────────────────────
  function setEnv(env: CompetitionEnvironment) {
    activeEnv.value = env
    router.replace({ query: { ...route.query, env } })
    resultsPagination.reset()
  }

  function setDiscipline(id: number) {
    activeChartDiscipline.value = id
    router.replace({ query: { ...route.query, discipline: id } })
  }

  // ── Mount: fetch profile, then derive initial state ────────────────────────
  onMounted(async () => {
    profileLoading.value = true
    try {
      profile.value = await getAthlete(license)

      // TASK-004: defaultEnv — env with more records; OUTDOOR on tie
      const counts: Partial<Record<CompetitionEnvironment, number>> = {}
      for (const rec of profile.value.records) {
        counts[rec.environment] = (counts[rec.environment] ?? 0) + 1
      }
      const defaultEnv: CompetitionEnvironment =
        (counts['INDOOR'] ?? 0) > (counts['OUTDOOR'] ?? 0) ? 'INDOOR' : 'OUTDOOR'

      // TASK-002 / TASK-004: query param takes precedence over computed default
      const queryEnv = route.query.env
      activeEnv.value = queryEnv === 'OUTDOOR' || queryEnv === 'INDOOR' ? queryEnv : defaultEnv

      // TASK-006: activeChartDiscipline from query or PB record or first record
      const parsed = Number(route.query.discipline)
      if (!isNaN(parsed) && parsed > 0) {
        activeChartDiscipline.value = parsed
      } else {
        const pbRecord = profile.value.records.find((r) => r.personalBest !== null)
        const first = profile.value.records[0]
        activeChartDiscipline.value = pbRecord?.disciplineId ?? first?.disciplineId ?? null
      }

      // Kick off first results page now that env is resolved
      resultsPagination.reset()
    } catch (err) {
      profileError.value = err instanceof ApiError ? err : new ApiError('UNKNOWN', String(err))
    } finally {
      profileLoading.value = false
    }
  })

  return {
    profile,
    profileLoading,
    profileError,
    activeEnv,
    setEnv,
    athleteDisciplines,
    activeChartDiscipline,
    setDiscipline,
    resultsPagination,
    progressionPoints,
    progressionLoading,
  }
}
