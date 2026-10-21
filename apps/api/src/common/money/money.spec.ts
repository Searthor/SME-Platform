import { Prisma } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { currencyScale, roundMoney } from './money'

describe('money rounding policy (MON-001, MON-004)', () => {
  it('rounds LAK to whole kip, half-up', () => {
    expect(currencyScale('LAK')).toBe(0)
    expect(roundMoney(new Prisma.Decimal('1234.5'), 'LAK').toString()).toBe('1235')
    expect(roundMoney(new Prisma.Decimal('1234.4999'), 'LAK').toString()).toBe('1234')
  })

  it('rounds two-decimal currencies to cents', () => {
    expect(roundMoney(new Prisma.Decimal('10.005'), 'USD').toString()).toBe('10.01')
    expect(roundMoney(new Prisma.Decimal('10.004'), 'THB').toString()).toBe('10')
  })
})
