<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { deleteAthlete } from '@/api/admin'
import type { AdminAthlete } from '@/api/admin'
import { useAthleteSearch } from '@/composables/useAthleteSearch'
import { useUiStore } from '@/stores/ui'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadMore from '@/components/common/LoadMore.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import AdminAthleteRow from '@/components/admin/AdminAthleteRow.vue'
import AthleteFormModal from '@/components/admin/AthleteFormModal.vue'
import AthleteMergeModal from '@/components/admin/AthleteMergeModal.vue'
import uk from '@/i18n/uk'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()

// ── Search (q synced to URL) ───────────────────────────────────────────────────

const { query, items, loading, hasMore, loadMore, reset } = useAthleteSearch()

// Sync composable query from URL on mount
const urlQ = computed(() => (route.query.q as string) || '')
onMounted(() => { query.value = urlQ.value })

// When query changes, update URL
watch(query, (q) => {
  router.replace({ query: { ...route.query, q: q || undefined } })
})

// ── Delete ────────────────────────────────────────────────────────────────────

const deleteTarget = ref<AdminAthlete | null>(null)
const deleteOpen = shallowRef(false)

function requestDelete(athlete: AdminAthlete) {
  deleteTarget.value = athlete
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const id = deleteTarget.value.id
  deleteOpen.value = false
  try {
    await deleteAthlete(id)
    items.value = items.value.filter((a) => a.id !== id)
  } catch {
    uiStore.addToast(uk.ERROR_GENERIC, 'error')
  } finally {
    deleteTarget.value = null
  }
}

// ── Create / Edit modal ───────────────────────────────────────────────────────

const formOpen = shallowRef(false)
const editTarget = ref<AdminAthlete | null>(null)

function openCreate() {
  editTarget.value = null
  formOpen.value = true
}

function openEdit(athlete: AdminAthlete) {
  editTarget.value = athlete
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  editTarget.value = null
}

function onAthleteSaved(saved: AdminAthlete) {
  const idx = items.value.findIndex((a) => a.id === saved.id)
  if (idx !== -1) {
    items.value = items.value.map((a) => (a.id === saved.id ? saved : a))
  } else {
    items.value = [saved, ...items.value]
  }
}

// ── Merge modal ───────────────────────────────────────────────────────────────

const mergeOpen = shallowRef(false)

function onMerged() {
  reset()
}
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-semibold text-[var(--color-text-primary)]">{{ uk.NAV_ADMIN_ATHLETES }}</h1>
      <div class="flex gap-2">
        <AppButton variant="secondary" @click="mergeOpen = true">{{ uk.MERGE }}</AppButton>
        <AppButton @click="openCreate">{{ uk.CREATE }}</AppButton>
      </div>
    </div>

    <!-- Search input -->
    <div class="mb-6">
      <label class="flex flex-col gap-1">
        <span class="text-xs text-[var(--color-text-muted)]">{{ uk.ATHLETE_SEARCH_LABEL }}</span>
        <input
          v-model="query"
          type="search"
          :placeholder="uk.ATHLETE_SEARCH_PLACEHOLDER"
          class="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        />
      </label>
    </div>

    <!-- Loading state -->
    <div v-if="loading && items.length === 0" class="flex justify-center py-12">
      <AppSpinner size="md" />
    </div>

    <!-- Results -->
    <div v-else-if="items.length > 0" class="flex flex-col gap-2">
      <AdminAthleteRow
        v-for="athlete in items"
        :key="athlete.id"
        :athlete="athlete"
        @edit="openEdit"
        @delete="requestDelete"
      />
      <LoadMore :loading="loading" :has-more="hasMore" @load="loadMore" />
    </div>

    <!-- Empty state (only after a search) -->
    <EmptyState v-else-if="query" :message="uk.EMPTY_ATHLETES" />

    <!-- Default state — no search yet -->
    <p v-else class="py-12 text-center text-sm text-[var(--color-text-secondary)]">{{ uk.ATHLETE_SEARCH_PLACEHOLDER }}</p>

    <!-- Modals -->
    <AthleteFormModal
      :open="formOpen"
      :athlete="editTarget"
      @saved="onAthleteSaved"
      @close="closeForm"
    />

    <AthleteMergeModal
      :open="mergeOpen"
      @merged="onMerged"
      @close="mergeOpen = false"
    />

    <ConfirmDialog
      :open="deleteOpen"
      :title="uk.ATHLETE_DELETE_TITLE"
      :body="uk.ATHLETE_DELETE_BODY"
      @confirm="confirmDelete"
      @cancel="deleteOpen = false; deleteTarget = null"
    />
  </div>
</template>
