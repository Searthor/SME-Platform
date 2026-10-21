import {
  applyUiPreferences,
  defaultUiPreferences,
  normalizeUiPreferences,
  UI_PREFERENCES_COOKIE_KEY,
  UI_PREFERENCES_STORAGE_KEY,
  type UiPreferences,
  type UiSize,
  type UiTheme,
} from '~/utils/ui-preferences'

export const useUiPreferences = () => {
  const cookie = useCookie<UiPreferences | null>(UI_PREFERENCES_COOKIE_KEY, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  })

  const initialPreferences = cookie.value
    ? normalizeUiPreferences(cookie.value)
    : { ...defaultUiPreferences }

  const preferences = useState<UiPreferences>('ui-preferences', () => initialPreferences)
  const initialized = useState('ui-preferences-initialized', () => false)

  const apply = () => {
    if (!import.meta.client) return

    applyUiPreferences(document.documentElement, preferences.value)
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--color-brand-700').trim())
  }

  const persist = () => {
    cookie.value = preferences.value
    if (import.meta.client) {
      try {
        localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences.value))
      }
      catch {
        // Ignore local storage quota/private mode errors
      }
    }
  }

  const initialize = () => {
    if (!import.meta.client || initialized.value) return

    try {
      let source: unknown = cookie.value
      if (!source) {
        const saved = localStorage.getItem(UI_PREFERENCES_STORAGE_KEY)
        if (saved) {
          source = JSON.parse(saved)
        }
      }
      preferences.value = source ? normalizeUiPreferences(source) : { ...defaultUiPreferences }
    }
    catch {
      preferences.value = { ...defaultUiPreferences }
      localStorage.removeItem(UI_PREFERENCES_STORAGE_KEY)
    }

    initialized.value = true
    apply()
    persist()
  }

  const update = (next: UiPreferences) => {
    preferences.value = normalizeUiPreferences(next)
    apply()
    persist()
  }

  const setSize = (size: UiSize) => update({ ...preferences.value, size })
  const setTheme = (theme: UiTheme) => update({ ...preferences.value, theme })
  const reset = () => update({ ...defaultUiPreferences })

  return { preferences: readonly(preferences), initialize, setSize, setTheme, reset }
}
