<script setup lang="ts">
const props = withDefaults(defineProps<{
  placeholder?: string
  /** Debounce (ms) before the model is updated while typing. 0 = immediate. */
  debounce?: number
  ariaLabel?: string
}>(), { placeholder: undefined, debounce: 300, ariaLabel: undefined })

const model = defineModel<string>({ default: '' })
const { t } = useI18n()

const draft = ref(model.value)
let timer: ReturnType<typeof setTimeout> | undefined

watch(model, (value) => { if (value !== draft.value) draft.value = value })

const onInput = () => {
  if (timer) clearTimeout(timer)
  if (props.debounce <= 0) { model.value = draft.value; return }
  timer = setTimeout(() => { model.value = draft.value }, props.debounce)
}

const clear = () => {
  if (timer) clearTimeout(timer)
  draft.value = ''
  model.value = ''
}

onBeforeUnmount(() => { if (timer) clearTimeout(timer) })
</script>

<template>
  <div class="relative w-full">
    <span class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-500"><AdminIcon name="search" class="size-4" /></span>
    <input
      v-model="draft"
      type="search"
      class="admin-field pl-10 pr-9"
      :placeholder="placeholder ?? t('ui.search_placeholder', 'ຄົ້ນຫາ...')"
      :aria-label="ariaLabel ?? t('ui.search', 'ຄົ້ນຫາ')"
      @input="onInput"
      @keydown.esc="clear"
    >
    <button
      v-if="draft"
      type="button"
      class="focus-ring absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-ink-500 hover:bg-canvas"
      :aria-label="t('ui.reset', 'ລ້າງ')"
      @click="clear"
    >
      <AdminIcon name="x" class="size-3.5" />
    </button>
  </div>
</template>
