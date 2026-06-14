import type { NavigationGuard } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/**
 * Navigation guard for all `/admin/*` routes.
 * Redirects to `/admin/login` and clears stored auth if the JWT is missing
 * or its expiry timestamp has passed.
 */
export const requireAdmin: NavigationGuard = (_to, _from, next) => {
  const auth = useAuthStore()
  if (!auth.token || Date.now() >= auth.expiresAt) {
    auth.clear()
    next('/admin/login')
  } else {
    next()
  }
}
