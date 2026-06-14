<script setup lang="ts">
import { watch, nextTick, useTemplateRef } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{
  close: []
}>()

defineSlots<{
  default(): any
  footer(): any
}>()

const dialogRef = useTemplateRef<HTMLDialogElement>('dialog')

watch(
  () => props.open,
  async (isOpen) => {
    const el = dialogRef.value
    if (!el) return
    if (isOpen) {
      el.showModal()
      await nextTick()
      el.querySelector<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus()
    } else {
      el.close()
    }
  },
)

function onNativeCancel() {
  emit('close')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto w-full max-w-lg rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-page)] p-0 shadow-md"
    @cancel="onNativeCancel"
  >
    <div class="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
      <h2 class="text-base font-semibold text-[var(--color-text-primary)]">{{ title }}</h2>
      <button
        type="button"
        class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        @click="emit('close')"
      >
        ✕
      </button>
    </div>

    <div class="flex-1 overflow-y-auto px-6 py-4">
      <slot />
    </div>

    <div v-if="$slots.footer" class="shrink-0 border-t border-[var(--color-border)] px-6 py-4">
      <slot name="footer" />
    </div>
  </dialog>
</template>

<style scoped>
dialog::backdrop {
  background: rgba(0, 0, 0, 0.4);
}

/* Apply flex layout only when the dialog is actually open.
   Putting flex directly on <dialog> overrides the UA stylesheet's
   display:none for closed dialogs, making them permanently visible. */
dialog[open] {
  display: flex;
  flex-direction: column;
  max-height: 90dvh;
}
</style>
