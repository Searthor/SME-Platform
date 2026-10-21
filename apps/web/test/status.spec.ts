import { describe, expect, it } from 'vitest'
import { statusTone, toneClasses } from '~/utils/status'

describe('status utilities', () => {
  it('maps known statuses to tones correctly', () => {
    expect(statusTone('ACTIVE')).toBe('success')
    expect(statusTone('PAID')).toBe('success')
    expect(statusTone('PENDING')).toBe('warning')
    expect(statusTone('DRAFT')).toBe('warning')
    expect(statusTone('SUSPENDED')).toBe('danger')
    expect(statusTone('FAILED')).toBe('danger')
    expect(statusTone('IN_TRANSIT')).toBe('info')
    expect(statusTone('INACTIVE')).toBe('neutral')
    expect(statusTone('ARCHIVED')).toBe('neutral')
    expect(statusTone('UNKNOWN_STATUS')).toBe('neutral')
  })

  it('provides badge and dot classes for every tone', () => {
    const tones = ['success', 'warning', 'danger', 'info', 'neutral'] as const
    for (const tone of tones) {
      expect(toneClasses[tone]).toBeDefined()
      expect(toneClasses[tone].badge).toContain('bg-')
      expect(toneClasses[tone].dot).toContain('bg-')
    }
  })
})
