/**
 * Decimal-string helpers for money/quantity inputs.
 * Values never pass through JavaScript floating point: they stay strings end to end
 * and are only formatted for display. The backend remains the authority for calculations.
 */

/** Strip everything but digits and one dot, trim fraction to `scale`, drop redundant leading zeros. */
export const sanitizeDecimalInput = (raw: string, scale: number): string => {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const firstDot = cleaned.indexOf('.')
  const hasDot = firstDot !== -1 && scale > 0
  const integerRaw = firstDot === -1 ? cleaned : cleaned.slice(0, firstDot)
  const integerPart = integerRaw.replace(/^0+(?=\d)/, '')
  if (!hasDot) return integerPart
  const fraction = cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, scale)
  return `${integerPart === '' ? '0' : integerPart}.${fraction}`
}

/** True for non-negative decimal strings with at most `scale` fraction digits. */
export const isDecimalString = (value: string, scale: number): boolean => {
  if (!/^\d+(\.\d+)?$/.test(value)) return false
  const fraction = value.split('.')[1] ?? ''
  return fraction.length <= scale
}

/** Group the integer part with thousands separators. Pads the fraction to `scale` when given. */
export const formatDecimalString = (value: string, scale?: number, groupSeparator = ','): string => {
  if (!isDecimalString(value, scale ?? Number.MAX_SAFE_INTEGER)) return ''
  const [integerPart = '0', fraction = ''] = value.split('.')
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator)
  if (scale === undefined) return fraction ? `${grouped}.${fraction}` : grouped
  if (scale === 0) return grouped
  return `${grouped}.${fraction.padEnd(scale, '0')}`
}

/** Normalize to exactly `scale` fraction digits for submission to the API (e.g. '1500' -> '1500.0000'). */
export const toApiDecimal = (value: string, scale: number): string => {
  const sanitized = sanitizeDecimalInput(value, scale)
  if (sanitized === '') return scale > 0 ? `0.${'0'.repeat(scale)}` : '0'
  const [integerPart = '0', fraction = ''] = sanitized.split('.')
  return scale > 0 ? `${integerPart}.${fraction.padEnd(scale, '0')}` : integerPart
}

/**
 * Format money amount with comma thousands separators and without trailing .00 decimals.
 * Example: 1200000 -> "1,200,000"
 */
export const formatMoney = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === '') return '0'
  const cleaned = typeof val === 'string' ? val.replace(/,/g, '').trim() : val
  const num = typeof cleaned === 'string' ? Number(cleaned) : cleaned
  if (isNaN(num)) return '0'
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(num))
}

/**
 * Format user-typed string into a formatted currency string (digits only with comma group separators).
 * Example: "5000" -> "5,000", "" -> ""
 */
export const formatMoneyInput = (val: string | null | undefined): string => {
  if (!val) return ''
  const digits = val.replace(/[^\d]/g, '')
  if (!digits) return ''
  const intVal = parseInt(digits, 10)
  if (isNaN(intVal)) return ''
  return new Intl.NumberFormat('en-US').format(intVal)
}


