<script setup lang="ts">
withDefaults(defineProps<{ rounded?: 'md' | 'lg' | 'full' }>(), { rounded: 'md' })
</script>

<template>
  <div
    class="skeleton animate-pulse bg-line/80"
    :class="rounded === 'full' ? 'rounded-full' : rounded === 'lg' ? 'rounded-xl' : 'rounded-md'"
    aria-hidden="true"
  />
</template>
