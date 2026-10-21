<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** When true, clicking the backdrop does not close the dialog. */
  persistent?: boolean
}>(), { description: undefined, size: 'md', persistent: false })

const open = defineModel<boolean>({ default: false })
const panel = ref<HTMLElement | null>(null)
const titleId = useId()
const { t } = useI18n()

const close = () => { open.value = false }
useOverlay(open, close, panel)

const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' } as const
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-navy-950/55 p-4 backdrop-blur-sm sm:items-center" @mousedown.self="!persistent && close()">
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          class="relative my-6 flex max-h-[calc(100vh-3rem)] w-full flex-col rounded-3xl border border-line bg-white shadow-pop outline-none"
          :class="widths[size]"
        >
          <header class="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <slot name="header">
              <div class="min-w-0">
                <h2 :id="titleId" class="text-base font-black text-ink-950">{{ props.title }}</h2>
                <p v-if="description" class="mt-1 text-xs text-ink-500">{{ description }}</p>
              </div>
            </slot>
            <button type="button" class="focus-ring grid size-8 shrink-0 place-items-center rounded-lg text-ink-500 transition hover:bg-canvas hover:text-ink-950" :aria-label="t('ui.close')" @click="close">
              <AdminIcon name="x" class="size-4" />
            </button>
          </header>
          <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5"><slot /></div>
          <footer v-if="$slots.footer" class="flex flex-wrap items-center justify-end gap-3 border-t border-line px-6 py-4"><slot name="footer" :close="close" /></footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
