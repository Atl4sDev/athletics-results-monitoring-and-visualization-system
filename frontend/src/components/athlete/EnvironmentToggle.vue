<script setup lang="ts">
import type { CompetitionEnvironment } from '@/api/public'
import AppButton from '@/components/common/AppButton.vue'
import uk from '@/i18n/uk'

defineProps<{
  modelValue: CompetitionEnvironment
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CompetitionEnvironment]
}>()
</script>

<template>
  <div class="mb-5 flex gap-2" role="group" aria-label="Середовище">
    <AppButton
      :variant="modelValue === 'OUTDOOR' ? 'primary' : 'secondary'"
      :disabled="disabled"
      @click="emit('update:modelValue', 'OUTDOOR')"
    >
      {{ uk.OUTDOOR }}
    </AppButton>
    <AppButton
      :variant="modelValue === 'INDOOR' ? 'primary' : 'secondary'"
      :disabled="disabled"
      @click="emit('update:modelValue', 'INDOOR')"
    >
      {{ uk.INDOOR }}
    </AppButton>
  </div>
</template>
