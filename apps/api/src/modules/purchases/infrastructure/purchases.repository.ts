import { Inject, Injectable } from '@nestjs/common'
import { PaymentAllocationTargetType, PaymentDirection, PaymentMethod, Prisma, PurchaseLifecycleStatus, PurchasePaymentStatus, StockMovementType } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { PrismaService } from '../../../core/database/prisma.service'
import { DocumentNumberService } from '../../../core/documents/document-number.service'
import { IdService } from '../../../core/ids/id.service'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import { StockLedgerRepository } from '../../inventory/infrastructure/stock-ledger.repository'
import type { PurchaseListQueryDto } from '../api/dto/purchase-query.dto'

type AuditInput = { auditId: string; actorUserId: string; requestId?: string }

export type PurchaseItemData = {
  id: string
  variantId: string
  orderedQuantity: Prisma.Decimal
  unitCost: Prisma.Decimal
  subtotal: Prisma.Decimal
  taxAmount: Prisma.Decimal
  totalAmount: Prisma.Decimal
}

export type InitialPaymentData = {
  paymentId: string
  allocationId: string
  amount: Prisma.Decimal
  method: PaymentMethod
  reference?: string
  notes?: string
}

export type InitialReceiptData = {
  receiptId: string
  items: Array<{
    id: string
    purchaseItemId: string
    stockMovementId: string
    variantId: string
    receivedQuantity: Prisma.Decimal
    unitCost: Prisma.Decimal
  }>
}

@Injectable()
export class PurchasesRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(IdService) private readonly ids: IdService,
    @Inject(DocumentNumberService) private readonly documentNumbers: DocumentNumberService,
    @Inject(StockLedgerRepository) private readonly stockLedger: StockLedgerRepository,
  ) {}

  /** Row-locks the purchase so concurrent receipts/payments serialize on it until commit. */
  private async lockPurchase(tx: Prisma.TransactionClient, businessId: string, purchaseId: string) {
    await tx.$queryRaw`
      SELECT "id" FROM "purchases"
       WHERE "business_id" = ${businessId}::uuid AND "id" = ${purchaseId}::uuid
       FOR UPDATE`
  }

  async listWarehouses() {
    const context = this.tenantContext.require()
    return this.prisma.warehouse.findMany({
      where: {
        businessId: context.businessId,
        status: 'ACTIVE',
        ...(context.branchScope.kind === 'selected' ? { branchId: { in: [...context.branchScope.branchIds] } } : {}),
      },
      select: {
        id: true,
        businessId: true,
        branchId: true,
        code: true,
        name: true,
        isDefault: true,
        status: true,
        branch: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
  }

  async list(query: PurchaseListQueryDto) {
    const context = this.tenantContext.require()
    const { businessId } = context

    const where: Prisma.PurchaseWhereInput = {
      businessId,
      ...(context.branchScope.kind === 'selected' ? { branchId: { in: [...context.branchScope.branchIds] } } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.lifecycleStatus ? { lifecycleStatus: query.lifecycleStatus } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { purchaseNumber: { contains: query.search, mode: 'insensitive' } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
              { notes: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          supplier: { select: { id: true, code: true, name: true, phone: true } },
          branch: { select: { id: true, code: true, name: true } },
          warehouse: { select: { id: true, code: true, name: true } },
          _count: { select: { items: true, goodsReceipts: true } },
        },
      }),
      this.prisma.purchase.count({ where }),
    ])

    return {
      total,
      limit: query.limit,
      offset: query.offset,
      items: items.map((p) => {
        const remainingDebt = p.grandTotal.sub(p.paidAmount)
        return {
          id: p.id,
          businessId: p.businessId,
          purchaseNumber: p.purchaseNumber,
          branchId: p.branchId,
          warehouseId: p.warehouseId,
          supplierId: p.supplierId,
          supplier: p.supplier,
          branch: p.branch,
          warehouse: p.warehouse,
          lifecycleStatus: p.lifecycleStatus,
          paymentStatus: p.paymentStatus,
          currencyCode: p.currencyCode,
          subtotal: p.subtotal.toFixed(4),
          taxAmount: p.taxAmount.toFixed(4),
          grandTotal: p.grandTotal.toFixed(4),
          paidAmount: p.paidAmount.toFixed(4),
          remainingDebt: remainingDebt.isPositive() ? remainingDebt.toFixed(4) : '0.0000',
          itemCount: p._count.items,
          receiptCount: p._count.goodsReceipts,
          notes: p.notes,
          orderedAt: p.orderedAt,
          expectedAt: p.expectedAt,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }
      }),
    }
  }

  async findById(purchaseId: string) {
    const { businessId } = this.tenantContext.require()
    const p = await this.prisma.purchase.findFirst({
      where: { businessId, id: purchaseId },
      include: {
        supplier: {
          select: { id: true, code: true, name: true, contactName: true, phone: true, email: true, address: true, taxId: true },
        },
        branch: { select: { id: true, code: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        items: {
          include: {
            variant: {
              select: {
                id: true,
                sku: true,
                name: true,
                cost: true,
                sellingPrice: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    unit: { select: { id: true, code: true, name: true, decimalPlaces: true } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        goodsReceipts: {
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
            items: {
              include: {
                variant: {
                  select: {
                    id: true,
                    sku: true,
                    product: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
          orderBy: { receivedAt: 'desc' },
        },
        paymentAllocations: {
          include: {
            payment: {
              select: {
                id: true,
                direction: true,
                method: true,
                amount: true,
                currencyCode: true,
                paidAt: true,
                reference: true,
                notes: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!p) return null

    const remainingDebt = p.grandTotal.sub(p.paidAmount)

    return {
      id: p.id,
      businessId: p.businessId,
      purchaseNumber: p.purchaseNumber,
      supplierId: p.supplierId,
      branchId: p.branchId,
      warehouseId: p.warehouseId,
      supplier: p.supplier,
      branch: p.branch,
      warehouse: p.warehouse,
      lifecycleStatus: p.lifecycleStatus,
      paymentStatus: p.paymentStatus,
      currencyCode: p.currencyCode,
      subtotal: p.subtotal.toFixed(4),
      taxAmount: p.taxAmount.toFixed(4),
      grandTotal: p.grandTotal.toFixed(4),
      paidAmount: p.paidAmount.toFixed(4),
      remainingDebt: remainingDebt.isPositive() ? remainingDebt.toFixed(4) : '0.0000',
      notes: p.notes,
      orderedAt: p.orderedAt,
      expectedAt: p.expectedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      items: p.items.map(item => ({
        id: item.id,
        variantId: item.variantId,
        productName: item.variant.product.name,
        variantName: item.variant.name,
        sku: item.variant.sku,
        unitName: item.variant.product.unit.name,
        orderedQuantity: item.orderedQuantity.toString(),
        receivedQuantity: item.receivedQuantity.toString(),
        remainingQuantity: item.orderedQuantity.sub(item.receivedQuantity).toString(),
        unitCost: item.unitCost.toFixed(4),
        subtotal: item.subtotal.toFixed(4),
        taxAmount: item.taxAmount.toFixed(4),
        totalAmount: item.totalAmount.toFixed(4),
      })),
      goodsReceipts: p.goodsReceipts.map(gr => ({
        id: gr.id,
        receiptNumber: gr.receiptNumber,
        warehouseName: gr.warehouse.name,
        receivedAt: gr.receivedAt,
        notes: gr.notes,
        items: gr.items.map(gri => ({
          id: gri.id,
          variantId: gri.variantId,
          productName: gri.variant.product.name,
          receivedQuantity: gri.receivedQuantity.toString(),
          unitCost: gri.unitCost.toFixed(4),
        })),
      })),
      payments: p.paymentAllocations.map(alloc => ({
        allocationId: alloc.id,
        paymentId: alloc.paymentId,
        method: alloc.payment.method,
        amount: alloc.amount.toFixed(4),
        currencyCode: alloc.payment.currencyCode,
        paidAt: alloc.payment.paidAt,
        reference: alloc.payment.reference,
        notes: alloc.payment.notes,
      })),
    }
  }

  async create(input: {
    id: string
    supplierId: string
    branchId: string
    warehouseId: string
    currencyCode: string
    subtotal: Prisma.Decimal
    taxAmount: Prisma.Decimal
    grandTotal: Prisma.Decimal
    notes?: string
    expectedAt?: string
    items: PurchaseItemData[]
    initialPayment?: InitialPaymentData
    initialReceipt?: InitialReceiptData
  } & AuditInput) {
    const { businessId } = this.tenantContext.require()

    try {
      return await this.prisma.$transaction(async (tx) => {
        const isReceived = Boolean(input.initialReceipt)
        const paidAmount = input.initialPayment ? input.initialPayment.amount : new Prisma.Decimal(0)
        const paymentStatus = paidAmount.lte(0)
          ? PurchasePaymentStatus.UNPAID
          : paidAmount.gte(input.grandTotal)
            ? PurchasePaymentStatus.PAID
            : PurchasePaymentStatus.PARTIALLY_PAID

        const lifecycleStatus = isReceived
          ? PurchaseLifecycleStatus.RECEIVED
          : PurchaseLifecycleStatus.ORDERED

        const now = new Date()
        const purchase = await tx.purchase.create({
          data: {
            id: input.id,
            businessId,
            purchaseNumber: await this.documentNumbers.next(tx, businessId, 'PO', now),
            supplierId: input.supplierId,
            branchId: input.branchId,
            warehouseId: input.warehouseId,
            currencyCode: input.currencyCode,
            subtotal: input.subtotal,
            taxAmount: input.taxAmount,
            grandTotal: input.grandTotal,
            paidAmount,
            lifecycleStatus,
            paymentStatus,
            orderedAt: new Date(),
            notes: input.notes?.trim() || null,
            expectedAt: input.expectedAt ? new Date(input.expectedAt) : null,
            createdByUserId: input.actorUserId,
            items: {
              create: input.items.map(item => ({
                id: item.id,
                variantId: item.variantId,
                orderedQuantity: item.orderedQuantity,
                receivedQuantity: isReceived ? item.orderedQuantity : new Prisma.Decimal(0),
                unitCost: item.unitCost,
                subtotal: item.subtotal,
                taxAmount: item.taxAmount,
                totalAmount: item.totalAmount,
              })),
            },
          },
        })

        // If direct receipt selected at creation time, increment stock & record movements
        if (input.initialReceipt) {
          const goodsReceipt = await tx.goodsReceipt.create({
            data: {
              id: input.initialReceipt.receiptId,
              businessId,
              purchaseId: purchase.id,
              warehouseId: input.warehouseId,
              receiptNumber: await this.documentNumbers.next(tx, businessId, 'GR', now),
              receivedAt: new Date(),
              receivedByUserId: input.actorUserId,
              notes: 'Direct receipt upon purchase creation',
              items: {
                create: input.initialReceipt.items.map(gri => ({
                  id: gri.id,
                  purchaseItemId: gri.purchaseItemId,
                  variantId: gri.variantId,
                  receivedQuantity: gri.receivedQuantity,
                  unitCost: gri.unitCost,
                })),
              },
            },
          })

          const receiptItems = [...input.initialReceipt.items].sort((a, b) => a.variantId.localeCompare(b.variantId))
          for (const item of receiptItems) {
            await this.stockLedger.increase(tx, {
              businessId,
              warehouseId: input.warehouseId,
              variantId: item.variantId,
              quantity: item.receivedQuantity,
              type: StockMovementType.PURCHASE_RECEIPT,
              referenceType: 'GOODS_RECEIPT',
              referenceId: goodsReceipt.id,
              actorUserId: input.actorUserId,
              notes: `Direct PO Receipt: ${purchase.purchaseNumber}`,
              movementId: item.stockMovementId,
            })
          }
        }

        // If initial payment provided at creation time, record payment & allocation
        if (input.initialPayment && input.initialPayment.amount.gt(0)) {
          const payment = await tx.payment.create({
            data: {
              id: input.initialPayment.paymentId,
              businessId,
              branchId: input.branchId,
              direction: PaymentDirection.OUTBOUND,
              method: input.initialPayment.method,
              amount: input.initialPayment.amount,
              currencyCode: input.currencyCode,
              paidAt: new Date(),
              reference: input.initialPayment.reference?.trim() || null,
              notes: input.initialPayment.notes?.trim() || null,
              createdByUserId: input.actorUserId,
            },
          })

          await tx.paymentAllocation.create({
            data: {
              id: input.initialPayment.allocationId,
              businessId,
              paymentId: payment.id,
              targetType: PaymentAllocationTargetType.PURCHASE,
              targetId: purchase.id,
              amount: input.initialPayment.amount,
            },
          })
        }

        await tx.auditLog.create({
          data: {
            id: input.auditId,
            businessId,
            userId: input.actorUserId,
            action: 'purchase.created',
            entityType: 'Purchase',
            entityId: purchase.id,
            after: {
              purchaseNumber: purchase.purchaseNumber,
              supplierId: purchase.supplierId,
              grandTotal: purchase.grandTotal.toString(),
              paidAmount: purchase.paidAmount.toString(),
              paymentStatus,
              lifecycleStatus,
            },
            requestId: input.requestId ?? null,
          },
        })

        return purchase
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw errors.purchaseNumberExists()
      }
      throw error
    }
  }

  async cancel(input: { purchaseId: string } & AuditInput) {
    const { businessId } = this.tenantContext.require()
    const purchase = await this.prisma.purchase.findFirst({
      where: { businessId, id: input.purchaseId },
      include: { items: true },
    })

    if (!purchase) throw errors.resourceNotFound('Purchase')
    if (purchase.lifecycleStatus === 'CANCELLED') throw errors.purchaseCancelled()
    if (purchase.lifecycleStatus === 'RECEIVED' || purchase.lifecycleStatus === 'PARTIALLY_RECEIVED') {
      throw errors.purchaseAlreadyReceived()
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.purchase.update({
        where: { businessId_id: { businessId, id: input.purchaseId } },
        data: { lifecycleStatus: PurchaseLifecycleStatus.CANCELLED },
      })

      await tx.auditLog.create({
        data: {
          id: input.auditId,
          businessId,
          userId: input.actorUserId,
          action: 'purchase.cancelled',
          entityType: 'Purchase',
          entityId: purchase.id,
          before: { lifecycleStatus: purchase.lifecycleStatus },
          after: { lifecycleStatus: updated.lifecycleStatus },
          requestId: input.requestId ?? null,
        },
      })

      return updated
    })
  }

  async receiveGoods(input: {
    receiptId: string
    purchaseId: string
    warehouseId?: string
    notes?: string
    items: Array<{
      id: string
      purchaseItemId: string
      receivedQuantity: Prisma.Decimal
      stockMovementId: string
    }>
  } & AuditInput) {
    const { businessId } = this.tenantContext.require()

    return this.prisma.$transaction(async (tx) => {
      // Lock before reading received quantities so two receipts cannot both pass the over-receipt check
      await this.lockPurchase(tx, businessId, input.purchaseId)
      const purchase = await tx.purchase.findFirst({
        where: { businessId, id: input.purchaseId },
        include: { items: true },
      })

      if (!purchase) throw errors.resourceNotFound('Purchase')
      if (purchase.lifecycleStatus === 'CANCELLED') throw errors.purchaseCancelled()
      if (purchase.lifecycleStatus === 'RECEIVED') throw errors.purchaseAlreadyReceived()

      const warehouseId = input.warehouseId || purchase.warehouseId

      // Validate warehouse exists in this business
      const warehouse = await tx.warehouse.findFirst({
        where: { businessId, id: warehouseId },
      })
      if (!warehouse) throw errors.warehouseNotFound()

      const purchaseItemMap = new Map(purchase.items.map(i => [i.id, i]))

      // Create GoodsReceipt
      const goodsReceipt = await tx.goodsReceipt.create({
        data: {
          id: input.receiptId,
          businessId,
          purchaseId: purchase.id,
          warehouseId,
          receiptNumber: await this.documentNumbers.next(tx, businessId, 'GR'),
          notes: input.notes?.trim() || null,
          receivedAt: new Date(),
          receivedByUserId: input.actorUserId,
        },
      })

      for (const item of input.items) {
        const purchaseItem = purchaseItemMap.get(item.purchaseItemId)
        if (!purchaseItem) {
          throw errors.resourceNotFound(`Purchase item ${item.purchaseItemId}`)
        }

        const remainingQty = purchaseItem.orderedQuantity.sub(purchaseItem.receivedQuantity)
        if (item.receivedQuantity.gt(remainingQty)) {
          throw errors.invalidReceiptQuantity(
            `Received quantity ${item.receivedQuantity.toString()} exceeds remaining ordered quantity ${remainingQty.toString()}`,
          )
        }

        // 1. Create GoodsReceiptItem
        await tx.goodsReceiptItem.create({
          data: {
            id: item.id,
            businessId,
            goodsReceiptId: goodsReceipt.id,
            purchaseItemId: purchaseItem.id,
            variantId: purchaseItem.variantId,
            receivedQuantity: item.receivedQuantity,
            unitCost: purchaseItem.unitCost,
          },
        })

        // 2. Update PurchaseItem.receivedQuantity
        const newReceivedQty = purchaseItem.receivedQuantity.add(item.receivedQuantity)
        await tx.purchaseItem.update({
          where: { businessId_id: { businessId, id: purchaseItem.id } },
          data: { receivedQuantity: newReceivedQty },
        })
        purchaseItem.receivedQuantity = newReceivedQty

        // 3. Increase stock with its immutable StockMovement (INV-001, PUR-003); the variant
        // always comes from the purchase line, never from the client
        await this.stockLedger.increase(tx, {
          businessId,
          warehouseId,
          variantId: purchaseItem.variantId,
          quantity: item.receivedQuantity,
          type: StockMovementType.PURCHASE_RECEIPT,
          referenceType: 'GOODS_RECEIPT',
          referenceId: goodsReceipt.id,
          actorUserId: input.actorUserId,
          notes: `PO: ${purchase.purchaseNumber}`,
          movementId: item.stockMovementId,
        })
      }

      // 5. Update purchase lifecycle status
      const allFullyReceived = purchase.items.every(i => i.receivedQuantity.gte(i.orderedQuantity))
      const newStatus = allFullyReceived
        ? PurchaseLifecycleStatus.RECEIVED
        : PurchaseLifecycleStatus.PARTIALLY_RECEIVED

      await tx.purchase.update({
        where: { businessId_id: { businessId, id: purchase.id } },
        data: { lifecycleStatus: newStatus },
      })

      // 6. Audit log
      await tx.auditLog.create({
        data: {
          id: input.auditId,
          businessId,
          userId: input.actorUserId,
          action: 'purchase.goods_received',
          entityType: 'GoodsReceipt',
          entityId: goodsReceipt.id,
          after: {
            purchaseNumber: purchase.purchaseNumber,
            receiptNumber: goodsReceipt.receiptNumber,
            newStatus,
          },
          requestId: input.requestId ?? null,
        },
      })

      return goodsReceipt
    })
  }

  async createPayment(input: {
    paymentId: string
    allocationId: string
    purchaseId: string
    amount: Prisma.Decimal
    method: PaymentMethod
    paidAt?: string
    reference?: string
    notes?: string
  } & AuditInput) {
    const { businessId } = this.tenantContext.require()

    return this.prisma.$transaction(async (tx) => {
      // Lock so concurrent payments cannot both pass the remaining-debt check
      await this.lockPurchase(tx, businessId, input.purchaseId)
      const purchase = await tx.purchase.findFirst({
        where: { businessId, id: input.purchaseId },
      })

      if (!purchase) throw errors.resourceNotFound('Purchase')
      if (purchase.lifecycleStatus === 'CANCELLED') throw errors.purchaseCancelled()

      const remainingDebt = purchase.grandTotal.sub(purchase.paidAmount)
      if (input.amount.gt(remainingDebt)) {
        throw errors.invalidPaymentAmount(
          `Payment amount ${input.amount.toString()} exceeds remaining debt ${remainingDebt.toString()}`,
        )
      }

      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          id: input.paymentId,
          businessId,
          branchId: purchase.branchId,
          direction: PaymentDirection.OUTBOUND,
          method: input.method,
          amount: input.amount,
          currencyCode: purchase.currencyCode,
          paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
          reference: input.reference?.trim() || null,
          notes: input.notes?.trim() || null,
          createdByUserId: input.actorUserId,
        },
      })

      // 2. Create PaymentAllocation (PAY-003, PAY-007)
      await tx.paymentAllocation.create({
        data: {
          id: input.allocationId,
          businessId,
          paymentId: payment.id,
          targetType: PaymentAllocationTargetType.PURCHASE,
          targetId: purchase.id,
          amount: input.amount,
        },
      })

      // 3. Update Purchase.paidAmount and paymentStatus
      const newPaidAmount = purchase.paidAmount.add(input.amount)
      const newPaymentStatus = newPaidAmount.gte(purchase.grandTotal)
        ? PurchasePaymentStatus.PAID
        : PurchasePaymentStatus.PARTIALLY_PAID

      await tx.purchase.update({
        where: { businessId_id: { businessId, id: purchase.id } },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus: newPaymentStatus,
        },
      })

      // 4. Audit log
      await tx.auditLog.create({
        data: {
          id: input.auditId,
          businessId,
          userId: input.actorUserId,
          action: 'purchase.payment_recorded',
          entityType: 'Payment',
          entityId: payment.id,
          after: {
            purchaseNumber: purchase.purchaseNumber,
            amount: input.amount.toString(),
            method: payment.method,
            newPaymentStatus,
          },
          requestId: input.requestId ?? null,
        },
      })

      return payment
    })
  }
}
