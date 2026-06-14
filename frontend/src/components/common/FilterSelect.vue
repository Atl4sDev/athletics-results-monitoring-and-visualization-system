<script setup lang="ts">
const model = defineModel<string>()

defineProps<{
  id: string
  label: string
  options: { value: string; label: string }[]
}>()
</script>

<template>
  <label :for="id" class="flex flex-col gap-1">
    <span class="text-xs text-[var(--color-text-muted)]">{{ label }}</span>
    <select
      :id="id"
      v-model="model"
      class="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
    >
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
  </label>
</template>
