<script setup lang="ts">
import { ref, shallowRef, computed } from 'vue'
import { mergeAthletes, getAdminAthlete } from '@/api/admin'
import type { AdminAthlete, AdminAthleteDetail } from '@/api/admin'
import { ApiError } from '@/api/client'
import { useUiStore } from '@/stores/ui'
import { useAthleteSearch } from '@/composables/useAthleteSearch'
import { parseISODate } from '@/utils/date'
import Modal from '@/components/common/Modal.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import uk from '@/i18n/uk'

defineProps<{ open: boolean }>()

const emit = defineEmits<{
  merged: []
  close: []
}>()

const uiStore = useUiStore()

// ── Source picker ─────────────────────────────────────────────────────────────

const sourceSearch = useAthleteSearch()
const sourceSelected = ref<AdminAthleteDetail | null>(null)

async function selectSource(athlete: AdminAthlete) {
  sourceSearch.query.value = ''
  try {
    sourceSelected.value = await getAdminAthlete(athlete.id)
  } catch {
    sourceSelected.value = { ...athlete, resultCount: 0 }
  }
}

function clearSource() {
  sourceSelected.value = null
}

// ── Target picker ─────────────────────────────────────────────────────────────

const targetSearch = useAthleteSearch()
const targetSelected = ref<AdminAthleteDetail | null>(null)

async function selectTarget(athlete: AdminAthlete) {
  targetSearch.query.value = ''
  try {
    targetSelected.value = await getAdminAthlete(athlete.id)
  } catch {
    targetSelected.value = { ...athlete, resultCount: 0 }
  }
}

function clearTarget() {
  targetSelected.value = null
}

// ── Validation ────────────────────────────────────────────────────────────────

const canMerge = computed(() =>
  sourceSelected.value !== null &&
  targetSelected.value !== null &&
  sourceSelected.value.id !== targetSelected.value.id,
)

// ── Confirm merge ─────────────────────────────────────────────────────────────

const confirmOpen = shallowRef(false)
const merging = shallowRef(false)

async function confirmMerge() {
  if (!sourceSelected.value || !targetSelected.value) return
  confirmOpen.value = false
  merging.value = true
  try {
    // target is the keeper (first arg), source is absorbed (second arg)
    await mergeAthletes(targetSelected.value.id, sourceSelected.value.id)
    emit('merged')
    emit('close')
  } catch (e) {
    uiStore.addToast(e instanceof ApiError ? e.message : uk.ERROR_GENERIC, 'error')
  } finally {
    merging.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function athleteLabel(a: AdminAthleteDetail): string {
  const year = a.birthDate ? parseISODate(a.birthDate).getUTCFullYear() : null
  return `${a.lastName} ${a.firstName}${year ? ` (${year})` : ''} · ${a.licenseNumber} · ${a.resultCount} ${uk.ATHLETE_RESULTS_COUNT}`
}
</script>

<template>
  <Modal :open="open" :title="uk.ATHLETE_MERGE_TITLE" @close="emit('close')">
    <div class="flex flex-col gap-6">
      <!-- Direction explanation -->
      <p class="text-sm text-[var(--color-text-secondary)]">{{ uk.ATHLETE_MERGE_DIRECTION }}</p>

      <!-- Source picker -->
      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium text-[var(--color-text-primary)]">{{ uk.ATHLETE_MERGE_SOURCE }}</p>
        <div v-if="sourceSelected" class="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm">
          <span class="text-[var(--color-text-primary)]">{{ athleteLabel(sourceSelected) }}</span>
          <AppButton variant="quiet" size="sm" @click="clearSource">✕</AppButton>
        </div>
        <template v-else>
          <input
            v-model="sourceSearch.query.value"
            type="search"
            :placeholder="uk.ATHLETE_SEARCH_PLACEHOLDER"
            class="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          />
          <div v-if="sourceSearch.loading.value" class="flex justify-center py-2">
            <AppSpinner size="sm" />
          </div>
          <ul v-else-if="sourceSearch.items.value.length > 0" class="max-h-40 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)]">
            <li
              v-for="a in sourceSearch.items.value"
              :key="a.id"
              class="cursor-pointer px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-accent-tint)]"
              @click="selectSource(a)"
            >
              {{ a.lastName }} {{ a.firstName }} · {{ a.licenseNumber }}
            </li>
          </ul>
        </template>
      </div>

      <!-- Target picker -->
      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium text-[var(--color-text-primary)]">{{ uk.ATHLETE_MERGE_TARGET }}</p>
        <div v-if="targetSelected" class="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm">
          <span class="text-[var(--color-text-primary)]">{{ athleteLabel(targetSelected) }}</span>
          <AppButton variant="quiet" size="sm" @click="clearTarget">✕</AppButton>
        </div>
        <template v-else>
          <input
            v-model="targetSearch.query.value"
            type="search"
            :placeholder="uk.ATHLETE_SEARCH_PLACEHOLDER"
            class="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          />
          <div v-if="targetSearch.loading.value" class="flex justify-center py-2">
            <AppSpinner size="sm" />
          </div>
          <ul v-else-if="targetSearch.items.value.length > 0" class="max-h-40 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)]">
            <li
              v-for="a in targetSearch.items.value"
              :key="a.id"
              class="cursor-pointer px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-accent-tint)]"
              @click="selectTarget(a)"
            >
              {{ a.lastName }} {{ a.firstName }} · {{ a.licenseNumber }}
            </li>
          </ul>
        </template>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <AppButton variant="secondary" type="button" @click="emit('close')">{{ uk.CANCEL }}</AppButton>
        <AppButton
          type="button"
          :disabled="!canMerge"
          :loading="merging"
          @click="confirmOpen = true"
        >
          {{ uk.MERGE }}
        </AppButton>
      </div>
    </template>
  </Modal>

  <ConfirmDialog
    :open="confirmOpen"
    :title="uk.ATHLETE_MERGE_CONFIRM_TITLE"
    :body="uk.ATHLETE_MERGE_CONFIRM_BODY"
    @confirm="confirmMerge"
    @cancel="confirmOpen = false"
  />
</template>
