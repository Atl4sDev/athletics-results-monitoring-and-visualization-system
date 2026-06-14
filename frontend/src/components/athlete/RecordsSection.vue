<script setup lang="ts">
import { computed } from 'vue'
import type { PbSbRecord, CompetitionEnvironment } from '@/api/public'
import EmptyState from '@/components/common/EmptyState.vue'
import { formatDisplayDate, parseISODate } from '@/utils/date'
import { formatMark } from '@/utils/format'
import uk from '@/i18n/uk'

const props = defineProps<{
  records: PbSbRecord[]
  environment: CompetitionEnvironment
  loading: boolean
}>()

// Pure client-side filter — no refetch
const filteredRecords = computed(() =>
  props.records.filter((r) => r.environment === props.environment),
)

const emptyMessage = computed(() =>
  props.environment === 'OUTDOOR' ? uk.NO_OUTDOOR_RECORDS : uk.NO_INDOOR_RECORDS,
)

function formatPointDate(date: string | null): string {
  if (!date) return '—'
  return formatDisplayDate(parseISODate(date))
}
</script>

<template>
  <section class="mb-8">
    <!-- Loading skeleton -->
    <template v-if="loading">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="i in 3"
          :key="i"
          class="h-24 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-border-subtle)]"
        />
      </div>
    </template>

    <!-- Empty state -->
    <EmptyState
      v-else-if="filteredRecords.length === 0"
      :message="emptyMessage"
    />

    <!-- Records grid -->
    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="rec in filteredRecords"
        :key="`${rec.disciplineId}-${rec.environment}`"
        class="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 shadow-[var(--shadow-card)]"
      >
        <p class="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          {{ rec.disciplineName ?? '—' }}
        </p>

        <!-- Personal best row -->
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-xs text-[var(--color-text-secondary)]">{{ uk.PERSONAL_BEST }}</span>
          <span
            v-if="rec.personalBest"
            class="text-right text-sm font-semibold text-[var(--color-text-primary)]"
          >
            {{ formatMark(rec.personalBest.mark) }}
            <span class="ml-1 font-normal text-[var(--color-text-muted)]">
              {{ formatPointDate(rec.personalBest.date) }}
            </span>
          </span>
          <span v-else class="text-sm text-[var(--color-text-muted)]">—</span>
        </div>

        <!-- Season best row -->
        <div class="mt-1 flex items-baseline justify-between gap-2">
          <span class="text-xs text-[var(--color-text-secondary)]">{{ uk.SEASON_BEST }}</span>
          <span
            v-if="rec.seasonBest"
            class="text-right text-sm text-[var(--color-text-primary)]"
          >
            {{ formatMark(rec.seasonBest.mark) }}
            <span class="ml-1 font-normal text-[var(--color-text-muted)]">
              {{ formatPointDate(rec.seasonBest.date) }}
            </span>
          </span>
          <span v-else class="text-sm text-[var(--color-text-muted)]">—</span>
        </div>
      </div>
    </div>
  </section>
</template>
