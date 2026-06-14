<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronDown } from '@lucide/vue'
import { useCompetitionStore } from '@/stores/competition'
import { useCompetitionSocket } from '@/composables/useCompetitionSocket'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EnvBadge from '@/components/common/EnvBadge.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import HeatTable from '@/components/heat/HeatTable.vue'
import PublicLayout from '@/components/layout/PublicLayout.vue'
import { formatDateRange, formatDayTab } from '@/utils/date'
import uk from '@/i18n/uk'

// TASK-017: data fetching
const route = useRoute()
const router = useRouter()
const store = useCompetitionStore()

// TASK-027: socket join/leave — called at setup level so onMounted/onUnmounted register in this component's lifecycle
useCompetitionSocket(route.params.id as string)

const detail = computed(() => store.detail)
const loading = computed(() => store.loading)
const error = computed(() => store.error)

// TASK-018: schedule derived state
const dateDays = computed(() =>
  Object.keys(detail.value?.schedule ?? {}).filter(k => k !== 'unscheduled').sort(),
)
const unscheduledEvents = computed(() => detail.value?.schedule['unscheduled'] ?? [])
const activeDay = ref<string>('')
const activeEvents = computed(() => detail.value?.schedule[activeDay.value] ?? [])

// Keep activeDay valid whenever the schedule changes (e.g. socket-triggered refresh
// on an initially empty competition where activeDay starts as '').
watch(dateDays, (days) => {
  if (!days.includes(activeDay.value)) {
    const today = new Date().toISOString().slice(0, 10)
    activeDay.value = days.includes(today) ? today : (days[0] ?? '')
  }
})

// TASK-019: accordion state — initialise from ?event= query param
const openEventId = ref<string | null>(
  typeof route.query.event === 'string' ? route.query.event : null,
)

function toggleEvent(eventId: string) {
  const next = openEventId.value === eventId ? null : eventId
  openEventId.value = next
  router.replace({ query: { ...route.query, event: next ?? undefined } })
}

onMounted(async () => {
  await store.fetch(route.params.id as string)
  const requestedDate = typeof route.query.date === 'string' ? route.query.date : null
  const today = new Date().toISOString().slice(0, 10)
  if (requestedDate && dateDays.value.includes(requestedDate)) {
    activeDay.value = requestedDate
  } else {
    activeDay.value = dateDays.value.includes(today) ? today : (dateDays.value[0] ?? '')
  }
})
</script>

<template>
  <PublicLayout>
    <!-- TASK-020: loading / error states -->
    <div v-if="loading && !detail" class="flex justify-center py-12">
      <AppSpinner />
    </div>

    <EmptyState v-else-if="error && !detail" :message="uk.ERROR_GENERIC" />

    <template v-else-if="detail">
      <!-- TASK-021: competition header -->
      <header class="mb-6">
        <h1 class="text-2xl font-semibold text-[var(--color-text-primary)]">{{ detail.name }}</h1>
        <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
          {{ formatDateRange(detail.dateStart, detail.dateEnd) }} · {{ detail.location }}
        </p>
        <div class="mt-2 flex items-center gap-2">
          <StatusBadge :status="detail.status" />
          <EnvBadge :env="detail.environment" />
        </div>
      </header>

      <!-- TASK-022: day tabs (only when multiple days) -->
      <nav
        v-if="dateDays.length > 1"
        class="mb-4 flex gap-1 border-b border-[var(--color-border)]"
        role="tablist"
      >
        <button
          v-for="day in dateDays"
          :key="day"
          role="tab"
          :aria-selected="activeDay === day"
          tabindex="0"
          class="px-4 py-2 text-sm font-medium transition-colors"
          :class="activeDay === day
            ? 'border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'"
          @click="activeDay = day"
          @keydown.enter="activeDay = day"
        >{{ formatDayTab(day) }}</button>
      </nav>

      <!-- TASK-023: event accordion for active day -->
      <EmptyState v-if="activeEvents.length === 0 && !loading" :message="uk.NO_EVENTS" />

      <div v-else class="divide-y divide-[var(--color-border)] rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-card)]">
        <div v-for="event in activeEvents" :key="event.id">
          <!-- Accordion header -->
          <button
            class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[var(--color-bg-page)] transition-colors"
            @click="toggleEvent(event.id)"
          >
            <div class="flex flex-col gap-0.5">
              <span class="font-medium text-[var(--color-text-primary)]">{{ event.disciplineName }}</span>
              <span class="text-xs text-[var(--color-text-secondary)]">
                {{ uk[event.gender as 'MALE' | 'FEMALE'] ?? event.gender }} · {{ event.ageCategory }} · {{ event.roundName }}
              </span>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <span
                v-if="event.scheduledTime"
                class="text-sm text-[var(--color-text-secondary)]"
              >{{ event.scheduledTime.slice(11, 16) }}</span>
              <ChevronDown
                class="h-4 w-4 shrink-0 text-[var(--color-text-secondary)] transition-transform duration-200"
                :class="{ 'rotate-180': openEventId === event.id }"
              />
            </div>
          </button>

          <!-- Accordion open content -->
          <div v-if="openEventId === event.id" class="px-4 pb-4 pt-2">
            <EmptyState v-if="event.heats.length === 0" :message="uk.NO_HEATS" />
            <div v-else class="space-y-4">
              <HeatTable
                v-for="(heat, heatIdx) in event.heats"
                :key="heat.id"
                :heat="heat"
                :heat-number="heatIdx + 1"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- TASK-024: unscheduled section (below date tabs) -->
      <template v-if="unscheduledEvents.length > 0">
        <h2 class="mb-3 mt-8 text-base font-semibold text-[var(--color-text-muted)]">
          {{ uk.UNSCHEDULED }}
        </h2>
        <div class="divide-y divide-[var(--color-border)] rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-card)]">
          <div v-for="event in unscheduledEvents" :key="event.id">
            <button
              class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[var(--color-bg-page)] transition-colors"
              @click="toggleEvent(event.id)"
            >
              <div class="flex flex-col gap-0.5">
                <span class="font-medium text-[var(--color-text-primary)]">{{ event.disciplineName }}</span>
                <span class="text-xs text-[var(--color-text-secondary)]">
                  {{ uk[event.gender as 'MALE' | 'FEMALE'] ?? event.gender }} · {{ event.ageCategory }} · {{ event.roundName }}
                </span>
              </div>
              <ChevronDown
                class="h-4 w-4 shrink-0 text-[var(--color-text-secondary)] transition-transform duration-200"
                :class="{ 'rotate-180': openEventId === event.id }"
              />
            </button>
            <div v-if="openEventId === event.id" class="px-4 pb-4 pt-2">
              <EmptyState v-if="event.heats.length === 0" :message="uk.NO_HEATS" />
              <div v-else class="space-y-4">
                <HeatTable
                  v-for="(heat, heatIdx) in event.heats"
                  :key="heat.id"
                  :heat="heat"
                  :heat-number="heatIdx + 1"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </PublicLayout>
</template>
