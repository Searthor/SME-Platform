import {
  defaultLocale,
  getLocaleOption,
  isSupportedLocale,
  LOCALE_COOKIE_KEY,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  supportedLocales,
  translate,
} from '~/utils/i18n'

describe('i18n localization', () => {
  it('supports the requested 5 languages: Lao, English, Thai, Chinese, Vietnamese', () => {
    expect(supportedLocales).toHaveLength(5)
    expect(supportedLocales.map(item => item.code)).toEqual(['lo', 'en', 'th', 'zh', 'vi'])
    expect(LOCALE_COOKIE_KEY).toBe('sme_locale')
    expect(LOCALE_STORAGE_KEY).toBe('sme-flow:locale:v1')
    expect(defaultLocale).toBe('lo')
  })

  it('correctly maps flags and native names', () => {
    expect(getLocaleOption('lo')).toMatchObject({ code: 'lo', nativeName: 'ພາສາລາວ', flag: '🇱🇦' })
    expect(getLocaleOption('en')).toMatchObject({ code: 'en', nativeName: 'English', flag: '🇬🇧' })
    expect(getLocaleOption('th')).toMatchObject({ code: 'th', nativeName: 'ไทย', flag: '🇹🇭' })
    expect(getLocaleOption('zh')).toMatchObject({ code: 'zh', nativeName: '中文', flag: '🇨🇳' })
    expect(getLocaleOption('vi')).toMatchObject({ code: 'vi', nativeName: 'Tiếng Việt', flag: '🇻🇳' })
  })

  it('normalizes locale values with safe fallback to Lao default', () => {
    expect(isSupportedLocale('th')).toBe(true)
    expect(isSupportedLocale('fr')).toBe(false)
    expect(normalizeLocale('zh')).toBe('zh')
    expect(normalizeLocale('invalid')).toBe('lo')
    expect(normalizeLocale(null)).toBe('lo')
  })

  it('translates navigation keys across all 5 languages', () => {
    expect(translate('lo', 'nav.dashboard')).toBe('ໜ້າຫຼັກ')
    expect(translate('en', 'nav.dashboard')).toBe('Dashboard')
    expect(translate('th', 'nav.dashboard')).toBe('หน้าหลัก')
    expect(translate('zh', 'nav.dashboard')).toBe('首页控制台')
    expect(translate('vi', 'nav.dashboard')).toBe('Trang chủ')
  })

  it('falls back gracefully when translation key is unknown', () => {
    expect(translate('en', 'unknown.key', 'Fallback')).toBe('Fallback')
    expect(translate('en', 'unknown.key')).toBe('unknown.key')
  })
})
