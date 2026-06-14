import { defineStore } from 'pinia'
import { getDisciplines } from '@/api/public'
import type { DisciplinePublic } from '@/api/public'

export const useDisciplineStore = defineStore('discipline', {
  state: () => ({
    list: [] as DisciplinePublic[],
    loading: false,
    lastFetched: null as number | null,
  }),

  getters: {
    labelById: (state) => (id: number) => state.list.find((d) => d.id === id)?.name ?? '—',
  },

  actions: {
    /** Fetches disciplines from the server unless a fetch already succeeded within the last 60 seconds. */
    async fetchIfStale() {
      if (this.loading) return
      if (this.lastFetched !== null && Date.now() - this.lastFetched < 60_000) return

      this.loading = true
      try {
        this.list = await getDisciplines()
        this.lastFetched = Date.now()
      } finally {
        this.loading = false
      }
    },
  },
})
