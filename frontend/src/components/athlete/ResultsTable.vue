<script setup lang="ts">
import type { AthleteResult } from '@/api/public'
import SkeletonRow from '@/components/common/SkeletonRow.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadMore from '@/components/common/LoadMore.vue'
import PbSbBadge from '@/components/common/PbSbBadge.vue'
import { formatDisplayDate, parseISODate } from '@/utils/date'
import { formatMark } from '@/utils/format'
import uk from '@/i18n/uk'

defineProps<{
  items: AthleteResult[]
  loading: boolean
  hasMore: boolean
  loadError?: string | null
}>()

const emit = defineEmits<{
  'load-more': []
}>()
</script>

<template>
  <section class="mb-8">
    <!-- Initial loading: no items yet, either loading or not yet triggered -->
    <div
      v-if="items.length === 0 && (loading || hasMore)"
      class="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] shadow-[var(--shadow-card)]"
    >
      <table class="min-w-[580px] w-full text-sm bg-[var(--color-bg-card)]">
        <thead>
          <tr class="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
            <th class="px-3 py-2">{{ uk.COL_DATE }}</th>
            <th class="px-3 py-2">{{ uk.COL_COMPETITION }}</th>
            <th class="px-3 py-2">{{ uk.COL_DISCIPLINE }}</th>
            <th class="px-3 py-2">{{ uk.MARK }}</th>
            <th class="px-3 py-2">{{ uk.COL_PLACE }}</th>
            <th class="w-px px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          <SkeletonRow v-for="i in 4" :key="i" :columns="6" />
        </tbody>
      </table>
    </div>

    <!-- Empty state: loaded, no results -->
    <EmptyState
      v-else-if="items.length === 0 && !loading && !hasMore"
      :message="uk.NO_RESULTS"
    />

    <!-- Table with results -->
    <div
      v-else
      class="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] shadow-[var(--shadow-card)]"
    >
      <table class="min-w-[580px] w-full text-sm bg-[var(--color-bg-card)]">
        <thead>
          <tr class="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
            <th class="px-3 py-2">{{ uk.COL_DATE }}</th>
            <th class="px-3 py-2">{{ uk.COL_COMPETITION }}</th>
            <th class="px-3 py-2">{{ uk.COL_DISCIPLINE }}</th>
            <th class="px-3 py-2">{{ uk.MARK }}</th>
            <th class="px-3 py-2">{{ uk.COL_PLACE }}</th>
            <th class="w-px px-3 py-2" />
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-border-subtle)]">
          <!-- Server-ordered rows — do NOT re-sort (REQ-007) -->
          <tr
            v-for="item in items"
            :key="item.id"
            class="transition-colors hover:bg-[var(--color-bg-page)]"
          >
            <td class="whitespace-nowrap px-3 py-2 text-[var(--color-text-secondary)]">
              {{ formatDisplayDate(parseISODate(item.competition.dateStart)) }}
            </td>
            <td class="px-3 py-2">
              <RouterLink
                :to="`/competitions/${item.competition.id}?date=${item.competition.dateStart.slice(0, 10)}`"
                class="text-[var(--color-accent)] hover:underline"
              >{{ item.competition.name }}</RouterLink>
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-[var(--color-text-secondary)]">
              {{ item.disciplineName ?? '—' }}
            </td>
            <td class="whitespace-nowrap px-3 py-2 font-medium text-[var(--color-text-primary)]">
              {{ formatMark(item.mark) }}
            </td>
            <td class="px-3 py-2 text-[var(--color-text-secondary)]">
              {{ item.place ?? '—' }}
            </td>
            <td class="w-px whitespace-nowrap px-3 py-2">
              <div class="flex gap-1">
                <PbSbBadge v-if="item.isPB" type="pb" />
                <PbSbBadge v-if="item.isSB" type="sb" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>

    </div>

    <LoadMore :loading="loading" :has-more="hasMore" @load="emit('load-more')" />

    <p v-if="loadError" class="mt-2 text-center text-sm text-[var(--color-error)]">
      {{ loadError }}
    </p>
  </section>
</template>
