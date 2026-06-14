import { ref, shallowRef } from 'vue'
import type { Ref } from 'vue'

/**
 * Generic cursor-pagination composable.
 *
 * @param fetcher - Called with the current cursor (`null` on first page).
 *   Must return `{ items, nextCursor, hasMore }`.
 *
 * `loadMore` appends results; `reset` clears all items, resets the cursor,
 * and immediately calls `loadMore` to fetch the first page again.
 */
export function usePagination<T>(
  fetcher: (cursor: string | null) => Promise<{ items: T[]; nextCursor: string | null; hasMore: boolean }>,
) {
  const items: Ref<T[]> = ref([])
  const loading = shallowRef(false)
  const hasMore = shallowRef(true)
  const loadError = shallowRef<string | null>(null)
  let cursor: string | null = null

  async function loadMore() {
    if (loading.value || !hasMore.value) return
    loading.value = true
    loadError.value = null
    try {
      const result = await fetcher(cursor)
      items.value = [...items.value, ...result.items]
      cursor = result.nextCursor
      hasMore.value = result.hasMore
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : 'Помилка завантаження'
    } finally {
      loading.value = false
    }
  }

  function reset() {
    items.value = []
    cursor = null
    hasMore.value = true
    loadError.value = null
    loadMore()
  }

  return { items, loading, hasMore, loadError, loadMore, reset }
}
