import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PosService } from './pos.service'
import type { PosRepository } from '../infrastructure/pos.repository'
import { CashMovementType, PaymentMethod, PosSessionStatus, Prisma } from '@prisma/client'
import type { PrismaService } from '../../../core/database/prisma.service'
import { IdempotencyService } from '../../../core/idempotency/idempotency.service'
import type { TenantContextService } from '../../../core/tenancy/tenant-context.service'

describe('PosService (POS-001, POS-002, POS-003, MON-001)', () => {
  const repository = {
    listRegisters: vi.fn(),
    getCurrentSession: vi.fn(),
    getSessionById: vi.fn(),
    listSessions: vi.fn(),
    openSession: vi.fn(),
    recordCashMovement: vi.fn(),
    closeSession: vi.fn(),
    calculateSessionSummary: vi.fn(),
    searchProducts: vi.fn(),
    createSale: vi.fn(),
    listSales: vi.fn(),
    getSaleById: vi.fn(),
  } as unknown as PosRepository

  const idempotencyRecords = { findUnique: vi.fn(), deleteMany: vi.fn() }
  const prisma = { idempotencyRecord: idempotencyRecords } as unknown as PrismaService
  const tenantContext = { require: () => ({ businessId: 'business-1' }) } as unknown as TenantContextService
  const idempotency = new IdempotencyService(prisma, tenantContext)

  const service = new PosService(repository, idempotency)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates openSession to repository', async () => {
    const mockSession = {
      id: 'session-1',
      sessionNumber: 'SHIFT-202610-0001',
      status: PosSessionStatus.OPEN,
      openingCash: '100000.0000',
    }
    vi.mocked(repository.openSession).mockResolvedValue(mockSession as never)

    const result = await service.openSession('user-1', {
      branchId: 'branch-1',
      openingCash: '100000',
      notes: 'Morning shift',
    })

    expect(repository.openSession).toHaveBeenCalledWith('user-1', {
      branchId: 'branch-1',
      openingCash: '100000',
      notes: 'Morning shift',
    })
    expect(result).toEqual(mockSession)
  })

  it('delegates recordCashMovement to repository', async () => {
    const mockMovement = {
      id: 'move-1',
      type: CashMovementType.CASH_IN,
      amount: '50000.0000',
      reason: 'Petty cash top-up',
    }
    vi.mocked(repository.recordCashMovement).mockResolvedValue(mockMovement as never)

    const result = await service.recordCashMovement('user-1', 'session-1', {
      type: CashMovementType.CASH_IN,
      amount: '50000',
      reason: 'Petty cash top-up',
    })

    expect(repository.recordCashMovement).toHaveBeenCalledWith('user-1', 'session-1', {
      type: CashMovementType.CASH_IN,
      amount: '50000',
      reason: 'Petty cash top-up',
    })
    expect(result).toEqual(mockMovement)
  })

  it('delegates closeSession with Z-report reconciliation to repository', async () => {
    const mockClosedSession = {
      id: 'session-1',
      status: PosSessionStatus.CLOSED,
      openingCash: '100000.0000',
      closingCashCount: '250000.0000',
      expectedCash: '250000.0000',
      cashDifference: '0.0000',
    }
    vi.mocked(repository.closeSession).mockResolvedValue(mockClosedSession as never)

    const result = await service.closeSession('user-1', 'session-1', {
      closingCashCount: '250000',
      notes: 'All balanced',
    })

    expect(repository.closeSession).toHaveBeenCalledWith('user-1', 'session-1', {
      closingCashCount: '250000',
      notes: 'All balanced',
    })
    expect(result).toEqual(mockClosedSession)
  })

  it('delegates createSale to repository with line items and cash payment', async () => {
    const mockSale = {
      id: 'sale-1',
      saleNumber: 'INV-202610-0001',
      grandTotal: '45000.0000',
      paidAmount: '50000.0000',
      changeAmount: '5000.0000',
    }
    vi.mocked(repository.createSale).mockResolvedValue(mockSale as never)

    const saleDto = {
      branchId: 'branch-1',
      items: [
        { variantId: 'v-1', quantity: '2', unitPrice: '20000' },
        { variantId: 'v-2', quantity: '1', unitPrice: '5000' },
      ],
      payments: [
        { method: PaymentMethod.CASH, amount: '45000', tenderedAmount: '50000' },
      ],
    }

    const result = await service.createSale('cashier-1', saleDto)
    expect(repository.createSale).toHaveBeenCalledWith('cashier-1', saleDto)
    expect(result).toEqual(mockSale)
  })

  describe('Idempotency-Key on createSale', () => {
    const saleDto = {
      branchId: 'branch-1',
      items: [{ variantId: 'v-1', quantity: '1' }],
    }
    const storedRecord = (requestHash: string) => ({
      resourceId: 'sale-original',
      requestHash,
      expiresAt: new Date(Date.now() + 60_000),
    })
    const hashOf = (dto: unknown) => idempotency.prepare('pos.sale.create', 'retry-key-0001', dto)!.requestHash

    it('passes the claim to the repository on the first attempt', async () => {
      idempotencyRecords.findUnique.mockResolvedValue(null)
      vi.mocked(repository.createSale).mockResolvedValue({ id: 'sale-1' } as never)

      await service.createSale('cashier-1', saleDto, 'retry-key-0001')

      expect(repository.createSale).toHaveBeenCalledWith('cashier-1', saleDto, {
        operation: 'pos.sale.create',
        key: 'retry-key-0001',
        requestHash: hashOf(saleDto),
      })
    })

    it('returns the original sale on retry without selling again', async () => {
      idempotencyRecords.findUnique.mockResolvedValue(storedRecord(hashOf(saleDto)))
      vi.mocked(repository.getSaleById).mockResolvedValue({ id: 'sale-original' } as never)

      const result = await service.createSale('cashier-1', { ...saleDto }, 'retry-key-0001')

      expect(repository.createSale).not.toHaveBeenCalled()
      expect(result).toEqual({ id: 'sale-original' })
    })

    it('rejects a reused key with a different payload', async () => {
      idempotencyRecords.findUnique.mockResolvedValue(storedRecord(hashOf(saleDto)))

      await expect(
        service.createSale('cashier-1', { ...saleDto, items: [{ variantId: 'v-1', quantity: '2' }] }, 'retry-key-0001'),
      ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED', statusCode: 409 })
      expect(repository.createSale).not.toHaveBeenCalled()
    })

    it('returns the winner when a concurrent duplicate loses the claim race', async () => {
      idempotencyRecords.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(storedRecord(hashOf(saleDto)))
      vi.mocked(repository.createSale).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { modelName: 'IdempotencyRecord' },
        }),
      )
      vi.mocked(repository.getSaleById).mockResolvedValue({ id: 'sale-original' } as never)

      const result = await service.createSale('cashier-1', saleDto, 'retry-key-0001')

      expect(result).toEqual({ id: 'sale-original' })
    })

    it('rejects malformed keys', async () => {
      await expect(service.createSale('cashier-1', saleDto, 'bad key!')).rejects.toMatchObject({
        code: 'INVALID_IDEMPOTENCY_KEY',
      })
    })
  })
})
