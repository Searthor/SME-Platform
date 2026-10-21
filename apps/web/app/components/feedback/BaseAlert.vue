<script setup lang="ts">
import type { AdminIconName, Tone } from '~/types/ui'

const props = withDefaults(defineProps<{
  tone?: Tone
  title?: string
  dismissible?: boolean
}>(), { tone: 'info', title: undefined, dismissible: false })

const { t } = useI18n()
const visible = ref(true)

const styles: Record<Tone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-rose-200 bg-rose-50 text-rose-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  neutral: 'border-line bg-canvas text-ink-700',
}
const icons: Record<Tone, AdminIconName> = { success: 'check', warning: 'alert', danger: 'alert', info: 'info', neutral: 'info' }
const role = computed(() => (props.tone === 'danger' || props.tone === 'warning' ? 'alert' : 'status'))
</script>

<template>
  <div v-if="visible" class="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm" :class="styles[tone]" :role="role">
    <AdminIcon :name="icons[tone]" class="mt-0.5 size-4 shrink-0" />
    <div class="min-w-0 flex-1">
      <p v-if="title" class="font-semibold">{{ title }}</p>
      <div :class="title ? 'mt-0.5 opacity-90' : ''"><slot /></div>
    </div>
    <button v-if="dismissible" type="button" class="focus-ring -m-1 rounded p-1 opacity-70 hover:opacity-100" :aria-label="t('ui.dismiss', 'ປິດ')" @click="visible = false">
      <AdminIcon name="x" class="size-4" />
    </button>
  </div>
</template>
