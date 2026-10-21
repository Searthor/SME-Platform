<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { sanitizeDecimalInput } from '~/utils/money'

const { t } = useI18n()

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  label?: string
  hint?: string
  error?: string
  required?: boolean
  optional?: boolean
  disabled?: boolean
  suffix?: string
  scale?: number
  placeholder?: string
  size?: 'sm' | 'md'
}>(), {
  label: undefined,
  hint: undefined,
  error: undefined,
  required: false,
  optional: false,
  disabled: false,
  suffix: undefined,
  scale: 4,
  placeholder: '0',
  size: 'md',
})

const model = defineModel<string | number>({ default: '' })
const id = useId()
const isFocused = ref(false)
const suffixRef = ref<HTMLElement | null>(null)
const suffixWidth = ref(0)

function updateSuffixWidth() {
  if (suffixRef.value) {
    suffixWidth.value = suffixRef.value.offsetWidth
  }
}

onMounted(() => {
  updateSuffixWidth()
})

watch(() => props.suffix, () => {
  nextTick(updateSuffixWidth)
})

// Calculate exact right padding needed so text NEVER overlaps the suffix badge
const paddingRightStyle = computed(() => {
  if (!props.suffix) return undefined
  // Suffix badge is absolute right-2.5 (10px).
  // Provide badge width + 10px (position) + 16px (breathing room gap)
  if (suffixWidth.value > 0) {
    return `${suffixWidth.value + 26}px`
  }
  // Safe SSR/pre-mount fallback based on suffix character length
  const len = props.suffix.length
  if (len <= 1) return '52px' // 1 char like ₭, $
  if (len <= 4) return '72px' // 2-4 chars like LAK, THB, ກິບ
  return `${Math.max(92, len * 12 + 30)}px` // multi-char Lao words like ຫົວໜ່ວຍ
})

// Format the display string with comma thousand separators
const displayValue = computed(() => {
  if (model.value === '' || model.value === undefined || model.value === null) return ''
  const sanitized = sanitizeDecimalInput(String(model.value), props.scale)
  if (!sanitized) return ''
  const [intPart = '', decPart] = sanitized.split('.')
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (props.scale === 0 || decPart === undefined) {
    return formattedInt
  }
  if (decPart.replace(/0+$/, '') === '' && !isFocused.value) {
    return formattedInt
  }
  if (isFocused.value && (decPart === '0000' || decPart === '00' || decPart === '000')) {
    return formattedInt
  }
  return `${formattedInt}.${decPart}`
})

function onFocus(event: FocusEvent) {
  isFocused.value = true
  const target = event.target as HTMLInputElement
  if (target.value === '0') {
    target.select()
  }
}

function onBlur() {
  isFocused.value = false
}

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  const raw = target.value.replace(/,/g, '')
  const sanitized = sanitizeDecimalInput(raw, props.scale)
  model.value = sanitized

  // Format the input field immediately
  const [intPart = '', decPart] = sanitized.split('.')
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const newDisplay = (props.scale > 0 && decPart !== undefined) ? `${formattedInt}.${decPart}` : formattedInt
  target.value = newDisplay
}
</script>

<template>
  <div class="block w-full" :class="$attrs.class as string">
    <label v-if="label" :for="id" class="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-600">
      {{ label }}
      <span v-if="required" class="text-rose-500" aria-hidden="true">*</span>
      <span v-else-if="optional" class="font-normal text-slate-400">({{ t('ui.optional') }})</span>
    </label>

    <div class="relative">
      <input
        :id="id"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        :value="displayValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        class="admin-field text-right font-mono text-xs tabular-nums transition"
        :class="[
          size === 'sm' ? '!h-9.5 px-3' : 'h-10 px-3.5',
          error ? 'border-rose-400 focus:border-rose-500' : 'focus:border-[#5b4cf5]',
          disabled ? 'cursor-not-allowed bg-slate-50 opacity-60' : '',
        ]"
        :style="{
          paddingRight: paddingRightStyle,
          boxShadow: 'none !important',
          outline: 'none !important',
        }"
        @focus="onFocus"
        @blur="onBlur"
        @input="onInput"
      >

      <span
        v-if="suffix"
        ref="suffixRef"
        class="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md bg-slate-100 px-2 py-0.5 text-[0.68rem] font-bold text-slate-500 select-none whitespace-nowrap"
      >
        {{ suffix }}
      </span>
    </div>

    <p v-if="error" role="alert" class="mt-1.5 text-[0.68rem] font-semibold text-rose-600">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-[0.68rem] text-slate-500">{{ hint }}</p>
  </div>
</template>
