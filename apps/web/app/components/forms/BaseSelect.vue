<script setup lang="ts">
import type { SelectOption } from '~/types/ui'
import Select2 from '~/components/forms/Select2.vue'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  options: (SelectOption | Record<string, unknown> | string | number)[]
  label?: string
  hint?: string
  error?: string
  required?: boolean
  optional?: boolean
  placeholder?: string
  disabled?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  clearable?: boolean
  valueKey?: string
  labelKey?: string
  sublabelKey?: string
  size?: 'sm' | 'md'
}>(), {
  label: undefined,
  hint: undefined,
  error: undefined,
  required: false,
  optional: false,
  placeholder: undefined,
  disabled: false,
  searchable: true,
  searchPlaceholder: undefined,
  clearable: false,
  valueKey: undefined,
  labelKey: undefined,
  sublabelKey: undefined,
  size: 'md',
})

const model = defineModel<string | number | null>({ default: '' })
</script>

<template>
  <Select2
    v-model="model"
    :options="options"
    :label="label"
    :hint="hint"
    :error="error"
    :required="required"
    :optional="optional"
    :placeholder="placeholder"
    :disabled="disabled"
    :searchable="searchable"
    :search-placeholder="searchPlaceholder"
    :clearable="clearable"
    :value-key="valueKey"
    :label-key="labelKey"
    :sublabel-key="sublabelKey"
    :size="size"
    v-bind="$attrs"
  />
</template>
