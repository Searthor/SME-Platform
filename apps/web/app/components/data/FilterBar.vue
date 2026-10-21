<script setup lang="ts">
withDefaults(defineProps<{
  searchPlaceholder?: string
  /** Show the reset button (usually when any filter is active). */
  dirty?: boolean
  showSearch?: boolean
}>(), { searchPlaceholder: undefined, dirty: false, showSearch: true })

const search = defineModel<string>('search', { default: '' })
defineEmits<{ reset: [] }>()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <div v-if="showSearch" class="min-w-52 flex-1 sm:max-w-sm">
      <SearchInput v-model="search" :placeholder="searchPlaceholder" />
    </div>
    <slot />
    <button
      v-if="dirty"
      type="button"
      class="focus-ring rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
      @click="$emit('reset')"
    >
      {{ t('ui.reset', 'ລ້າງຕົວກອງ') }}
    </button>
    <div v-if="$slots.actions" class="ml-auto flex items-center gap-2"><slot name="actions" /></div>
  </div>
</template>
