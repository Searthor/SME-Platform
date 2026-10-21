<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  disabled?: boolean
  /** Render as a radio button (use with `value` + a shared v-model). */
  radio?: boolean
  value?: string
}>(), { label: undefined, disabled: false, radio: false, value: undefined })

const model = defineModel<boolean | string>({ default: false })
const id = useId()
</script>

<template>
  <label :for="id" class="inline-flex cursor-pointer items-center gap-2.5 text-xs font-bold text-ink-950" :class="disabled ? 'cursor-not-allowed opacity-50' : ''">
    <input
      :id="id"
      v-model="model"
      :type="radio ? 'radio' : 'checkbox'"
      :value="radio ? value : undefined"
      :disabled="disabled"
      class="size-4 shrink-0 cursor-pointer accent-brand-600 disabled:cursor-not-allowed"
    >
    <span v-if="label || $slots.default"><slot>{{ label }}</slot></span>
  </label>
</template>
