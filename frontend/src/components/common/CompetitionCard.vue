<script setup lang="ts">
import type { CompetitionCard } from '@/api/public'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EnvBadge from '@/components/common/EnvBadge.vue'
import { formatDateRange } from '@/utils/date'

defineProps<{ competition: CompetitionCard }>()
</script>

<template>
  <RouterLink
    :to="`/competitions/${competition.id}`"
    class="block rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--shadow-card)] hover:bg-[var(--color-bg-page)] transition-colors"
  >
    <div class="flex items-start justify-between gap-2">
      <h3 class="font-semibold text-[var(--color-text-primary)]">{{ competition.name }}</h3>
      <div class="flex shrink-0 items-center gap-1.5">
        <StatusBadge :status="competition.status" />
        <EnvBadge :env="competition.environment" />
      </div>
    </div>
    <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
      {{ formatDateRange(competition.dateStart, competition.dateEnd) }}
    </p>
    <p class="text-sm text-[var(--color-text-muted)]">{{ competition.location }}</p>
  </RouterLink>
</template>
