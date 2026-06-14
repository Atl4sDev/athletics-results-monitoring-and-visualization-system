import { defineStore } from 'pinia'
import { getCompetition } from '@/api/public'
import type { CompetitionDetailPublic, PublicHeatRow } from '@/api/public'
import { ApiError } from '@/api/client'

export const useCompetitionStore = defineStore('competition', {
  state: () => ({
    detail: null as CompetitionDetailPublic | null,
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetch(id: string) {
      // Only clear stale data when switching to a different competition.
      // For same-competition refreshes (e.g. socket-triggered), keep the old
      // data visible so the template stays mounted and Vue can diff-patch it
      // in place rather than going through a full unmount/remount cycle.
      if (this.detail?.id !== id) {
        this.detail = null
      }
      this.loading = true
      this.error = null
      try {
        this.detail = await getCompetition(id)
      } catch (e) {
        this.error = e instanceof ApiError ? e.message : 'Unknown error'
        this.detail = null
      } finally {
        this.loading = false
      }
    },
    /**
     * Immutably replaces a single heat inside `detail.schedule`.
     * Called by `useCompetitionSocket` on every `live_results` socket event.
     * Does nothing when `detail` is null (socket arrived before initial fetch).
     */
    patchHeat(heatId: string, payload: PublicHeatRow) {
      if (!this.detail) return
      for (const events of Object.values(this.detail.schedule)) {
        for (const event of events) {
          const idx = event.heats.findIndex(h => h.id === heatId)
          if (idx !== -1) {
            event.heats.splice(idx, 1, { ...payload })
            return
          }
        }
      }
    },
  },
})
