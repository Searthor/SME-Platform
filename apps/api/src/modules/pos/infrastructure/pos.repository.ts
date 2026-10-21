import { Inject, Injectable } from '@nestjs/common'
import {
  CashMovementType,
  PaymentMethod,
  PosSessionStatus,
  Prisma,
  SaleLifecycleStatus,
  SalePaymentStatus,
  StockMovementType,
} from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { PrismaService } from '../../../core/database/prisma.service'
import { IdService } from '../../../core/ids/id.service'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import type {
  CashMovementDto,
  CloseSessionDto,
  CreateSaleDto,
  OpenSessionDto,
  SaleListQueryDto,
} from '../api/dto/pos.dto'

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
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const countThisMonth = await this.prisma.posSession.count({
      where: {
        businessId,
        sessionNumber: { startsWith: `SHIFT-${yearMonth}-` },
      },
    })
    const sessionNumber = `SHIFT-${yearMonth}-${String(countThisMonth + 1).padStart(4, '0')}`

    const openingCash = new Prisma.Decimal(dto.openingCash || '0')

    const session = await this.prisma.posSession.create({
      data: {
        id: this.ids.generate(),
        businessId,
        branchId: dto.branchId,
        registerId,
        sessionNumber,
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
    })

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

  async createSale(cashierUserId: string, dto: CreateSaleDto) {
    const { businessId } = this.tenantContext.require()

    // 1. Validate session
    let sessionId = dto.posSessionId
    if (!sessionId) {
      const activeSession = await this.prisma.posSession.findFirst({
        where: { businessId, branchId: dto.branchId, status: PosSessionStatus.OPEN },
      })
      if (!activeSession) {
        throw errors.sessionNotOpen()
      }
      sessionId = activeSession.id
    } else {
      const session = await this.prisma.posSession.findFirst({
        where: { businessId, id: sessionId },
      })
      if (!session) throw errors.resourceNotFound('POS Session')
      if (session.status !== PosSessionStatus.OPEN) {
        throw errors.sessionNotOpen()
      }
    }

    // 2. Determine warehouse
    let warehouseId = dto.warehouseId
    if (!warehouseId) {
      const defaultWarehouse = await this.prisma.warehouse.findFirst({
        where: { businessId, branchId: dto.branchId, status: 'ACTIVE' },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      })
      if (!defaultWarehouse) throw errors.warehouseNotFound()
      warehouseId = defaultWarehouse.id
    } else {
      const wh = await this.prisma.warehouse.findFirst({
        where: { businessId, id: warehouseId, status: 'ACTIVE' },
      })
      if (!wh) throw errors.warehouseNotFound()
    }

    // 3. Validate items
    if (!dto.items || dto.items.length === 0) {
      throw errors.invalidSaleItems()
    }

    const variantIds = [...new Set(dto.items.map(i => i.variantId))]
    const variants = await this.prisma.productVariant.findMany({
      where: { businessId, id: { in: variantIds } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            trackStock: true,
            unit: { select: { id: true, name: true, decimalPlaces: true } },
          },
        },
        groupPrices: {
          select: { customerGroupId: true, price: true },
        },
      },
    })

    const variantMap = new Map(variants.map(v => [v.id, v]))
    for (const item of dto.items) {
      if (!variantMap.has(item.variantId)) {
        throw errors.resourceNotFound(`Variant ${item.variantId}`)
      }
    }

    // Resolve Customer and Price Group / Customer Group if specified
    let targetGroupId: string | null = dto.priceGroupId || null
    let customer: { id: string; name: string; groupId: string | null; group: { discountPercent: Prisma.Decimal } | null } | null = null
    if (dto.customerId) {
      customer = await this.prisma.customer.findFirst({
        where: { businessId, id: dto.customerId, active: true },
        select: {
          id: true,
          name: true,
          groupId: true,
          group: { select: { discountPercent: true } },
        },
      })
      if (!targetGroupId && customer?.groupId) {
        targetGroupId = customer.groupId
      }
    }

    let targetGroup: { discountPercent: Prisma.Decimal } | null = customer?.group ?? null
    if (targetGroupId && (!targetGroup || targetGroupId !== customer?.groupId)) {
      const g = await this.prisma.customerGroup.findFirst({
        where: { businessId, id: targetGroupId, active: true },
        select: { discountPercent: true },
      })
      if (g) targetGroup = g
    }

    // 4. Calculate Financials strictly using Decimal (MON-001, MON-003)
    let computedSubtotal = new Prisma.Decimal(0)
    let totalDiscount = new Prisma.Decimal(dto.discountAmount || '0')

    const preparedItems = dto.items.map(item => {
      const variant = variantMap.get(item.variantId)!
      const qty = new Prisma.Decimal(item.quantity)
      if (qty.lte(0)) {
        throw errors.invalidSaleItems('Item quantity must be greater than zero')
      }

      // Determine unit price: check price group / customer group price first, then group discount %, then default price
      let unitPrice = item.unitPrice ? new Prisma.Decimal(item.unitPrice) : variant.sellingPrice
      if (targetGroupId) {
        const gp = variant.groupPrices.find(g => g.customerGroupId === targetGroupId)
        if (gp) {
          unitPrice = gp.price
        } else if (targetGroup && targetGroup.discountPercent.gt(0)) {
          const discountMultiplier = new Prisma.Decimal(1).sub(targetGroup.discountPercent.div(100))
          unitPrice = variant.sellingPrice.mul(discountMultiplier)
        }
      }

      const lineDiscount = new Prisma.Decimal(item.discountAmount || '0')
      const lineSubtotal = unitPrice.mul(qty)
      const lineTotal = lineSubtotal.sub(lineDiscount)

      computedSubtotal = computedSubtotal.add(lineSubtotal)

      return {
        id: this.ids.generate(),
        variantId: variant.id,
        productName: variant.product.name,
        variantName: variant.name,
        unitName: variant.product.unit.name,
        unitCost: variant.cost,
        unitPrice,
        quantity: qty,
        discountAmount: lineDiscount,
        subtotal: lineSubtotal,
        taxAmount: new Prisma.Decimal(0),
        totalAmount: lineTotal,
        trackStock: variant.product.trackStock,
        promotionId: item.promotionId || null,
        isPromoGift: item.isPromoGift || false,
      }
    })

    const grandTotal = computedSubtotal.sub(totalDiscount)
    if (grandTotal.isNegative()) {
      throw errors.invalidPaymentAmount('Grand total cannot be negative')
    }

    // Process payments
    const paymentsInput = dto.payments || []
    let totalPaid = new Prisma.Decimal(0)
    let changeAmount = new Prisma.Decimal(0)

    const preparedPayments = paymentsInput.map(p => {
      const pAmt = new Prisma.Decimal(p.amount)
      const pTendered = p.tenderedAmount ? new Prisma.Decimal(p.tenderedAmount) : pAmt
      let pChange = new Prisma.Decimal(0)

      if (p.method === PaymentMethod.CASH && pTendered.gt(pAmt)) {
        pChange = pTendered.sub(pAmt)
        changeAmount = changeAmount.add(pChange)
      }

      totalPaid = totalPaid.add(pAmt)

      return {
        id: this.ids.generate(),
        method: p.method,
        amount: pAmt,
        tenderedAmount: pTendered,
        changeAmount: pChange,
        reference: p.reference?.trim() || null,
      }
    })

    // If no payments provided, default to cash paid in full
    if (preparedPayments.length === 0) {
      preparedPayments.push({
        id: this.ids.generate(),
        method: PaymentMethod.CASH,
        amount: grandTotal,
        tenderedAmount: grandTotal,
        changeAmount: new Prisma.Decimal(0),
        reference: null,
      })
      totalPaid = grandTotal
    }

    let paymentStatus: SalePaymentStatus = SalePaymentStatus.PAID
    if (totalPaid.isZero()) {
      paymentStatus = SalePaymentStatus.UNPAID
    } else if (totalPaid.lt(grandTotal)) {
      paymentStatus = SalePaymentStatus.PARTIALLY_PAID
    }

    // 5. Generate Sale Number: INV-YYYYMM-XXXX
    const now = new Date()
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const countThisMonth = await this.prisma.sale.count({
      where: {
        businessId,
        saleNumber: { startsWith: `INV-${yearMonth}-` },
      },
    })
    const saleNumber = `INV-${yearMonth}-${String(countThisMonth + 1).padStart(4, '0')}`
    const saleId = this.ids.generate()

    // 6. Execute atomic database transaction (Rule 9: Critical operations must use database transactions)
    return this.prisma.$transaction(async tx => {
      // Create Sale Header
      const sale = await tx.sale.create({
        data: {
          id: saleId,
          businessId,
          branchId: dto.branchId,
          warehouseId,
          posSessionId: sessionId,
          saleNumber,
          customerId: customer?.id ?? dto.customerId ?? null,
          customerName: customer?.name ?? (dto.customerName?.trim() || null),
          currencyCode: 'LAK',
          subtotal: computedSubtotal,
          discountAmount: totalDiscount,
          taxAmount: new Prisma.Decimal(0),
          grandTotal,
          paidAmount: totalPaid,
          changeAmount,
          lifecycleStatus: SaleLifecycleStatus.COMPLETED,
          paymentStatus,
          soldAt: now,
          cashierUserId,
          notes: dto.notes?.trim() || null,
          promotionId: dto.promotionId || null,
        },
      })

      // Create Sale Items & Deduct Stock
      for (const item of preparedItems) {
        await tx.saleItem.create({
          data: {
            id: item.id,
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
            taxAmount: item.taxAmount,
            totalAmount: item.totalAmount,
            promotionId: item.promotionId,
            isPromoGift: item.isPromoGift,
          },
        })

        // Check & Deduct Inventory (Rule 8: Every inventory change must create a stock movement)
        if (item.trackStock) {
          const balance = await tx.stockBalance.findUnique({
            where: { warehouseId_variantId: { warehouseId, variantId: item.variantId } },
          })

          if (!balance || balance.quantity.lt(item.quantity)) {
            const available = balance ? balance.quantity.toString() : '0'
            throw errors.insufficientStock(
              `ສິນຄ້າ "${item.productName}" ມີຈຳນວນໃນສາງບໍ່ພໍ (ມີພຽງ ${available}, ຕ້ອງການ ${item.quantity})`,
            )
          }

          // Decrement stock balance atomically
          await tx.stockBalance.update({
            where: { id: balance.id },
            data: {
              quantity: balance.quantity.sub(item.quantity),
              version: { increment: 1 },
            },
          })

          // Create Stock Movement
          await tx.stockMovement.create({
            data: {
              id: this.ids.generate(),
              businessId,
              warehouseId,
              variantId: item.variantId,
              type: StockMovementType.SALE,
              quantityDelta: item.quantity.negated(),
              referenceType: 'SALE',
              referenceId: sale.id,
              actorUserId: cashierUserId,
              notes: `ຂາຍໜ້າຮ້ານເລກທີ: ${saleNumber}`,
            },
          })
        }
      }

      // Create Payments
      for (const p of preparedPayments) {
        await tx.salePayment.create({
          data: {
            id: p.id,
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
