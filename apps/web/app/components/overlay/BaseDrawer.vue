<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  description?: string
  width?: 'sm' | 'md' | 'lg'
  persistent?: boolean
}>(), { description: undefined, width: 'md', persistent: false })

const open = defineModel<boolean>({ default: false })
const panel = ref<HTMLElement | null>(null)
const titleId = useId()
const { t } = useI18n()

const close = () => { open.value = false }
useOverlay(open, close, panel)

const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-[60] flex justify-end bg-navy-950/55 backdrop-blur-sm" @mousedown.self="!persistent && close()">
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          class="drawer-panel flex h-full w-full flex-col bg-white shadow-pop outline-none"
          :class="widths[width]"
        >
          <header class="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div class="min-w-0">
              <h2 :id="titleId" class="text-base font-black text-ink-950">{{ props.title }}</h2>
              <p v-if="description" class="mt-1 text-xs text-ink-500">{{ description }}</p>
            </div>
            <button type="button" class="focus-ring grid size-8 shrink-0 place-items-center rounded-lg text-ink-500 transition hover:bg-canvas hover:text-ink-950" :aria-label="t('ui.close')" @click="close">
              <AdminIcon name="x" class="size-4" />
            </button>
          </header>
          <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5"><slot /></div>
          <footer v-if="$slots.footer" class="flex items-center justify-end gap-3 border-t border-line px-6 py-4"><slot name="footer" :close="close" /></footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-panel { animation: drawer-in 0.24s cubic-bezier(0.22, 1, 0.36, 1); }
@keyframes drawer-in { from { transform: translateX(2rem); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
</style>
