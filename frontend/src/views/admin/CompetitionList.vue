<script setup lang="ts">
import { ref, computed, shallowRef, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAdminCompetitions, deleteCompetition } from '@/api/admin'
import { getCalendarYears } from '@/api/public'
import type { AdminCompetitionSummary } from '@/api/admin'
import type { CompetitionStatus, CompetitionEnvironment } from '@/api/public'
import { usePagination } from '@/composables/usePagination'
import { useUiStore } from '@/stores/ui'
import { formatDateRange } from '@/utils/date'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EnvBadge from '@/components/common/EnvBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadMore from '@/components/common/LoadMore.vue'
import AppButton from '@/components/common/AppButton.vue'
import FilterBar from '@/components/common/FilterBar.vue'
import FilterSelect from '@/components/common/FilterSelect.vue'
import SkeletonRow from '@/components/common/SkeletonRow.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import uk from '@/i18n/uk'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()

// ── URL filters ───────────────────────────────────────────────────────────────

const year = computed<number | undefined>(() => {
  const y = Number(route.query.year)
  return y > 0 ? y : undefined
})

const status = computed<CompetitionStatus | undefined>(() =>
  (route.query.status as CompetitionStatus) || undefined,
)

const environment = computed<CompetitionEnvironment | undefined>(() =>
  (route.query.environment as CompetitionEnvironment) || undefined,
)

function setYear(val: string | undefined) {
  router.replace({ query: { ...route.query, year: val || undefined } })
}

function setStatus(val: string | undefined) {
  router.replace({ query: { ...route.query, status: val || undefined } })
}

function setEnvironment(val: string | undefined) {
  router.replace({ query: { ...route.query, environment: val || undefined } })
}

// ── Dynamic years ─────────────────────────────────────────────────────────────

const years = ref<number[]>([])

// ── Pagination ────────────────────────────────────────────────────────────────

const pagination = usePagination((cursor) =>
  getAdminCompetitions({
    year: year.value,
    status: status.value,
    environment: environment.value,
    cursor: cursor ?? undefined,
    take: 30,
  }),
)

watch([year, status, environment], () => pagination.reset())

onMounted(() => {
  getCalendarYears().then((r) => { years.value = r }).catch(() => {})
  pagination.loadMore()
})

// ── Delete ────────────────────────────────────────────────────────────────────

const deleteTarget = ref<AdminCompetitionSummary | null>(null)
const deleteOpen = shallowRef(false)
const deleting = shallowRef(false)

function requestDelete(comp: AdminCompetitionSummary) {
  deleteTarget.value = comp
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  const id = deleteTarget.value.id
  deleteOpen.value = false
  try {
    await deleteCompetition(id)
    pagination.items.value = pagination.items.value.filter((c) => c.id !== id)
  } catch {
    uiStore.addToast(uk.ERROR_GENERIC, 'error')
    pagination.reset()
  } finally {
    deleting.value = false
    deleteTarget.value = null
  }
}

// ── Filter options ────────────────────────────────────────────────────────────

const yearOptions = computed(() => [
  { value: '', label: uk.FILTER_ALL },
  ...years.value.map((y) => ({ value: String(y), label: String(y) })),
])

const statusOptions = [
  { value: '', label: uk.FILTER_ALL },
  { value: 'UPCOMING', label: uk.UPCOMING },
  { value: 'ONGOING', label: uk.ONGOING },
  { value: 'COMPLETED', label: uk.COMPLETED },
]

const envOptions = [
  { value: '', label: uk.FILTER_ALL },
  { value: 'INDOOR', label: uk.INDOOR },
  { value: 'OUTDOOR', label: uk.OUTDOOR },
]
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-semibold text-[var(--color-text-primary)]">{{ uk.NAV_ADMIN_COMPETITIONS }}</h1>
      <AppButton @click="router.push({ name: 'AdminCompetitionCreate' })">{{ uk.CREATE }}</AppButton>
    </div>

    <!-- Filters -->
    <FilterBar>
      <FilterSelect
        id="filter-year"
        :label="uk.FILTER_YEAR"
        :model-value="String(year ?? '')"
        :options="yearOptions"
        @update:model-value="setYear"
      />
      <FilterSelect
        id="filter-status"
        :label="uk.FILTER_STATUS"
        :model-value="status ?? ''"
        :options="statusOptions"
        @update:model-value="setStatus"
      />
      <FilterSelect
        id="filter-env"
        :label="uk.FILTER_ENVIRONMENT"
        :model-value="environment ?? ''"
        :options="envOptions"
        @update:model-value="setEnvironment"
      />
    </FilterBar>

    <!-- Table -->
    <div class="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-border)]">
      <table class="w-full text-sm">
        <thead class="border-b border-[var(--color-border)] bg-[var(--color-bg-card)]">
          <tr>
            <th class="px-3 py-2 text-left font-medium text-[var(--color-text-secondary)]">{{ uk.COMP_NAME }}</th>
            <th class="px-3 py-2 text-left font-medium text-[var(--color-text-secondary)]">{{ uk.COMP_DATES }}</th>
            <th class="hidden px-3 py-2 text-left font-medium text-[var(--color-text-secondary)] md:table-cell">{{ uk.COMP_LOCATION }}</th>
            <th class="px-3 py-2 text-left font-medium text-[var(--color-text-secondary)]">{{ uk.COMP_STATUS }}</th>
            <th class="hidden px-3 py-2 text-left font-medium text-[var(--color-text-secondary)] sm:table-cell">{{ uk.COMP_ENVIRONMENT }}</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-border)] bg-[var(--color-bg-card)]">
          <!-- Skeleton rows while loading initial page -->
          <template v-if="pagination.items.value.length === 0 && pagination.loading.value">
            <SkeletonRow v-for="i in 5" :key="i" :columns="6" />
          </template>

          <!-- Data rows -->
          <tr
            v-for="comp in pagination.items.value"
            :key="comp.id"
            class="group hover:bg-[var(--color-bg-page)]"
          >
            <td class="px-3 py-2">
              <RouterLink
                :to="{ name: 'CompetitionDetail', params: { id: comp.id } }"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[var(--color-accent)] hover:underline"
              >{{ comp.name }}</RouterLink>
            </td>
            <td class="px-3 py-2 text-[var(--color-text-secondary)]">{{ formatDateRange(comp.dateStart, comp.dateEnd) }}</td>
            <td class="hidden px-3 py-2 text-[var(--color-text-secondary)] md:table-cell">{{ comp.location }}</td>
            <td class="px-3 py-2"><StatusBadge :status="comp.status" /></td>
            <td class="hidden px-3 py-2 sm:table-cell"><EnvBadge :env="comp.environment" /></td>
            <td class="px-3 py-2">
              <div class="flex items-center justify-end gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <AppButton
                  variant="quiet"
                  size="sm"
                  @click="router.push({ name: 'AdminCompetitionForm', params: { id: comp.id } })"
                >
                  {{ uk.EDIT }}
                </AppButton>
                <AppButton variant="danger" size="sm" @click="requestDelete(comp)">
                  {{ uk.DELETE }}
                </AppButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty state -->
    <EmptyState v-if="pagination.items.value.length === 0 && !pagination.loading.value" :message="uk.EMPTY_COMPETITIONS" />

    <!-- Load more -->
    <LoadMore :loading="pagination.loading.value" :has-more="pagination.hasMore.value" @load="pagination.loadMore" />

    <!-- Delete confirmation -->
    <ConfirmDialog
      :open="deleteOpen"
      :title="uk.COMP_DELETE_TITLE"
      :body="uk.COMP_DELETE_BODY"
      @confirm="confirmDelete"
      @cancel="deleteOpen = false; deleteTarget = null"
    />
  </div>
</template>
