import { computed, onMounted } from 'vue'
import { useDisciplineStore } from '@/stores/discipline'

/**
 * Provides the global disciplines list with a 60-second stale-while-revalidate
 * strategy. Triggers a fetch on `onMounted`; subsequent mounts within the
 * stale window are no-ops.
 */
export function useDisciplines() {
  const store = useDisciplineStore()

  onMounted(() => store.fetchIfStale())

  return {
    disciplines: computed(() => store.list),
    loading: computed(() => store.loading),
    labelById: store.labelById,
  }
}
