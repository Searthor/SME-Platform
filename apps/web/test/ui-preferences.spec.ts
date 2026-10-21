import {
  buildUiStyleString,
  defaultUiPreferences,
  getUiSizeConfig,
  getUiThemeConfig,
  normalizeUiPreferences,
  UI_PREFERENCES_COOKIE_KEY,
  UI_PREFERENCES_STORAGE_KEY,
  uiSizes,
  uiThemes,
} from '~/utils/ui-preferences'

describe('UI preferences', () => {
  it('provides three sizes and the requested five theme colors', () => {
    expect(uiSizes).toHaveLength(3)
    expect(uiThemes.map(theme => theme.value)).toEqual(['blue', 'emerald', 'violet', 'amber', 'rose', 'indigo'])
    expect(defaultUiPreferences.theme).toBe('indigo')
    expect(UI_PREFERENCES_COOKIE_KEY).toBe('sme_ui_preferences')
    expect(UI_PREFERENCES_STORAGE_KEY).toBe('sme-flow:ui-preferences:v1')
  })

  it('accepts supported persisted preferences', () => {
    expect(normalizeUiPreferences({ size: 'comfortable', theme: 'violet' })).toEqual({
      size: 'comfortable',
      theme: 'violet',
    })
  })

  it('falls back safely when local storage contains unsupported values', () => {
    expect(normalizeUiPreferences({ size: 'huge', theme: '<script>' })).toEqual(defaultUiPreferences)
    expect(normalizeUiPreferences(null)).toEqual(defaultUiPreferences)
  })

  it('correctly resolves theme and size config', () => {
    expect(getUiThemeConfig('violet').brand700).toBe('#6d28d9')
    expect(getUiSizeConfig('compact').rootFontSize).toBe('15px')
  })

  it('builds CSS style string for immediate SSR and anti-flash injection', () => {
    const styleString = buildUiStyleString({ size: 'default', theme: 'violet' })
    expect(styleString).toContain('--ui-root-font-size: 16px;')
    expect(styleString).toContain('--color-brand-700: #6d28d9;')
    expect(styleString).toContain('--color-brand-100: #ede9fe;')
  })
})
