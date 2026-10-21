import { describe, expect, it, vi } from 'vitest'
import { PurchasesService } from './purchases.service'
import type { PurchasesRepository } from '../infrastructure/purchases.repository'
import type { IdService } from '../../../core/ids/id.service'
import type { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import type { PrismaService } from '../../../core/database/prisma.service'
import { Prisma } from '@prisma/client'

describe('PurchasesService (MON-001, MON-003, PUR-001)', () => {
  const repository = {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    cancel: vi.fn(),
    receiveGoods: vi.fn(),
    createPayment: vi.fn(),
  } as unknown as PurchasesRepository

  const ids = {
    generate: vi.fn().mockReturnValue('uuid-v7-mock'),
  } as unknown as IdService

  const tenantContext = {
    require: vi.fn().mockReturnValue({ businessId: 'b-1' }),
  } as unknown as TenantContextService

  const prisma = {
    business: {
      findUnique: vi.fn().mockResolvedValue({ currencyCode: 'LAK' }),
    },
    purchase: {
      count: vi.fn().mockResolvedValue(0),
    },
    goodsReceipt: {
      count: vi.fn().mockResolvedValue(0),
    },
  } as unknown as PrismaService

  const service = new PurchasesService(repository, ids, tenantContext, prisma)

  it('calculates line subtotals and grand total accurately on backend', async () => {
    vi.mocked(repository.create).mockResolvedValue({ id: 'uuid-v7-mock' } as never)

    await service.create('actor-1', {
      supplierId: 'sup-1',
      branchId: 'br-1',
      warehouseId: 'wh-1',
      items: [
        {
          variantId: 'v-1',
          orderedQuantity: '10',
          unitCost: '5000',
          taxAmount: '500',
        },
        {
          variantId: 'v-2',
          orderedQuantity: '2',
          unitCost: '20000',
        },
      ],
    })

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotal: new Prisma.Decimal('90000'), // 10*5000 + 2*20000 = 50000 + 40000 = 90000
        taxAmount: new Prisma.Decimal('500'),
        grandTotal: new Prisma.Decimal('90500'),
        currencyCode: 'LAK',
      }),
    )
  })

  it('rejects non-positive payment amount', () => {
    expect(() =>
      service.createPayment('actor-1', 'p-1', {
        amount: '0',
      }),
    ).toThrowError('Payment amount must be greater than zero')

    expect(() =>
      service.createPayment('actor-1', 'p-1', {
        amount: '-1000',
      }),
    ).toThrowError('Payment amount must be greater than zero')
  })
})
