<script setup lang="ts">
import type { RankingRow } from '@/api/public'
import AthleteRow from '@/components/athlete/AthleteRow.vue'
import PbSbBadge from '@/components/common/PbSbBadge.vue'
import SkeletonRow from '@/components/common/SkeletonRow.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { formatDisplayDate, parseISODate } from '@/utils/date'
import { formatMark } from '@/utils/format'
import uk from '@/i18n/uk'

defineProps<{
  rows: RankingRow[]
  loading: boolean
}>()
</script>

<template>
  <EmptyState v-if="!loading && rows.length === 0" :message="uk.NO_RESULTS" />
  <div
    v-else
    class="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] shadow-[var(--shadow-card)]"
  >
    <table class="min-w-[640px] w-full text-sm bg-[var(--color-bg-card)]">
      <thead>
        <tr
          class="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]"
        >
          <th class="w-10 px-3 py-2 text-right">{{ uk.RANK }}</th>
          <th class="px-3 py-2">{{ uk.ATHLETE }}</th>
          <th class="px-3 py-2">{{ uk.MARK }}</th>
          <th class="px-3 py-2">{{ uk.COL_COMPETITION }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[var(--color-border-subtle)]">
        <template v-if="loading && rows.length === 0">
          <SkeletonRow v-for="i in 5" :key="i" :columns="4" />
        </template>
        <template v-else>
          <tr
            v-for="row in rows"
            :key="row.result.id"
            class="transition-colors hover:bg-[var(--color-bg-page)]"
          >
            <td
              class="px-3 py-2 text-right tabular-nums text-[var(--color-text-secondary)]"
            >
              {{ row.rank }}
            </td>
            <td class="px-3 py-2">
              <AthleteRow :athlete="row.athlete" />
            </td>
            <td class="whitespace-nowrap px-3 py-2">
              <span class="font-medium text-[var(--color-text-primary)]">{{
                formatMark(row.result.mark)
              }}</span>
              <span class="ml-1 inline-flex gap-1">
                <PbSbBadge v-if="row.result.isPB" type="pb" />
                <PbSbBadge v-if="row.result.isSB" type="sb" />
              </span>
            </td>
            <td class="px-3 py-2 text-[var(--color-text-secondary)]">
              <RouterLink
                :to="`/competitions/${row.result.competition.id}?date=${row.result.competition.dateStart.slice(0, 10)}`"
                class="text-[var(--color-accent)] hover:underline"
              >{{ row.result.competition.name }}</RouterLink>
              <div class="text-xs text-[var(--color-text-muted)]">
                {{ formatDisplayDate(parseISODate(row.result.competition.dateStart)) }}
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
