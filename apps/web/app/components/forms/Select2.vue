<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export type Select2Option = {
  value: string | number
  label: string
  sublabel?: string
  disabled?: boolean
  [key: string]: unknown
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  options: (Select2Option | Record<string, unknown> | string | number)[]
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
  multiple?: boolean
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
  placeholder: 'ເລືອກ...',
  disabled: false,
  searchable: true,
  searchPlaceholder: 'ຄົ້ນຫາ...',
  clearable: false,
  multiple: false,
  valueKey: undefined,
  labelKey: undefined,
  sublabelKey: undefined,
  size: 'md',
})

const emit = defineEmits<{
  (e: 'change', value: any): void
}>()

const { t } = useI18n()

const model = defineModel<any>({ default: '' })

const id = useId()
const isOpen = ref(false)
const searchQuery = ref('')
const highlightedIndex = ref(-1)
const containerRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

// Normalize options array into { value, label, sublabel, disabled }
const normalizedOptions = computed<Select2Option[]>(() => {
  if (!Array.isArray(props.options)) return []

  return props.options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt), disabled: false }
    }
    if (typeof opt === 'object' && opt !== null) {
      const record = opt as Record<string, unknown>
      const val = props.valueKey
        ? (record[props.valueKey] as string | number)
        : ((record.value ?? record.id ?? record.code) as string | number)

      const lbl = props.labelKey
        ? (record[props.labelKey] as string)
        : ((record.label ?? record.name ?? String(val ?? '')) as string)

      const sub = props.sublabelKey
        ? (record[props.sublabelKey] as string)
        : ((record.sublabel || (record.code && record.name && record.code !== lbl ? record.code : undefined)) as string | undefined)

      return {
        value: val,
        label: String(lbl ?? ''),
        sublabel: sub ? String(sub) : undefined,
        disabled: Boolean(record.disabled),
        ...record,
      }
    }
    return { value: '', label: '', disabled: false }
  })
})

// Filtered options based on search query
const filteredOptions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return normalizedOptions.value

  return normalizedOptions.value.filter((opt) => {
    const matchLabel = opt.label.toLowerCase().includes(query)
    const matchSublabel = opt.sublabel?.toLowerCase().includes(query)
    const matchVal = String(opt.value).toLowerCase().includes(query)
    return matchLabel || matchSublabel || matchVal
  })
})

const isSelected = (val: string | number) => {
  if (props.multiple) {
    return Array.isArray(model.value) && model.value.some((v: any) => String(v) === String(val))
  }
  return String(model.value ?? '') === String(val)
}

// Current selected option
const selectedOption = computed(() => {
  if (props.multiple) return null
  return normalizedOptions.value.find((opt) => String(opt.value) === String(model.value ?? ''))
})

// Current selected options list for multiple mode
const selectedOptionsList = computed(() => {
  if (!props.multiple || !Array.isArray(model.value)) return []
  return normalizedOptions.value.filter((opt) =>
    model.value.some((v: any) => String(v) === String(opt.value))
  )
})

function toggleDropdown() {
  if (props.disabled) return
  if (isOpen.value) {
    closeDropdown()
  } else {
    openDropdown()
  }
}

function openDropdown() {
  if (props.disabled) return
  isOpen.value = true
  searchQuery.value = ''
  highlightedIndex.value = filteredOptions.value.findIndex((o) => isSelected(o.value))
  if (highlightedIndex.value < 0 && filteredOptions.value.length) {
    highlightedIndex.value = 0
  }
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

function closeDropdown() {
  isOpen.value = false
  searchQuery.value = ''
  highlightedIndex.value = -1
}

function selectOption(option: Select2Option) {
  if (option.disabled) return
  if (props.multiple) {
    const arr = Array.isArray(model.value) ? [...model.value] : []
    const idx = arr.findIndex((v: any) => String(v) === String(option.value))
    if (idx > -1) {
      arr.splice(idx, 1)
    } else {
      arr.push(option.value)
    }
    model.value = arr
    emit('change', arr)
  } else {
    model.value = option.value
    emit('change', option.value)
    closeDropdown()
  }
}

function removeOption(val: string | number, e?: MouseEvent) {
  e?.stopPropagation()
  if (!props.multiple || !Array.isArray(model.value)) return
  const arr = model.value.filter((v: any) => String(v) !== String(val))
  model.value = arr
  emit('change', arr)
}

function clearSelection(e: MouseEvent) {
  e.stopPropagation()
  if (props.multiple) {
    model.value = []
    emit('change', [])
  } else {
    model.value = ''
    emit('change', '')
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (props.disabled) return

  if (!isOpen.value) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openDropdown()
    }
    return
  }

  if (e.key === 'Escape') {
    e.preventDefault()
    closeDropdown()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (!filteredOptions.value.length) return
    highlightedIndex.value = (highlightedIndex.value + 1) % filteredOptions.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (!filteredOptions.value.length) return
    highlightedIndex.value = (highlightedIndex.value - 1 + filteredOptions.value.length) % filteredOptions.value.length
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredOptions.value.length) {
      const target = filteredOptions.value[highlightedIndex.value]
      if (target) {
        selectOption(target)
      }
    }
  }
}

// Click outside handling
function handleClickOutside(event: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleClickOutside)
})

watch(isOpen, (val) => {
  if (val && props.searchable) {
    nextTick(() => searchInputRef.value?.focus())
  }
})
</script>

<template>
  <div ref="containerRef" class="relative block w-full select-none" :class="$attrs.class as string">
    <!-- Optional Label -->
    <label v-if="label" :for="id" class="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-600">
      {{ label }}
      <span v-if="required" class="text-rose-500" aria-hidden="true">*</span>
      <span v-else-if="optional" class="font-normal text-slate-400">({{ t('ui.optional') }})</span>
    </label>

    <!-- Trigger Button -->
    <div class="relative">
      <button
        :id="id"
        type="button"
        :disabled="disabled"
        class="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white text-left transition outline-none cursor-pointer"
        style="box-shadow: none !important; outline: none !important;"
        :class="[
          size === 'sm' ? 'min-h-9.5 px-3 text-xs' : 'min-h-10 px-3.5 text-xs',
          isOpen ? 'border-[#5b4cf5]' : 'hover:border-slate-300 focus:border-[#5b4cf5] focus-visible:border-[#5b4cf5]',
          error ? 'border-rose-400 focus:border-rose-500 focus-visible:border-rose-500' : '',
          disabled ? 'cursor-not-allowed bg-slate-50 opacity-60' : '',
        ]"
        @click="toggleDropdown"
        @keydown="onKeyDown"
      >
        <!-- Multiple Mode Tags Display -->
        <div v-if="multiple" class="flex flex-wrap items-center gap-1.5 min-w-0 flex-1 py-1">
          <span
            v-for="opt in selectedOptionsList"
            :key="String(opt.value)"
            class="inline-flex items-center gap-1 rounded-md bg-[#ecebff] px-2 py-0.5 text-[0.7rem] font-bold text-[#4a3bd9]"
          >
            <span class="truncate max-w-[140px]">{{ opt.label }}</span>
            <button
              type="button"
              class="hover:text-rose-600 transition ml-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              @click.stop="removeOption(opt.value, $event)"
            >
              ✕
            </button>
          </span>
          <span v-if="selectedOptionsList.length === 0" class="text-slate-400">
            {{ placeholder }}
          </span>
        </div>

        <!-- Single Mode Display -->
        <span v-else class="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden" :class="selectedOption ? 'text-slate-800 font-medium' : 'text-slate-400'">
          <span class="truncate block py-0.5 leading-normal">{{ selectedOption ? selectedOption.label : placeholder }}</span>
          <span v-if="selectedOption?.sublabel" class="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[0.65rem] font-bold text-slate-500 font-mono">
            {{ selectedOption.sublabel }}
          </span>
        </span>

        <!-- Right Icons: Clear & Chevron -->
        <span class="ml-2 flex items-center gap-1.5 shrink-0">
          <button
            v-if="clearable && ((multiple && selectedOptionsList.length > 0) || (!multiple && selectedOption)) && !disabled"
            type="button"
            class="grid size-4 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            title="Clear selection"
            @click.stop="clearSelection"
          >
            ✕
          </button>
          <AdminIcon
            name="chevron-down"
            class="size-3.5 text-slate-400 transition-transform duration-200"
            :class="isOpen ? 'rotate-180 text-[#5b4cf5]' : ''"
          />
        </span>
      </button>

      <!-- Hidden native input for required form validation -->
      <input
        type="text"
        :value="multiple ? (Array.isArray(model) ? model.join(',') : '') : (model ?? '')"
        :required="required && (multiple ? (!Array.isArray(model) || model.length === 0) : !model)"
        tabindex="-1"
        class="pointer-events-none absolute bottom-0 left-1/2 size-0 -translate-x-1/2 opacity-0"
      >

      <!-- Dropdown Popover -->
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="transform scale-95 opacity-0 -translate-y-1"
        enter-to-class="transform scale-100 opacity-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="transform scale-100 opacity-100 translate-y-0"
        leave-to-class="transform scale-95 opacity-0 -translate-y-1"
      >
        <div
          v-if="isOpen"
          class="absolute left-0 top-full z-50 mt-1.5 w-full min-w-44 rounded-2xl border border-slate-200 bg-white py-1.5 shadow-[0_12px_36px_rgba(16,24,40,0.14)]"
          @keydown="onKeyDown"
        >
          <!-- Search Box (Select2 hallmark) -->
          <div v-if="searchable" class="px-2 pb-1.5 pt-0.5 border-b border-slate-100">
            <div class="relative">
              <AdminIcon name="search" class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                type="text"
                class="h-8.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs leading-normal py-1.5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#5b4cf5] focus:bg-white"
                style="box-shadow: none !important; outline: none !important;"
                :placeholder="searchPlaceholder"
                @click.stop
              >
            </div>
          </div>

          <!-- Options List -->
          <div class="max-h-56 overflow-y-auto px-1 py-1 space-y-0.5 text-xs">
            <button
              v-for="(option, index) in filteredOptions"
              :key="String(option.value)"
              type="button"
              :disabled="option.disabled"
              class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition cursor-pointer"
              :class="[
                isSelected(option.value)
                  ? 'bg-[#ecebff] text-[#4a3bd9] font-bold'
                  : highlightedIndex === index
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
                option.disabled ? 'cursor-not-allowed opacity-40' : '',
              ]"
              @click.stop="selectOption(option)"
              @mouseenter="highlightedIndex = index"
            >
              <div class="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                <input
                  v-if="multiple"
                  type="checkbox"
                  :checked="isSelected(option.value)"
                  class="size-3.5 rounded border-slate-300 text-[#5b4cf5] pointer-events-none"
                >
                <span class="truncate block py-0.5 leading-normal">{{ option.label }}</span>
                <span v-if="option.sublabel" class="shrink-0 text-[0.65rem] font-mono text-slate-400">
                  ({{ option.sublabel }})
                </span>
              </div>
              <AdminIcon
                v-if="isSelected(option.value) && !multiple"
                name="check"
                class="size-3.5 text-[#5b4cf5] shrink-0 ml-2"
              />
            </button>

            <div v-if="!filteredOptions.length" class="py-4 text-center text-xs text-slate-400">
              ບໍ່ພົບຂໍ້ມູນທີ່ກົງກັນ
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Error / Hint -->
    <p v-if="error" role="alert" class="mt-1.5 text-[0.68rem] font-semibold text-rose-600">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-[0.68rem] text-slate-500">{{ hint }}</p>
  </div>
</template>
