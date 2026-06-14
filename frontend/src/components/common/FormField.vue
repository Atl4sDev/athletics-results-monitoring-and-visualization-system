<script setup lang="ts">
withDefaults(defineProps<{
  id: string
  label: string
  type?: string
  required?: boolean
  readonly?: boolean
  autocomplete?: string
  placeholder?: string
  step?: string
  pattern?: string
}>(), {
  type: 'text',
  required: false,
  readonly: false,
})

const model = defineModel<string>()

function onDateTouchEnd(e: TouchEvent) {
  // Prevent the synthetic click that follows touchend — inside <dialog> it
  // fails to open the native date picker. Instead open it explicitly.
  e.preventDefault()
  const input = e.currentTarget as HTMLInputElement
  input.focus()
  input.showPicker?.()
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <label :for="id" class="text-sm font-medium text-[var(--color-text-secondary)]">{{ label }}</label>
    <input
      :id="id"
      v-model="model"
      :type="type"
      lang="uk"
      :required="required"
      :readonly="readonly"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :step="step"
      :pattern="pattern"
      class="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      :class="readonly ? 'cursor-default opacity-70' : ''"
      @touchend="type === 'date' ? onDateTouchEnd($event) : undefined"
    />
  </div>
</template>
