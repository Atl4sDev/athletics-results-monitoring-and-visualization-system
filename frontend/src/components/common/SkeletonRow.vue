<script setup lang="ts">
withDefaults(defineProps<{ columns?: number }>(), { columns: 4 })
</script>

<template>
  <tr>
    <td v-for="i in columns" :key="i" class="px-3 py-2">
      <div
        class="h-4 rounded animate-pulse bg-[var(--color-border-subtle)]"
        :class="i === 1 ? 'w-2/5' : 'w-3/4'"
      />
    </td>
  </tr>
</template>
