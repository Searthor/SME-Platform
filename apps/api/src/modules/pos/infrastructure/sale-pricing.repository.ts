import { Inject, Injectable } from '@nestjs/common'
import { BranchStatus } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { PrismaService } from '../../../core/database/prisma.service'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import type { PricingGroup, PricingVariant } from '../domain/sale-pricing'

/** Read-side data needed to price a sale; every query is scoped to the active business. */
@Injectable()
export class SalePricingRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
  ) {}

  /** Business currency/timezone, after checking the branch is active and within the member's scope (TEN-004). */
  async loadSellingContext(branchId: string): Promise<{ currencyCode: string; timeZone: string }> {
    const context = this.tenantContext.require()
    if (context.branchScope.kind === 'selected' && !context.branchScope.branchIds.includes(branchId)) {
      throw errors.branchAccessDenied()
    }

    const branch = await this.prisma.branch.findFirst({
      where: { businessId: context.businessId, id: branchId, status: BranchStatus.ACTIVE },
      select: { business: { select: { currencyCode: true, timezone: true } } },
    })
    if (!branch) throw errors.resourceNotFound('Branch')
    return { currencyCode: branch.business.currencyCode, timeZone: branch.business.timezone }
  }

  /** Only active variants of active, non-archived products are sellable (SAL-002). */
  async findSellableVariants(variantIds: readonly string[]): Promise<PricingVariant[]> {
    if (variantIds.length === 0) return []
    const { businessId } = this.tenantContext.require()
    const variants = await this.prisma.productVariant.findMany({
      where: { businessId, id: { in: [...variantIds] }, active: true, product: { active: true, archivedAt: null } },
      include: {
        product: { select: { id: true, name: true, trackStock: true, categoryId: true, unit: { select: { id: true, name: true } } } },
        groupPrices: { select: { customerGroupId: true, price: true } },
      },
    })

    return variants.map(variant => ({
      variantId: variant.id,
      productId: variant.product.id,
      productName: variant.product.name,
      variantName: variant.name,
      sku: variant.sku,
      unitId: variant.product.unit.id,
      unitName: variant.product.unit.name,
      categoryId: variant.product.categoryId,
      sellingPrice: variant.sellingPrice,
      cost: variant.cost,
      trackStock: variant.product.trackStock,
      groupPrices: variant.groupPrices,
    }))
  }

  async findActiveCustomer(customerId: string) {
    const { businessId } = this.tenantContext.require()
    return this.prisma.customer.findFirst({
      where: { businessId, id: customerId, active: true },
      select: { id: true, name: true, groupId: true },
    })
  }

  async findActiveGroup(groupId: string): Promise<PricingGroup | null> {
    const { businessId } = this.tenantContext.require()
    return this.prisma.customerGroup.findFirst({
      where: { businessId, id: groupId, active: true },
      select: { id: true, discountPercent: true },
    })
  }
}
