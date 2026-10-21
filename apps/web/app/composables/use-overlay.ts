/**
 * Shared behaviour for modal-like overlays: Escape to close, body scroll lock,
 * and focus restore. Call with a reactive "open" flag and a close callback.
 */
export const useOverlay = (open: Ref<boolean>, close: () => void, panel?: Ref<HTMLElement | null>) => {
  let previouslyFocused: HTMLElement | null = null

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      close()
    }
  }

  watch(open, async (isOpen) => {
    if (!import.meta.client) return
    if (isOpen) {
      previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', onKeydown)
      await nextTick()
      panel?.value?.focus()
    }
    else {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeydown)
      previouslyFocused?.focus?.()
      previouslyFocused = null
    }
  }, { immediate: true })

  onBeforeUnmount(() => {
    if (!import.meta.client) return
    document.body.style.overflow = ''
    document.removeEventListener('keydown', onKeydown)
  })
}
