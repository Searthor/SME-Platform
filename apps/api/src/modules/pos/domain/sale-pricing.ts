import { PaymentMethod, Prisma, SalePaymentStatus } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { minDecimal, roundMoney, ZERO } from '../../../common/money/money'
import { evaluatePromotions, type PromotionRule } from '../../promotions/domain/promotion-engine'

/**
 * Server-side sale pricing (MON-003): the client sends only variant + quantity (+ an optional
 * manual discount request); unit price, promotions, discounts and totals are all resolved here.
 * Tax is 0 until the tax/rounding ADR is decided.
 */

export type PricingVariant = {
  variantId: string
  productId: string
  productName: string
  variantName: string | null
  sku: string | null
  unitId: string
  unitName: string
  categoryId: string | null
  sellingPrice: Prisma.Decimal
  cost: Prisma.Decimal
  trackStock: boolean
  groupPrices: Array<{ customerGroupId: string; price: Prisma.Decimal }>
}

export type PricingGroup = { id: string; discountPercent: Prisma.Decimal }

export type ManualDiscountInput = { type: 'AMOUNT' | 'PERCENT'; value: Prisma.Decimal }

export type QuoteLine = {
  variantId: string
  productId: string
  productName: string
  variantName: string | null
  sku: string | null
  unitName: string
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal
  unitCost: Prisma.Decimal
  subtotal: Prisma.Decimal
  discountAmount: Prisma.Decimal
  totalAmount: Prisma.Decimal
  trackStock: boolean
  isPromoGift: boolean
  promotionId: string | null
}

export type QuotePromotion = { id: string; name: string; code: string; type: string; discountAmount: Prisma.Decimal; description: string }

export type SaleQuote = {
  currencyCode: string
  lines: QuoteLine[]
  /** Gross amount of all lines before any discount. */
  subtotal: Prisma.Decimal
  lineDiscountTotal: Prisma.Decimal
  billPromotionDiscount: Prisma.Decimal
  manualDiscount: Prisma.Decimal
  /** All discounts: line promotions + bill promotions + manual. */
  discountAmount: Prisma.Decimal
  taxAmount: Prisma.Decimal
  grandTotal: Prisma.Decimal
  appliedPromotions: QuotePromotion[]
  promotionId: string | null
}

const ONE = new Prisma.Decimal(1)
const HUNDRED = new Prisma.Decimal(100)

/** Customer/price-group fixed price, else group percentage discount, else the variant's selling price. */
export const resolveUnitPrice = (variant: PricingVariant, group: PricingGroup | null, currencyCode: string): Prisma.Decimal => {
  if (group) {
    const fixed = variant.groupPrices.find(price => price.customerGroupId === group.id)
    if (fixed && fixed.price.gt(0)) return roundMoney(fixed.price, currencyCode)
    if (group.discountPercent.gt(0)) {
      return roundMoney(variant.sellingPrice.mul(ONE.sub(group.discountPercent.div(HUNDRED))), currencyCode)
    }
  }
  return roundMoney(variant.sellingPrice, currencyCode)
}

const resolveManualDiscount = (
  request: ManualDiscountInput | undefined,
  remaining: Prisma.Decimal,
  currencyCode: string,
): Prisma.Decimal => {
  if (!request || request.value.isZero()) return ZERO
  if (request.value.isNegative()) throw errors.invalidDiscount('Discount cannot be negative')

  if (request.type === 'PERCENT') {
    if (request.value.gt(HUNDRED)) throw errors.invalidDiscount('Discount percent cannot exceed 100')
    return roundMoney(remaining.mul(request.value).div(HUNDRED), currencyCode)
  }

  const amount = roundMoney(request.value, currencyCode)
  if (amount.gt(remaining)) throw errors.invalidDiscount(`Discount ${amount.toString()} exceeds the amount due ${remaining.toString()}`)
  return amount
}

export const calculateSaleQuote = (input: {
  currencyCode: string
  items: ReadonlyArray<{ variant: PricingVariant; quantity: Prisma.Decimal }>
  /** Variants that promotions may hand out as gifts. */
  giftVariants: ReadonlyMap<string, PricingVariant>
  group: PricingGroup | null
  promotions: readonly PromotionRule[]
  manualDiscount?: ManualDiscountInput
}): SaleQuote => {
  const { currencyCode } = input
  if (input.items.length === 0) throw errors.invalidSaleItems()

  const priced = input.items.map(({ variant, quantity }) => {
    if (quantity.lte(0)) throw errors.invalidSaleItems('Item quantity must be greater than zero')
    const unitPrice = resolveUnitPrice(variant, input.group, currencyCode)
    return { variant, quantity, unitPrice, subtotal: roundMoney(unitPrice.mul(quantity), currencyCode) }
  })

  const outcome = evaluatePromotions(
    input.promotions,
    priced.map(line => ({
      variantId: line.variant.variantId,
      productId: line.variant.productId,
      unitId: line.variant.unitId,
      categoryId: line.variant.categoryId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    })),
  )

  const lines: QuoteLine[] = priced.map(line => {
    const promotionDiscount = roundMoney(outcome.lineDiscounts.get(line.variant.variantId) ?? ZERO, currencyCode)
    const discountAmount = minDecimal(promotionDiscount, line.subtotal)
    return {
      variantId: line.variant.variantId,
      productId: line.variant.productId,
      productName: line.variant.productName,
      variantName: line.variant.variantName,
      sku: line.variant.sku,
      unitName: line.variant.unitName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      unitCost: line.variant.cost,
      subtotal: line.subtotal,
      discountAmount,
      totalAmount: line.subtotal.sub(discountAmount),
      trackStock: line.variant.trackStock,
      isPromoGift: false,
      promotionId: null,
    }
  })

  const giftPromotionIds = new Set<string>()
  for (const gift of outcome.freeGifts) {
    const variant = input.giftVariants.get(gift.variantId)
    if (!variant) continue // reward variant archived or deleted: no gift
    giftPromotionIds.add(gift.promotionId)
    lines.push({
      variantId: variant.variantId,
      productId: variant.productId,
      productName: variant.productName,
      variantName: variant.variantName,
      sku: variant.sku,
      unitName: variant.unitName,
      quantity: gift.quantity,
      unitPrice: ZERO,
      unitCost: variant.cost,
      subtotal: ZERO,
      discountAmount: ZERO,
      totalAmount: ZERO,
      trackStock: variant.trackStock,
      isPromoGift: true,
      promotionId: gift.promotionId,
    })
  }

  const subtotal = lines.reduce((sum, line) => sum.add(line.subtotal), ZERO)
  const lineDiscountTotal = lines.reduce((sum, line) => sum.add(line.discountAmount), ZERO)
  const afterLineDiscounts = subtotal.sub(lineDiscountTotal)
  const billPromotionDiscount = minDecimal(roundMoney(outcome.billDiscount, currencyCode), afterLineDiscounts)
  const manualDiscount = resolveManualDiscount(input.manualDiscount, afterLineDiscounts.sub(billPromotionDiscount), currencyCode)
  const discountAmount = lineDiscountTotal.add(billPromotionDiscount).add(manualDiscount)

  const appliedPromotions = outcome.applied
    .filter(promo => promo.type !== 'BUNDLE_CROSS' || giftPromotionIds.has(promo.id))
    .map(promo => ({ ...promo, discountAmount: roundMoney(promo.discountAmount, currencyCode) }))

  return {
    currencyCode,
    lines,
    subtotal,
    lineDiscountTotal,
    billPromotionDiscount,
    manualDiscount,
    discountAmount,
    taxAmount: ZERO,
    grandTotal: subtotal.sub(discountAmount),
    appliedPromotions,
    promotionId: appliedPromotions[0]?.id ?? null,
  }
}

export type PaymentInput = { method: PaymentMethod; amount: string; tenderedAmount?: string; reference?: string }

export type PreparedPayment = {
  method: PaymentMethod
  amount: Prisma.Decimal
  tenderedAmount: Prisma.Decimal
  changeAmount: Prisma.Decimal
  reference: string | null
}

/** Validates tender against the server total (PAY-001, PAY-004); change is only given on cash. */
export const preparePayments = (grandTotal: Prisma.Decimal, inputs: readonly PaymentInput[], currencyCode: string) => {
  const payments: PreparedPayment[] = inputs.map(input => {
    const amount = new Prisma.Decimal(input.amount)
    if (amount.lte(0)) throw errors.invalidPaymentAmount('Payment amount must be greater than zero')
    if (!amount.eq(roundMoney(amount, currencyCode))) {
      throw errors.invalidPaymentAmount(`Payment amount ${amount.toString()} has more decimals than ${currencyCode} allows`)
    }

    if (input.method !== PaymentMethod.CASH) {
      return { method: input.method, amount, tenderedAmount: amount, changeAmount: ZERO, reference: input.reference?.trim() || null }
    }
    const tenderedAmount = input.tenderedAmount ? new Prisma.Decimal(input.tenderedAmount) : amount
    if (tenderedAmount.lt(amount)) throw errors.invalidPaymentAmount('Cash tendered is less than the payment amount')
    return { method: input.method, amount, tenderedAmount, changeAmount: tenderedAmount.sub(amount), reference: input.reference?.trim() || null }
  })

  // No tender given: the full amount is paid in cash (nothing to record for a zero total)
  if (payments.length === 0 && grandTotal.gt(0)) {
    payments.push({ method: PaymentMethod.CASH, amount: grandTotal, tenderedAmount: grandTotal, changeAmount: ZERO, reference: null })
  }

  const totalPaid = payments.reduce((sum, payment) => sum.add(payment.amount), ZERO)
  if (totalPaid.gt(grandTotal)) {
    throw errors.invalidPaymentAmount(
      `Payments ${totalPaid.toString()} exceed the sale total ${grandTotal.toString()}; record cash change with tenderedAmount`,
    )
  }

  const paymentStatus = totalPaid.gte(grandTotal)
    ? SalePaymentStatus.PAID
    : totalPaid.isZero()
      ? SalePaymentStatus.UNPAID
      : SalePaymentStatus.PARTIALLY_PAID

  return {
    payments,
    totalPaid,
    changeAmount: payments.reduce((sum, payment) => sum.add(payment.changeAmount), ZERO),
    paymentStatus,
  }
}
