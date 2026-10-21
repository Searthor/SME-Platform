import { PaymentMethod, Prisma, PromotionRewardType, PromotionType } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import type { PromotionRule } from '../../promotions/domain/promotion-engine'
import { calculateSaleQuote, preparePayments, resolveUnitPrice, type PricingVariant } from './sale-pricing'

const d = (value: string) => new Prisma.Decimal(value)

const errorCode = (fn: () => unknown): string | undefined => {
  try {
    fn()
  } catch (error) {
    return (error as { code?: string }).code
  }
  return undefined
}

const variant = (id: string, sellingPrice: string, overrides: Partial<PricingVariant> = {}): PricingVariant => ({
  variantId: id,
  productId: `product-${id}`,
  productName: `Product ${id}`,
  variantName: null,
  sku: null,
  unitId: 'unit-pcs',
  unitName: 'Piece',
  categoryId: 'category-drinks',
  sellingPrice: d(sellingPrice),
  cost: d('1000'),
  trackStock: true,
  groupPrices: [],
  ...overrides,
})

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
  discountValue: d('0'),
  rewardQuantity: d('1'),
  rewardDiscountPercent: d('100'),
  rewardVariantId: null,
  maxDiscountCap: null,
  items: [],
  ...overrides,
})

const quote = (input: Partial<Parameters<typeof calculateSaleQuote>[0]> & Pick<Parameters<typeof calculateSaleQuote>[0], 'items'>) =>
  calculateSaleQuote({ currencyCode: 'LAK', giftVariants: new Map(), group: null, promotions: [], ...input })

describe('resolveUnitPrice (MON-003)', () => {
  const coffee = variant('coffee', '25000', { groupPrices: [{ customerGroupId: 'vip', price: d('20000') }] })

  it('uses the selling price without a group', () => {
    expect(resolveUnitPrice(coffee, null, 'LAK').toString()).toBe('25000')
  })

  it('prefers the fixed group price', () => {
    expect(resolveUnitPrice(coffee, { id: 'vip', discountPercent: d('50') }, 'LAK').toString()).toBe('20000')
  })

  it('falls back to the group percentage, rounded to whole kip', () => {
    expect(resolveUnitPrice(variant('tea', '12345'), { id: 'member', discountPercent: d('10') }, 'LAK').toString()).toBe('11111')
  })
})

describe('calculateSaleQuote', () => {
  it('ignores nothing but server data: subtotal, discount and total come from catalog prices', () => {
    const result = quote({ items: [{ variant: variant('a', '20000'), quantity: d('2') }, { variant: variant('b', '5000'), quantity: d('1') }] })

    expect(result.subtotal.toString()).toBe('45000')
    expect(result.discountAmount.toString()).toBe('0')
    expect(result.taxAmount.toString()).toBe('0')
    expect(result.grandTotal.toString()).toBe('45000')
    expect(result.lines.map(line => line.unitCost.toString())).toEqual(['1000', '1000'])
  })

  it('applies a line percentage promotion and keeps totals equal to the sum of lines', () => {
    const result = quote({
      items: [{ variant: variant('a', '10000'), quantity: d('3') }],
      promotions: [promotion({ discountValue: d('15') })],
    })

    expect(result.lines[0]!.discountAmount.toString()).toBe('4500')
    expect(result.lines[0]!.totalAmount.toString()).toBe('25500')
    expect(result.grandTotal.toString()).toBe('25500')
    expect(result.promotionId).toBe('promo-1')
  })

  it('applies a special price only when it is lower than the line price', () => {
    const result = quote({
      items: [{ variant: variant('a', '10000'), quantity: d('2') }],
      promotions: [promotion({ rewardType: PromotionRewardType.SPECIAL_PRICE, discountValue: d('8000') })],
    })
    expect(result.lineDiscountTotal.toString()).toBe('4000')
  })

  it('gives buy-X-get-Y as a discount on the same line', () => {
    const result = quote({
      items: [{ variant: variant('a', '10000'), quantity: d('5') }],
      promotions: [promotion({ type: PromotionType.BUY_X_GET_Y, minQuantity: d('2'), rewardQuantity: d('1') })],
    })
    // 5 bought -> 2 complete sets -> 2 free
    expect(result.lineDiscountTotal.toString()).toBe('20000')
    expect(result.grandTotal.toString()).toBe('30000')
  })

  it('never discounts a line below zero when promotions stack', () => {
    const result = quote({
      items: [{ variant: variant('a', '10000'), quantity: d('1') }],
      promotions: [
        promotion({ id: 'p1', rewardType: PromotionRewardType.DISCOUNT_AMOUNT, discountValue: d('7000') }),
        promotion({ id: 'p2', rewardType: PromotionRewardType.DISCOUNT_AMOUNT, discountValue: d('7000') }),
      ],
    })
    expect(result.lines[0]!.discountAmount.toString()).toBe('10000')
    expect(result.grandTotal.toString()).toBe('0')
  })

  it('caps a bill-total promotion and only applies it above the minimum amount', () => {
    const billPromo = promotion({
      type: PromotionType.BILL_TOTAL,
      minAmount: d('100000'),
      discountValue: d('10'),
      maxDiscountCap: d('15000'),
    })

    expect(quote({ items: [{ variant: variant('a', '50000'), quantity: d('1') }], promotions: [billPromo] })
      .billPromotionDiscount.toString()).toBe('0')
    expect(quote({ items: [{ variant: variant('a', '50000'), quantity: d('4') }], promotions: [billPromo] })
      .billPromotionDiscount.toString()).toBe('15000')
  })

  it('adds bundle gifts as zero-priced lines with a cost snapshot, and skips unavailable gift variants', () => {
    const bundle = promotion({ type: PromotionType.BUNDLE_CROSS, minQuantity: d('2'), rewardQuantity: d('1'), rewardVariantId: 'cookie' })
    const cookie = variant('cookie', '8000', { cost: d('3000') })

    const withGift = quote({
      items: [{ variant: variant('coffee', '25000'), quantity: d('4') }],
      promotions: [bundle],
      giftVariants: new Map([['cookie', cookie]]),
    })
    const gift = withGift.lines.find(line => line.isPromoGift)
    expect(gift).toMatchObject({ variantId: 'cookie', promotionId: 'promo-1', trackStock: true })
    expect(gift?.quantity.toString()).toBe('2')
    expect(gift?.unitCost.toString()).toBe('3000')
    expect(gift?.totalAmount.toString()).toBe('0')
    expect(withGift.grandTotal.toString()).toBe('100000')

    const withoutGift = quote({ items: [{ variant: variant('coffee', '25000'), quantity: d('4') }], promotions: [bundle] })
    expect(withoutGift.lines.some(line => line.isPromoGift)).toBe(false)
    expect(withoutGift.appliedPromotions).toHaveLength(0)
  })

  it('applies a manual percentage discount after promotions', () => {
    const result = quote({
      items: [{ variant: variant('a', '10000'), quantity: d('2') }],
      promotions: [promotion({ rewardType: PromotionRewardType.DISCOUNT_AMOUNT, discountValue: d('1000') })],
      manualDiscount: { type: 'PERCENT', value: d('10') },
    })
    // 20000 - 2000 promo = 18000; 10% manual = 1800
    expect(result.manualDiscount.toString()).toBe('1800')
    expect(result.discountAmount.toString()).toBe('3800')
    expect(result.grandTotal.toString()).toBe('16200')
  })

  it('rejects manual discounts larger than the amount due, over 100% or negative', () => {
    const items = [{ variant: variant('a', '10000'), quantity: d('1') }]
    expect(errorCode(() => quote({ items, manualDiscount: { type: 'AMOUNT', value: d('10001') } }))).toBe('INVALID_DISCOUNT')
    expect(errorCode(() => quote({ items, manualDiscount: { type: 'PERCENT', value: d('101') } }))).toBe('INVALID_DISCOUNT')
    expect(errorCode(() => quote({ items, manualDiscount: { type: 'AMOUNT', value: d('-1') } }))).toBe('INVALID_DISCOUNT')
  })

  it('rejects empty carts and non-positive quantities (SAL-001)', () => {
    expect(errorCode(() => quote({ items: [] }))).toBe('INVALID_SALE_ITEMS')
    expect(errorCode(() => quote({ items: [{ variant: variant('a', '1000'), quantity: d('0') }] }))).toBe('INVALID_SALE_ITEMS')
  })
})

describe('preparePayments (PAY-001, PAY-004)', () => {
  it('defaults to full cash payment', () => {
    const result = preparePayments(d('45000'), [], 'LAK')
    expect(result.payments).toHaveLength(1)
    expect(result.totalPaid.toString()).toBe('45000')
    expect(result.paymentStatus).toBe('PAID')
  })

  it('records change only from cash tendered', () => {
    const result = preparePayments(d('45000'), [{ method: PaymentMethod.CASH, amount: '45000', tenderedAmount: '50000' }], 'LAK')
    expect(result.changeAmount.toString()).toBe('5000')
  })

  it('supports mixed tender and partial payment', () => {
    const result = preparePayments(d('45000'), [
      { method: PaymentMethod.CASH, amount: '20000' },
      { method: PaymentMethod.BANK_TRANSFER, amount: '10000', reference: ' TX-1 ' },
    ], 'LAK')
    expect(result.paymentStatus).toBe('PARTIALLY_PAID')
    expect(result.payments[1]!.reference).toBe('TX-1')
  })

  it('rejects overpayment, short cash tender, zero amounts and sub-kip amounts', () => {
    expect(errorCode(() => preparePayments(d('45000'), [{ method: PaymentMethod.BANK_TRANSFER, amount: '45001' }], 'LAK'))).toBe('INVALID_PAYMENT_AMOUNT')
    expect(errorCode(() => preparePayments(d('45000'), [{ method: PaymentMethod.CASH, amount: '45000', tenderedAmount: '40000' }], 'LAK'))).toBe('INVALID_PAYMENT_AMOUNT')
    expect(errorCode(() => preparePayments(d('45000'), [{ method: PaymentMethod.CASH, amount: '0' }], 'LAK'))).toBe('INVALID_PAYMENT_AMOUNT')
    expect(errorCode(() => preparePayments(d('45000'), [{ method: PaymentMethod.CASH, amount: '100.5' }], 'LAK'))).toBe('INVALID_PAYMENT_AMOUNT')
  })

  it('records no payment for a zero total', () => {
    const result = preparePayments(d('0'), [], 'LAK')
    expect(result.payments).toHaveLength(0)
    expect(result.paymentStatus).toBe('PAID')
  })
})
