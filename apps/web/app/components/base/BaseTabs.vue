<script setup lang="ts">
import type { TabItem } from '~/types/ui'

const props = defineProps<{
  tabs: TabItem[]
  modelValue: string
  ariaLabel?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [key: string] }>()

const enabledTabs = computed(() => props.tabs.filter(tab => !tab.disabled))

const move = (event: KeyboardEvent, current: string) => {
  const keys = enabledTabs.value.map(tab => tab.key)
  const index = keys.indexOf(current)
  let next = index
  if (event.key === 'ArrowRight') next = (index + 1) % keys.length
  else if (event.key === 'ArrowLeft') next = (index - 1 + keys.length) % keys.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = keys.length - 1
  else return
  event.preventDefault()
  const target = keys[next]
  if (target) {
    emit('update:modelValue', target)
    nextTick(() => document.getElementById(`tab-${target}`)?.focus())
  }
}
</script>

<template>
  <div role="tablist" :aria-label="ariaLabel" class="flex flex-wrap items-center gap-1 border-b border-line">
    <button
      v-for="tab in tabs"
      :id="`tab-${tab.key}`"
      :key="tab.key"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.key"
      :tabindex="modelValue === tab.key ? 0 : -1"
      :disabled="tab.disabled"
      class="focus-ring relative -mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
      :class="modelValue === tab.key ? 'border-[#5b4cf5] text-[#5b4cf5]' : 'border-transparent text-slate-500 hover:text-slate-900'"
      @click="emit('update:modelValue', tab.key)"
      @keydown="move($event, tab.key)"
    >
      <slot name="label" :tab="tab">{{ tab.label }}</slot>
      <span
        v-if="tab.count !== undefined"
        class="rounded-full px-2 py-0.5 text-[0.62rem] font-black"
        :class="modelValue === tab.key ? 'bg-[#ede9fe] text-[#5b4cf5]' : 'bg-slate-100 text-slate-500'"
      >{{ tab.count }}</span>
    </button>
  </div>
</template>
