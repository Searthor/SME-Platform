import { describe, expect, it } from 'vitest'
import {
  formatDecimalString,
  isDecimalString,
  sanitizeDecimalInput,
  toApiDecimal,
} from '~/utils/money'

describe('money & decimal utilities', () => {
  describe('sanitizeDecimalInput', () => {
    it('strips non-numeric characters and extra dots', () => {
      expect(sanitizeDecimalInput('abc12.34xyz', 2)).toBe('12.34')
      expect(sanitizeDecimalInput('12.3.4.5', 2)).toBe('12.34')
      expect(sanitizeDecimalInput('$1,500.50', 2)).toBe('1500.50')
    })

    it('limits fractions to scale', () => {
      expect(sanitizeDecimalInput('10.12345', 2)).toBe('10.12')
      expect(sanitizeDecimalInput('10.12345', 0)).toBe('10')
      expect(sanitizeDecimalInput('10.123456', 4)).toBe('10.1234')
    })

    it('strips redundant leading zeros', () => {
      expect(sanitizeDecimalInput('00012.5', 2)).toBe('12.5')
      expect(sanitizeDecimalInput('0.5', 2)).toBe('0.5')
      expect(sanitizeDecimalInput('.5', 2)).toBe('0.5')
    })
  })

  describe('isDecimalString', () => {
    it('validates decimal strings', () => {
      expect(isDecimalString('12500', 2)).toBe(true)
      expect(isDecimalString('12500.50', 2)).toBe(true)
      expect(isDecimalString('12500.555', 2)).toBe(false)
      expect(isDecimalString('-10', 2)).toBe(false)
      expect(isDecimalString('abc', 2)).toBe(false)
    })
  })

  describe('formatDecimalString', () => {
    it('formats numbers with thousands separators and optional padding', () => {
      expect(formatDecimalString('1250000')).toBe('1,250,000')
      expect(formatDecimalString('1250000.5')).toBe('1,250,000.5')
      expect(formatDecimalString('1250000.5', 2)).toBe('1,250,000.50')
      expect(formatDecimalString('1250000', 0)).toBe('1,250,000')
    })
  })

  describe('toApiDecimal', () => {
    it('pads fractions to exact scale for API consumption', () => {
      expect(toApiDecimal('1500', 2)).toBe('1500.00')
      expect(toApiDecimal('1500.5', 4)).toBe('1500.5000')
      expect(toApiDecimal('', 2)).toBe('0.00')
      expect(toApiDecimal('', 0)).toBe('0')
    })
  })
})
