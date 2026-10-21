<script setup lang="ts">
import { statusTone, toneClasses } from '~/utils/status'

const props = withDefaults(defineProps<{
  status: string
  /** Override the translated label. */
  label?: string
  dot?: boolean
}>(), { label: undefined, dot: true })

const { t } = useI18n()
const classes = computed(() => toneClasses[statusTone(props.status)])
const text = computed(() => props.label ?? t(`ui.status.${props.status.trim().toLowerCase()}`, props.status))
</script>

<template>
  <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset" :class="classes.badge">
    <span v-if="dot" class="size-1.5 rounded-full" :class="classes.dot" aria-hidden="true" />
    {{ text }}
  </span>
</template>
