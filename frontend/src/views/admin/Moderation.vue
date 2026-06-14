<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getAdminHeats,
  getAdminHeat,
  getAdminCompetitions,
  confirmHeat,
  unconfirmHeat,
  patchResult,
  deleteResult,
  addResult,
  type AdminHeatListItem,
  type HeatAdmin,
  type AdminResultRow,
  type PatchResultBody,
  type AddResultBody,
} from '@/api/admin'
import type { HeatStatus, ResultStatus } from '@/api/public'
import { ApiError } from '@/api/client'
import { usePagination } from '@/composables/usePagination'
import { adminHeatToPublic } from '@/utils/format'
import { formatDisplayDate, parseISODate } from '@/utils/date'
import { useUiStore } from '@/stores/ui'
import HeatTable from '@/components/heat/HeatTable.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadMore from '@/components/common/LoadMore.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import FilterBar from '@/components/common/FilterBar.vue'
import FilterSelect from '@/components/common/FilterSelect.vue'
import uk from '@/i18n/uk'

// ── Router / URL state ────────────────────────────────────────────────────────

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()

const statusFilter = computed<HeatStatus>(() =>
  (route.query.status as HeatStatus) || 'UNCONFIRMED',
)

const competitionFilter = computed<string | undefined>(() =>
  (route.query.competitionId as string) || undefined,
)

function setStatusFilter(value: HeatStatus) {
  router.replace({ query: { ...route.query, status: value, competitionId: route.query.competitionId } })
}

function setCompetitionFilter(value: string | undefined) {
  router.replace({ query: { status: route.query.status || 'UNCONFIRMED', competitionId: value || undefined } })
}

// ── Competition filter options ────────────────────────────────────────────────

interface CompetitionOption {
  id: string
  name: string
}

const competitionOptions = ref<CompetitionOption[]>([])

onMounted(async () => {
  try {
    const result = await getAdminCompetitions({ take: 100 })
    competitionOptions.value = result.items.map(c => ({ id: c.id, name: c.name }))
  } catch {
    // non-critical
  }
})

// ── Queue pagination ──────────────────────────────────────────────────────────

const pagination = usePagination((cursor) =>
  getAdminHeats({
    status: statusFilter.value,
    competitionId: competitionFilter.value,
    cursor: cursor ?? undefined,
    take: 30,
  }),
)

watch([statusFilter, competitionFilter], () => {
  pagination.reset()
})

onMounted(() => {
  pagination.loadMore()
})

// ── Grouped queue ─────────────────────────────────────────────────────────────

interface CompetitionGroup {
  competitionId: string
  competitionName: string
  dateStart: string
  heats: AdminHeatListItem[]
}

const groupedQueue = computed<CompetitionGroup[]>(() => {
  const map = new Map<string, CompetitionGroup>()
  for (const item of pagination.items.value) {
    const { id, name, dateStart } = item.competition
    if (!map.has(id)) {
      map.set(id, { competitionId: id, competitionName: name, dateStart, heats: [] })
    }
    map.get(id)!.heats.push(item)
  }
  return [...map.values()]
})

// ── Mobile pane toggle ────────────────────────────────────────────────────────

const mobileView = shallowRef<'queue' | 'review'>('queue')

// ── Review pane state ─────────────────────────────────────────────────────────

const selectedHeatId = shallowRef<string | null>(null)
const reviewHeat = ref<HeatAdmin | null>(null)
const reviewLoading = shallowRef(false)
const reviewError = shallowRef<string | null>(null)

async function loadReviewHeat(id: string) {
  reviewLoading.value = true
  reviewError.value = null
  try {
    reviewHeat.value = await getAdminHeat(id)
  } catch {
    reviewError.value = uk.ERROR_GENERIC
  } finally {
    reviewLoading.value = false
  }
}

function selectHeat(item: AdminHeatListItem) {
  selectedHeatId.value = item.id
  mobileView.value = 'review'
}

watch(selectedHeatId, (id) => {
  if (id) loadReviewHeat(id)
  else reviewHeat.value = null
})

// ── Confirm ───────────────────────────────────────────────────────────────────

const showConfirmDialog = shallowRef(false)
const confirmLoading = shallowRef(false)

async function handleConfirm() {
  if (!selectedHeatId.value) return
  confirmLoading.value = true
  try {
    await confirmHeat(selectedHeatId.value)
    removeFromQueueAndAdvance(selectedHeatId.value)
  } catch (e) {
    const msg = e instanceof ApiError && e.code === 'HEAT_ALREADY_CONFIRMED'
      ? uk.MODERATION_STALE
      : uk.ERROR_GENERIC
    uiStore.addToast(msg, 'error')
  } finally {
    confirmLoading.value = false
    showConfirmDialog.value = false
  }
}

// ── Unconfirm ─────────────────────────────────────────────────────────────────

const showUnconfirmDialog = shallowRef(false)
const unconfirmLoading = shallowRef(false)

async function handleUnconfirm() {
  if (!selectedHeatId.value) return
  unconfirmLoading.value = true
  try {
    await unconfirmHeat(selectedHeatId.value)
    reviewHeat.value = await getAdminHeat(selectedHeatId.value)
    if (statusFilter.value === 'OFFICIAL') {
      removeFromQueueAndAdvance(selectedHeatId.value)
    }
  } catch (e) {
    const msg = e instanceof ApiError && e.code === 'HEAT_NOT_OFFICIAL'
      ? uk.MODERATION_STALE
      : uk.ERROR_GENERIC
    uiStore.addToast(msg, 'error')
  } finally {
    unconfirmLoading.value = false
    showUnconfirmDialog.value = false
  }
}

function removeFromQueueAndAdvance(heatId: string) {
  const allItems = pagination.items.value
  const idx = allItems.findIndex(i => i.id === heatId)
  pagination.items.value = allItems.filter(i => i.id !== heatId)
  const next = pagination.items.value[idx] ?? pagination.items.value[idx - 1] ?? null
  selectedHeatId.value = next?.id ?? null
  if (!selectedHeatId.value) reviewHeat.value = null
}

// ── Inline result editing ─────────────────────────────────────────────────────

const editingResultId = shallowRef<string | null>(null)
const editForm = ref({
  mark: '' as string,
  status: 'OK' as ResultStatus,
  lane: 0,
  bibNumber: '',
  team: '',
  place: null as number | null,
  reacTime: null as number | null,
})
const editLoading = shallowRef(false)

function startEdit(result: AdminResultRow) {
  editingResultId.value = result.id
  editForm.value = {
    mark: result.mark ?? '',
    status: result.status,
    lane: result.lane,
    bibNumber: result.bibNumber,
    team: result.team,
    place: result.place,
    reacTime: result.reacTime,
  }
}

function cancelEdit() {
  editingResultId.value = null
}

async function saveEdit(resultId: string) {
  if (!reviewHeat.value) return
  editLoading.value = true
  try {
    const body: PatchResultBody = {
      mark: editForm.value.mark || null,
      status: editForm.value.status,
      lane: Number(editForm.value.lane) || 0,
      bibNumber: editForm.value.bibNumber,
      team: editForm.value.team,
      place: toOptionalNumber(editForm.value.place),
      reacTime: toOptionalNumber(editForm.value.reacTime),
    }
    const updated = await patchResult(resultId, body)
    const idx = reviewHeat.value.results.findIndex(r => r.id === resultId)
    if (idx !== -1) reviewHeat.value.results[idx] = updated
    editingResultId.value = null
    uiStore.addToast(uk.RESULT_SAVED, 'success')
  } catch {
    uiStore.addToast(uk.ERROR_GENERIC, 'error')
  } finally {
    editLoading.value = false
  }
}

// ── Inline delete ─────────────────────────────────────────────────────────────

const deletingResultId = shallowRef<string | null>(null)
const deleteLoading = shallowRef(false)

async function handleDeleteResult(resultId: string) {
  if (!reviewHeat.value) return
  deleteLoading.value = true
  try {
    await deleteResult(resultId)
    reviewHeat.value.results = reviewHeat.value.results.filter(r => r.id !== resultId)
    deletingResultId.value = null
    updateQueueResultCount(-1)
    uiStore.addToast(uk.RESULT_DELETED, 'success')
  } catch {
    uiStore.addToast(uk.ERROR_GENERIC, 'error')
  } finally {
    deleteLoading.value = false
  }
}

// ── Add athlete ───────────────────────────────────────────────────────────────

const showAddForm = shallowRef(false)
const addForm = ref<AddResultBody>({
  licenseNumber: '',
  lane: 0,
  bibNumber: '',
  team: '',
  mark: '',
  status: 'OK',
  place: undefined,
  reacTime: undefined,
})
const addLoading = shallowRef(false)

function resetAddForm() {
  addForm.value = { licenseNumber: '', lane: 0, bibNumber: '', team: '', mark: '', status: 'OK', place: undefined, reacTime: undefined }
}

async function handleAddResult() {
  if (!reviewHeat.value || !selectedHeatId.value) return
  addLoading.value = true
  try {
    const body: AddResultBody = {
      licenseNumber: addForm.value.licenseNumber,
      lane: Number(addForm.value.lane) || 0,
      bibNumber: addForm.value.bibNumber,
      team: addForm.value.team,
      mark: addForm.value.mark || undefined,
      status: addForm.value.status,
      place: toOptionalNumber(addForm.value.place),
      reacTime: toOptionalNumber(addForm.value.reacTime),
    }
    const newRow = await addResult(selectedHeatId.value, body)
    reviewHeat.value.results.push(newRow)
    updateQueueResultCount(1)
    showAddForm.value = false
    resetAddForm()
    uiStore.addToast(uk.RESULT_SAVED, 'success')
  } catch {
    uiStore.addToast(uk.ERROR_GENERIC, 'error')
  } finally {
    addLoading.value = false
  }
}

function updateQueueResultCount(delta: number) {
  if (!selectedHeatId.value) return
  const item = pagination.items.value.find(i => i.id === selectedHeatId.value)
  if (item) item.resultCount += delta
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCompDate(dateStart: string): string {
  return formatDisplayDate(parseISODate(dateStart))
}

// v-model.number on an empty input produces "" (string), not undefined.
// "" ?? undefined is still "" → backend rejects it as "received string, expected number".
function toOptionalNumber(val: unknown): number | undefined {
  if (val === '' || val === null || val === undefined) return undefined
  const n = Number(val)
  return isNaN(n) ? undefined : n
}

const RESULT_STATUS_OPTIONS: ResultStatus[] = ['OK', 'DNS', 'DNF', 'DQ', 'FS', 'PENDING']

const competitionFilterOptions = computed(() => [
  { value: '', label: uk.MODERATION_ALL_COMPETITIONS },
  ...competitionOptions.value.map(c => ({ value: c.id, label: c.name })),
])
</script>

<template>
  <div>
    <!-- Page header + filters -->
    <h1 class="mb-4 text-xl font-semibold text-[var(--color-text-primary)]">{{ uk.MODERATION_TITLE }}</h1>
    <FilterBar>
      <FilterSelect
        id="comp-filter"
        :label="uk.MODERATION_FILTER_COMPETITION"
        :model-value="competitionFilter ?? ''"
        :options="competitionFilterOptions"
        @update:model-value="setCompetitionFilter"
      />
      <!-- Status toggle — checkbox, aligned with filter labels -->
      <label class="flex flex-col gap-1">
        <span class="text-xs text-[var(--color-text-muted)]">{{ uk.FILTER_STATUS }}</span>
        <label class="flex cursor-pointer select-none items-center gap-2 py-1 text-sm text-[var(--color-text-secondary)]">
          <input
            type="checkbox"
            :checked="statusFilter === 'OFFICIAL'"
            @change="setStatusFilter(($event.target as HTMLInputElement).checked ? 'OFFICIAL' : 'UNCONFIRMED')"
          />
          {{ uk.MODERATION_STATUS_FILTER }}
        </label>
      </label>
    </FilterBar>

    <!-- Split-pane layout -->
    <div class="md:grid md:grid-cols-[280px_1fr] md:gap-6">

      <!-- ── Left pane: Queue ───────────────────────────────────────────────── -->
      <div class="min-w-0" :class="{ 'hidden md:block': mobileView === 'review' }">
        <div class="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)]">
          <!-- Skeleton -->
          <template v-if="pagination.loading.value && pagination.items.value.length === 0">
            <div v-for="i in 5" :key="i" class="border-b border-[var(--color-border-subtle)] px-4 py-3 last:border-0">
              <div class="h-3 w-3/4 animate-pulse rounded bg-[var(--color-border-subtle)]" />
              <div class="mt-2 h-3 w-1/2 animate-pulse rounded bg-[var(--color-border-subtle)]" />
            </div>
          </template>

          <!-- Empty state -->
          <EmptyState
            v-else-if="pagination.items.value.length === 0 && !pagination.loading.value"
            :message="uk.MODERATION_EMPTY"
          />

          <!-- Groups -->
          <template v-else>
            <div v-for="group in groupedQueue" :key="group.competitionId">
              <!-- Group header -->
              <div class="border-b border-[var(--color-border)] px-4 py-2">
                <p class="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">{{ group.competitionName }}</p>
                <p class="text-xs text-[var(--color-text-muted)]">{{ formatCompDate(group.dateStart) }}</p>
              </div>
              <!-- Heat rows -->
              <button
                v-for="item in group.heats"
                :key="item.id"
                type="button"
                class="w-full border-b border-[var(--color-border-subtle)] px-4 py-3 text-left text-sm last:border-0 hover:bg-[var(--color-bg-page)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                :class="selectedHeatId === item.id ? 'bg-[var(--color-accent-tint)]' : ''"
                @click="selectHeat(item)"
              >
                <p class="font-medium text-[var(--color-text-primary)]">
                  {{ item.event.discipline.name }} · {{ item.event.roundName }} · {{ uk[item.event.gender] }}
                </p>
                <p class="mt-0.5 text-[var(--color-text-secondary)]">
                  {{ uk.HEAT_LABEL }} {{ item.lynxHeatId }} · {{ item.resultCount }} {{ uk.MODERATION_RESULTS_COUNT }}
                </p>
              </button>
            </div>
          </template>

          <!-- Load more -->
          <LoadMore
            :loading="pagination.loading.value"
            :has-more="pagination.hasMore.value"
            @load="pagination.loadMore()"
          />
        </div>
      </div>

      <!-- ── Right pane: Review ─────────────────────────────────────────────── -->
      <div class="min-w-0" :class="{ 'hidden md:block': mobileView === 'queue' }">

        <!-- Mobile back button -->
        <button
          type="button"
          class="mb-3 text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] md:hidden"
          @click="mobileView = 'queue'"
        >
          {{ uk.BACK }}
        </button>

        <!-- No selection -->
        <EmptyState
          v-if="!selectedHeatId"
          :message="uk.MODERATION_SELECT_HEAT"
        />

        <!-- Loading -->
        <div v-else-if="reviewLoading" class="flex justify-center py-12">
          <AppSpinner size="md" />
        </div>

        <!-- Error -->
        <div v-else-if="reviewError" class="py-12 text-center">
          <p class="mb-4 text-sm text-[var(--color-error)]">{{ reviewError }}</p>
          <AppButton variant="secondary" size="sm" @click="selectedHeatId && loadReviewHeat(selectedHeatId)">
            {{ uk.RETRY }}
          </AppButton>
        </div>

        <!-- Heat detail -->
        <template v-else-if="reviewHeat">
          <!-- Pane header -->
          <div class="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="text-base font-semibold text-[var(--color-text-primary)]">
                {{ reviewHeat.event.discipline.name }} · {{ reviewHeat.event.roundName }}
              </p>
              <p class="text-sm text-[var(--color-text-secondary)]">
                {{ reviewHeat.event.competition.name }} · {{ formatCompDate(reviewHeat.event.competition.dateStart) }}
              </p>
            </div>
            <StatusBadge :status="reviewHeat.status" />
          </div>

          <!-- Heat table (public read-only view) -->
          <HeatTable
            :heat="adminHeatToPublic(reviewHeat)"
            :heat-number="reviewHeat.lynxHeatId"
          />

          <!-- ── Secondary editable table ───────────────────────────────────── -->
          <div class="mt-6">
            <p class="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">Редагування рядків</p>
            <div class="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)]">
              <table class="w-full min-w-[360px] text-sm">
                <thead>
                  <tr class="border-b border-[var(--color-border)]">
                    <th class="px-3 py-2 text-left font-medium text-[var(--color-text-secondary)]">Спортсмен</th>
                    <th class="w-px whitespace-nowrap px-3 py-2 text-right font-medium text-[var(--color-text-secondary)]">Результат</th>
                    <th class="w-px px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="result in reviewHeat.results" :key="result.id">
                    <!-- Normal row -->
                    <tr
                      v-if="editingResultId !== result.id && deletingResultId !== result.id"
                      class="group border-b border-[var(--color-border-subtle)] last:border-0"
                    >
                      <td class="px-3 py-2 text-[var(--color-text-primary)]">
                        {{ result.athlete.firstName }} {{ result.athlete.lastName }}
                      </td>
                      <td class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-[var(--color-text-secondary)]">{{ result.mark ?? '—' }}</td>
                      <td class="whitespace-nowrap px-3 py-2 text-right">
                        <div class="inline-flex gap-2 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                          <button
                            type="button"
                            class="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
                            @click="startEdit(result)"
                          >{{ uk.EDIT_RESULT }}</button>
                          <button
                            type="button"
                            class="text-xs text-[var(--color-error)] hover:opacity-80"
                            @click="deletingResultId = result.id"
                          >{{ uk.DELETE_RESULT }}</button>
                        </div>
                      </td>
                    </tr>

                    <!-- Delete micro-confirm -->
                    <tr
                      v-else-if="deletingResultId === result.id"
                      class="border-b border-[var(--color-border-subtle)] bg-[var(--color-error-bg)] last:border-0"
                    >
                      <td colspan="3" class="px-3 py-2">
                        <div class="flex items-center gap-3 text-sm">
                          <span class="text-[var(--color-error-text)]">{{ uk.DELETE_CONFIRM_INLINE }}</span>
                          <AppButton
                            variant="primary"
                            size="sm"
                            :loading="deleteLoading"
                            @click="handleDeleteResult(result.id)"
                          >{{ uk.YES }}</AppButton>
                          <AppButton
                            variant="secondary"
                            size="sm"
                            :disabled="deleteLoading"
                            @click="deletingResultId = null"
                          >{{ uk.NO }}</AppButton>
                        </div>
                      </td>
                    </tr>

                    <!-- Edit form row -->
                    <tr
                      v-else
                      class="border-b border-[var(--color-border-subtle)] bg-[var(--color-border-subtle)] last:border-0"
                    >
                      <td colspan="3" class="px-3 py-3">
                        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                          <div class="flex flex-col gap-1">
                            <span class="text-xs text-[var(--color-text-secondary)]">Спортсмен</span>
                            <p class="text-sm text-[var(--color-text-primary)]">{{ result.athlete.firstName }} {{ result.athlete.lastName }}</p>
                          </div>
                          <div class="flex flex-col gap-1">
                            <label :for="`edit-mark-${result.id}`" class="text-xs text-[var(--color-text-secondary)]">Результат</label>
                            <input :id="`edit-mark-${result.id}`" v-model="editForm.mark" type="text" class="input-sm" />
                          </div>
                          <div class="flex flex-col gap-1">
                            <label :for="`edit-status-${result.id}`" class="text-xs text-[var(--color-text-secondary)]">Статус</label>
                            <select :id="`edit-status-${result.id}`" v-model="editForm.status" class="input-sm">
                              <option v-for="s in RESULT_STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
                            </select>
                          </div>
                          <div class="flex flex-col gap-1">
                            <label :for="`edit-place-${result.id}`" class="text-xs text-[var(--color-text-secondary)]">Місце</label>
                            <input :id="`edit-place-${result.id}`" v-model.number="editForm.place" type="number" class="input-sm" />
                          </div>
                          <div class="flex flex-col gap-1">
                            <label :for="`edit-lane-${result.id}`" class="text-xs text-[var(--color-text-secondary)]">Дор.</label>
                            <input :id="`edit-lane-${result.id}`" v-model.number="editForm.lane" type="number" class="input-sm" />
                          </div>
                          <div class="flex flex-col gap-1">
                            <label :for="`edit-bib-${result.id}`" class="text-xs text-[var(--color-text-secondary)]">№ нагрудний</label>
                            <input :id="`edit-bib-${result.id}`" v-model="editForm.bibNumber" type="text" class="input-sm" />
                          </div>
                          <div class="flex flex-col gap-1">
                            <label :for="`edit-team-${result.id}`" class="text-xs text-[var(--color-text-secondary)]">Клуб</label>
                            <input :id="`edit-team-${result.id}`" v-model="editForm.team" type="text" class="input-sm" />
                          </div>
                          <div class="flex flex-col gap-1">
                            <label :for="`edit-reac-${result.id}`" class="text-xs text-[var(--color-text-secondary)]">Р/ч</label>
                            <input :id="`edit-reac-${result.id}`" v-model.number="editForm.reacTime" type="number" step="0.001" class="input-sm" />
                          </div>
                        </div>
                        <div class="mt-3 flex gap-2">
                          <AppButton size="sm" :loading="editLoading" @click="saveEdit(result.id)">{{ uk.SAVE }}</AppButton>
                          <AppButton variant="secondary" size="sm" :disabled="editLoading" @click="cancelEdit">{{ uk.CANCEL }}</AppButton>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ── Add athlete ─────────────────────────────────────────────────── -->
          <div class="mt-4">
            <button
              v-if="!showAddForm"
              type="button"
              class="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
              @click="showAddForm = true"
            >
              + {{ uk.ADD_RESULT }}
            </button>

            <div v-else class="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-page)] p-4">
              <p class="mb-3 text-sm font-medium text-[var(--color-text-primary)]">{{ uk.ADD_RESULT }}</p>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div class="flex flex-col gap-1">
                  <label for="add-license" class="text-xs text-[var(--color-text-secondary)]">Ліцензія *</label>
                  <input id="add-license" v-model="addForm.licenseNumber" required type="text" class="input-sm" />
                </div>
                <div class="flex flex-col gap-1">
                  <label for="add-lane" class="text-xs text-[var(--color-text-secondary)]">Дор.</label>
                  <input id="add-lane" v-model.number="addForm.lane" type="number" class="input-sm" />
                </div>
                <div class="flex flex-col gap-1">
                  <label for="add-bib" class="text-xs text-[var(--color-text-secondary)]">№ нагрудний *</label>
                  <input id="add-bib" v-model="addForm.bibNumber" required type="text" class="input-sm" />
                </div>
                <div class="flex flex-col gap-1">
                  <label for="add-team" class="text-xs text-[var(--color-text-secondary)]">Клуб *</label>
                  <input id="add-team" v-model="addForm.team" required type="text" class="input-sm" />
                </div>
                <div class="flex flex-col gap-1">
                  <label for="add-mark" class="text-xs text-[var(--color-text-secondary)]">Результат</label>
                  <input id="add-mark" v-model="addForm.mark" type="text" class="input-sm" />
                </div>
                <div class="flex flex-col gap-1">
                  <label for="add-status" class="text-xs text-[var(--color-text-secondary)]">Статус</label>
                  <select id="add-status" v-model="addForm.status" class="input-sm">
                    <option v-for="s in RESULT_STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
                  </select>
                </div>
                <div class="flex flex-col gap-1">
                  <label for="add-place" class="text-xs text-[var(--color-text-secondary)]">Місце</label>
                  <input id="add-place" v-model.number="addForm.place" type="number" class="input-sm" />
                </div>
                <div class="flex flex-col gap-1">
                  <label for="add-reac" class="text-xs text-[var(--color-text-secondary)]">Р/ч</label>
                  <input id="add-reac" v-model.number="addForm.reacTime" type="number" step="0.001" class="input-sm" />
                </div>
              </div>
              <div class="mt-3 flex gap-2">
                <AppButton size="sm" :loading="addLoading" @click="handleAddResult">{{ uk.SAVE }}</AppButton>
                <AppButton
                  variant="secondary"
                  size="sm"
                  :disabled="addLoading"
                  @click="showAddForm = false; resetAddForm()"
                >{{ uk.CANCEL }}</AppButton>
              </div>
            </div>
          </div>

          <!-- ── Primary action buttons ──────────────────────────────────────── -->
          <div class="mt-6 flex gap-3 border-t border-[var(--color-border)] pt-4">
            <AppButton
              v-if="reviewHeat.status === 'UNCONFIRMED'"
              variant="primary"
              :loading="confirmLoading"
              @click="showConfirmDialog = true"
            >
              {{ uk.CONFIRM_HEAT }}
            </AppButton>
            <AppButton
              v-if="reviewHeat.status === 'OFFICIAL'"
              variant="secondary"
              :loading="unconfirmLoading"
              @click="showUnconfirmDialog = true"
            >
              {{ uk.MODERATION_UNCONFIRM }}
            </AppButton>
          </div>
        </template>
      </div>
    </div>

    <!-- Confirm dialog -->
    <ConfirmDialog
      :open="showConfirmDialog"
      :title="uk.MODERATION_CONFIRM_TITLE"
      :body="uk.MODERATION_CONFIRM_BODY"
      @confirm="handleConfirm"
      @cancel="showConfirmDialog = false"
    />

    <!-- Unconfirm dialog -->
    <ConfirmDialog
      :open="showUnconfirmDialog"
      :title="uk.MODERATION_UNCONFIRM_TITLE"
      :body="uk.MODERATION_UNCONFIRM_BODY"
      @confirm="handleUnconfirm"
      @cancel="showUnconfirmDialog = false"
    />
  </div>
</template>

<style scoped>
.input-sm {
  width: 100%;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-primary);
  outline: none;
}
.input-sm:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}
</style>
