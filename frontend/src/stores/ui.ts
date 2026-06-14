import { defineStore } from 'pinia'
import { ref } from 'vue'

/** A transient notification shown in the toast stack. Auto-dismissed after 4 seconds. */
export interface Toast {
  id: number
  message: string
  type: 'error' | 'success'
}

export const useUiStore = defineStore('ui', () => {
  const toasts = ref<Toast[]>([])
  let nextId = 0

  function addToast(message: string, type: 'error' | 'success' = 'error') {
    const id = ++nextId
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, 4000)
  }

  function removeToast(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return { toasts, addToast, removeToast }
})
