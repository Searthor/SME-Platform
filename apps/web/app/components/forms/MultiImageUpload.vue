<script setup lang="ts">
import { ref } from 'vue'

export type UploadedImage = {
  id: string
  name: string
  url: string
  size?: number
  isPrimary?: boolean
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  label?: string
  hint?: string
  maxImages?: number
  maxSizeMb?: number
  disabled?: boolean
}>(), {
  label: 'ຮູບພາບສິນຄ້າ (Product Images)',
  hint: 'ຮອງຮັບໄຟລ໌ PNG, JPG, WEBP ສູງສຸດ 5MB ຕໍ່ຮູບ. ຮູບທຳອິດຈະເປັນຮູບໜ້າປົກສິນຄ້າ',
  maxImages: 10,
  maxSizeMb: 5,
  disabled: false,
})

const model = defineModel<UploadedImage[]>({ default: () => [] })
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const errorMessage = ref('')

function handleFiles(files: FileList | null) {
  if (!files || !files.length || props.disabled) return
  errorMessage.value = ''

  if (model.value.length + files.length > props.maxImages) {
    errorMessage.value = `ສາມາດອັບໂຫຼດໄດ້ສູງສຸດ ${props.maxImages} ຮູບ (ຕອນນີ້ມີ ${model.value.length} ຮູບແລ້ວ)`
    return
  }

  Array.from(files).forEach((file) => {
    // Validate type
    if (!file.type.startsWith('image/')) {
      errorMessage.value = `ໄຟລ໌ ${file.name} ບໍ່ແມ່ນຮູບພາບ`
      return
    }
    // Validate size
    if (file.size > props.maxSizeMb * 1024 * 1024) {
      errorMessage.value = `ຂະໜາດຮູບ ${file.name} ໃຫຍ່ເກີນ ${props.maxSizeMb}MB`
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (result) {
        const isFirst = model.value.length === 0
        model.value.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          url: result,
          size: file.size,
          isPrimary: isFirst,
        })
      }
    }
    reader.readAsDataURL(file)
  })

  // Reset file input so same file can be re-selected if needed
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  if (props.disabled) return
  handleFiles(event.dataTransfer?.files || null)
}

function onFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  handleFiles(target.files)
}

function removeImage(index: number) {
  const removed = model.value[index]
  model.value.splice(index, 1)

  // If removed image was primary, set new first image as primary
  if (removed?.isPrimary && model.value.length > 0) {
    model.value[0]!.isPrimary = true
  }
}

function setAsPrimary(index: number) {
  model.value.forEach((img, i) => {
    img.isPrimary = i === index
  })
}

function formatSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="block w-full select-none" :class="$attrs.class as string">
    <div class="flex items-center justify-between mb-2">
      <div>
        <span class="block text-xs font-semibold text-slate-700">{{ label }}</span>
        <span v-if="hint" class="block text-[0.68rem] text-slate-400 mt-0.5">{{ hint }}</span>
      </div>
      <span class="text-[0.68rem] font-bold text-slate-400 font-mono">
        {{ model.length }} / {{ maxImages }} ຮູບ
      </span>
    </div>

    <!-- Dropzone Trigger Box -->
    <div
      v-if="model.length < maxImages"
      class="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-5 text-center transition hover:border-[#5b4cf5] hover:bg-slate-50 cursor-pointer"
      :class="[
        isDragging ? 'border-[#5b4cf5] bg-[#ecebff]/40' : '',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      ]"
      @dragover.prevent="isDragging = !disabled"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInputRef?.click()"
    >
      <input
        ref="fileInputRef"
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif"
        :disabled="disabled"
        class="hidden"
        @change="onFileSelect"
      >

      <div class="grid size-11 place-items-center rounded-2xl bg-white shadow-2xs border border-slate-200/80 text-[#5b4cf5] group-hover:scale-105 transition-transform">
        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <p class="mt-2 text-xs font-bold text-slate-700">
        <span class="text-[#5b4cf5]">ຄລິກເພື່ອເລືອກຮູບ</span> ຫຼື ລາກຮູບຫຼາຍຮູບມາໃສ່ບ່ອນນີ້
      </p>
      <p class="mt-0.5 text-[0.65rem] text-slate-400">
        ເລືອກພ້ອມກັນໄດ້ຫຼາຍຮູບ (PNG, JPG, WEBP ສູງສຸດ 5MB)
      </p>
    </div>

    <!-- Error Message -->
    <p v-if="errorMessage" role="alert" class="mt-2 text-xs font-medium text-rose-500">
      ⚠️ {{ errorMessage }}
    </p>

    <!-- Uploaded Thumbnails Grid -->
    <div v-if="model.length" class="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
      <div
        v-for="(img, idx) in model"
        :key="img.id"
        class="group relative aspect-square overflow-hidden rounded-2xl border bg-white shadow-2xs transition hover:shadow-md"
        :class="img.isPrimary ? 'border-[#5b4cf5] ring-2 ring-[#5b4cf5]/30' : 'border-slate-200'"
      >
        <img
          :src="img.url"
          :alt="img.name"
          class="size-full object-cover"
        >

        <!-- Primary Badge -->
        <span
          v-if="img.isPrimary"
          class="absolute top-2 left-2 rounded-lg bg-[#5b4cf5] px-2 py-0.5 text-[0.62rem] font-black text-white shadow-xs"
        >
          ຮູບຫຼັກ
        </span>

        <!-- Hover Overlay Actions -->
        <div class="absolute inset-0 flex flex-col justify-between bg-black/45 p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <div class="flex items-center justify-between">
            <button
              v-if="!img.isPrimary"
              type="button"
              class="rounded-lg bg-white/90 px-2 py-1 text-[0.6rem] font-bold text-slate-800 hover:bg-white shadow-xs"
              title="ຕັ້ງເປັນຮູບຫຼັກ"
              @click.stop="setAsPrimary(idx)"
            >
              ⭐ ຕັ້ງເປັນຮູບຫຼັກ
            </button>
            <span v-else />

            <button
              type="button"
              class="grid size-6 place-items-center rounded-lg bg-rose-500 text-white hover:bg-rose-600 shadow-xs ml-auto"
              title="ລຶບຮູບນີ້"
              @click.stop="removeImage(idx)"
            >
              ✕
            </button>
          </div>

          <div class="truncate text-[0.62rem] text-white/90 font-mono">
            <p class="truncate">{{ img.name }}</p>
            <p class="text-white/70">{{ formatSize(img.size) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
