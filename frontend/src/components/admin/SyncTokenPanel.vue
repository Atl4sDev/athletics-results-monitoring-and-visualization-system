<script setup lang="ts">
/**
 * Displays the competition sync token and provides copy and rotate actions.
 * The token is always visible (not shown-once), so admins can copy it at any time.
 * Rotating generates a new token and invalidates the previous one — the parent
 * is responsible for showing a confirmation dialog before emitting `rotate`.
 *
 * @prop token    - Current sync token string.
 * @prop rotating - When true, the rotate button shows a loading state.
 * @emits rotate  - User requested token rotation (after confirmation).
 */
import { useUiStore } from '@/stores/ui'
import AppButton from '@/components/common/AppButton.vue'
import uk from '@/i18n/uk'

defineProps<{
  token: string
  rotating: boolean
}>()

const emit = defineEmits<{
  rotate: []
}>()

const uiStore = useUiStore()

async function copyToken(token: string) {
  await navigator.clipboard.writeText(token)
  uiStore.addToast(uk.TOKEN_COPIED, 'success')
}
</script>

<template>
  <div class="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-page)] p-4">
    <p class="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">{{ uk.COMP_SYNC_TOKEN }}</p>
    <div class="mb-3 flex items-center gap-2">
      <code class="flex-1 select-all overflow-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 font-mono text-xs text-[var(--color-text-primary)]">{{ token }}</code>
      <AppButton variant="secondary" size="sm" @click="copyToken(token)">
        {{ uk.COPY_TOKEN }}
      </AppButton>
    </div>
    <AppButton variant="secondary" size="sm" :loading="rotating" @click="emit('rotate')">
      {{ uk.ROTATE_TOKEN }}
    </AppButton>
  </div>
</template>
