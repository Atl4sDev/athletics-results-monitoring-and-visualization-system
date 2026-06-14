<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAdminDisciplines, deleteDiscipline } from '@/api/admin'
import type { Discipline } from '@/api/admin'
import type { DisciplineType } from '@/api/public'
import { usePagination } from '@/composables/usePagination'
import { useUiStore } from '@/stores/ui'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadMore from '@/components/common/LoadMore.vue'
import AppButton from '@/components/common/AppButton.vue'
import FilterBar from '@/components/common/FilterBar.vue'
import FilterSelect from '@/components/common/FilterSelect.vue'
import SkeletonRow from '@/components/common/SkeletonRow.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import DisciplineFormModal from '@/components/admin/DisciplineFormModal.vue'
import uk from '@/i18n/uk'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()

// ── URL filters ───────────────────────────────────────────────────────────────

const typeFilter = computed<DisciplineType | undefined>(() =>
  (route.query.type as DisciplineType) || undefined,
)

// isStandard is stored as 'true'/'false' string in URL
const isStandardFilter = computed<boolean | undefined>(() => {
  const v = route.query.isStandard
  if (v === 'true') return true
  if (v === 'false') return false
  return undefined
})

function setType(val: string | undefined) {
  router.replace({ query: { ...route.query, type: val || undefined } })
}

function setIsStandard(val: string | undefined) {
  router.replace({ query: { ...route.query, isStandard: val || undefined } })
}

// ── Pagination ────────────────────────────────────────────────────────────────

const pagination = usePagination((cursor) =>
  getAdminDisciplines({
    type: typeFilter.value,
    isStandard: isStandardFilter.value,
    cursor: cursor ?? undefined,
    take: 30,
  }),
)

watch([typeFilter, isStandardFilter], () => pagination.reset())
onMounted(pagination.loadMore)

// ── Create / Edit modal ───────────────────────────────────────────────────────

const modalOpen = shallowRef(false)
const editTarget = ref<Discipline | null>(null)

function openCreate() {
  editTarget.value = null
  modalOpen.value = true
}

function openEdit(discipline: Discipline) {
  editTarget.value = discipline
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  editTarget.value = null
}

function onSaved(saved: Discipline) {
  const idx = pagination.items.value.findIndex((d) => d.id === saved.id)
  if (idx !== -1) {
    pagination.items.value = pagination.items.value.map((d) => (d.id === saved.id ? saved : d))
  } else {
    pagination.items.value = [saved, ...pagination.items.value]
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

const deleteTarget = ref<Discipline | null>(null)
const deleteOpen = shallowRef(false)

function requestDelete(discipline: Discipline) {
  deleteTarget.value = discipline
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const id = deleteTarget.value.id
  deleteOpen.value = false
  try {
    await deleteDiscipline(id)
    pagination.items.value = pagination.items.value.filter((d) => d.id !== id)
  } catch {
    uiStore.addToast(uk.ERROR_GENERIC, 'error')
    pagination.reset()
  } finally {
    deleteTarget.value = null
  }
}

// ── Filter options ────────────────────────────────────────────────────────────

const typeOptions = [
  { value: '', label: uk.FILTER_ALL },
  { value: 'TRACK', label: uk.DISC_TYPE_TRACK },
  { value: 'FIELD', label: uk.DISC_TYPE_FIELD },
]

const standardOptions = [
  { value: '', label: uk.FILTER_ALL },
  { value: 'true', label: uk.DISC_IS_STANDARD },
]
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-semibold text-[var(--color-text-primary)]">{{ uk.NAV_ADMIN_DISCIPLINES }}</h1>
      <AppButton @click="openCreate">{{ uk.CREATE }}</AppButton>
    </div>

    <!-- Filters -->
    <FilterBar>
      <FilterSelect
        id="filter-type"
        :label="uk.DISC_FILTER_TYPE"
        :model-value="typeFilter ?? ''"
        :options="typeOptions"
        @update:model-value="setType"
      />
      <FilterSelect
        id="filter-standard"
        :label="uk.DISC_FILTER_STANDARD"
        :model-value="isStandardFilter === undefined ? '' : String(isStandardFilter)"
        :options="standardOptions"
        @update:model-value="setIsStandard"
      />
    </FilterBar>

    <!-- Table -->
    <div class="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-border)]">
      <table class="w-full text-sm">
        <thead class="border-b border-[var(--color-border)] bg-[var(--color-bg-card)]">
          <tr>
            <th class="px-3 py-2 text-left font-medium text-[var(--color-text-secondary)]">{{ uk.DISC_CODE }}</th>
            <th class="px-3 py-2 text-left font-medium text-[var(--color-text-secondary)]">{{ uk.DISC_NAME }}</th>
            <th class="px-3 py-2 text-left font-medium text-[var(--color-text-secondary)]">{{ uk.DISC_TYPE }}</th>
            <th class="px-3 py-2 text-center font-medium text-[var(--color-text-secondary)]">{{ uk.DISC_IS_STANDARD }}</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-border)] bg-[var(--color-bg-card)]">
          <template v-if="pagination.items.value.length === 0 && pagination.loading.value">
            <SkeletonRow v-for="i in 5" :key="i" :columns="5" />
          </template>

          <tr
            v-for="disc in pagination.items.value"
            :key="disc.id"
            class="group hover:bg-[var(--color-bg-page)]"
          >
            <td class="px-3 py-2 font-mono text-xs text-[var(--color-text-primary)]">{{ disc.code }}</td>
            <td class="px-3 py-2 text-[var(--color-text-primary)]">{{ disc.name }}</td>
            <td class="px-3 py-2 text-[var(--color-text-secondary)]">
              {{ disc.type === 'TRACK' ? uk.DISC_TYPE_TRACK : uk.DISC_TYPE_FIELD }}
            </td>
            <td class="px-3 py-2 text-center text-[var(--color-text-secondary)]">{{ disc.isStandard ? '✓' : '—' }}</td>
            <td class="px-3 py-2">
              <div class="flex items-center justify-end gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <AppButton variant="quiet" size="sm" @click="openEdit(disc)">{{ uk.EDIT }}</AppButton>
                <AppButton variant="danger" size="sm" @click="requestDelete(disc)">{{ uk.DELETE }}</AppButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <EmptyState v-if="pagination.items.value.length === 0 && !pagination.loading.value" :message="uk.EMPTY_DISCIPLINES" />
    <LoadMore :loading="pagination.loading.value" :has-more="pagination.hasMore.value" @load="pagination.loadMore" />

    <DisciplineFormModal
      :open="modalOpen"
      :discipline="editTarget"
      @saved="onSaved"
      @close="closeModal"
    />

    <ConfirmDialog
      :open="deleteOpen"
      :title="uk.DISC_DELETE_TITLE"
      :body="uk.DISC_DELETE_BODY"
      @confirm="confirmDelete"
      @cancel="deleteOpen = false; deleteTarget = null"
    />
  </div>
</template>
