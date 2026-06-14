<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCompetitionForm } from '@/composables/useCompetitionForm'
import { useUiStore } from '@/stores/ui'
import FormField from '@/components/common/FormField.vue'
import SelectField from '@/components/common/SelectField.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import SyncTokenPanel from '@/components/admin/SyncTokenPanel.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import uk from '@/i18n/uk'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()

const id = computed(() => route.params.id as string | undefined)
const isEditMode = computed(() => !!id.value)

const { form, competition, loading, saving, rotating, error, load, save, rotate } =
  useCompetitionForm(id)

// Re-load when the id param changes (handles /new → /:id navigation after create)
watch(() => route.params.id, () => load(), { immediate: true })

// ── Rotate token ──────────────────────────────────────────────────────────────

const rotateDialogOpen = shallowRef(false)

async function confirmRotate() {
  rotateDialogOpen.value = false
  try {
    await rotate()
  } catch {
    uiStore.addToast(uk.ERROR_GENERIC, 'error')
  }
}

// ── Submit ────────────────────────────────────────────────────────────────────

async function handleSubmit() {
  try {
    const newId = await save()
    if (newId) {
      router.replace({ name: 'AdminCompetitionForm', params: { id: newId } })
    } else {
      uiStore.addToast(uk.RESULT_SAVED, 'success')
    }
  } catch {
    uiStore.addToast(error.value ?? uk.ERROR_GENERIC, 'error')
  }
}

// ── Select options ────────────────────────────────────────────────────────────

const envOptions = [
  { value: 'OUTDOOR', label: uk.OUTDOOR },
  { value: 'INDOOR', label: uk.INDOOR },
]
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div class="mb-6 flex items-center gap-3">
      <AppButton variant="quiet" size="sm" @click="router.push({ name: 'AdminCompetitionList' })">
        {{ uk.BACK }}
      </AppButton>
      <h1 class="text-xl font-semibold text-[var(--color-text-primary)]">
        {{ isEditMode ? competition?.name ?? uk.NAV_ADMIN_COMPETITIONS : uk.CREATE }}
      </h1>
    </div>

    <AppSpinner v-if="loading" size="md" class="my-8" />

    <form v-else class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <FormField id="name" v-model="form.name" :label="uk.COMP_NAME" required />
      <FormField id="dateStart" v-model="form.dateStart" :label="uk.COMP_DATE_START" type="date" required />
      <FormField id="dateEnd" v-model="form.dateEnd" :label="uk.COMP_DATE_END" type="date" required />
      <FormField id="location" v-model="form.location" :label="uk.COMP_LOCATION" required />
      <SelectField
        id="environment"
        v-model="(form.environment as string)"
        :label="uk.COMP_ENVIRONMENT"
        :options="envOptions"
        required
      />

      <!-- Status (read-only, edit mode only) -->
      <div v-if="isEditMode && competition" class="flex flex-col gap-1">
        <span class="text-sm font-medium text-[var(--color-text-secondary)]">{{ uk.COMP_STATUS }}</span>
        <div class="py-1">
          <StatusBadge :status="competition.status" />
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-2">
        <AppButton
          variant="secondary"
          type="button"
          @click="router.push({ name: 'AdminCompetitionList' })"
        >
          {{ uk.CANCEL }}
        </AppButton>
        <AppButton type="submit" :loading="saving">{{ uk.SAVE }}</AppButton>
      </div>
    </form>

    <!-- Sync token panel (edit mode only, after form) -->
    <div v-if="isEditMode && competition?.syncToken" class="mt-6">
      <SyncTokenPanel
        :token="competition.syncToken"
        :rotating="rotating"
        @rotate="rotateDialogOpen = true"
      />
    </div>

    <!-- Rotate token confirmation -->
    <ConfirmDialog
      :open="rotateDialogOpen"
      :title="uk.COMP_ROTATE_TOKEN_TITLE"
      :body="uk.COMP_ROTATE_TOKEN_BODY"
      @confirm="confirmRotate"
      @cancel="rotateDialogOpen = false"
    />
  </div>
</template>
