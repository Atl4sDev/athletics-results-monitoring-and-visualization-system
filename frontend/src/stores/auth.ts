import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') as string | null,
    expiresAt: Number(localStorage.getItem('expiresAt') || 0),
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && Date.now() < state.expiresAt,
  },

  actions: {
    /**
     * Stores the JWT and converts the server-supplied `expiresIn` (seconds)
     * to an absolute `expiresAt` timestamp. Both values are persisted in
     * `localStorage` so the session survives a page reload.
     */
    setAuth({ token, expiresIn }: { token: string; expiresIn: number }) {
      this.token = token
      this.expiresAt = Date.now() + expiresIn * 1000
      localStorage.setItem('token', token)
      localStorage.setItem('expiresAt', String(this.expiresAt))
    },

    clear() {
      this.token = null
      this.expiresAt = 0
      localStorage.removeItem('token')
      localStorage.removeItem('expiresAt')
    },
  },
})
