<script setup lang="ts">
import { computed } from 'vue'
import type { AdminAthlete } from '@/api/admin'
import { parseISODate } from '@/utils/date'
import AppButton from '@/components/common/AppButton.vue'
import uk from '@/i18n/uk'

const props = defineProps<{
  athlete: AdminAthlete
}>()

const emit = defineEmits<{
  edit: [athlete: AdminAthlete]
  delete: [athlete: AdminAthlete]
}>()

const genderLabel = computed(() => uk[props.athlete.gender as keyof typeof uk] ?? props.athlete.gender)

const birthYear = computed(() => {
  if (!props.athlete.birthDate) return null
  return parseISODate(props.athlete.birthDate).getUTCFullYear()
})
</script>

<template>
  <div class="group flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm">
    <div class="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
      <RouterLink
        :to="{ name: 'AthleteProfile', params: { license: athlete.licenseNumber } }"
        target="_blank"
        rel="noopener noreferrer"
        class="font-medium text-[var(--color-accent)] hover:underline"
      >{{ athlete.lastName }} {{ athlete.firstName }}</RouterLink>
      <span class="text-[var(--color-text-secondary)]">{{ genderLabel }}</span>
      <span v-if="birthYear" class="text-[var(--color-text-secondary)]">{{ birthYear }}</span>
      <span class="font-mono text-xs text-[var(--color-text-secondary)]">{{ athlete.licenseNumber }}</span>
    </div>
    <div class="flex shrink-0 items-center gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
      <AppButton variant="quiet" size="sm" @click="emit('edit', athlete)">{{ uk.EDIT }}</AppButton>
      <AppButton variant="danger" size="sm" @click="emit('delete', athlete)">{{ uk.DELETE }}</AppButton>
    </div>
  </div>
</template>
