<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePagination } from '@/composables/usePagination'
import { getCalendar, getCalendarYears } from '@/api/public'
import type { CompetitionStatus, CompetitionEnvironment } from '@/api/public'
import CompetitionCard from '@/components/common/CompetitionCard.vue'
import LoadMore from '@/components/common/LoadMore.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import FilterBar from '@/components/common/FilterBar.vue'
import FilterSelect from '@/components/common/FilterSelect.vue'
import PublicLayout from '@/components/layout/PublicLayout.vue'
import uk from '@/i18n/uk'

const route = useRoute()
const router = useRouter()

// URL-driven filter state (TASK-008)
const statusFilter = computed(() => route.query.status as CompetitionStatus | undefined)
const envFilter = computed(() => route.query.environment as CompetitionEnvironment | undefined)
const yearFilter = computed(() => route.query.year ? Number(route.query.year) : undefined)

function setFilter(key: 'status' | 'environment' | 'year', value: string | undefined) {
  router.replace({ query: { ...route.query, [key]: value ?? undefined } })
}

// Year options (TASK-009)
const years = ref<number[]>([])

// Pagination — reactive() unwraps refs so template uses pagination.items, .loading, etc. without .value (TASK-010)
const pagination = reactive(
  usePagination((cursor) =>
    getCalendar({
      status: statusFilter.value,
      environment: envFilter.value,
      year: yearFilter.value,
      cursor: cursor ?? undefined,
      take: 20,
    }),
  ),
)

watch(() => route.query, () => pagination.reset(), { deep: true })

onMounted(() => {
  getCalendarYears().then(r => { years.value = r }).catch(() => {})
  pagination.reset()
})

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

const yearOptions = computed(() => [
  { value: '', label: uk.FILTER_ALL },
  ...years.value.map(y => ({ value: String(y), label: String(y) })),
])
</script>

<template>
  <PublicLayout>
    <!-- Filter bar -->
    <FilterBar>
      <FilterSelect
        id="filter-status"
        :label="uk.FILTER_STATUS"
        :model-value="statusFilter ?? ''"
        :options="statusOptions"
        @update:model-value="setFilter('status', $event || undefined)"
      />
      <FilterSelect
        id="filter-env"
        :label="uk.FILTER_ENVIRONMENT"
        :model-value="envFilter ?? ''"
        :options="envOptions"
        @update:model-value="setFilter('environment', $event || undefined)"
      />
      <FilterSelect
        id="filter-year"
        :label="uk.FILTER_YEAR"
        :model-value="yearFilter !== undefined ? String(yearFilter) : ''"
        :options="yearOptions"
        @update:model-value="setFilter('year', $event || undefined)"
      />
    </FilterBar>

    <!-- Initial loading -->
    <div v-if="pagination.loading && pagination.items.length === 0" class="flex justify-center py-12">
      <AppSpinner />
    </div>

    <!-- Empty state -->
    <EmptyState
      v-else-if="!pagination.loading && pagination.items.length === 0"
      :message="uk.EMPTY_RESULTS"
    />

    <!-- Card grid -->
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <CompetitionCard
        v-for="item in pagination.items"
        :key="item.id"
        :competition="item"
      />
    </div>

    <!-- Load more -->
    <LoadMore
      :loading="pagination.loading"
      :has-more="pagination.hasMore"
      @load="pagination.loadMore"
    />
  </PublicLayout>
</template>
