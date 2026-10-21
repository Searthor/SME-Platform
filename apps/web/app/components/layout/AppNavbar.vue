<script setup lang="ts">
defineProps<{ collapsed?: boolean }>()
const emit = defineEmits<{ 'toggle-collapse': []; 'open-menu': [] }>()
const { t } = useI18n()
</script>

<template>
  <header class="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-white/90 px-3 sm:px-4 lg:px-5 backdrop-blur">
    <div class="flex min-w-0 flex-1 items-center gap-2.5">
      <button
        type="button"
        class="focus-ring grid size-9 shrink-0 place-items-center rounded-xl border border-line text-ink-700 lg:hidden"
        :aria-label="t('ui.menu')"
        @click="emit('open-menu')"
      >
        <AdminIcon name="menu" class="size-4.5" />
      </button>
      <button
        type="button"
        class="focus-ring hidden size-9 shrink-0 place-items-center rounded-xl border border-line text-ink-700 transition hover:border-brand-500/40 hover:bg-brand-100/60 hover:text-brand-700 active:scale-95 lg:grid"
        :aria-label="t('ui.menu')"
        @click="emit('toggle-collapse')"
      >
        <AdminIcon :name="collapsed ? 'panel-left-open' : 'panel-left-close'" class="size-4.5" />
      </button>
      <div v-if="$slots.search" class="hidden min-w-0 max-w-md flex-1 sm:block"><slot name="search" /></div>
    </div>

    <div class="flex shrink-0 items-center gap-2 sm:gap-2.5"><slot name="actions" /></div>
  </header>
</template>
