<script setup lang="ts">
import type { AdminIconName, Tone } from '~/types/ui'

const { toasts, dismiss } = useToast()
const { t } = useI18n()

const styles: Record<Tone, string> = {
  success: 'border-emerald-200 text-emerald-700',
  warning: 'border-amber-200 text-amber-700',
  danger: 'border-rose-200 text-rose-700',
  info: 'border-sky-200 text-sky-700',
  neutral: 'border-line text-ink-700',
}
const icons: Record<Tone, AdminIconName> = { success: 'check', warning: 'alert', danger: 'x', info: 'info', neutral: 'info' }
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <div class="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite" aria-atomic="false">
        <TransitionGroup name="toast">
          <div
            v-for="item in toasts"
            :key="item.id"
            class="pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-3.5 shadow-pop"
            :class="styles[item.tone]"
            :role="item.tone === 'danger' ? 'alert' : 'status'"
          >
            <AdminIcon :name="icons[item.tone]" class="mt-0.5 size-5 shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-ink-900">{{ item.title }}</p>
              <p v-if="item.message" class="mt-0.5 text-sm text-ink-500">{{ item.message }}</p>
            </div>
            <button type="button" class="focus-ring -m-1 rounded p-1 text-ink-500 hover:text-ink-900" :aria-label="t('ui.dismiss', 'ປິດ')" @click="dismiss(item.id)">
              <AdminIcon name="x" class="size-4" />
            </button>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from { opacity: 0; transform: translateX(1.5rem); }
.toast-leave-to { opacity: 0; transform: translateX(1.5rem) scale(0.96); }
.toast-leave-active { position: absolute; right: 0; }
</style>
