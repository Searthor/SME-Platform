import { Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { PrismaService } from '../../../core/database/prisma.service'
import { IdService } from '../../../core/ids/id.service'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import type { ProductListQueryDto } from '../api/dto/product.dto'

const productSelect = {
  id: true,
  businessId: true,
  name: true,
  description: true,
  categoryId: true,
  unitId: true,
  trackStock: true,
  taxCode: true,
  active: true,
  archivedAt: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  unit: { select: { id: true, code: true, name: true, decimalPlaces: true } },
  packagingUnits: {
    select: {
      id: true,
      unitId: true,
      conversionRate: true,
      sellingPrice: true,
      barcode: true,
      unit: { select: { id: true, code: true, name: true, decimalPlaces: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
  variants: {
    select: {
      id: true,
      name: true,
      size: true,
      color: true,
      sku: true,
      cost: true,
      sellingPrice: true,
      minStock: true,
      isDefault: true,
      active: true,
      barcodes: { select: { id: true, barcode: true }, orderBy: { barcode: 'asc' as const } },
      groupPrices: {
        select: {
          id: true,
          customerGroupId: true,
          price: true,
          customerGroup: { select: { id: true, name: true, code: true } },
        },
      },
      stockBalances: {
        select: {
          warehouseId: true,
          quantity: true,
        },
      },
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.ProductSelect

type ProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>

export type VariantItemInput = {
  id: string
  name: string | null
  size: string | null
  color: string | null
  sku: string | null
  cost: string
  sellingPrice: string
  minStock: string
  isDefault: boolean
  active: boolean
  barcodes: Array<{ id: string; barcode: string }>
  groupPrices?: Array<{ customerGroupId: string; price: string }>
}

export type PackagingUnitItemInput = {
  id: string
  unitId: string
  conversionRate: string
  sellingPrice: string | null
  barcode: string | null
}

export type CreateProductRepoInput = {
  productId: string
  name: string
  description: string | null
  categoryId: string | null
  unitId: string
  trackStock: boolean
  taxCode: string | null
  active: boolean
  variants: VariantItemInput[]
  packagingUnits: PackagingUnitItemInput[]
} & AuditInput

export type UpdateProductRepoInput = {
  productId: string
  version: number
  name: string
  description: string | null
  categoryId: string | null
  unitId: string
  trackStock: boolean
  taxCode: string | null
  active: boolean
  variants: VariantItemInput[]
  packagingUnits: PackagingUnitItemInput[]
} & AuditInput

type AuditInput = { auditId: string; actorUserId: string; requestId?: string }

@Injectable()
export class CatalogRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(IdService) private readonly ids: IdService,
  ) {}

  listCategories() {
    const { businessId } = this.tenantContext.require()
    return this.prisma.category.findMany({
      where: { businessId, archivedAt: null },
      select: { id: true, businessId: true, parentId: true, name: true, archivedAt: true, createdAt: true, updatedAt: true },
      orderBy: { name: 'asc' },
    })
  }

  listUnits() {
    const { businessId } = this.tenantContext.require()
    return this.prisma.unit.findMany({
      where: { businessId },
      select: { id: true, businessId: true, code: true, name: true, decimalPlaces: true, active: true, createdAt: true, updatedAt: true },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    })
  }

  async listProducts(query: ProductListQueryDto) {
    const { businessId } = this.tenantContext.require()
    const q = query.q?.trim()
    const stateWhere: Prisma.ProductWhereInput = query.status === 'ARCHIVED'
      ? { archivedAt: { not: null } }
      : query.status === 'ALL'
        ? {}
        : { archivedAt: null, active: query.status === 'ACTIVE' }
    const where: Prisma.ProductWhereInput = {
      businessId,
      ...stateWhere,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(q ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { variants: { some: { sku: { contains: q, mode: 'insensitive' } } } },
          { variants: { some: { barcodes: { some: { barcode: { contains: q, mode: 'insensitive' } } } } } },
          { variants: { some: { name: { contains: q, mode: 'insensitive' } } } },
          { packagingUnits: { some: { barcode: { contains: q, mode: 'insensitive' } } } },
        ],
      } : {}),
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: productSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ])
    return { items: rows.map(row => this.mapProduct(row)), total, page: query.page, limit: query.limit }
  }

  async findProductById(productId: string) {
    const { businessId } = this.tenantContext.require()
    const row = await this.prisma.product.findFirst({ where: { businessId, id: productId }, select: productSelect })
    return row ? this.mapProduct(row) : null
  }

  async createCategory(input: { id: string; name: string; parentId?: string } & AuditInput) {
    const { businessId } = this.tenantContext.require()
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (input.parentId) {
          const parent = await tx.category.findFirst({ where: { businessId, id: input.parentId, archivedAt: null }, select: { id: true } })
          if (!parent) throw errors.resourceNotFound('Category')
        }
        const category = await tx.category.create({
          data: { id: input.id, businessId, name: input.name, parentId: input.parentId ?? null },
          select: { id: true, businessId: true, parentId: true, name: true, archivedAt: true, createdAt: true, updatedAt: true },
        })
        await this.audit(tx, businessId, input, 'category.created', 'Category', category.id, null, { name: category.name, parentId: category.parentId })
        return category
      })
    } catch (error) {
      this.rethrowUnique(error, 'category')
    }
  }

  async updateCategory(input: { categoryId: string; name: string } & AuditInput) {
    const { businessId } = this.tenantContext.require()
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await tx.category.findFirst({ where: { businessId, id: input.categoryId, archivedAt: null }, select: { name: true, parentId: true } })
        if (!before) throw errors.resourceNotFound('Category')
        const category = await tx.category.update({
          where: { businessId_id: { businessId, id: input.categoryId } }, data: { name: input.name },
          select: { id: true, businessId: true, parentId: true, name: true, archivedAt: true, createdAt: true, updatedAt: true },
        })
        await this.audit(tx, businessId, input, 'category.updated', 'Category', category.id, before, { name: category.name, parentId: category.parentId })
        return category
      })
    } catch (error) {
      this.rethrowUnique(error, 'category')
    }
  }

  async createUnit(input: { id: string; code: string; name: string; decimalPlaces: number } & AuditInput) {
    const { businessId } = this.tenantContext.require()
    try {
      return await this.prisma.$transaction(async (tx) => {
        const unit = await tx.unit.create({
          data: { id: input.id, businessId, code: input.code, name: input.name, decimalPlaces: input.decimalPlaces },
          select: { id: true, businessId: true, code: true, name: true, decimalPlaces: true, active: true, createdAt: true, updatedAt: true },
        })
        await this.audit(tx, businessId, input, 'unit.created', 'Unit', unit.id, null, { code: unit.code, name: unit.name, decimalPlaces: unit.decimalPlaces, active: unit.active })
        return unit
      })
    } catch (error) {
      this.rethrowUnique(error, 'unit')
    }
  }

  async updateUnit(input: { unitId: string; code: string; name: string; decimalPlaces: number; active: boolean } & AuditInput) {
    const { businessId } = this.tenantContext.require()
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await tx.unit.findFirst({ where: { businessId, id: input.unitId }, select: { code: true, name: true, decimalPlaces: true, active: true } })
        if (!before) throw errors.resourceNotFound('Unit')
        const unit = await tx.unit.update({
          where: { businessId_id: { businessId, id: input.unitId } },
          data: { code: input.code, name: input.name, decimalPlaces: input.decimalPlaces, active: input.active },
          select: { id: true, businessId: true, code: true, name: true, decimalPlaces: true, active: true, createdAt: true, updatedAt: true },
        })
        await this.audit(tx, businessId, input, 'unit.updated', 'Unit', unit.id, before, { code: unit.code, name: unit.name, decimalPlaces: unit.decimalPlaces, active: unit.active })
        return unit
      })
    } catch (error) {
      this.rethrowUnique(error, 'unit')
    }
  }

  async createProduct(input: CreateProductRepoInput) {
    const { businessId } = this.tenantContext.require()
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.validateReferences(tx, businessId, input.categoryId, input.unitId, input.packagingUnits)

        await tx.product.create({
          data: {
            id: input.productId,
            businessId,
            name: input.name,
            description: input.description,
            categoryId: input.categoryId,
            unitId: input.unitId,
            trackStock: input.trackStock,
            taxCode: input.taxCode,
            active: input.active,
          },
        })

        if (input.packagingUnits.length) {
          await tx.productUnit.createMany({
            data: input.packagingUnits.map(pu => ({
              id: pu.id,
              businessId,
              productId: input.productId,
              unitId: pu.unitId,
              conversionRate: pu.conversionRate,
              sellingPrice: pu.sellingPrice,
              barcode: pu.barcode,
            })),
          })
        }

        for (const variant of input.variants) {
          const variantData: Prisma.ProductVariantCreateInput = {
            id: variant.id,
            business: { connect: { id: businessId } },
            product: { connect: { businessId_id: { businessId, id: input.productId } } },
            name: variant.name,
            size: variant.size,
            color: variant.color,
            sku: variant.sku,
            cost: variant.cost,
            sellingPrice: variant.sellingPrice,
            minStock: variant.minStock,
            isDefault: variant.isDefault,
            active: variant.active,
            barcodes: {
              create: variant.barcodes.map(b => ({
                id: b.id,
                barcode: b.barcode,
              })),
            },
          }
          if (variant.groupPrices?.length) {
            variantData.groupPrices = {
              create: variant.groupPrices.map(gp => ({
                id: this.ids.generate(),
                business: { connect: { id: businessId } },
                customerGroup: { connect: { businessId_id: { businessId, id: gp.customerGroupId } } },
                price: new Prisma.Decimal(gp.price),
              })),
            }
          }
          await tx.productVariant.create({ data: variantData })
        }

        const row = await tx.product.findUniqueOrThrow({
          where: { businessId_id: { businessId, id: input.productId } },
          select: productSelect,
        })
        const product = this.mapProduct(row)
        await this.audit(tx, businessId, input, 'product.created', 'Product', row.id, null, this.productSnapshot(product))
        return product
      })
    } catch (error) {
      this.rethrowUnique(error, 'product')
    }
  }

  async updateProduct(input: UpdateProductRepoInput) {
    const { businessId } = this.tenantContext.require()
    try {
      return await this.prisma.$transaction(async (tx) => {
        const beforeRow = await tx.product.findFirst({ where: { businessId, id: input.productId }, select: productSelect })
        if (!beforeRow) throw errors.resourceNotFound('Product')
        if (beforeRow.archivedAt) throw errors.archivedProduct()
        if (beforeRow.version !== input.version) throw errors.productVersionConflict()

        await this.validateReferences(tx, businessId, input.categoryId, input.unitId, input.packagingUnits)

        const updated = await tx.product.updateMany({
          where: { businessId, id: input.productId, version: input.version, archivedAt: null },
          data: {
            name: input.name,
            description: input.description,
            categoryId: input.categoryId,
            unitId: input.unitId,
            trackStock: input.trackStock,
            taxCode: input.taxCode,
            active: input.active,
            version: { increment: 1 },
          },
        })
        if (updated.count !== 1) throw errors.productVersionConflict()

        // Replace packaging units
        await tx.productUnit.deleteMany({ where: { businessId, productId: input.productId } })
        if (input.packagingUnits.length) {
          await tx.productUnit.createMany({
            data: input.packagingUnits.map(pu => ({
              id: pu.id,
              businessId,
              productId: input.productId,
              unitId: pu.unitId,
              conversionRate: pu.conversionRate,
              sellingPrice: pu.sellingPrice,
              barcode: pu.barcode,
            })),
          })
        }

        // Replace variants and barcodes
        await tx.productVariant.deleteMany({ where: { businessId, productId: input.productId } })
        for (const variant of input.variants) {
          const variantData: Prisma.ProductVariantCreateInput = {
            id: variant.id,
            business: { connect: { id: businessId } },
            product: { connect: { businessId_id: { businessId, id: input.productId } } },
            name: variant.name,
            size: variant.size,
            color: variant.color,
            sku: variant.sku,
            cost: variant.cost,
            sellingPrice: variant.sellingPrice,
            minStock: variant.minStock,
            isDefault: variant.isDefault,
            active: variant.active,
            barcodes: {
              create: variant.barcodes.map(b => ({
                id: b.id,
                barcode: b.barcode,
              })),
            },
          }
          if (variant.groupPrices?.length) {
            variantData.groupPrices = {
              create: variant.groupPrices.map(gp => ({
                id: this.ids.generate(),
                business: { connect: { id: businessId } },
                customerGroup: { connect: { businessId_id: { businessId, id: gp.customerGroupId } } },
                price: new Prisma.Decimal(gp.price),
              })),
            }
          }
          await tx.productVariant.create({ data: variantData })
        }

        const afterRow = await tx.product.findUniqueOrThrow({
          where: { businessId_id: { businessId, id: input.productId } },
          select: productSelect,
        })
        const before = this.mapProduct(beforeRow)
        const after = this.mapProduct(afterRow)
        await this.audit(tx, businessId, input, 'product.updated', 'Product', input.productId, this.productSnapshot(before), this.productSnapshot(after))
        return after
      })
    } catch (error) {
      this.rethrowUnique(error, 'product')
    }
  }

  async archiveProduct(input: { productId: string; version: number } & AuditInput) {
    const { businessId } = this.tenantContext.require()
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.product.findFirst({ where: { businessId, id: input.productId }, select: productSelect })
      if (!beforeRow) throw errors.resourceNotFound('Product')
      if (beforeRow.archivedAt) throw errors.archivedProduct()
      if (beforeRow.version !== input.version) throw errors.productVersionConflict()
      const archivedAt = new Date()
      const updated = await tx.product.updateMany({
        where: { businessId, id: input.productId, version: input.version, archivedAt: null },
        data: { active: false, archivedAt, version: { increment: 1 } },
      })
      if (updated.count !== 1) throw errors.productVersionConflict()
      await tx.productVariant.updateMany({ where: { businessId, productId: input.productId }, data: { active: false } })
      const afterRow = await tx.product.findUniqueOrThrow({ where: { businessId_id: { businessId, id: input.productId } }, select: productSelect })
      const before = this.mapProduct(beforeRow)
      const after = this.mapProduct(afterRow)
      await this.audit(tx, businessId, input, 'product.archived', 'Product', input.productId, this.productSnapshot(before), this.productSnapshot(after))
      return after
    })
  }

  private async validateReferences(
    tx: Prisma.TransactionClient,
    businessId: string,
    categoryId: string | null,
    unitId: string,
    packagingUnits: PackagingUnitItemInput[] = [],
  ) {
    const [unit, category] = await Promise.all([
      tx.unit.findFirst({ where: { businessId, id: unitId, active: true }, select: { id: true } }),
      categoryId ? tx.category.findFirst({ where: { businessId, id: categoryId, archivedAt: null }, select: { id: true } }) : Promise.resolve({ id: 'none' }),
    ])
    if (!unit) throw errors.resourceNotFound('Unit')
    if (!category) throw errors.resourceNotFound('Category')

    for (const pu of packagingUnits) {
      const puUnit = await tx.unit.findFirst({ where: { businessId, id: pu.unitId, active: true }, select: { id: true } })
      if (!puUnit) throw errors.resourceNotFound('Packaging Unit')
    }
  }

  private mapProduct(row: ProductRow) {
    const variants = row.variants.map(variant => {
      const stockDec = (variant.stockBalances ?? []).reduce(
        (sum, sb) => sum.add(sb.quantity),
        new Prisma.Decimal(0),
      )
      return {
        ...variant,
        cost: variant.cost.toFixed(4),
        sellingPrice: variant.sellingPrice.toFixed(4),
        minStock: variant.minStock.toFixed(6),
        stock: stockDec.toString(),
        groupPrices: (variant.groupPrices ?? []).map(gp => ({
          id: gp.id,
          customerGroupId: gp.customerGroupId,
          price: gp.price.toFixed(4),
          customerGroup: gp.customerGroup,
        })),
      }
    })

    const totalStockDec = variants.reduce(
      (sum, v) => sum.add(new Prisma.Decimal(v.stock)),
      new Prisma.Decimal(0),
    )

    return {
      ...row,
      packagingUnits: (row.packagingUnits ?? []).map(pu => ({
        ...pu,
        conversionRate: pu.conversionRate.toFixed(6),
        sellingPrice: pu.sellingPrice ? pu.sellingPrice.toFixed(4) : null,
      })),
      variants,
      totalStock: row.trackStock ? totalStockDec.toString() : null,
    }
  }

  private productSnapshot(product: ReturnType<CatalogRepository['mapProduct']>): Prisma.InputJsonObject {
    const defaultVariant = product.variants.find(v => v.isDefault) ?? product.variants[0]
    return {
      name: product.name,
      categoryId: product.categoryId,
      unitId: product.unitId,
      active: product.active,
      archivedAt: product.archivedAt?.toISOString() ?? null,
      version: product.version,
      trackStock: product.trackStock,
      taxCode: product.taxCode,
      variantsCount: product.variants.length,
      variants: product.variants.map(v => ({
        name: v.name,
        size: v.size,
        color: v.color,
        sku: v.sku,
        cost: v.cost,
        sellingPrice: v.sellingPrice,
        minStock: v.minStock,
        isDefault: v.isDefault,
        active: v.active,
        barcodes: v.barcodes.map(b => b.barcode),
      })),
      packagingUnits: product.packagingUnits.map(pu => ({
        unitId: pu.unitId,
        conversionRate: pu.conversionRate,
        sellingPrice: pu.sellingPrice,
        barcode: pu.barcode,
      })),
      sku: defaultVariant?.sku ?? null,
      cost: defaultVariant?.cost ?? '0.0000',
      sellingPrice: defaultVariant?.sellingPrice ?? '0.0000',
      minStock: defaultVariant?.minStock ?? '0.000000',
      barcodes: defaultVariant?.barcodes.map(item => item.barcode) ?? [],
    }
  }

  private audit(
    tx: Prisma.TransactionClient,
    businessId: string,
    input: AuditInput,
    action: string,
    entityType: string,
    entityId: string,
    before: Prisma.InputJsonValue | null,
    after: Prisma.InputJsonValue,
  ) {
    return tx.auditLog.create({
      data: {
        id: input.auditId, businessId, userId: input.actorUserId, action, entityType, entityId,
        before: before ?? Prisma.JsonNull, after, requestId: input.requestId ?? null,
      },
    })
  }

  private rethrowUnique(error: unknown, fallback: 'category' | 'unit' | 'product'): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : ''
      if (target.includes('barcode')) throw errors.productBarcodeExists()
      if (target.includes('sku')) throw errors.productSkuExists()
      if (fallback === 'category') throw errors.categoryNameExists()
      if (fallback === 'unit') throw errors.unitCodeExists()
      throw errors.productSkuExists()
    }
    throw error
  }
}
