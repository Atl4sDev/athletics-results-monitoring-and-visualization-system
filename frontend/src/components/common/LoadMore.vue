<script setup lang="ts">
import AppButton from './AppButton.vue'
import AppSpinner from './AppSpinner.vue'
import uk from '@/i18n/uk'

defineProps<{ loading: boolean; hasMore: boolean }>()
defineEmits<{ load: [] }>()
</script>

<template>
  <div v-if="hasMore" class="flex justify-center py-6">
    <AppSpinner v-if="loading" size="md" />
    <AppButton v-else variant="secondary" @click="$emit('load')">
      {{ uk.LOAD_MORE }}
    </AppButton>
  </div>
</template>
