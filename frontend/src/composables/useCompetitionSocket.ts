import { onMounted, onUnmounted } from 'vue'
import { getSocket } from '@/api/sockets'
import { useCompetitionStore } from '@/stores/competition'
import type { PublicHeatRow } from '@/api/public'

/**
 * Joins the `comp_<id>` socket room on mount and leaves it on unmount.
 * Forgetting to call this composable (or not mounting the component) leaks
 * a live stream per visited competition — always pair mount with unmount.
 *
 * Handles two server events:
 * - `live_results`: patches a single heat in the competition store.
 * - `schedule_changed`: unconditionally refetches the full competition detail.
 */
export function useCompetitionSocket(id: string) {
  const socket = getSocket()
  const store = useCompetitionStore()

  onMounted(() => {
    socket.connect()
    socket.emit('join_competition', id)
    socket.on('live_results', (payload: PublicHeatRow) => store.patchHeat(payload.id, payload))
    // schedule_changed carries { timestamp } but is intentionally ignored — refetch is unconditional
    socket.on('schedule_changed', () => store.fetch(id))
  })

  onUnmounted(() => {
    socket.off('live_results')
    socket.off('schedule_changed')
    socket.emit('leave_competition', id)
  })
}
