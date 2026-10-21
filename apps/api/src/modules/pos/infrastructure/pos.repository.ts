import { Inject, Injectable } from '@nestjs/common'
import {
  CashMovementType,
  PaymentMethod,
  PosSessionStatus,
  Prisma,
  SaleLifecycleStatus,
  StockMovementType,
} from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { PrismaService } from '../../../core/database/prisma.service'
import { DocumentNumberService } from '../../../core/documents/document-number.service'
import { type IdempotencyClaim, IdempotencyService } from '../../../core/idempotency/idempotency.service'
import { IdService } from '../../../core/ids/id.service'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import { StockLedgerRepository } from '../../inventory/infrastructure/stock-ledger.repository'
import type {
  CashMovementDto,
  CloseSessionDto,
  OpenSessionDto,
  SaleListQueryDto,
} from '../api/dto/pos.dto'
import type { preparePayments, SaleQuote } from '../domain/sale-pricing'

export type CreateSaleInput = {
  branchId: string
  warehouseId?: string | undefined
  posSessionId?: string | undefined
  customer: { id: string; name: string } | null
  customerName?: string | undefined
  notes?: string | undefined
  quote: SaleQuote
  payment: ReturnType<typeof preparePayments>
}

export interface SessionSummaryReport {
  sessionId: string
  sessionNumber: string
  status: PosSessionStatus
  branch: { id: string; name: string }
  register: { id: string; name: string; code: string }
  openedBy: { id: string; name?: string }
  closedBy?: { id: string; name?: string } | null
  openedAt: Date
  closedAt?: Date | null
  openingCash: string
  cashIn: string
  cashOut: string
  netCashMovements: string
  salesCount: number
  grossSales: string
  totalDiscount: string
  netSales: string
  cashSales: string
  bankSales: string
  otherSales: string
  expectedCash: string
  closingCashCount?: string | null
  cashDifference?: string | null
  notes?: string | null
  cashMovements: Array<{
    id: string
    type: CashMovementType
    amount: string
    reason: string
    createdAt: Date
  }>
}

@Injectable()
export class PosRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(IdService) private readonly ids: IdService,
    @Inject(DocumentNumberService) private readonly documentNumbers: DocumentNumberService,
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
    @Inject(StockLedgerRepository) private readonly stockLedger: StockLedgerRepository,
  ) {}

  async ensureDefaultRegister(branchId: string) {
    const { businessId } = this.tenantContext.require()
    let register = await this.prisma.posRegister.findFirst({
      where: { businessId, branchId, active: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!register) {
      register = await this.prisma.posRegister.create({
        data: {
          id: this.ids.generate(),
          businessId,
          branchId,
          code: 'REG-01',
          name: 'ເຄົາເຕີ້ 1 (Counter 1)',
          active: true,
        },
      })
    }
    return register
  }

  async listRegisters(branchId?: string) {
    const context = this.tenantContext.require()
    const branchFilter = branchId
      ? { branchId }
      : context.branchScope.kind === 'selected'
        ? { branchId: { in: [...context.branchScope.branchIds] } }
        : {}

    return this.prisma.posRegister.findMany({
      where: {
        businessId: context.businessId,
        active: true,
        ...branchFilter,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { code: 'asc' },
    })
  }

  async getCurrentSession(userId: string, branchId?: string) {
    const { businessId } = this.tenantContext.require()

    const session = await this.prisma.posSession.findFirst({
      where: {
        businessId,
        status: PosSessionStatus.OPEN,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        register: { select: { id: true, name: true, code: true } },
        cashMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
      orderBy: { openedAt: 'desc' },
    })

    if (!session) return null

    // Get live summary of this active session
    const summary = await this.calculateSessionSummary(session.id)
    return {
      ...session,
      openingCash: session.openingCash.toFixed(4),
      summary,
    }
  }

  async getSessionById(sessionId: string) {
    const { businessId } = this.tenantContext.require()
    const session = await this.prisma.posSession.findFirst({
      where: { businessId, id: sessionId },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        register: { select: { id: true, name: true, code: true } },
        cashMovements: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!session) return null

    const summary = await this.calculateSessionSummary(session.id)
    return {
      ...session,
      openingCash: session.openingCash.toFixed(4),
      closingCashCount: session.closingCashCount ? session.closingCashCount.toFixed(4) : null,
      expectedCash: session.expectedCash ? session.expectedCash.toFixed(4) : summary.expectedCash,
      cashDifference: session.cashDifference ? session.cashDifference.toFixed(4) : summary.cashDifference,
      summary,
    }
  }

  async listSessions(query: { branchId?: string; status?: PosSessionStatus; limit?: number; offset?: number }) {
    const context = this.tenantContext.require()
    const limit = query.limit ?? 20
    const offset = query.offset ?? 0

    const branchFilter = query.branchId
      ? { branchId: query.branchId }
      : context.branchScope.kind === 'selected'
        ? { branchId: { in: [...context.branchScope.branchIds] } }
        : {}

    const where: Prisma.PosSessionWhereInput = {
      businessId: context.businessId,
      ...branchFilter,
      ...(query.status ? { status: query.status } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.posSession.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { openedAt: 'desc' },
        include: {
          branch: { select: { id: true, name: true, code: true } },
          register: { select: { id: true, name: true, code: true } },
          _count: { select: { sales: true, cashMovements: true } },
        },
      }),
      this.prisma.posSession.count({ where }),
    ])

    return {
      total,
      limit,
      offset,
      items: items.map(s => ({
        id: s.id,
        sessionNumber: s.sessionNumber,
        branchId: s.branchId,
        branch: s.branch,
        registerId: s.registerId,
        register: s.register,
        status: s.status,
        openedAt: s.openedAt,
        closedAt: s.closedAt,
        openingCash: s.openingCash.toFixed(4),
        closingCashCount: s.closingCashCount ? s.closingCashCount.toFixed(4) : null,
        expectedCash: s.expectedCash ? s.expectedCash.toFixed(4) : null,
        cashDifference: s.cashDifference ? s.cashDifference.toFixed(4) : null,
        totalSalesCount: s.totalSalesCount,
        totalNetSales: s.totalNetSales.toFixed(4),
        totalCashSales: s.totalCashSales.toFixed(4),
        totalBankSales: s.totalBankSales.toFixed(4),
        notes: s.notes,
      })),
    }
  }

  async openSession(userId: string, dto: OpenSessionDto) {
    const { businessId } = this.tenantContext.require()

    let registerId = dto.registerId
    if (!registerId) {
      const reg = await this.ensureDefaultRegister(dto.branchId)
      registerId = reg.id
    }

    // Check if there is an existing OPEN session for this register
    const active = await this.prisma.posSession.findFirst({
      where: {
        businessId,
        registerId,
        status: PosSessionStatus.OPEN,
      },
    })

    if (active) {
      throw errors.activeSessionExists()
    }

    const now = new Date()
    const openingCash = new Prisma.Decimal(dto.openingCash || '0')

    const session = await this.prisma.$transaction(async tx => tx.posSession.create({
      data: {
        id: this.ids.generate(),
        businessId,
        branchId: dto.branchId,
        registerId,
        sessionNumber: await this.documentNumbers.next(tx, businessId, 'SHIFT', now),
        status: PosSessionStatus.OPEN,
        openedAt: now,
        openedByUserId: userId,
        openingCash,
        notes: dto.notes?.trim() || null,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        register: { select: { id: true, name: true, code: true } },
      },
    }))

    return {
      ...session,
      openingCash: session.openingCash.toFixed(4),
    }
  }

  async recordCashMovement(userId: string, sessionId: string, dto: CashMovementDto) {
    const { businessId } = this.tenantContext.require()

    const session = await this.prisma.posSession.findFirst({
      where: { businessId, id: sessionId },
    })

    if (!session) throw errors.resourceNotFound('POS Session')
    if (session.status !== PosSessionStatus.OPEN) {
      throw errors.sessionNotOpen()
    }

    const amount = new Prisma.Decimal(dto.amount)
    if (amount.lte(0)) {
      throw errors.invalidPaymentAmount('Amount must be greater than zero')
    }

    return this.prisma.posCashMovement.create({
      data: {
        id: this.ids.generate(),
        businessId,
        sessionId,
        type: dto.type,
        amount,
        reason: dto.reason.trim(),
        performedBy: userId,
      },
    })
  }

  async calculateSessionSummary(sessionId: string): Promise<SessionSummaryReport> {
    const { businessId } = this.tenantContext.require()

    const session = await this.prisma.posSession.findFirst({
      where: { businessId, id: sessionId },
      include: {
        branch: { select: { id: true, name: true } },
        register: { select: { id: true, name: true, code: true } },
        cashMovements: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!session) throw errors.resourceNotFound('POS Session')

    let cashIn = new Prisma.Decimal(0)
    let cashOut = new Prisma.Decimal(0)

    for (const m of session.cashMovements) {
      if (m.type === CashMovementType.CASH_IN) {
        cashIn = cashIn.add(m.amount)
      } else if (m.type === CashMovementType.CASH_OUT) {
        cashOut = cashOut.add(m.amount)
      }
    }
    const netCashMovements = cashIn.sub(cashOut)

    // Query sales made in this session
    const sales = await this.prisma.sale.findMany({
      where: {
        businessId,
        posSessionId: sessionId,
        lifecycleStatus: SaleLifecycleStatus.COMPLETED,
      },
      include: {
        payments: true,
      },
    })

    let totalGrossSales = new Prisma.Decimal(0)
    let totalDiscount = new Prisma.Decimal(0)
    let totalNetSales = new Prisma.Decimal(0)
    let totalCashSales = new Prisma.Decimal(0)
    let totalBankSales = new Prisma.Decimal(0)
    let totalCreditSales = new Prisma.Decimal(0)

    for (const s of sales) {
      totalGrossSales = totalGrossSales.add(s.subtotal)
      totalDiscount = totalDiscount.add(s.discountAmount)
      totalNetSales = totalNetSales.add(s.grandTotal)

      for (const p of s.payments) {
        if (p.method === PaymentMethod.CASH) {
          // In cash payments, if change was given, net cash received is amount (or tendered - change)
          totalCashSales = totalCashSales.add(p.amount)
        } else if (p.method === PaymentMethod.BANK_TRANSFER) {
          totalBankSales = totalBankSales.add(p.amount)
        } else {
          totalCreditSales = totalCreditSales.add(p.amount)
        }
      }
    }

    const expectedCash = session.openingCash.add(netCashMovements).add(totalCashSales)
    const closingCash = session.closingCashCount
    const diff = closingCash ? closingCash.sub(expectedCash) : null

    return {
      sessionId: session.id,
      sessionNumber: session.sessionNumber,
      status: session.status,
      branch: session.branch,
      register: session.register,
      openedBy: { id: session.openedByUserId },
      closedBy: session.closedByUserId ? { id: session.closedByUserId } : null,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      openingCash: session.openingCash.toFixed(4),
      cashIn: cashIn.toFixed(4),
      cashOut: cashOut.toFixed(4),
      netCashMovements: netCashMovements.toFixed(4),
      salesCount: sales.length,
      grossSales: totalGrossSales.toFixed(4),
      totalDiscount: totalDiscount.toFixed(4),
      netSales: totalNetSales.toFixed(4),
      cashSales: totalCashSales.toFixed(4),
      bankSales: totalBankSales.toFixed(4),
      otherSales: totalCreditSales.toFixed(4),
      expectedCash: expectedCash.toFixed(4),
      closingCashCount: closingCash ? closingCash.toFixed(4) : null,
      cashDifference: diff ? diff.toFixed(4) : null,
      notes: session.notes,
      cashMovements: session.cashMovements.map(m => ({
        id: m.id,
        type: m.type,
        amount: m.amount.toFixed(4),
        reason: m.reason,
        createdAt: m.createdAt,
      })),
    }
  }

  async closeSession(userId: string, sessionId: string, dto: CloseSessionDto) {
    const { businessId } = this.tenantContext.require()

    const session = await this.prisma.posSession.findFirst({
      where: { businessId, id: sessionId },
    })

    if (!session) throw errors.resourceNotFound('POS Session')
    if (session.status === PosSessionStatus.CLOSED) {
      throw errors.sessionAlreadyClosed()
    }

    const closingCashCount = new Prisma.Decimal(dto.closingCashCount || '0')
    const summary = await this.calculateSessionSummary(sessionId)

    const expectedCash = new Prisma.Decimal(summary.expectedCash)
    const cashDifference = closingCashCount.sub(expectedCash)

    const closed = await this.prisma.posSession.update({
      where: { businessId_id: { businessId, id: sessionId } },
      data: {
        status: PosSessionStatus.CLOSED,
        closedAt: new Date(),
        closedByUserId: userId,
        closingCashCount,
        expectedCash,
        cashDifference,
        totalSalesCount: summary.salesCount,
        totalGrossSales: new Prisma.Decimal(summary.grossSales),
        totalDiscount: new Prisma.Decimal(summary.totalDiscount),
        totalNetSales: new Prisma.Decimal(summary.netSales),
        totalCashSales: new Prisma.Decimal(summary.cashSales),
        totalBankSales: new Prisma.Decimal(summary.bankSales),
        totalCreditSales: new Prisma.Decimal(summary.otherSales),
        notes: dto.notes ? (session.notes ? `${session.notes}\n[Close Note]: ${dto.notes}` : dto.notes) : session.notes,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        register: { select: { id: true, name: true, code: true } },
      },
    })

    return {
      ...closed,
      closingCashCount: closed.closingCashCount?.toFixed(4),
      expectedCash: closed.expectedCash?.toFixed(4),
      cashDifference: closed.cashDifference?.toFixed(4),
      summary: await this.calculateSessionSummary(sessionId),
    }
  }

  async searchProducts(query: { q?: string; branchId: string; warehouseId?: string }) {
    const { businessId } = this.tenantContext.require()
    const { q, branchId } = query

    // Determine warehouse
    let targetWarehouseId = query.warehouseId
    if (!targetWarehouseId) {
      const defaultWh = await this.prisma.warehouse.findFirst({
        where: { businessId, branchId, status: 'ACTIVE' },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      })
      targetWarehouseId = defaultWh?.id
    }

    const searchTerm = q?.trim()

    // Query active variants with product, barcodes, and current stock balance in targetWarehouse
    const variants = await this.prisma.productVariant.findMany({
      where: {
        businessId,
        active: true,
        product: {
          active: true,
          archivedAt: null,
          ...(searchTerm
            ? {
                OR: [
                  { name: { contains: searchTerm, mode: 'insensitive' } },
                  { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
                ],
              }
            : {}),
        },
        ...(searchTerm
          ? {
              OR: [
                { sku: { contains: searchTerm, mode: 'insensitive' } },
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { barcodes: { some: { barcode: { contains: searchTerm, mode: 'insensitive' } } } },
                { product: { name: { contains: searchTerm, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            trackStock: true,
            unit: { select: { id: true, name: true, code: true, decimalPlaces: true } },
            category: { select: { id: true, name: true } },
          },
        },
        barcodes: { select: { barcode: true } },
        groupPrices: { select: { customerGroupId: true, price: true } },
        stockBalances: targetWarehouseId
          ? {
              where: { warehouseId: targetWarehouseId },
              select: { quantity: true },
            }
          : false,
      },
      take: 60,
      orderBy: [{ product: { name: 'asc' } }, { isDefault: 'desc' }],
    })

    return variants.map(v => {
      const firstBalance = Array.isArray(v.stockBalances) ? v.stockBalances[0] : null
      const stockQty = firstBalance ? firstBalance.quantity : new Prisma.Decimal(0)
      return {
        variantId: v.id,
        productId: v.productId,
        productName: v.product.name,
        variantName: v.name || '',
        sku: v.sku,
        barcodes: v.barcodes.map(b => b.barcode),
        unitId: v.product.unit.id,
        unitName: v.product.unit.name,
        categoryId: v.product.category?.id || null,
        categoryName: v.product.category?.name || 'ທົ່ວໄປ (General)',
        unitCost: v.cost.toFixed(4),
        sellingPrice: v.sellingPrice.toFixed(4),
        trackStock: v.product.trackStock,
        availableStock: stockQty.toString(),
        groupPrices: (v.groupPrices || []).map(gp => ({
          customerGroupId: gp.customerGroupId,
          price: gp.price.toFixed(4),
        })),
      }
    })
  }

  /** Persists a sale priced by SalePricingService; this method never computes money itself. */
  async createSale(cashierUserId: string, input: CreateSaleInput, idempotency?: IdempotencyClaim) {
    const { businessId } = this.tenantContext.require()
    const { quote, payment } = input

    // 1. Validate session: must be OPEN and belong to the selling branch
    let sessionId = input.posSessionId
    if (!sessionId) {
      const activeSession = await this.prisma.posSession.findFirst({
        where: { businessId, branchId: input.branchId, status: PosSessionStatus.OPEN },
      })
      if (!activeSession) {
        throw errors.sessionNotOpen()
      }
      sessionId = activeSession.id
    } else {
      const session = await this.prisma.posSession.findFirst({
        where: { businessId, id: sessionId, branchId: input.branchId },
      })
      if (!session) throw errors.resourceNotFound('POS Session')
      if (session.status !== PosSessionStatus.OPEN) {
        throw errors.sessionNotOpen()
      }
    }

    // 2. Determine warehouse; it must belong to the selling branch (SAL-003)
    const warehouse = await this.prisma.warehouse.findFirst({
      where: {
        businessId,
        branchId: input.branchId,
        status: 'ACTIVE',
        ...(input.warehouseId ? { id: input.warehouseId } : {}),
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
    if (!warehouse) throw errors.warehouseNotFound()
    const warehouseId = warehouse.id

    const now = new Date()
    const saleId = this.ids.generate()

    // 5. Execute atomic database transaction (Rule 9: Critical operations must use database transactions)
    return this.prisma.$transaction(async tx => {
      // Claim first so a concurrent retry with the same key waits here instead of selling twice
      if (idempotency) await this.idempotency.claim(tx, idempotency, saleId)

      // Sale Number INV-YYYYMM-XXXX, issued inside the transaction so concurrent sales never collide
      const saleNumber = await this.documentNumbers.next(tx, businessId, 'INV', now)

      // Create Sale Header
      const sale = await tx.sale.create({
        data: {
          id: saleId,
          businessId,
          branchId: input.branchId,
          warehouseId,
          posSessionId: sessionId,
          saleNumber,
          customerId: input.customer?.id ?? null,
          customerName: input.customer?.name ?? (input.customerName?.trim() || null),
          currencyCode: quote.currencyCode,
          subtotal: quote.subtotal,
          discountAmount: quote.discountAmount,
          taxAmount: quote.taxAmount,
          grandTotal: quote.grandTotal,
          paidAmount: payment.totalPaid,
          changeAmount: payment.changeAmount,
          lifecycleStatus: SaleLifecycleStatus.COMPLETED,
          paymentStatus: payment.paymentStatus,
          soldAt: now,
          cashierUserId,
          notes: input.notes?.trim() || null,
          promotionId: quote.promotionId,
        },
      })

      // Create Sale Items with price/cost/label snapshots (MON-005)
      for (const item of quote.lines) {
        await tx.saleItem.create({
          data: {
            id: this.ids.generate(),
            businessId,
            saleId: sale.id,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            unitName: item.unitName,
            quantity: item.quantity,
            unitCost: item.unitCost,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            subtotal: item.subtotal,
            taxAmount: new Prisma.Decimal(0),
            totalAmount: item.totalAmount,
            promotionId: item.promotionId,
            isPromoGift: item.isPromoGift,
          },
        })
      }

      // Deduct stock in variant order so concurrent sales lock balance rows in the same sequence
      const stockItems = quote.lines
        .filter(item => item.trackStock)
        .sort((a, b) => a.variantId.localeCompare(b.variantId))
      for (const item of stockItems) {
        await this.stockLedger.decrease(tx, {
          businessId,
          warehouseId,
          variantId: item.variantId,
          quantity: item.quantity,
          type: StockMovementType.SALE,
          referenceType: 'SALE',
          referenceId: sale.id,
          actorUserId: cashierUserId,
          notes: `ຂາຍໜ້າຮ້ານເລກທີ: ${saleNumber}`,
          itemLabel: item.productName,
        })
      }

      // Create Payments
      for (const p of payment.payments) {
        await tx.salePayment.create({
          data: {
            id: this.ids.generate(),
            businessId,
            saleId: sale.id,
            method: p.method,
            amount: p.amount,
            tenderedAmount: p.tenderedAmount,
            changeAmount: p.changeAmount,
            reference: p.reference,
            paidAt: now,
          },
        })
      }

      return this.getSaleById(sale.id, tx)
    })
  }

  async listSales(query: SaleListQueryDto) {
    const context = this.tenantContext.require()
    const page = query.page ?? 1
    const limit = query.limit ?? 30
    const skip = (page - 1) * limit

    const branchFilter = query.branchId
      ? { branchId: query.branchId }
      : context.branchScope.kind === 'selected'
        ? { branchId: { in: [...context.branchScope.branchIds] } }
        : {}

    const where: Prisma.SaleWhereInput = {
      businessId: context.businessId,
      ...branchFilter,
      ...(query.posSessionId ? { posSessionId: query.posSessionId } : {}),
      ...(query.q
        ? {
            OR: [
              { saleNumber: { contains: query.q, mode: 'insensitive' } },
              { customerName: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.from || query.to
        ? {
            soldAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        take: limit,
        skip,
        orderBy: { soldAt: 'desc' },
        include: {
          branch: { select: { id: true, name: true, code: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          payments: { select: { method: true, amount: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.sale.count({ where }),
    ])

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: items.map(s => ({
        id: s.id,
        saleNumber: s.saleNumber,
        branchId: s.branchId,
        branch: s.branch,
        warehouseId: s.warehouseId,
        warehouse: s.warehouse,
        customerName: s.customerName,
        currencyCode: s.currencyCode,
        subtotal: s.subtotal.toFixed(4),
        discountAmount: s.discountAmount.toFixed(4),
        grandTotal: s.grandTotal.toFixed(4),
        paidAmount: s.paidAmount.toFixed(4),
        changeAmount: s.changeAmount.toFixed(4),
        lifecycleStatus: s.lifecycleStatus,
        paymentStatus: s.paymentStatus,
        itemCount: s._count.items,
        payments: s.payments.map(p => ({
          method: p.method,
          amount: p.amount.toFixed(4),
        })),
        soldAt: s.soldAt,
      })),
    }
  }

  async getSaleById(saleId: string, txClient?: Prisma.TransactionClient) {
    const { businessId } = this.tenantContext.require()
    const client = txClient || this.prisma

    const s = await client.sale.findFirst({
      where: { businessId, id: saleId },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        session: { select: { id: true, sessionNumber: true, status: true } },
        items: {
          include: {
            variant: {
              select: {
                sku: true,
                barcodes: { select: { barcode: true } },
              },
            },
          },
        },
        payments: true,
      },
    })

    if (!s) return null

    return {
      id: s.id,
      saleNumber: s.saleNumber,
      branchId: s.branchId,
      branch: s.branch,
      warehouseId: s.warehouseId,
      warehouse: s.warehouse,
      sessionId: s.posSessionId,
      session: s.session,
      customerId: s.customerId,
      customerName: s.customerName,
      currencyCode: s.currencyCode,
      subtotal: s.subtotal.toFixed(4),
      discountAmount: s.discountAmount.toFixed(4),
      grandTotal: s.grandTotal.toFixed(4),
      paidAmount: s.paidAmount.toFixed(4),
      changeAmount: s.changeAmount.toFixed(4),
      lifecycleStatus: s.lifecycleStatus,
      paymentStatus: s.paymentStatus,
      soldAt: s.soldAt,
      cashierUserId: s.cashierUserId,
      notes: s.notes,
      items: s.items.map(i => ({
        id: i.id,
        variantId: i.variantId,
        productName: i.productName,
        variantName: i.variantName,
        sku: i.variant.sku,
        unitName: i.unitName,
        quantity: i.quantity.toString(),
        unitCost: i.unitCost.toFixed(4),
        unitPrice: i.unitPrice.toFixed(4),
        discountAmount: i.discountAmount.toFixed(4),
        subtotal: i.subtotal.toFixed(4),
        totalAmount: i.totalAmount.toFixed(4),
      })),
      payments: s.payments.map(p => ({
        id: p.id,
        method: p.method,
        amount: p.amount.toFixed(4),
        tenderedAmount: p.tenderedAmount?.toFixed(4) || null,
        changeAmount: p.changeAmount?.toFixed(4) || null,
        reference: p.reference,
        paidAt: p.paidAt,
      })),
    }
  }
}
