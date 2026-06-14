<script setup lang="ts">
/**
 * Line chart showing an athlete's progression for a single discipline/environment.
 *
 * Chart.js is dynamically imported on first render so it stays out of the
 * initial bundle. The chart instance is destroyed in `onUnmounted` to prevent
 * canvas memory leaks and when `points` changes (full rebuild on data change).
 *
 * Edge cases:
 * - 0 points → EmptyState message.
 * - 1 point  → Shows the mark and date as text; a single-point line chart
 *   would be visually misleading.
 * - Chart.js import fails → Shows a generic error via EmptyState.
 *
 * @prop points  - Sorted progression data points.
 * @prop loading - When true, shows a spinner instead of the chart.
 */
import { shallowRef, watch, onUnmounted, nextTick, useTemplateRef } from 'vue'
import type { ProgressionPoint } from '@/api/public'
import EmptyState from '@/components/common/EmptyState.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import { formatDisplayDate, parseISODate } from '@/utils/date'
import uk from '@/i18n/uk'

const props = defineProps<{
  points: ProgressionPoint[]
  loading: boolean
}>()

const canvasEl = useTemplateRef<HTMLCanvasElement>('canvas')
const chartLoadError = shallowRef(false)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let chartInstance: any = null

function destroyChart() {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
}

async function buildChart(points: ProgressionPoint[]) {
  try {
    const { Chart, registerables } = await import('chart.js')
    Chart.register(...registerables)
    if (!canvasEl.value) return

    const style = getComputedStyle(document.documentElement)
    const accent = style.getPropertyValue('--color-accent').trim() || '#4F46E5'
    const borderSubtle = style.getPropertyValue('--color-border-subtle').trim() || '#E4E4E7'
    const textMuted = style.getPropertyValue('--color-text-muted').trim() || '#A1A1AA'

    // Inline plugin: draw mark label above each data point
    const markLabelsPlugin = {
      id: 'markLabels',
      afterDatasetsDraw(chart: any) {
        const ctx = chart.ctx as CanvasRenderingContext2D
        const meta = chart.getDatasetMeta(0)
        ctx.save()
        ctx.font = `11px var(--font-sans, system-ui, sans-serif)`
        ctx.fillStyle = textMuted
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        meta.data.forEach((pt: any, i: number) => {
          ctx.fillText(points[i].mark, pt.x, pt.y - 6)
        })
        ctx.restore()
      },
    }

    destroyChart()
    chartInstance = new Chart(canvasEl.value, {
      type: 'line',
      data: {
        labels: points.map((p) =>
          p.date ? formatDisplayDate(parseISODate(p.date)) : '',
        ),
        datasets: [
          {
            data: points.map((p) => p.sortValue),
            borderColor: accent,
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.15,
            pointRadius: 4,
            pointBackgroundColor: accent,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 24 } }, // room for mark labels above the topmost point
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => points[ctx.dataIndex].mark,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textMuted, maxTicksLimit: 8, maxRotation: 0 },
          },
          y: {
            grid: { color: borderSubtle },
            ticks: { display: false },
          },
        },
      },
      plugins: [markLabelsPlugin],
    })
  } catch {
    chartLoadError.value = true
  }
}

// TASK-018: rebuild chart when points change; destroy in onUnmounted
watch(
  () => props.points,
  async (pts) => {
    destroyChart()
    if (pts.length > 1) {
      await nextTick() // wait for canvas to appear in DOM
      buildChart(pts)
    }
  },
)

onUnmounted(() => {
  destroyChart()
})
</script>

<template>
  <div class="mb-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--shadow-card)]">
    <!-- Loading -->
    <div v-if="loading" class="flex h-48 items-center justify-center">
      <AppSpinner />
    </div>

    <!-- Chart.js failed to load -->
    <EmptyState v-else-if="chartLoadError" :message="uk.ERROR_GENERIC" />

    <!-- No data -->
    <EmptyState v-else-if="points.length === 0" :message="uk.NO_PROGRESSION" />

    <!-- Single point: show value + date, no chart line (misleading for 1 result) -->
    <div
      v-else-if="points.length === 1"
      class="flex flex-col items-center justify-center gap-1 py-10"
    >
      <span class="text-2xl font-semibold text-[var(--color-text-primary)]">
        {{ points[0].mark }}
      </span>
      <span class="text-sm text-[var(--color-text-secondary)]">
        {{ points[0].date ? formatDisplayDate(parseISODate(points[0].date)) : '—' }}
      </span>
      <span class="mt-1 text-xs text-[var(--color-text-muted)]">
        {{ uk.PROGRESSION_SINGLE_POINT }}
      </span>
    </div>

    <!-- Multi-point chart -->
    <div v-else class="relative h-48">
      <canvas ref="canvas" />
    </div>
  </div>
</template>
