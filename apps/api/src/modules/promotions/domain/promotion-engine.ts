import { type Prisma, PromotionRewardType, PromotionType, type Promotion, type PromotionItem } from '@prisma/client'
import { ZERO } from '../../../common/money/money'

export type PromotionRule = Pick<
  Promotion,
  | 'id'
  | 'name'
  | 'code'
  | 'type'
  | 'startTime'
  | 'endTime'
  | 'daysOfWeek'
  | 'branchScope'
  | 'customerGroupScope'
  | 'minQuantity'
  | 'minAmount'
  | 'rewardType'
  | 'discountValue'
  | 'rewardQuantity'
  | 'rewardDiscountPercent'
  | 'rewardVariantId'
  | 'maxDiscountCap'
> & { items: Array<Pick<PromotionItem, 'productId' | 'variantId' | 'unitId' | 'categoryId'>> }

export type PromotionContext = {
  branchId: string
  customerGroupId: string | null
  at: Date
  /** Business IANA timezone; day-of-week and happy-hour windows are local business time. */
  timeZone: string
}

/** A cart line priced by the server; promotions never see client-supplied prices. */
export type PromotionLine = {
  variantId: string
  productId: string
  unitId: string
  categoryId: string | null
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal
}

export type AppliedPromotion = {
  id: string
  name: string
  code: string
  type: PromotionType
  discountAmount: Prisma.Decimal
  description: string
}

export type PromotionOutcome = {
  applied: AppliedPromotion[]
  /** variantId -> discount on that line (unrounded) */
  lineDiscounts: Map<string, Prisma.Decimal>
  billDiscount: Prisma.Decimal
  freeGifts: Array<{ promotionId: string; promotionName: string; variantId: string; quantity: Prisma.Decimal }>
}

const WEEKDAY_INDEX: Readonly<Record<string, string>> = { Sun: '0', Mon: '1', Tue: '2', Wed: '3', Thu: '4', Fri: '5', Sat: '6' }

export const localDayAndTime = (at: Date, timeZone: string): { dayOfWeek: string; time: string } => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? ''
  return { dayOfWeek: WEEKDAY_INDEX[part('weekday')] ?? '', time: `${part('hour')}:${part('minute')}` }
}

/** Scope, weekday and time-window checks; date range and `active` are filtered by the query. */
export const isPromotionApplicable = (promo: PromotionRule, context: PromotionContext): boolean => {
  // A scoped promotion applies only to that branch / customer group, never to everyone else
  if (promo.branchScope && promo.branchScope !== context.branchId) return false
  if (promo.customerGroupScope && promo.customerGroupScope !== context.customerGroupId) return false

  const { dayOfWeek, time } = localDayAndTime(context.at, context.timeZone)
  if (promo.daysOfWeek) {
    const allowedDays = promo.daysOfWeek.split(',').map(day => day.trim())
    if (!allowedDays.includes(dayOfWeek)) return false
  }
  if (promo.startTime && promo.endTime) {
    if (time < promo.startTime || time > promo.endTime) return false
  }
  return true
}

const itemMatchesTargets = (line: PromotionLine, targets: PromotionRule['items']): boolean => {
  if (targets.length === 0) return true // no targets: applies to every product
  return targets.some(target => {
    if (target.unitId && target.unitId !== line.unitId) return false
    if (target.variantId && target.variantId === line.variantId) return true
    if (target.productId && target.productId === line.productId) return true
    if (target.categoryId && line.categoryId && target.categoryId === line.categoryId) return true
    return false
  })
}

const groupDigits = (amount: Prisma.Decimal) => amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const capped = (discount: Prisma.Decimal, cap: Prisma.Decimal | null) => (cap && discount.gt(cap) ? cap : discount)

/** Applies every given promotion to the server-priced lines. Rounding and clamping happen in the caller. */
export const evaluatePromotions = (promos: readonly PromotionRule[], lines: readonly PromotionLine[]): PromotionOutcome => {
  const applied: AppliedPromotion[] = []
  const lineDiscounts = new Map<string, Prisma.Decimal>()
  const freeGifts: PromotionOutcome['freeGifts'] = []
  let billDiscount = ZERO

  const addLineDiscount = (variantId: string, amount: Prisma.Decimal) =>
    lineDiscounts.set(variantId, (lineDiscounts.get(variantId) ?? ZERO).add(amount))
  const record = (promo: PromotionRule, discountAmount: Prisma.Decimal, description: string) =>
    applied.push({ id: promo.id, name: promo.name, code: promo.code, type: promo.type, discountAmount, description })

  const subtotal = lines.reduce((sum, line) => sum.add(line.unitPrice.mul(line.quantity)), ZERO)

  for (const promo of promos) {
    if (promo.type === PromotionType.BILL_TOTAL) {
      if (subtotal.lt(promo.minAmount)) continue
      let discount = ZERO
      if (promo.rewardType === PromotionRewardType.DISCOUNT_PERCENT) {
        discount = subtotal.mul(promo.discountValue).div(100)
      } else if (promo.rewardType === PromotionRewardType.DISCOUNT_AMOUNT) {
        discount = promo.discountValue
      }
      discount = capped(discount, promo.maxDiscountCap)
      if (discount.gt(0)) {
        billDiscount = billDiscount.add(discount)
        record(promo, discount, `ຊື້ຄົບ ${groupDigits(promo.minAmount)} ₭ ຫຼຸດ ${groupDigits(discount)} ₭`)
      }
    } else if (promo.type === PromotionType.BUY_X_GET_Y) {
      // Buy X get Y of the same line free / discounted
      for (const line of lines) {
        if (!itemMatchesTargets(line, promo.items) || line.quantity.lt(promo.minQuantity)) continue
        const sets = line.quantity.div(promo.minQuantity).floor()
        const freeQuantity = sets.mul(promo.rewardQuantity)
        const discount = line.unitPrice.mul(freeQuantity).mul(promo.rewardDiscountPercent).div(100)
        if (discount.gt(0)) {
          addLineDiscount(line.variantId, discount)
          record(promo, discount, `ຊື້ ${promo.minQuantity.toString()} ແຖມ ${freeQuantity.toString()}`)
        }
      }
    } else if (promo.type === PromotionType.BUNDLE_CROSS) {
      // Buy item A, receive item B as a gift
      let triggerCount = ZERO
      for (const line of lines) {
        if (itemMatchesTargets(line, promo.items) && line.quantity.gte(promo.minQuantity)) {
          triggerCount = triggerCount.add(line.quantity.div(promo.minQuantity).floor())
        }
      }
      if (triggerCount.gt(0) && promo.rewardVariantId) {
        const quantity = triggerCount.mul(promo.rewardQuantity)
        freeGifts.push({ promotionId: promo.id, promotionName: promo.name, variantId: promo.rewardVariantId, quantity })
        record(promo, ZERO, `ແຖມຟຣີ ${quantity.toString()} ລາຍການ`)
      }
    } else if (promo.type === PromotionType.DISCOUNT) {
      for (const line of lines) {
        if (!itemMatchesTargets(line, promo.items) || line.quantity.lt(promo.minQuantity)) continue
        let discount = ZERO
        if (promo.rewardType === PromotionRewardType.DISCOUNT_PERCENT) {
          discount = line.unitPrice.mul(line.quantity).mul(promo.discountValue).div(100)
        } else if (promo.rewardType === PromotionRewardType.DISCOUNT_AMOUNT) {
          discount = promo.discountValue.mul(line.quantity)
        } else if (promo.rewardType === PromotionRewardType.SPECIAL_PRICE && line.unitPrice.gt(promo.discountValue)) {
          discount = line.unitPrice.sub(promo.discountValue).mul(line.quantity)
        }
        discount = capped(discount, promo.maxDiscountCap)
        if (discount.gt(0)) {
          addLineDiscount(line.variantId, discount)
          record(promo, discount, `ສ່ວນຫຼຸດສິນຄ້າ: ${groupDigits(discount)} ₭`)
        }
      }
    }
  }

  return { applied, lineDiscounts, billDiscount, freeGifts }
}
