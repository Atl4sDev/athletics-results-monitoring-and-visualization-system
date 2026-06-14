import { ref, watch, onUnmounted } from 'vue'
import { toRef } from 'vue'
import type { MaybeRef } from 'vue'

/**
 * Returns a debounced ref that mirrors `source` but only updates after
 * `delay` ms of silence. Accepts a plain string, a `ref`, or a getter.
 * The pending timer is cleared on `onUnmounted`.
 */
export function useDebounce(source: MaybeRef<string>, delay = 350) {
  const sourceRef = toRef(source)
  const debounced = ref(sourceRef.value)
  let timer: ReturnType<typeof setTimeout> | null = null

  watch(sourceRef, (value) => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      debounced.value = value
    }, delay)
  })

  onUnmounted(() => {
    if (timer !== null) clearTimeout(timer)
  })

  return debounced
}
