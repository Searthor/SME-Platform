import { Prisma, PromotionRewardType, PromotionType } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { isPromotionApplicable, localDayAndTime, type PromotionRule } from './promotion-engine'

const d = (value: string) => new Prisma.Decimal(value)

const promotion = (overrides: Partial<PromotionRule>): PromotionRule => ({
  id: 'promo-1',
  name: 'Promo',
  code: 'PROMO',
  type: PromotionType.DISCOUNT,
  startTime: null,
  endTime: null,
  daysOfWeek: null,
  branchScope: null,
  customerGroupScope: null,
  minQuantity: d('1'),
  minAmount: d('0'),
  rewardType: PromotionRewardType.DISCOUNT_PERCENT,
  discountValue: d('10'),
  rewardQuantity: d('1'),
  rewardDiscountPercent: d('100'),
  rewardVariantId: null,
  maxDiscountCap: null,
  items: [],
  ...overrides,
})

// Wednesday 2026-10-21 10:30 in Asia/Vientiane (UTC+7)
const context = { branchId: 'branch-a', customerGroupId: null, at: new Date('2026-10-21T03:30:00Z'), timeZone: 'Asia/Vientiane' }

describe('isPromotionApplicable', () => {
  it('does not give a customer-group promotion to walk-in customers', () => {
    const vipOnly = promotion({ customerGroupScope: 'vip' })
    expect(isPromotionApplicable(vipOnly, context)).toBe(false)
    expect(isPromotionApplicable(vipOnly, { ...context, customerGroupId: 'vip' })).toBe(true)
  })

  it('limits a branch-scoped promotion to that branch', () => {
    expect(isPromotionApplicable(promotion({ branchScope: 'branch-b' }), context)).toBe(false)
    expect(isPromotionApplicable(promotion({ branchScope: 'branch-a' }), context)).toBe(true)
  })

  it('checks weekday and happy hour in the business timezone, not the server timezone', () => {
    expect(localDayAndTime(context.at, context.timeZone)).toEqual({ dayOfWeek: '3', time: '10:30' })
    expect(isPromotionApplicable(promotion({ daysOfWeek: '3' }), context)).toBe(true)
    expect(isPromotionApplicable(promotion({ daysOfWeek: '0,6' }), context)).toBe(false)
    expect(isPromotionApplicable(promotion({ startTime: '10:00', endTime: '11:00' }), context)).toBe(true)
    expect(isPromotionApplicable(promotion({ startTime: '14:00', endTime: '16:00' }), context)).toBe(false)
  })
})
