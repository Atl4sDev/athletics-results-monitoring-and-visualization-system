<script setup lang="ts">
/**
 * Status-driven heat table used in both the public competition detail and
 * the admin moderation view.
 *
 * - `SCHEDULED` → renders a start-list (lane, bib, athlete, team).
 * - `UNCONFIRMED` or `OFFICIAL` → renders results (place, lane, bib, athlete,
 *   team, optional reaction time, mark with PB/SB badges).
 *
 * The `reacTime` column is only shown when at least one result in the heat
 * carries a non-null value (i.e. only for sprint events).
 *
 * @prop heat - The heat to display.
 * @prop heatNumber - 1-based display index shown in the heat header.
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { PublicHeatRow, PublicResultRow } from '@/api/public'
import StatusBadge from '@/components/common/StatusBadge.vue'
import PbSbBadge from '@/components/common/PbSbBadge.vue'
import { formatWind, formatMark } from '@/utils/format'
import uk from '@/i18n/uk'

const props = defineProps<{
  heat: PublicHeatRow
  heatNumber: number
}>()

const isResultsMode = computed(
  () => props.heat.status === 'UNCONFIRMED' || props.heat.status === 'OFFICIAL',
)

// Only show reacTime column when at least one result carries it
const hasReacTime = computed(
  () => isResultsMode.value && props.heat.results.some(r => r.reacTime != null),
)

// Show status code (DNS, DNF, DQ, FS, PENDING) instead of place for non-finishers
function displayPlace(result: PublicResultRow): string {
  if (result.status === 'OK') return result.place != null ? String(result.place) : '—'
  return result.status
}
</script>

<template>
  <!-- Heat header: label left, status badge + wind right -->
  <div class="flex items-center justify-between py-2 text-sm">
    <span class="font-medium text-[var(--color-text-primary)]">{{ uk.HEAT_LABEL }} {{ heatNumber }}</span>
    <div class="flex items-center gap-3">
      <StatusBadge :status="heat.status" />
      <span
        v-if="heat.wind != null"
        class="text-[var(--color-text-secondary)]"
      >{{ uk.WIND }}: {{ formatWind(heat.wind) }} {{ uk.WIND_UNIT }}</span>
    </div>
  </div>

  <!-- Start list mode -->
  <div v-if="!isResultsMode" class="overflow-x-auto">
    <table class="w-full min-w-[360px] table-fixed text-sm">
      <thead>
        <tr>
          <th class="w-12 px-3 py-2 text-right font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">{{ uk.COL_LANE }}</th>
          <th class="w-14 px-3 py-2 text-left font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">{{ uk.COL_BIB }}</th>
          <th class="px-3 py-2 text-left font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">{{ uk.ATHLETE }}</th>
          <th class="w-1/4 px-3 py-2 text-left font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">{{ uk.TEAM }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="result in heat.results"
          :key="result.id"
          class="border-b border-[var(--color-border-subtle)] last:border-0"
        >
          <td class="px-3 py-2 text-right tabular-nums text-[var(--color-text-secondary)]">{{ result.lane }}</td>
          <td class="px-3 py-2">{{ result.bibNumber }}</td>
          <td class="px-3 py-2">
            <RouterLink
              :to="`/athletes/${result.athlete.licenseNumber}`"
              class="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            >{{ result.athlete.firstName }} {{ result.athlete.lastName }}</RouterLink>
          </td>
          <td class="px-3 py-2 text-[var(--color-text-secondary)]">{{ result.team }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Results mode -->
  <div v-else class="overflow-x-auto">
    <table class="w-full min-w-[520px] table-fixed text-sm">
      <thead>
        <tr>
          <th class="w-12 px-3 py-2 text-right font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">{{ uk.COL_PLACE }}</th>
          <th class="w-12 px-3 py-2 text-right font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">{{ uk.COL_LANE }}</th>
          <th class="w-14 px-3 py-2 text-left font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">{{ uk.COL_BIB }}</th>
          <th class="px-3 py-2 text-left font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">{{ uk.ATHLETE }}</th>
          <th class="w-1/4 px-3 py-2 text-left font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">{{ uk.TEAM }}</th>
          <th v-if="hasReacTime" class="w-20 px-3 py-2 text-right font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">{{ uk.COL_REAC }}</th>
          <th class="w-28 px-3 py-2 text-right font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">{{ uk.MARK }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="result in heat.results"
          :key="result.id"
          class="border-b border-[var(--color-border-subtle)] last:border-0"
        >
          <td class="px-3 py-2 text-right tabular-nums text-[var(--color-text-secondary)]">{{ displayPlace(result) }}</td>
          <td class="px-3 py-2 text-right tabular-nums text-[var(--color-text-secondary)]">{{ result.lane }}</td>
          <td class="px-3 py-2">{{ result.bibNumber }}</td>
          <td class="px-3 py-2">
            <RouterLink
              :to="`/athletes/${result.athlete.licenseNumber}`"
              class="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            >{{ result.athlete.firstName }} {{ result.athlete.lastName }}</RouterLink>
          </td>
          <td class="px-3 py-2 text-[var(--color-text-secondary)]">{{ result.team }}</td>
          <td v-if="hasReacTime" class="px-3 py-2 text-right tabular-nums text-[var(--color-text-secondary)]">
            {{ result.reacTime != null ? result.reacTime.toFixed(3) : '—' }}
          </td>
          <!-- Mark cell: PB/SB badges left, mark right, all in a flex row -->
          <td class="px-3 py-2">
            <div class="flex items-center justify-end gap-1">
              <PbSbBadge v-if="result.isPB" type="pb" />
              <PbSbBadge v-if="result.isSB" type="sb" />
              <span class="tabular-nums font-semibold">{{ formatMark(result.mark) }}</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
