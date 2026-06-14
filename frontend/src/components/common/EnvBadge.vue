<script setup lang="ts">
import uk from '@/i18n/uk'

type Env = 'INDOOR' | 'OUTDOOR'

defineProps<{ env: Env }>()

const colorMap: Record<Env, string> = {
  INDOOR: 'bg-[var(--color-env-indoor-bg)] text-[var(--color-env-indoor-text)] border-[var(--color-env-indoor-border)]',
  OUTDOOR: 'bg-[var(--color-env-outdoor-bg)] text-[var(--color-env-outdoor-text)] border-[var(--color-env-outdoor-border)]',
}

const labelMap: Record<Env, string> = {
  INDOOR: uk.INDOOR,
  OUTDOOR: uk.OUTDOOR,
}
</script>

<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
    :class="colorMap[env]"
  >{{ labelMap[env] }}</span>
</template>
