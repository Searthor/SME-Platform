import { PromotionRewardType, PromotionType } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import type { PromotionRule } from './promotion-engine'

type StoredRule = PromotionRule & { startDate: Date; endDate: Date }

const invalid = (message: string) => errors.badRequest(`Invalid promotion: ${message}`)

/** Rules a promotion must satisfy to be priced safely by the engine; checked on the stored result of create/update. */
export const assertValidPromotionRule = (rule: StoredRule): void => {
  if (rule.endDate < rule.startDate) throw invalid('end date is before start date')
  if (Boolean(rule.startTime) !== Boolean(rule.endTime)) throw invalid('set both start and end time, or neither')
  if (rule.startTime && rule.endTime && rule.startTime > rule.endTime) throw invalid('start time is after end time')
  if (rule.daysOfWeek && !rule.daysOfWeek.split(',').every(day => /^[0-6]$/.test(day.trim()))) {
    throw invalid('days of week must be numbers 0 (Sunday) to 6 (Saturday)')
  }
  if (!rule.minQuantity.gt(0)) throw invalid('minimum quantity must be greater than zero')

  const isPercent = rule.rewardType === PromotionRewardType.DISCOUNT_PERCENT
  if (rule.type === PromotionType.DISCOUNT || rule.type === PromotionType.BILL_TOTAL) {
    if (rule.type === PromotionType.BILL_TOTAL && rule.rewardType !== PromotionRewardType.DISCOUNT_PERCENT && rule.rewardType !== PromotionRewardType.DISCOUNT_AMOUNT) {
      throw invalid('a bill-total promotion gives a percent or amount discount')
    }
    if (!rule.discountValue.gt(0)) throw invalid('discount value must be greater than zero')
    if (isPercent && rule.discountValue.gt(100)) throw invalid('percent discount cannot exceed 100')
  }
  if (rule.type === PromotionType.BUY_X_GET_Y && !rule.rewardQuantity.gt(0)) throw invalid('reward quantity must be greater than zero')
  if (rule.type === PromotionType.BUNDLE_CROSS) {
    if (!rule.rewardVariantId) throw invalid('a bundle promotion needs a reward product')
    if (!rule.rewardQuantity.gt(0)) throw invalid('reward quantity must be greater than zero')
  }
  if (rule.maxDiscountCap && rule.maxDiscountCap.isNegative()) throw invalid('discount cap cannot be negative')
}
