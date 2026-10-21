import { Inject, Injectable } from '@nestjs/common'
import { PaymentMethod, Prisma } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { PrismaService } from '../../../core/database/prisma.service'
import { IdempotencyService } from '../../../core/idempotency/idempotency.service'
import { IdService } from '../../../core/ids/id.service'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import type { CreatePurchasePaymentDto } from '../api/dto/create-payment.dto'
import type { CreatePurchaseDto } from '../api/dto/create-purchase.dto'
import type { PurchaseListQueryDto } from '../api/dto/purchase-query.dto'
import type { ReceiveGoodsDto } from '../api/dto/receive-goods.dto'
import { type InitialPaymentData, type InitialReceiptData, type PurchaseItemData, PurchasesRepository } from '../infrastructure/purchases.repository'

@Injectable()
export class PurchasesService {
  constructor(
    @Inject(PurchasesRepository) private readonly repository: PurchasesRepository,
    @Inject(IdService) private readonly ids: IdService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
  ) {}

  listWarehouses() {
    return this.repository.listWarehouses()
  }

  list(query: PurchaseListQueryDto) {
    return this.repository.list(query)
  }

  async getById(purchaseId: string) {
    const purchase = await this.repository.findById(purchaseId)
    if (!purchase) throw errors.resourceNotFound('Purchase')
    return purchase
  }

  async create(actorUserId: string, dto: CreatePurchaseDto, requestId?: string) {
    const { businessId } = this.tenantContext.require()
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { currencyCode: true },
    })

    if (!business) throw errors.resourceNotFound('Business')

    // Calculate financials on backend using Decimal (MON-001, MON-003)
    let grandSubtotal = new Prisma.Decimal(0)
    let grandTax = new Prisma.Decimal(0)

    const items: PurchaseItemData[] = dto.items.map((item) => {
      const orderedQty = new Prisma.Decimal(item.orderedQuantity)
      if (orderedQty.lte(0)) throw errors.invalidReceiptQuantity('Ordered quantity must be greater than zero')
      const unitCost = new Prisma.Decimal(item.unitCost)
      const subtotal = orderedQty.mul(unitCost)
      const taxAmount = item.taxAmount ? new Prisma.Decimal(item.taxAmount) : new Prisma.Decimal(0)
      const totalAmount = subtotal.add(taxAmount)

      grandSubtotal = grandSubtotal.add(subtotal)
      grandTax = grandTax.add(taxAmount)

      return {
        id: this.ids.generate(),
        variantId: item.variantId,
        orderedQuantity: orderedQty,
        unitCost,
        subtotal,
        taxAmount,
        totalAmount,
      }
    })

    const grandTotal = grandSubtotal.add(grandTax)

    let initialReceipt: InitialReceiptData | undefined
    if (dto.receiveImmediately) {
      initialReceipt = {
        receiptId: this.ids.generate(),
        items: items.map(item => ({
          id: this.ids.generate(),
          purchaseItemId: item.id,
          stockMovementId: this.ids.generate(),
          variantId: item.variantId,
          receivedQuantity: item.orderedQuantity,
          unitCost: item.unitCost,
        })),
      }
    }

    let initialPayment: InitialPaymentData | undefined
    if (dto.paidAmount) {
      const paidDecimal = new Prisma.Decimal(dto.paidAmount)
      if (paidDecimal.lt(0)) {
        throw errors.invalidPaymentAmount('Payment amount cannot be negative')
      }
      if (paidDecimal.gt(grandTotal)) {
        throw errors.invalidPaymentAmount('Payment amount cannot exceed grand total')
      }
      if (paidDecimal.gt(0)) {
        initialPayment = {
          paymentId: this.ids.generate(),
          allocationId: this.ids.generate(),
          amount: paidDecimal,
          method: (dto.paymentMethod as PaymentMethod) ?? PaymentMethod.CASH,
          ...(dto.paymentReference ? { reference: dto.paymentReference } : {}),
          ...(dto.paymentNotes ? { notes: dto.paymentNotes } : {}),
        }
      }
    }

    return this.repository.create({
      id: this.ids.generate(),
      supplierId: dto.supplierId,
      branchId: dto.branchId,
      warehouseId: dto.warehouseId,
      currencyCode: business.currencyCode,
      subtotal: grandSubtotal,
      taxAmount: grandTax,
      grandTotal,
      items,
      auditId: this.ids.generate(),
      actorUserId,
      ...(initialReceipt ? { initialReceipt } : {}),
      ...(initialPayment ? { initialPayment } : {}),
      ...(dto.notes ? { notes: dto.notes } : {}),
      ...(dto.expectedAt ? { expectedAt: dto.expectedAt } : {}),
      ...(requestId ? { requestId } : {}),
    })
  }

  cancel(actorUserId: string, purchaseId: string, requestId?: string) {
    return this.repository.cancel({
      purchaseId,
      auditId: this.ids.generate(),
      actorUserId,
      ...(requestId ? { requestId } : {}),
    })
  }

  /** Idempotency-Key makes a retried receipt return the first receipt instead of adding stock twice. */
  receiveGoods(actorUserId: string, purchaseId: string, dto: ReceiveGoodsDto, requestId?: string, idempotencyKey?: string) {
    if (dto.items.some(item => new Prisma.Decimal(item.receivedQuantity).lte(0))) {
      throw errors.invalidReceiptQuantity('Received quantity must be greater than zero')
    }
    if (new Set(dto.items.map(item => item.purchaseItemId)).size !== dto.items.length) {
      throw errors.invalidReceiptQuantity('Each purchase line can appear only once per receipt')
    }

    const items = dto.items.map(item => ({
      id: this.ids.generate(),
      purchaseItemId: item.purchaseItemId,
      receivedQuantity: new Prisma.Decimal(item.receivedQuantity),
      stockMovementId: this.ids.generate(),
    }))

    const claim = this.idempotency.prepare('purchase.receive', idempotencyKey, { purchaseId, ...dto })
    return this.idempotency.run(
      claim,
      () => this.repository.receiveGoods({
        receiptId: this.ids.generate(),
        purchaseId,
        items,
        auditId: this.ids.generate(),
        actorUserId,
        ...(dto.warehouseId ? { warehouseId: dto.warehouseId } : {}),
        ...(dto.notes ? { notes: dto.notes } : {}),
        ...(requestId ? { requestId } : {}),
      }, claim),
      receiptId => this.repository.findGoodsReceipt(receiptId),
    )
  }

  /** Idempotency-Key makes a retried payment return the first payment instead of paying twice. */
  createPayment(actorUserId: string, purchaseId: string, dto: CreatePurchasePaymentDto, requestId?: string, idempotencyKey?: string) {
    const amount = new Prisma.Decimal(dto.amount)
    if (amount.lte(0)) {
      throw errors.invalidPaymentAmount('Payment amount must be greater than zero')
    }

    const claim = this.idempotency.prepare('purchase.payment', idempotencyKey, { purchaseId, ...dto })
    return this.idempotency.run(
      claim,
      () => this.repository.createPayment({
        paymentId: this.ids.generate(),
        allocationId: this.ids.generate(),
        purchaseId,
        amount,
        method: dto.method ?? PaymentMethod.CASH,
        auditId: this.ids.generate(),
        actorUserId,
        ...(dto.paidAt ? { paidAt: dto.paidAt } : {}),
        ...(dto.reference ? { reference: dto.reference } : {}),
        ...(dto.notes ? { notes: dto.notes } : {}),
        ...(requestId ? { requestId } : {}),
      }, claim),
      paymentId => this.repository.findPayment(paymentId),
    )
  }
}
