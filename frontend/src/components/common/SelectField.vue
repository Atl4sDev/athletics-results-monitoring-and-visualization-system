<script setup lang="ts">
defineProps<{
  id: string
  label: string
  options: { value: string; label: string }[]
  required?: boolean
}>()

const model = defineModel<string>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <label :for="id" class="text-sm font-medium text-[var(--color-text-secondary)]">{{ label }}</label>
    <select
      :id="id"
      v-model="model"
      :required="required"
      class="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
    >
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
  </div>
</template>
