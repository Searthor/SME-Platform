<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  subtitle?: string
  padded?: boolean
}>(), { title: undefined, subtitle: undefined, padded: true })
</script>

<template>
  <section class="page-card overflow-hidden">
    <header v-if="title || $slots.header || $slots.actions" class="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
      <slot name="header">
        <div class="min-w-0">
          <h2 class="truncate text-sm font-black text-ink-950">{{ title }}</h2>
          <p v-if="subtitle" class="mt-0.5 text-[0.7rem] text-ink-500">{{ subtitle }}</p>
        </div>
      </slot>
      <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2"><slot name="actions" /></div>
    </header>
    <div :class="padded ? 'p-5' : ''"><slot /></div>
    <footer v-if="$slots.footer" class="border-t border-line bg-canvas/60 px-5 py-3"><slot name="footer" /></footer>
  </section>
</template>
