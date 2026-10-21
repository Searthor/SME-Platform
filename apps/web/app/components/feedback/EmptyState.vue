<script setup lang="ts">
import type { AdminIconName } from '~/types/ui'

withDefaults(defineProps<{
  title?: string
  description?: string
  icon?: AdminIconName
}>(), { title: undefined, description: undefined, icon: 'box' })

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-12 text-center">
    <span class="grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-700"><AdminIcon :name="icon" class="size-7" /></span>
    <h3 class="mt-4 text-base font-semibold text-ink-900">{{ title ?? t('ui.empty_title', 'ຍັງບໍ່ມີຂໍ້ມູນ') }}</h3>
    <p class="mt-1 max-w-sm text-sm text-ink-500">{{ description ?? t('ui.empty_desc', 'ເມື່ອມີຂໍ້ມູນ ມັນຈະສະແດງຢູ່ບ່ອນນີ້') }}</p>
    <div v-if="$slots.default" class="mt-5"><slot /></div>
  </div>
</template>
