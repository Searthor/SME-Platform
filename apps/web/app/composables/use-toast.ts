import type { Tone, ToastItem } from '~/types/ui'

const MAX_TOASTS = 5
let sequence = 0

/**
 * Global toast queue. Render <ToastContainer /> once (app.vue); call useToast().success(...) anywhere.
 * State lives in Nuxt `useState` so it is SSR-safe, but timers only run on the client.
 */
export const useToast = () => {
  const toasts = useState<ToastItem[]>('sme-toasts', () => [])

  const dismiss = (id: number) => {
    toasts.value = toasts.value.filter(item => item.id !== id)
  }

  const push = (tone: Tone, title: string, message?: string, duration = 4500): number => {
    const id = ++sequence
    toasts.value = [...toasts.value, { id, tone, title, duration, ...(message ? { message } : {}) }].slice(-MAX_TOASTS)
    if (import.meta.client && duration > 0) setTimeout(() => dismiss(id), duration)
    return id
  }

  return {
    toasts: readonly(toasts),
    dismiss,
    push,
    success: (title: string, message?: string) => push('success', title, message),
    error: (title: string, message?: string) => push('danger', title, message, 7000),
    warning: (title: string, message?: string) => push('warning', title, message),
    info: (title: string, message?: string) => push('info', title, message),
  }
}
