<script setup lang="ts">
import AppButton from './AppButton.vue'

defineProps<{
  message: string
  action?: { label: string; onClick?: () => void; to?: string }
}>()
</script>

<template>
  <div class="py-12 text-center">
    <p class="text-sm text-[var(--color-text-secondary)]">{{ message }}</p>
    <div v-if="action" class="mt-4">
      <RouterLink v-if="action.to" :to="action.to">
        <AppButton variant="secondary" size="sm">{{ action.label }}</AppButton>
      </RouterLink>
      <AppButton v-else-if="action.onClick" variant="secondary" size="sm" @click="action.onClick">
        {{ action.label }}
      </AppButton>
    </div>
  </div>
</template>
