<script setup lang="ts">
const props = withDefaults(defineProps<{
  label?: string
  hint?: string
  /** Comma separated MIME types or extensions, same syntax as the native `accept` attribute. */
  accept?: string
  maxSizeMb?: number
  disabled?: boolean
}>(), { label: undefined, hint: undefined, accept: undefined, maxSizeMb: 2, disabled: false })

const emit = defineEmits<{ error: [message: string] }>()
const model = defineModel<File | null>({ default: null })
const { t } = useI18n()

const input = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const errorMessage = ref('')
const previewUrl = ref<string | null>(null)

const matchesAccept = (file: File): boolean => {
  if (!props.accept) return true
  return props.accept.split(',').map(item => item.trim().toLowerCase()).filter(Boolean).some((rule) => {
    if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule)
    if (rule.endsWith('/*')) return file.type.toLowerCase().startsWith(rule.slice(0, -1))
    return file.type.toLowerCase() === rule
  })
}

const revoke = () => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
}

const acceptFile = (file: File | undefined) => {
  if (!file) return
  errorMessage.value = ''
  if (!matchesAccept(file)) errorMessage.value = t('ui.upload_bad_type')
  else if (file.size > props.maxSizeMb * 1024 * 1024) errorMessage.value = `${t('ui.upload_too_large')} (max ${props.maxSizeMb} MB)`
  if (errorMessage.value) {
    emit('error', errorMessage.value)
    return
  }
  revoke()
  if (file.type.startsWith('image/')) previewUrl.value = URL.createObjectURL(file)
  model.value = file
}

const onDrop = (event: DragEvent) => {
  dragging.value = false
  if (!props.disabled) acceptFile(event.dataTransfer?.files?.[0])
}
const onChange = (event: Event) => acceptFile((event.target as HTMLInputElement).files?.[0])
const clear = () => {
  revoke()
  model.value = null
  errorMessage.value = ''
  if (input.value) input.value.value = ''
}

watch(model, (value) => { if (!value) revoke() })
onBeforeUnmount(revoke)

const sizeLabel = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
</script>

<template>
  <div>
    <p v-if="label" class="mb-1.5 text-xs font-extrabold text-ink-950">{{ label }}</p>
    <div
      class="relative grid min-h-36 place-items-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition"
      :class="[dragging ? 'border-brand-500 bg-brand-100/60' : 'border-line bg-canvas/60 hover:border-brand-500/60', disabled ? 'opacity-50' : '']"
      @dragover.prevent="dragging = !disabled"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <input ref="input" type="file" :accept="accept" :disabled="disabled" class="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed" :aria-label="label ?? t('ui.upload_click')" @change="onChange">

      <div v-if="model" class="relative z-10 flex items-center gap-3">
        <img v-if="previewUrl" :src="previewUrl" alt="" class="size-14 rounded-xl object-cover">
        <span v-else class="grid size-14 place-items-center rounded-xl bg-brand-100 text-brand-700"><AdminIcon name="file" class="size-6" /></span>
        <span class="min-w-0 text-left">
          <span class="block max-w-52 truncate text-xs font-extrabold text-ink-950">{{ model.name }}</span>
          <span class="block text-[0.68rem] text-ink-500">{{ sizeLabel(model.size) }}</span>
        </span>
        <button type="button" class="focus-ring relative z-20 grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" :aria-label="t('ui.upload_remove')" @click.stop="clear">
          <AdminIcon name="x" class="size-4" />
        </button>
      </div>
      <div v-else class="pointer-events-none">
        <span class="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-700"><AdminIcon name="upload" class="size-5" /></span>
        <p class="mt-3 text-xs font-extrabold text-ink-950">{{ t('ui.upload_click') }}</p>
        <p v-if="hint" class="mt-1 text-[0.68rem] text-ink-500">{{ hint }}</p>
      </div>
    </div>
    <p v-if="errorMessage" role="alert" class="mt-1.5 text-[0.68rem] font-semibold text-rose-600">{{ errorMessage }}</p>
  </div>
</template>
