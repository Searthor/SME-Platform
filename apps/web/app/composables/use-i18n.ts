import {
  defaultLocale,
  getLocaleOption,
  LOCALE_COOKIE_KEY,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  supportedLocales,
  translate,
  type SupportedLocale,
} from '~/utils/i18n'

export const useI18n = () => {
  const cookie = useCookie<SupportedLocale | null>(LOCALE_COOKIE_KEY, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  })

  const initialLocale = cookie.value
    ? normalizeLocale(cookie.value)
    : defaultLocale

  const locale = useState<SupportedLocale>('sme-locale', () => initialLocale)
  const initialized = useState('sme-locale-initialized', () => false)

  const persist = (next: SupportedLocale) => {
    cookie.value = next
    if (import.meta.client) {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, next)
      }
      catch {
        // Ignore storage errors in private browsing
      }
    }
  }

  const initialize = () => {
    if (!import.meta.client || initialized.value) return

    try {
      let source: unknown = cookie.value
      if (!source) {
        const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
        if (saved) {
          source = saved
        }
      }
      locale.value = source ? normalizeLocale(source) : defaultLocale
    }
    catch {
      locale.value = defaultLocale
      localStorage.removeItem(LOCALE_STORAGE_KEY)
    }

    initialized.value = true
    persist(locale.value)
  }

  const setLocale = (next: SupportedLocale) => {
    const valid = normalizeLocale(next)
    locale.value = valid
    persist(valid)
  }

  const currentLocale = computed(() => getLocaleOption(locale.value))

  const t = (key: string, fallback?: string): string => {
    return translate(locale.value, key, fallback)
  }

  return {
    locale: readonly(locale),
    currentLocale,
    supportedLocales,
    t,
    setLocale,
    initialize,
  }
}
