import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { describe, expect, it } from 'vitest'
import { CreateSaleDto } from './pos.dto'

// Same options as the global ValidationPipe in main.ts
const violations = (body: object) =>
  JSON.stringify(validateSync(plainToInstance(CreateSaleDto, body), { whitelist: true, forbidNonWhitelisted: true }).map(error => error.children?.length ? error.children : error.constraints))

const id = '0199f000-0000-7000-8000-000000000000'

describe('CreateSaleDto accepts intent only (MON-003)', () => {
  it('accepts variant and quantity', () => {
    expect(violations({ branchId: id, items: [{ variantId: id, quantity: '2' }] })).toBe('[]')
  })

  it.each([
    ['item unit price', { items: [{ variantId: id, quantity: '1', unitPrice: '1' }] }, 'unitPrice'],
    ['item discount', { items: [{ variantId: id, quantity: '1', discountAmount: '500' }] }, 'discountAmount'],
    ['client gift line', { items: [{ variantId: id, quantity: '1', isPromoGift: true }] }, 'isPromoGift'],
    ['bill discount amount', { discountAmount: '5000', items: [{ variantId: id, quantity: '1' }] }, 'discountAmount'],
    ['promotion id', { promotionId: id, items: [{ variantId: id, quantity: '1' }] }, 'promotionId'],
  ])('rejects a client-supplied %s', (_label, body, property) => {
    expect(violations({ branchId: id, ...body })).toContain(`property ${property} should not exist`)
  })
})
