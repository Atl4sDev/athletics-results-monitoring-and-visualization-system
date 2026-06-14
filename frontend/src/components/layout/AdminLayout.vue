<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterView, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { logoutAdmin } from '@/api/admin'
import uk from '@/i18n/uk'

const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()

const isMenuOpen = ref(false)
router.afterEach(() => { isMenuOpen.value = false })

async function logout() {
  try {
    await logoutAdmin()
  } catch {
    // always proceed with local logout
  }
  authStore.clear()
  router.push('/admin/login')
}

const navLinks = [
  { to: '/admin/moderation', label: uk.NAV_ADMIN_MODERATION },
  { to: '/admin/competitions', label: uk.NAV_ADMIN_COMPETITIONS },
  { to: '/admin/disciplines', label: uk.NAV_ADMIN_DISCIPLINES },
  { to: '/admin/athletes', label: uk.NAV_ADMIN_ATHLETES },
]
</script>

<template>
  <div class="min-h-screen bg-[var(--color-bg-page)]">
    <nav class="border-b border-[var(--color-border)] bg-[var(--color-bg-card)]">
      <div class="mx-auto flex w-full max-w-[var(--spacing-content-max)] items-center justify-between gap-4 px-4 py-3 md:px-8">
        <span class="text-sm font-semibold text-[var(--color-text-primary)]">{{ uk.ADMIN_PANEL }}</span>

        <!-- Desktop nav -->
        <div class="hidden flex-1 items-center gap-x-4 md:flex">
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            active-class="text-[var(--color-accent)] font-medium border-b border-[var(--color-accent)]"
          >
            {{ link.label }}
          </RouterLink>
        </div>

        <div class="flex items-center gap-3">
          <!-- Logout — desktop only -->
          <button
            type="button"
            class="hidden text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] md:block"
            @click="logout"
          >
            {{ uk.LOGOUT }}
          </button>

          <!-- Burger button — mobile only -->
          <button
            type="button"
            class="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-page)] hover:text-[var(--color-text-primary)] md:hidden"
            :aria-label="isMenuOpen ? 'Закрити меню' : 'Відкрити меню'"
            :aria-expanded="isMenuOpen"
            @click="isMenuOpen = !isMenuOpen"
          >
            <svg v-if="!isMenuOpen" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <div v-if="isMenuOpen" class="border-t border-[var(--color-border)] px-4 py-3 text-sm md:hidden">
        <RouterLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="block py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          active-class="text-[var(--color-accent)] font-medium border-b border-[var(--color-accent)]"
        >
          {{ link.label }}
        </RouterLink>
        <button
          type="button"
          class="mt-2 block py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          @click="logout"
        >
          {{ uk.LOGOUT }}
        </button>
      </div>
    </nav>

    <main class="mx-auto w-full max-w-[var(--spacing-content-max)] px-4 py-6 md:px-8">
      <RouterView />
    </main>

    <!-- Toast notifications -->
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <div
        v-for="toast in uiStore.toasts"
        :key="toast.id"
        class="max-w-sm rounded-[var(--radius-sm)] border px-4 py-3 text-sm shadow-md"
        :class="toast.type === 'error'
          ? 'border-[var(--color-error)] bg-[var(--color-error-bg)] text-[var(--color-error-text)]'
          : 'border-[var(--color-status-official-border)] bg-[var(--color-status-official-bg)] text-[var(--color-status-official-text)]'"
      >
        {{ toast.message }}
      </div>
    </div>
  </div>
</template>
