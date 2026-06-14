<script setup lang="ts">
import AppSpinner from './AppSpinner.vue'

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger'
type Size = 'md' | 'sm'

withDefaults(defineProps<{
  variant?: Variant
  size?: Size
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
}>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
})

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)]',
  secondary: 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-page)]',
  quiet: 'text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] hover:underline underline-offset-2',
  danger: 'text-[var(--color-error)] hover:opacity-80',
}

const sizeClasses: Record<Size, string> = {
  md: 'px-4 py-2 text-sm',
  sm: 'px-3 py-1.5 text-xs',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center gap-2 rounded-[var(--radius-sm)] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    :class="[variantClasses[variant], sizeClasses[size]]"
  >
    <AppSpinner v-if="loading" size="sm" />
    <slot />
  </button>
</template>
