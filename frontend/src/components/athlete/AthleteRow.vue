<script setup lang="ts">
/**
 * Compact athlete row shared between the Search results and Rankings table.
 * Renders the athlete's name as a link to their profile (keyed by `licenseNumber`)
 * and a secondary line with gender, birth year, and last team — any segment is
 * omitted when the corresponding field is null.
 */
import { computed } from 'vue'
import type { PublicAthleteRow, Gender } from '@/api/public'
import { parseISODate } from '@/utils/date'
import uk from '@/i18n/uk'

const props = defineProps<{
  athlete: PublicAthleteRow
}>()

const genderLabel: Record<Gender, string> = {
  MALE: uk.GENDER_MALE,
  FEMALE: uk.GENDER_FEMALE,
  MIXED: uk.MIXED,
}

const metaLine = computed(() => {
  const segments: string[] = [genderLabel[props.athlete.gender]]
  if (props.athlete.birthDate) {
    segments.push(String(parseISODate(props.athlete.birthDate).getFullYear()))
  }
  if (props.athlete.lastTeam) {
    segments.push(props.athlete.lastTeam)
  }
  return segments.join(' · ')
})
</script>

<template>
  <div>
    <RouterLink
      :to="'/athletes/' + athlete.licenseNumber"
      class="text-sm font-medium text-[var(--color-accent)] hover:underline"
    >
      {{ athlete.firstName }} {{ athlete.lastName }}
    </RouterLink>
    <p class="text-xs text-[var(--color-text-muted)]">{{ metaLine }}</p>
  </div>
</template>
