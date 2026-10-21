<script setup lang="ts">
import { formatDecimalString, sanitizeDecimalInput } from '~/utils/money'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  label?: string
  hint?: string
  error?: string
  required?: boolean
  optional?: boolean
  disabled?: boolean
  currency?: string
  /** Max fraction digits (LAK usually 0, USD 2). */
  scale?: number
  placeholder?: string
}>(), {
  label: undefined, hint: undefined, error: undefined, required: false, optional: false,
  disabled: false, currency: undefined, scale: 2, placeholder: '0',
})

/** Plain decimal string (e.g. "1500.50"). Never converted to a JS number. */
const model = defineModel<string>({ default: '' })
const id = useId()
const focused = ref(false)

const display = computed(() => {
  if (focused.value || model.value === '') return model.value
  return formatDecimalString(model.value) || model.value
})

const onInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const next = sanitizeDecimalInput(input.value, props.scale)
  input.value = next
  model.value = next
}

const onBlur = () => {
  focused.value = false
  // Drop a dangling decimal point such as "12."
  if (model.value.endsWith('.')) model.value = model.value.slice(0, -1)
}
</script>

<template>
  <FormField :label="label" :hint="hint" :error="error" :required="required" :optional="optional" :for="id" :class="$attrs.class as string">
    <div class="relative">
      <input
        :id="id"
        v-bind="{ ...$attrs, class: undefined }"
        :value="display"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :aria-invalid="error ? true : undefined"
        class="admin-field text-right tabular-nums disabled:cursor-not-allowed disabled:opacity-70"
        :class="[currency ? 'pr-14' : '', error ? 'border-rose-400' : '']"
        @focus="focused = true"
        @input="onInput"
        @blur="onBlur"
      >
      <span v-if="currency" class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold text-ink-500">{{ currency }}</span>
    </div>
  </FormField>
</template>
