import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRankings } from '@/api/public'
import { usePagination } from './usePagination'
import type { Gender, AgeCategory, CompetitionEnvironment, SeasonBounds } from '@/api/public'

/**
 * Manages rankings filters and pagination.
 *
 * Filters are persisted in the URL query string so that any filter combination
 * is shareable and survives a hard refresh. `setFilter` calls `router.replace`
 * which triggers a `route.query` watcher that resets pagination and refetches.
 *
 * `disciplineId` is required by the API — the fetcher returns an empty page
 * without firing a network request when it is absent.
 */
export function useRankings() {
  const route = useRoute()
  const router = useRouter()

  const disciplineId = computed(() => Number(route.query.disciplineId) || null)
  const gender = computed(() => (route.query.gender as Gender) || null)
  const ageCategory = computed(() => (route.query.ageCategory as AgeCategory) || null)
  const environment = computed(() => (route.query.environment as CompetitionEnvironment) || null)
  const season = computed(() => (route.query.season ? Number(route.query.season) : undefined))

  const seasonBounds = ref<SeasonBounds | null>(null)

  function setFilter(key: string, value: string | number | null) {
    router.replace({ query: { ...route.query, [key]: value ?? undefined } })
  }

  const pagination = usePagination(async (cursor) => {
    if (!disciplineId.value) return { items: [], nextCursor: null, hasMore: false }
    const result = await getRankings({
      disciplineId: disciplineId.value,
      gender: gender.value || undefined,
      ageCategory: ageCategory.value || undefined,
      environment: environment.value || undefined,
      season: season.value,
      cursor: cursor ?? undefined,
    })
    seasonBounds.value = result.seasonBounds
    return result
  })

  // GUD-001: watch route.query (not onMounted) so same-route filter changes refetch
  watch(() => route.query, () => pagination.reset(), { immediate: true, deep: true })

  return {
    disciplineId,
    gender,
    ageCategory,
    environment,
    season,
    setFilter,
    seasonBounds,
    ...pagination,
  }
}
