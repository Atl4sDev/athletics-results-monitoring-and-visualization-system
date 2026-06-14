<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAthleteProfile } from '@/composables/useAthleteProfile'
import PublicLayout from '@/components/layout/PublicLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ProfileHeader from '@/components/athlete/ProfileHeader.vue'
import EnvironmentToggle from '@/components/athlete/EnvironmentToggle.vue'
import RecordsSection from '@/components/athlete/RecordsSection.vue'
import DisciplineSelector from '@/components/athlete/DisciplineSelector.vue'
import ProgressionChart from '@/components/athlete/ProgressionChart.vue'
import ResultsTable from '@/components/athlete/ResultsTable.vue'
import uk from '@/i18n/uk'

// TASK-022: extract license; composable owns all data + URL state
const route = useRoute()
const license = route.params.license as string

const {
  profile,
  profileLoading,
  profileError,
  activeEnv,
  setEnv,
  athleteDisciplines,
  activeChartDiscipline,
  setDiscipline,
  resultsPagination,
  progressionPoints,
  progressionLoading,
} = useAthleteProfile(license)

// Destructure pagination refs so they're top-level — Vue auto-unwraps top-level refs in templates
const { items: resultsItems, loading: resultsLoading, hasMore: resultsHasMore, loadMore: resultsLoadMore, loadError: resultsLoadError } = resultsPagination
</script>

<template>
  <PublicLayout>
    <!-- TASK-024: ATHLETE_NOT_FOUND renders a not-found block; all other sections hidden -->
    <EmptyState
      v-if="profileError?.code === 'ATHLETE_NOT_FOUND'"
      :message="uk.ATHLETE_NOT_FOUND"
    />

    <template v-else>
      <!-- TASK-023 (1): identity header — renders from call 1 immediately -->
      <ProfileHeader :athlete="profile?.athlete ?? null" :loading="profileLoading" />

      <!-- TASK-023 (2): environment toggle — scopes everything below -->
      <EnvironmentToggle
        :model-value="activeEnv"
        :disabled="profileLoading"
        @update:model-value="setEnv"
      />

      <!-- TASK-023 (3): PB/SB records — pure client-side env filter, no refetch -->
      <RecordsSection
        :records="profile?.records ?? []"
        :environment="activeEnv"
        :loading="profileLoading"
      />

      <!-- TASK-023 (4): progression chart block -->
      <div class="mb-8">
        <div class="mb-3 flex flex-wrap items-center gap-3">
          <h2 class="text-base font-semibold text-[var(--color-text-primary)]">Динаміка</h2>
          <DisciplineSelector
            :model-value="activeChartDiscipline"
            :disciplines="athleteDisciplines"
            :disabled="profileLoading || athleteDisciplines.length === 0"
            @update:model-value="setDiscipline"
          />
        </div>
        <ProgressionChart :points="progressionPoints" :loading="progressionLoading" />
      </div>

      <!-- TASK-023 (5): paginated results history — lazy-loaded via IntersectionObserver -->
      <div class="mb-2">
        <h2 class="mb-3 text-base font-semibold text-[var(--color-text-primary)]">Результати</h2>
        <ResultsTable
          :items="resultsItems"
          :loading="resultsLoading"
          :has-more="resultsHasMore"
          :load-error="resultsLoadError"
          @load-more="resultsLoadMore"
        />
      </div>
    </template>
  </PublicLayout>
</template>
