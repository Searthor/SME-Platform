import { Inject, Injectable } from '@nestjs/common'
import { Prisma, StockMovementType } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { PrismaService } from '../../../core/database/prisma.service'
import { IdService } from '../../../core/ids/id.service'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import type { CreateStockAdjustmentDto, StockBalanceQueryDto, StockMovementQueryDto } from '../api/dto/inventory.dto'
import { StockLedgerRepository } from './stock-ledger.repository'

type BalanceRow = {
  variant_id: string
  product_id: string
  product_name: string
  variant_name: string | null
  sku: string | null
  unit_name: string
  track_stock: boolean
  min_stock: Prisma.Decimal
  quantity: Prisma.Decimal
  updated_at: Date | null
}

@Injectable()
export class InventoryRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(IdService) private readonly ids: IdService,
    @Inject(StockLedgerRepository) private readonly stockLedger: StockLedgerRepository,
  ) {}

  /** Warehouse of the active business inside the member's branch scope (TEN-004). */
  private async findAccessibleWarehouse(warehouseId: string, client: Prisma.TransactionClient = this.prisma) {
    const { businessId } = this.tenantContext.require()
    const warehouse = await client.warehouse.findFirst({
      where: { businessId, id: warehouseId, status: 'ACTIVE', ...this.tenantContext.branchFilter() },
      select: { id: true, name: true, branchId: true },
    })
    if (!warehouse) throw errors.warehouseNotFound()
    return warehouse
  }

  /** Every active stock-tracked variant with its quantity in the warehouse (0 when it has never been stocked). */
  async listBalances(query: StockBalanceQueryDto) {
    const { businessId } = this.tenantContext.require()
    const warehouse = await this.findAccessibleWarehouse(query.warehouseId)
    const search = query.search?.trim()

    const conditions = [
      Prisma.sql`v."business_id" = ${businessId}::uuid`,
      Prisma.sql`v."active" = true`,
      Prisma.sql`p."active" = true`,
      Prisma.sql`p."archived_at" IS NULL`,
      Prisma.sql`p."track_stock" = true`,
    ]
    if (search) {
      const like = `%${search}%`
      conditions.push(Prisma.sql`(p."name" ILIKE ${like} OR v."name" ILIKE ${like} OR v."sku" ILIKE ${like})`)
    }
    if (query.lowStock) conditions.push(Prisma.sql`COALESCE(b."quantity", 0) <= v."min_stock"`)
    const where = Prisma.join(conditions, ' AND ')

    const from = Prisma.sql`
      FROM "product_variants" v
      JOIN "products" p ON p."business_id" = v."business_id" AND p."id" = v."product_id"
      JOIN "units" u ON u."business_id" = p."business_id" AND u."id" = p."unit_id"
      LEFT JOIN "stock_balances" b ON b."variant_id" = v."id" AND b."warehouse_id" = ${warehouse.id}::uuid`

    const [rows, totals] = await Promise.all([
      this.prisma.$queryRaw<BalanceRow[]>`
        SELECT v."id" AS variant_id, p."id" AS product_id, p."name" AS product_name, v."name" AS variant_name,
               v."sku", u."name" AS unit_name, p."track_stock", v."min_stock",
               COALESCE(b."quantity", 0) AS quantity, b."updated_at"
        ${from}
        WHERE ${where}
        ORDER BY p."name" ASC, v."name" ASC NULLS FIRST, v."id" ASC
        LIMIT ${query.limit} OFFSET ${query.offset}`,
      this.prisma.$queryRaw<Array<{ total: bigint }>>`SELECT COUNT(*) AS total ${from} WHERE ${where}`,
    ])

    return {
      warehouse,
      total: Number(totals[0]?.total ?? 0),
      limit: query.limit,
      offset: query.offset,
      items: rows.map(row => ({
        variantId: row.variant_id,
        productId: row.product_id,
        productName: row.product_name,
        variantName: row.variant_name,
        sku: row.sku,
        unitName: row.unit_name,
        quantity: new Prisma.Decimal(row.quantity).toString(),
        minStock: new Prisma.Decimal(row.min_stock).toString(),
        isLowStock: new Prisma.Decimal(row.quantity).lte(row.min_stock),
        updatedAt: row.updated_at,
      })),
    }
  }

  async listMovements(query: StockMovementQueryDto) {
    const { businessId } = this.tenantContext.require()
    if (query.warehouseId) await this.findAccessibleWarehouse(query.warehouseId)

    const where: Prisma.StockMovementWhereInput = {
      businessId,
      warehouse: { status: 'ACTIVE', ...this.tenantContext.branchFilter() },
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.variantId ? { variantId: query.variantId } : {}),
    }
    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          warehouse: { select: { id: true, name: true } },
          variant: { select: { id: true, name: true, sku: true, product: { select: { name: true } } } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ])

    return {
      total,
      limit: query.limit,
      offset: query.offset,
      items: items.map(m => ({
        id: m.id,
        type: m.type,
        quantityDelta: m.quantityDelta.toString(),
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        notes: m.notes,
        actorUserId: m.actorUserId,
        createdAt: m.createdAt,
        warehouse: m.warehouse,
        variant: { id: m.variant.id, name: m.variant.name, sku: m.variant.sku, productName: m.variant.product.name },
      })),
    }
  }

  /** One stock count document: every changed line gets an ADJUSTMENT movement, all in one transaction. */
  async adjust(actorUserId: string, dto: CreateStockAdjustmentDto) {
    const { businessId, requestId } = this.tenantContext.require()
    const variantIds = [...new Set(dto.lines.map(line => line.variantId))]
    if (variantIds.length !== dto.lines.length) throw errors.badRequest('Each variant can appear only once per adjustment')

    const adjustmentId = this.ids.generate()
    const reason = dto.reason.trim()

    return this.prisma.$transaction(async tx => {
      const warehouse = await this.findAccessibleWarehouse(dto.warehouseId, tx)
      const variants = await tx.productVariant.findMany({
        where: { businessId, id: { in: variantIds }, active: true, product: { trackStock: true, archivedAt: null } },
        select: { id: true, name: true, product: { select: { name: true } } },
      })
      if (variants.length !== variantIds.length) throw errors.resourceNotFound('Stock-tracked product variant')
      const labelById = new Map(variants.map(v => [v.id, v.name ? `${v.product.name} (${v.name})` : v.product.name]))

      // Lock balance rows in a stable order (INV-005)
      const lines = [...dto.lines].sort((a, b) => a.variantId.localeCompare(b.variantId))
      const changes: Array<{ variantId: string; countedQuantity: string; delta: string }> = []
      for (const line of lines) {
        const delta = await this.stockLedger.setCounted(tx, {
          businessId,
          warehouseId: warehouse.id,
          variantId: line.variantId,
          counted: new Prisma.Decimal(line.countedQuantity),
          type: StockMovementType.ADJUSTMENT,
          referenceType: 'STOCK_ADJUSTMENT',
          referenceId: adjustmentId,
          actorUserId,
          notes: reason,
          itemLabel: labelById.get(line.variantId) ?? line.variantId,
        })
        changes.push({ variantId: line.variantId, countedQuantity: line.countedQuantity, delta: delta.toString() })
      }

      await tx.auditLog.create({
        data: {
          id: this.ids.generate(),
          businessId,
          userId: actorUserId,
          action: 'stock.adjusted',
          entityType: 'StockAdjustment',
          entityId: adjustmentId,
          after: { warehouseId: warehouse.id, reason, lines: changes },
          requestId,
        },
      })

      return { id: adjustmentId, warehouse, reason, lines: changes }
    })
  }
}
