<script setup lang="ts">
import { computed } from 'vue'
import type { Gender, AgeCategory, CompetitionEnvironment } from '@/api/public'
import { useDisciplines } from '@/composables/useDisciplines'
import DisciplineSelector from '@/components/athlete/DisciplineSelector.vue'
import uk from '@/i18n/uk'

const props = defineProps<{
  disciplineId: number | null
  gender: Gender | null
  ageCategory: AgeCategory | null
  environment: CompetitionEnvironment | null
  season: number | undefined
}>()

const emit = defineEmits<{
  'update:disciplineId': [value: number]
  'update:gender': [value: Gender | null]
  'update:ageCategory': [value: AgeCategory | null]
  'update:environment': [value: CompetitionEnvironment | null]
  'update:season': [value: number | null]
}>()

const { disciplines } = useDisciplines()

const ageCategoryOptions: AgeCategory[] = ['U14', 'U16', 'U18', 'U20', 'U23', 'SENIOR', 'MASTERS']

const currentYear = new Date().getFullYear()
const seasonYears = computed(() =>
  Array.from({ length: 10 }, (_, i) => currentYear - i),
)

function onGenderChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  emit('update:gender', val ? (val as Gender) : null)
}

function onAgeCategoryChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  emit('update:ageCategory', val ? (val as AgeCategory) : null)
}

function onEnvironmentChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  emit('update:environment', val ? (val as CompetitionEnvironment) : null)
}

function onSeasonChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  emit('update:season', val ? Number(val) : null)
}
</script>

<template>
  <div class="mb-6 flex flex-wrap gap-4">
    <label class="flex flex-col gap-1">
      <span class="text-xs text-[var(--color-text-muted)]">{{ uk.FILTER_DISCIPLINE }}</span>
      <DisciplineSelector
        :model-value="props.disciplineId"
        :disciplines="disciplines"
        @update:model-value="$emit('update:disciplineId', $event)"
      />
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-xs text-[var(--color-text-muted)]">{{ uk.FILTER_GENDER }}</span>
      <select
        :value="gender ?? ''"
        class="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        @change="onGenderChange"
      >
        <option value="">{{ uk.FILTER_ALL }}</option>
        <option value="MALE">{{ uk.GENDER_MALE }}</option>
        <option value="FEMALE">{{ uk.GENDER_FEMALE }}</option>
      </select>
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-xs text-[var(--color-text-muted)]">{{ uk.FILTER_AGE_CATEGORY }}</span>
      <select
        :value="ageCategory ?? ''"
        class="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        @change="onAgeCategoryChange"
      >
        <option value="">{{ uk.FILTER_ALL }}</option>
        <option v-for="cat in ageCategoryOptions" :key="cat" :value="cat">{{ cat }}</option>
      </select>
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-xs text-[var(--color-text-muted)]">{{ uk.FILTER_ENVIRONMENT }}</span>
      <select
        :value="environment ?? ''"
        class="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        @change="onEnvironmentChange"
      >
        <option value="">{{ uk.FILTER_ALL }}</option>
        <option value="INDOOR">{{ uk.INDOOR }}</option>
        <option value="OUTDOOR">{{ uk.OUTDOOR }}</option>
      </select>
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-xs text-[var(--color-text-muted)]">{{ uk.FILTER_SEASON }}</span>
      <select
        :value="season ?? ''"
        class="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        @change="onSeasonChange"
      >
        <option value="">{{ uk.SEASON_CURRENT }}</option>
        <option v-for="year in seasonYears" :key="year" :value="year">{{ year }}</option>
      </select>
    </label>
  </div>
</template>
