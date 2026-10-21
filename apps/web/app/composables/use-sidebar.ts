export const SIDEBAR_COLLAPSED_COOKIE = 'sme_sidebar_collapsed'
export const SIDEBAR_COLLAPSED_STORAGE = 'sme-flow:sidebar-collapsed:v1'

export const useSidebar = () => {
  const cookie = useCookie<boolean | null>(SIDEBAR_COLLAPSED_COOKIE, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  })

  const initial = cookie.value === true

  const isCollapsed = useState('sme-sidebar-collapsed', () => initial)
  const initialized = useState('sme-sidebar-initialized', () => false)

  const persist = (val: boolean) => {
    cookie.value = val
    if (import.meta.client) {
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE, val ? '1' : '0')
      }
      catch {
        // Ignore storage errors in private browsing
      }
    }
  }

  const initialize = () => {
    if (!import.meta.client || initialized.value) return

    try {
      if (cookie.value === null || cookie.value === undefined) {
        const saved = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE)
        if (saved !== null) {
          isCollapsed.value = saved === '1'
        }
      } else {
        isCollapsed.value = cookie.value === true
      }
    }
    catch {
      // Ignore
    }

    initialized.value = true
    persist(isCollapsed.value)
  }

  const toggle = () => {
    isCollapsed.value = !isCollapsed.value
    persist(isCollapsed.value)
  }

  const collapse = () => {
    isCollapsed.value = true
    persist(true)
  }

  const expand = () => {
    isCollapsed.value = false
    persist(false)
  }

  return {
    isCollapsed: readonly(isCollapsed),
    toggle,
    collapse,
    expand,
    initialize,
  }
}
