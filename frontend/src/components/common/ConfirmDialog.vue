<script setup lang="ts">
/**
 * Confirmation dialog built on the native `<dialog>` element.
 *
 * Open/close is controlled via the `open` prop (not v-if) so the element
 * stays mounted and `showModal()`/`close()` can be called imperatively.
 * Pressing Escape fires the native `cancel` event, which is forwarded as
 * the `cancel` emit.
 *
 * @prop open    - Whether the dialog is visible.
 * @prop title   - Heading text.
 * @prop body    - Optional explanatory paragraph.
 * @emits confirm - User clicked the confirm button.
 * @emits cancel  - User clicked cancel or pressed Escape.
 */
import { watch, nextTick, useTemplateRef } from 'vue'
import AppButton from './AppButton.vue'
import uk from '@/i18n/uk'

const props = defineProps<{
  open: boolean
  title: string
  body?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const dialogRef = useTemplateRef<HTMLDialogElement>('dialog')

watch(
  () => props.open,
  async (isOpen) => {
    const el = dialogRef.value
    if (!el) return
    if (isOpen) {
      el.showModal()
      // autofocus attribute only fires on first mount, not on showModal() calls.
      // Explicitly focus the first (Cancel) button after the DOM settles.
      await nextTick()
      el.querySelector<HTMLElement>('button')?.focus()
    } else {
      el.close()
    }
  },
)

function onNativeCancel() {
  emit('cancel')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto w-full max-w-sm rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-md"
    @cancel="onNativeCancel"
  >
    <h2 class="mb-2 text-base font-semibold text-[var(--color-text-primary)]">{{ title }}</h2>
    <p v-if="body" class="mb-6 text-sm text-[var(--color-text-secondary)]">{{ body }}</p>
    <div class="flex justify-end gap-3">
      <AppButton
        variant="secondary"
        @click="emit('cancel')"
      >
        {{ uk.CANCEL }}
      </AppButton>
      <AppButton variant="primary" @click="emit('confirm')">
        {{ uk.CONFIRM }}
      </AppButton>
    </div>
  </dialog>
</template>

<style scoped>
dialog::backdrop {
  background: rgba(0, 0, 0, 0.4);
}
</style>
