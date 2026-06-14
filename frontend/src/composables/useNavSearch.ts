import { ref, shallowRef, computed, watch } from 'vue'
import { useDebounce } from './useDebounce'
import { searchAthletes } from '@/api/public'
import type { PublicAthleteRow } from '@/api/public'

/**
 * Drives the header athlete search field.
 * Debounces the query by 300 ms and fetches the first 10 athlete results.
 * `isOpen` is true whenever `query` is non-empty, regardless of results.
 * `close` clears both query and results.
 */
export function useNavSearch() {
  const query = ref('')
  const debouncedQ = useDebounce(query, 300)
  const results = ref<PublicAthleteRow[]>([])
  const loading = shallowRef(false)

  watch(debouncedQ, async (q) => {
    if (!q.trim()) {
      results.value = []
      return
    }
    if (loading.value) return
    loading.value = true
    try {
      const page = await searchAthletes({ q, take: 10 })
      results.value = page.items
    } finally {
      loading.value = false
    }
  })

  function close() {
    query.value = ''
    results.value = []
  }

  return {
    query,
    results,
    loading,
    isOpen: computed(() => query.value.length > 0),
    close,
  }
}
