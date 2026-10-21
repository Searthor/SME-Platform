<script setup lang="ts">
import type { AdminIconName, Tone } from '~/types/ui'

const props = withDefaults(defineProps<{
  title: string
  message?: string
  tone?: Tone
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
}>(), { message: undefined, tone: 'danger', confirmLabel: undefined, cancelLabel: undefined, loading: false })

const emit = defineEmits<{ confirm: []; cancel: [] }>()
const open = defineModel<boolean>({ default: false })
const { t } = useI18n()
const panel = ref<HTMLElement | null>(null)

const iconByTone: Record<Tone, AdminIconName> = {
  danger: 'trash',
  warning: 'alert',
  success: 'check',
  info: 'info',
  neutral: 'info',
}

const iconClass: Record<Tone, string> = {
  danger: 'bg-rose-50 text-rose-600 ring-8 ring-rose-50/70',
  warning: 'bg-amber-50 text-amber-600 ring-8 ring-amber-50/70',
  success: 'bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/70',
  info: 'bg-sky-50 text-sky-600 ring-8 ring-sky-50/70',
  neutral: 'bg-slate-100 text-slate-600 ring-8 ring-slate-100/70',
}

const buttonVariant = computed(() =>
  props.tone === 'danger' ? 'danger'
  : props.tone === 'warning' ? 'warning'
  : props.tone === 'success' ? 'success'
  : 'primary'
)

const cancel = () => {
  if (props.loading) return
  open.value = false
  emit('cancel')
}

useOverlay(open, cancel, panel)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-xs"
        @click.self="cancel"
      >
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          class="relative w-full max-w-md rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl shadow-slate-900/15 outline-none transition-all"
        >
          <!-- Header with tone icon badge and close button -->
          <div class="flex items-start justify-between gap-4">
            <span class="grid size-12 shrink-0 place-items-center rounded-2xl transition" :class="iconClass[tone]">
              <AdminIcon :name="iconByTone[tone]" class="size-6" />
            </span>
            <button
              type="button"
              class="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              :disabled="loading"
              :aria-label="t('ui.close')"
              @click="cancel"
            >
              <AdminIcon name="x" class="size-4" />
            </button>
          </div>

          <!-- Title and description -->
          <div class="mt-4">
            <h2 class="text-base font-black text-slate-900">{{ title }}</h2>
            <p v-if="message" class="mt-1.5 text-xs leading-relaxed text-slate-500">{{ message }}</p>
          </div>

          <!-- Optional slot for detailed item summary or notes -->
          <div v-if="$slots.default" class="mt-3.5">
            <slot />
          </div>

          <!-- Action buttons -->
          <div class="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <BaseButton
              variant="secondary"
              :disabled="loading"
              @click="cancel"
            >
              {{ cancelLabel ?? t('ui.cancel') }}
            </BaseButton>
            <BaseButton
              :variant="buttonVariant"
              :loading="loading"
              @click="emit('confirm')"
            >
              {{ confirmLabel ?? t('ui.confirm') }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
