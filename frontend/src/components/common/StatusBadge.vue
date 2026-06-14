<script setup lang="ts">
/**
 * Pill badge that maps a status code to a localised label and theme colour.
 * Accepts values from both the competition domain (UPCOMING / ONGOING / COMPLETED)
 * and the heat domain (SCHEDULED / UNCONFIRMED / OFFICIAL), sharing colour tokens
 * where semantics align (e.g. UPCOMING and SCHEDULED both use the scheduled palette).
 */
import uk from '@/i18n/uk'

type Status = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'UNCONFIRMED' | 'SCHEDULED' | 'OFFICIAL'

defineProps<{ status: Status }>()

const colorMap: Record<Status, string> = {
  UPCOMING: 'bg-[var(--color-status-scheduled-bg)] text-[var(--color-status-scheduled-text)] border-[var(--color-status-scheduled-border)]',
  SCHEDULED: 'bg-[var(--color-status-scheduled-bg)] text-[var(--color-status-scheduled-text)] border-[var(--color-status-scheduled-border)]',
  ONGOING: 'bg-[var(--color-status-ongoing-bg)] text-[var(--color-status-ongoing-text)] border-[var(--color-status-ongoing-border)]',
  COMPLETED: 'bg-[var(--color-status-official-bg)] text-[var(--color-status-official-text)] border-[var(--color-status-official-border)]',
  OFFICIAL: 'bg-[var(--color-status-official-bg)] text-[var(--color-status-official-text)] border-[var(--color-status-official-border)]',
  UNCONFIRMED: 'bg-[var(--color-status-unconfirmed-bg)] text-[var(--color-status-unconfirmed-text)] border-[var(--color-status-unconfirmed-border)]',
}

const labelMap: Record<Status, string> = {
  UPCOMING: uk.UPCOMING,
  SCHEDULED: uk.SCHEDULED,
  ONGOING: uk.ONGOING,
  COMPLETED: uk.COMPLETED,
  OFFICIAL: uk.OFFICIAL,
  UNCONFIRMED: uk.UNCONFIRMED,
}
</script>

<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
    :class="colorMap[status]"
  >{{ labelMap[status] }}</span>
</template>
