import { describe, expect, it, vi } from 'vitest'
import { PosService } from './pos.service'
import type { PosRepository } from '../infrastructure/pos.repository'
import { CashMovementType, PaymentMethod, PosSessionStatus } from '@prisma/client'

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

  const service = new PosService(repository)

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
})
