<script setup lang="ts">
import uk from '@/i18n/uk'

type BadgeType = 'pb' | 'sb'

defineProps<{ type: BadgeType }>()

const colorMap: Record<BadgeType, string> = {
  pb: 'border-[var(--color-accent)] text-[var(--color-accent)]',
  sb: 'border-[var(--color-border)] text-[var(--color-text-secondary)]',
}

const labelMap: Record<BadgeType, string> = {
  pb: uk.PB,
  sb: uk.SB,
}
</script>

<template>
  <span
    class="rounded-full border px-1 py-0.5 text-xs font-medium"
    :class="colorMap[type]"
  >{{ labelMap[type] }}</span>
</template>
