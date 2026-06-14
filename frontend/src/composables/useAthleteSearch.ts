import { ref, watch } from 'vue'
import { getAdminAthletes } from '@/api/admin'
import type { AdminAthlete } from '@/api/admin'
import { useDebounce } from './useDebounce'
import { usePagination } from './usePagination'

/**
 * Admin athlete search with debounce and cursor pagination.
 * No network request is made while the query is empty.
 * A change to `query` resets pagination before fetching the first page.
 */
export function useAthleteSearch() {
  const query = ref('')
  const debouncedQuery = useDebounce(query, 300)

  const pagination = usePagination((cursor) => {
    // No fetch when query is empty
    if (!debouncedQuery.value) {
      return Promise.resolve({ items: [] as AdminAthlete[], nextCursor: null, hasMore: false })
    }
    return getAdminAthletes({ q: debouncedQuery.value, cursor: cursor ?? undefined, take: 30 })
  })

  watch(debouncedQuery, () => pagination.reset())

  return {
    query,
    items: pagination.items,
    loading: pagination.loading,
    hasMore: pagination.hasMore,
    loadMore: pagination.loadMore,
    reset: pagination.reset,
  }
}
