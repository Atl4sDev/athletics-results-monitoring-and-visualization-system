<script setup lang="ts">
import uk from '@/i18n/uk'

defineProps<{
  disciplines: { id: number; name: string }[]
  modelValue: number | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function onChange(e: Event) {
  const val = Number((e.target as HTMLSelectElement).value)
  if (!isNaN(val) && val > 0) emit('update:modelValue', val)
}
</script>

<template>
  <select
    :value="modelValue ?? ''"
    :disabled="disabled || disciplines.length === 0"
    class="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
    @change="onChange"
  >
    <option value="" disabled>{{ uk.SELECT_DISCIPLINE }}</option>
    <option v-for="d in disciplines" :key="d.id" :value="d.id">{{ d.name }}</option>
  </select>
</template>
