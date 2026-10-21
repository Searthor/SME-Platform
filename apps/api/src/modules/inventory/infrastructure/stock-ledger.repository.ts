import { Inject, Injectable } from '@nestjs/common'
import { Prisma, type StockMovementType } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { IdService } from '../../../core/ids/id.service'

export type StockChange = {
  businessId: string
  warehouseId: string
  variantId: string
  /** Always positive; the direction comes from increase/decrease. */
  quantity: Prisma.Decimal
  type: StockMovementType
  referenceType: string
  referenceId: string
  actorUserId: string
  notes?: string | null
  movementId?: string
  /** Used in the insufficient-stock message. */
  itemLabel?: string
}

/**
 * Single write path for stock_balances. Each change is one atomic SQL statement (so concurrent
 * requests cannot lose updates) plus its immutable stock movement (Rule 8), on the caller's transaction.
 * Callers changing several rows should apply them in a stable order (e.g. by variantId) to avoid deadlocks.
 */
@Injectable()
export class StockLedgerRepository {
  constructor(@Inject(IdService) private readonly ids: IdService) {}

  async increase(tx: Prisma.TransactionClient, change: StockChange): Promise<void> {
    this.assertPositive(change.quantity)
    await tx.$executeRaw`
      INSERT INTO "stock_balances" ("id", "business_id", "warehouse_id", "variant_id", "quantity", "version", "updated_at")
      VALUES (${this.ids.generate()}::uuid, ${change.businessId}::uuid, ${change.warehouseId}::uuid, ${change.variantId}::uuid,
              ${change.quantity.toString()}::numeric, 1, now())
      ON CONFLICT ("warehouse_id", "variant_id")
      DO UPDATE SET "quantity" = "stock_balances"."quantity" + EXCLUDED."quantity",
                    "version" = "stock_balances"."version" + 1,
                    "updated_at" = now()`
    await this.recordMovement(tx, change, change.quantity)
  }

  /** Fails with INSUFFICIENT_STOCK instead of letting the balance go negative. */
  async decrease(tx: Prisma.TransactionClient, change: StockChange): Promise<void> {
    this.assertPositive(change.quantity)
    const quantity = change.quantity.toString()
    const updated = await tx.$executeRaw`
      UPDATE "stock_balances"
         SET "quantity" = "quantity" - ${quantity}::numeric,
             "version" = "version" + 1,
             "updated_at" = now()
       WHERE "business_id" = ${change.businessId}::uuid
         AND "warehouse_id" = ${change.warehouseId}::uuid
         AND "variant_id" = ${change.variantId}::uuid
         AND "quantity" >= ${quantity}::numeric`

    if (updated === 0) {
      const balance = await tx.stockBalance.findUnique({
        where: { warehouseId_variantId: { warehouseId: change.warehouseId, variantId: change.variantId } },
        select: { quantity: true },
      })
      const available = balance ? balance.quantity.toString() : '0'
      throw errors.insufficientStock(
        `ສິນຄ້າ "${change.itemLabel ?? change.variantId}" ມີຈຳນວນໃນສາງບໍ່ພໍ (ມີພຽງ ${available}, ຕ້ອງການ ${quantity})`,
      )
    }

    await this.recordMovement(tx, change, change.quantity.negated())
  }

  private async recordMovement(tx: Prisma.TransactionClient, change: StockChange, quantityDelta: Prisma.Decimal) {
    await tx.stockMovement.create({
      data: {
        id: change.movementId ?? this.ids.generate(),
        businessId: change.businessId,
        warehouseId: change.warehouseId,
        variantId: change.variantId,
        type: change.type,
        quantityDelta,
        referenceType: change.referenceType,
        referenceId: change.referenceId,
        actorUserId: change.actorUserId,
        notes: change.notes ?? null,
      },
    })
  }

  private assertPositive(quantity: Prisma.Decimal) {
    if (!quantity.gt(0)) throw errors.badRequest('Stock change quantity must be greater than zero')
  }
}
