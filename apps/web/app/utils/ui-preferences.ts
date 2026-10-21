export const UI_PREFERENCES_STORAGE_KEY = 'sme-flow:ui-preferences:v1'
export const UI_PREFERENCES_COOKIE_KEY = 'sme_ui_preferences'

export const uiSizes = [
  { value: 'compact', label: 'ກະທັດຮັດ', rootFontSize: '15px' },
  { value: 'default', label: 'ປົກກະຕິ', rootFontSize: '16px' },
  { value: 'comfortable', label: 'ຂະໜາດໃຫຍ່', rootFontSize: '17px' },
] as const

export const uiThemes = [
  { value: 'blue', label: 'ສີຟ້າ', swatch: '#2563eb', brand100: '#dbeafe', brand500: '#3b82f6', brand600: '#2563eb', brand700: '#1d4ed8' },
  { value: 'emerald', label: 'ສີຂຽວ', swatch: '#0b9470', brand100: '#dff5eb', brand500: '#0b9470', brand600: '#087c5e', brand700: '#09634e' },
  { value: 'violet', label: 'ສີມ່ວງ', swatch: '#7c3aed', brand100: '#ede9fe', brand500: '#8b5cf6', brand600: '#7c3aed', brand700: '#6d28d9' },
  { value: 'amber', label: 'ສີສົ້ມ', swatch: '#d97706', brand100: '#fef3c7', brand500: '#f59e0b', brand600: '#d97706', brand700: '#b45309' },
  { value: 'rose', label: 'ສີບົວ', swatch: '#e11d48', brand100: '#ffe4e6', brand500: '#f43f5e', brand600: '#e11d48', brand700: '#be123c' },
  { value: 'indigo', label: 'ສີຄາມ', swatch: '#5b4cf5', brand100: '#ecebff', brand500: '#7568ff', brand600: '#5b4cf5', brand700: '#4a3bd9' },
] as const

export type UiSize = typeof uiSizes[number]['value']
export type UiTheme = typeof uiThemes[number]['value']

export type UiPreferences = {
  size: UiSize
  theme: UiTheme
}

export const defaultUiPreferences: UiPreferences = {
  size: 'default',
  theme: 'indigo',
}

export const isUiSize = (value: unknown): value is UiSize => uiSizes.some(option => option.value === value)
export const isUiTheme = (value: unknown): value is UiTheme => uiThemes.some(option => option.value === value)

export const normalizeUiPreferences = (value: unknown): UiPreferences => {
  if (!value || typeof value !== 'object') return { ...defaultUiPreferences }

  const candidate = value as Partial<Record<keyof UiPreferences, unknown>>
  return {
    size: isUiSize(candidate.size) ? candidate.size : defaultUiPreferences.size,
    theme: isUiTheme(candidate.theme) ? candidate.theme : defaultUiPreferences.theme,
  }
}

export const getUiThemeConfig = (themeValue: UiTheme) => {
  return uiThemes.find(option => option.value === themeValue) ?? uiThemes[uiThemes.length - 1]!
}

export const getUiSizeConfig = (sizeValue: UiSize) => {
  return uiSizes.find(option => option.value === sizeValue) ?? uiSizes[1]
}

export const buildUiStyleString = (preferences: UiPreferences): string => {
  const size = getUiSizeConfig(preferences.size)
  const theme = getUiThemeConfig(preferences.theme)

  return `--ui-root-font-size: ${size.rootFontSize}; --color-brand-100: ${theme.brand100}; --color-brand-500: ${theme.brand500}; --color-brand-600: ${theme.brand600}; --color-brand-700: ${theme.brand700};`
}

export const applyUiPreferences = (root: HTMLElement, preferences: UiPreferences): void => {
  const size = getUiSizeConfig(preferences.size)
  const theme = getUiThemeConfig(preferences.theme)

  root.dataset.uiSize = size.value
  root.dataset.uiTheme = theme.value
  root.style.setProperty('--ui-root-font-size', size.rootFontSize)
  root.style.setProperty('--color-brand-100', theme.brand100)
  root.style.setProperty('--color-brand-500', theme.brand500)
  root.style.setProperty('--color-brand-600', theme.brand600)
  root.style.setProperty('--color-brand-700', theme.brand700)
}
