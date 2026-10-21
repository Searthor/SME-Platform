<script setup lang="ts">
withDefaults(defineProps<{ label?: string; disabled?: boolean }>(), { label: undefined, disabled: false })
const model = defineModel<boolean>({ default: false })
</script>

<template>
  <label class="inline-flex cursor-pointer items-center gap-3 text-xs font-bold text-ink-950" :class="disabled ? 'cursor-not-allowed opacity-50' : ''">
    <button
      type="button"
      role="switch"
      :aria-checked="model"
      :disabled="disabled"
      class="focus-ring relative h-6 w-11 shrink-0 rounded-full transition"
      :class="model ? 'bg-brand-600' : 'bg-ink-950/15'"
      @click="model = !model"
    >
      <span class="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform" :class="model ? 'translate-x-5' : ''" />
    </button>
    <span v-if="label || $slots.default"><slot>{{ label }}</slot></span>
  </label>
</template>
