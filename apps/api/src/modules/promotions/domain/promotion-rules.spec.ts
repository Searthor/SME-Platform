import { Prisma, PromotionRewardType, PromotionType } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { assertValidPromotionRule } from './promotion-rules'

const d = (value: string) => new Prisma.Decimal(value)

const rule = (overrides: Partial<Parameters<typeof assertValidPromotionRule>[0]> = {}): Parameters<typeof assertValidPromotionRule>[0] => ({
  id: 'p', name: 'Promo', code: 'P', type: PromotionType.DISCOUNT,
  startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
  startTime: null, endTime: null, daysOfWeek: null, branchScope: null, customerGroupScope: null,
  minQuantity: d('1'), minAmount: d('0'), rewardType: PromotionRewardType.DISCOUNT_PERCENT,
  discountValue: d('10'), rewardQuantity: d('1'), rewardDiscountPercent: d('100'),
  rewardVariantId: null, maxDiscountCap: null, items: [],
  ...overrides,
})

const message = (overrides: Parameters<typeof rule>[0]) => {
  try {
    assertValidPromotionRule(rule(overrides))
    return 'valid'
  } catch (error) {
    return (error as Error).message
  }
}

describe('assertValidPromotionRule', () => {
  it('accepts a well-formed promotion', () => {
    expect(message({})).toBe('valid')
    expect(message({ startTime: '10:00', endTime: '14:00', daysOfWeek: '1,2,3' })).toBe('valid')
  })

  it.each([
    ['end before start', { endDate: new Date('2025-12-31') }, 'end date'],
    ['zero minimum quantity (division by zero)', { minQuantity: d('0') }, 'minimum quantity'],
    ['percent above 100', { discountValue: d('150') }, 'cannot exceed 100'],
    ['zero discount', { discountValue: d('0') }, 'greater than zero'],
    ['half a time window', { startTime: '10:00' }, 'both start and end'],
    ['invalid weekday', { daysOfWeek: '1,7' }, 'days of week'],
    ['bundle without reward', { type: PromotionType.BUNDLE_CROSS }, 'reward product'],
    ['bill total special price', { type: PromotionType.BILL_TOTAL, rewardType: PromotionRewardType.SPECIAL_PRICE }, 'bill-total'],
  ])('rejects %s', (_label, overrides, expected) => {
    expect(message(overrides)).toContain(expected)
  })
})
