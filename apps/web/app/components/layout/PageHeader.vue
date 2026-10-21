<script setup lang="ts">
import type { BreadcrumbItem } from '~/types/ui'

defineProps<{
  title: string
  description?: string
  eyebrow?: string
  breadcrumbs?: BreadcrumbItem[]
}>()
</script>

<template>
  <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div class="min-w-0">
      <AppBreadcrumb v-if="breadcrumbs?.length" :items="breadcrumbs" class="mb-2" />
      <p v-if="eyebrow" class="text-[0.66rem] font-extrabold tracking-[0.14em] text-[#5b4cf5] uppercase">{{ eyebrow }}</p>
      <h1 class="mt-1 text-xl font-black tracking-[-0.02em] text-slate-900 sm:text-2xl">{{ title }}</h1>
      <p v-if="description" class="mt-1 max-w-2xl text-xs text-slate-500">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2"><slot name="actions" /></div>
  </header>
</template>
