import { Prisma } from '@prisma/client'

/**
 * Central money rounding policy (MON-004): amounts are rounded half-up to the currency's minor
 * unit scale. Unit prices, line discounts and bill discounts are each rounded before totals are
 * summed, so a document's totals always equal the sum of its stored parts.
 */
const CURRENCY_SCALE: Readonly<Record<string, number>> = {
  LAK: 0,
  VND: 0,
  KRW: 0,
  JPY: 0,
}

const DEFAULT_SCALE = 2

export const currencyScale = (currencyCode: string): number => CURRENCY_SCALE[currencyCode] ?? DEFAULT_SCALE

export const roundMoney = (amount: Prisma.Decimal, currencyCode: string): Prisma.Decimal =>
  amount.toDecimalPlaces(currencyScale(currencyCode), Prisma.Decimal.ROUND_HALF_UP)

export const ZERO = new Prisma.Decimal(0)

export const minDecimal = (a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal => (a.lte(b) ? a : b)
