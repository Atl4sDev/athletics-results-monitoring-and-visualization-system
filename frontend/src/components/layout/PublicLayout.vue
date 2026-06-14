<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import NavSearch from './NavSearch.vue'
import uk from '@/i18n/uk'

const isMenuOpen = ref(false)

const router = useRouter()
router.afterEach(() => { isMenuOpen.value = false })

const navLinks = [
  { to: '/competitions', label: uk.NAV_CALENDAR },
  { to: '/rankings', label: uk.NAV_RANKINGS },
]
</script>

<template>
  <div class="min-h-screen bg-[var(--color-bg-page)]">
    <header class="border-b border-[var(--color-border)] bg-[var(--color-bg-card)]">
      <div class="mx-auto flex w-full max-w-[var(--spacing-content-max)] items-center justify-between gap-4 px-4 py-3 md:px-8">
        <RouterLink to="/" class="text-sm font-semibold text-[var(--color-text-primary)]">
          Легка атлетика
        </RouterLink>

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

        <div class="flex items-center gap-2">
          <NavSearch />
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
      </div>
    </header>

    <main class="mx-auto w-full max-w-[var(--spacing-content-max)] px-4 py-6 md:px-8">
      <slot />
    </main>

    <footer class="border-t border-[var(--color-border)] py-6 text-center text-xs text-[var(--color-text-muted)]">
      Легка атлетика України
    </footer>
  </div>
</template>
