<script setup lang="ts">
import type { BreadcrumbItem } from '~/types/ui'

defineProps<{ items: BreadcrumbItem[] }>()
</script>

<template>
  <nav aria-label="Breadcrumb">
    <ol class="flex flex-wrap items-center gap-1.5 text-[0.7rem] text-ink-500">
      <li v-for="(item, index) in items" :key="item.label + index" class="flex items-center gap-1.5">
        <AdminIcon v-if="index > 0" name="chevron-right" class="size-3 text-ink-500/60" />
        <NuxtLink v-if="item.to && index < items.length - 1" :to="item.to" class="font-semibold transition hover:text-brand-700">{{ item.label }}</NuxtLink>
        <span v-else class="font-extrabold text-ink-950" :aria-current="index === items.length - 1 ? 'page' : undefined">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>
