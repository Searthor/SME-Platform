<script setup lang="ts">
withDefaults(defineProps<{ align?: 'left' | 'right'; width?: string }>(), { align: 'right', width: 'w-52' })

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const close = () => { open.value = false }
const toggle = () => { open.value = !open.value }

const onDocumentClick = (event: MouseEvent) => {
  if (open.value && root.value && !root.value.contains(event.target as Node)) close()
}
const onKeydown = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="relative inline-block">
    <slot name="trigger" :open="open" :toggle="toggle" />
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div v-if="open" role="menu" class="absolute z-50 mt-2 rounded-2xl border border-line bg-white p-1.5 shadow-pop" :class="[align === 'right' ? 'right-0' : 'left-0', width]">
        <slot :close="close" />
      </div>
    </Transition>
  </div>
</template>
