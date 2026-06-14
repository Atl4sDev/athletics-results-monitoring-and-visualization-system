<script setup lang="ts">
import uk from '@/i18n/uk'

type Size = 'sm' | 'md' | 'lg'

withDefaults(defineProps<{ size?: Size }>(), { size: 'md' })

const sizeMap: Record<Size, number> = { sm: 16, md: 24, lg: 40 }
</script>

<template>
  <svg
    :width="sizeMap[size]"
    :height="sizeMap[size]"
    viewBox="0 0 24 24"
    fill="none"
    class="animate-spin"
    :aria-label="uk.LOADING"
    role="status"
  >
    <!-- track -->
    <circle
      cx="12" cy="12" r="10"
      stroke-width="2.5"
      class="stroke-[var(--color-border)]"
    />
    <!-- arc -->
    <path
      d="M12 2a10 10 0 0 1 10 10"
      stroke-width="2.5"
      stroke-linecap="round"
      class="stroke-[var(--color-accent)]"
    />
  </svg>
</template>
