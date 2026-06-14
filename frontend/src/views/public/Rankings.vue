<script setup lang="ts">
import { computed } from 'vue'
import PublicLayout from '@/components/layout/PublicLayout.vue'
import RankingsFilterBar from '@/components/common/RankingsFilterBar.vue'
import RankingsTable from '@/components/common/RankingsTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadMore from '@/components/common/LoadMore.vue'
import { useRankings } from '@/composables/useRankings'
import { formatDisplayDate, parseISODate } from '@/utils/date'
import uk from '@/i18n/uk'

const {
  disciplineId, gender, ageCategory, environment, season,
  setFilter, seasonBounds, items, loading, hasMore, loadMore, loadError,
} = useRankings()

const seasonLabel = computed(() => {
  if (!seasonBounds.value) return null
  const start = formatDisplayDate(parseISODate(seasonBounds.value.start))
  const end = formatDisplayDate(parseISODate(seasonBounds.value.end))
  return `${start} — ${end}`
})
</script>

<template>
  <PublicLayout>
    <RankingsFilterBar
      :discipline-id="disciplineId"
      :gender="gender"
      :age-category="ageCategory"
      :environment="environment"
      :season="season"
      @update:discipline-id="setFilter('disciplineId', $event)"
      @update:gender="setFilter('gender', $event)"
      @update:age-category="setFilter('ageCategory', $event)"
      @update:environment="setFilter('environment', $event)"
      @update:season="setFilter('season', $event)"
    />
    <p v-if="seasonLabel" class="mb-4 text-sm text-[var(--color-text-secondary)]">
      {{ seasonLabel }}
    </p>
    <EmptyState v-if="disciplineId === null" :message="uk.DISCIPLINE_REQUIRED" />
    <template v-else>
      <RankingsTable :rows="items" :loading="loading" />
      <LoadMore :has-more="hasMore" :loading="loading" @load="loadMore" />
      <p
        v-if="loadError"
        class="mt-2 text-center text-sm text-[var(--color-error)]"
      >
        {{ loadError }}
      </p>
    </template>
  </PublicLayout>
</template>
