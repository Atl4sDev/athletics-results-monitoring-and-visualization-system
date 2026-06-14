<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useNavSearch } from '@/composables/useNavSearch'
import AthleteRow from '@/components/athlete/AthleteRow.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import uk from '@/i18n/uk'

const router = useRouter()
const { query, results, loading, isOpen, close } = useNavSearch()

function navigateToAthlete(license: string) {
  router.push('/athletes/' + license)
  close()
}
</script>

<template>
  <div class="relative">
    <input
      v-model="query"
      type="search"
      class="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      :placeholder="uk.SEARCH_PLACEHOLDER"
      @keydown.escape="close"
    />

    <template v-if="isOpen">
      <!-- Transparent backdrop to close on outside click -->
      <div class="fixed inset-0 z-10" @click="close" />

      <!-- Results panel -->
      <div
        class="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-card)]"
      >
        <div v-if="loading" class="flex justify-center p-4">
          <AppSpinner size="sm" />
        </div>
        <template v-else-if="results.length > 0">
          <button
            v-for="athlete in results"
            :key="athlete.licenseNumber"
            type="button"
            class="w-full px-3 py-2 text-left hover:bg-[var(--color-bg-page)]"
            @click="navigateToAthlete(athlete.licenseNumber)"
          >
            <AthleteRow :athlete="athlete" />
          </button>
        </template>
        <EmptyState v-else :message="uk.NO_SEARCH_RESULTS" />
      </div>
    </template>
  </div>
</template>
