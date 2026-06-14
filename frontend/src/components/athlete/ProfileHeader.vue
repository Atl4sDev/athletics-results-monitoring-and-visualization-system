<script setup lang="ts">
import type { PublicAthleteRow, Gender } from '@/api/public'
import { parseISODate } from '@/utils/date'
import uk from '@/i18n/uk'

defineProps<{
  athlete: PublicAthleteRow | null
  loading: boolean
}>()

const genderLabel: Record<Gender, string> = {
  MALE: uk.GENDER_MALE,
  FEMALE: uk.GENDER_FEMALE,
  MIXED: uk.MIXED,
}
</script>

<template>
  <header class="mb-6">
    <template v-if="loading">
      <div class="h-8 w-56 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-border-subtle)]" />
      <div class="mt-2 flex flex-wrap gap-3">
        <div class="h-4 w-16 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-border-subtle)]" />
        <div class="h-4 w-10 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-border-subtle)]" />
        <div class="h-4 w-28 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-border-subtle)]" />
      </div>
    </template>

    <template v-else-if="athlete">
      <h1 class="text-2xl font-semibold text-[var(--color-text-primary)]">
        {{ athlete.firstName }} {{ athlete.lastName }}
      </h1>
      <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--color-text-secondary)]">
        <span>{{ genderLabel[athlete.gender] }}</span>
        <span v-if="athlete.birthDate">{{ parseISODate(athlete.birthDate).getFullYear() }}</span>
        <span class="font-mono tracking-wide">{{ athlete.licenseNumber }}</span>
      </div>
    </template>
  </header>
</template>
