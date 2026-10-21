import { Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import { AccessControlService } from '../../access-control/application/access-control.service'
import { isPromotionApplicable } from '../../promotions/domain/promotion-engine'
import { PromotionsRepository } from '../../promotions/infrastructure/promotions.repository'
import type { QuoteSaleDto } from '../api/dto/pos.dto'
import { calculateSaleQuote, type PricingGroup, type SaleQuote } from '../domain/sale-pricing'
import { SalePricingRepository } from '../infrastructure/sale-pricing.repository'

export type PricedSale = {
  quote: SaleQuote
  customer: { id: string; name: string } | null
}

@Injectable()
export class SalePricingService {
  constructor(
    @Inject(SalePricingRepository) private readonly repository: SalePricingRepository,
    @Inject(PromotionsRepository) private readonly promotions: PromotionsRepository,
    @Inject(AccessControlService) private readonly accessControl: AccessControlService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
  ) {}

  /** Prices a cart exactly as POST /pos/sales will: used for the POS preview and for the sale itself. */
  async price(dto: QuoteSaleDto, at: Date = new Date()): Promise<PricedSale> {
    const manualDiscount = dto.manualDiscount ? new Prisma.Decimal(dto.manualDiscount.value) : null
    if (manualDiscount && !manualDiscount.isZero()) await this.assertCanDiscount()

    const { currencyCode, timeZone } = await this.repository.loadSellingContext(dto.branchId)

    // Same variant on several lines is priced as one line
    const quantities = new Map<string, Prisma.Decimal>()
    for (const item of dto.items) {
      const quantity = new Prisma.Decimal(item.quantity)
      quantities.set(item.variantId, (quantities.get(item.variantId) ?? new Prisma.Decimal(0)).add(quantity))
    }

    const customer = dto.customerId ? await this.repository.findActiveCustomer(dto.customerId) : null
    if (dto.customerId && !customer) throw errors.resourceNotFound('Customer')
    const group = await this.resolveGroup(dto.priceGroupId ?? customer?.groupId ?? null)

    const allPromotions = await this.promotions.findActiveAt(at)
    const promotions = allPromotions.filter(promo =>
      isPromotionApplicable(promo, { branchId: dto.branchId, customerGroupId: group?.id ?? null, at, timeZone }))

    const giftVariantIds = promotions.flatMap(promo => (promo.rewardVariantId ? [promo.rewardVariantId] : []))
    const variants = await this.repository.findSellableVariants([...new Set([...quantities.keys(), ...giftVariantIds])])
    const variantById = new Map(variants.map(variant => [variant.variantId, variant]))

    const items = [...quantities].map(([variantId, quantity]) => {
      const variant = variantById.get(variantId)
      if (!variant) throw errors.resourceNotFound(`Variant ${variantId}`)
      return { variant, quantity }
    })

    const quote = calculateSaleQuote({
      currencyCode,
      items,
      giftVariants: variantById,
      group,
      promotions,
      ...(dto.manualDiscount && manualDiscount ? { manualDiscount: { type: dto.manualDiscount.type, value: manualDiscount } } : {}),
    })

    return { quote, customer: customer ? { id: customer.id, name: customer.name } : null }
  }

  private async resolveGroup(groupId: string | null): Promise<PricingGroup | null> {
    if (!groupId) return null
    const group = await this.repository.findActiveGroup(groupId)
    if (!group) throw errors.resourceNotFound('Customer group')
    return group
  }

  private async assertCanDiscount() {
    const { memberId } = this.tenantContext.require()
    if (!(await this.accessControl.hasAllPermissions(memberId, ['sale.discount']))) throw errors.discountPermissionRequired()
  }
}

/** JSON shape of a quote: money as fixed 4-decimal strings, like other POS responses. */
export const serializeQuote = ({ quote, customer }: PricedSale) => ({
  currencyCode: quote.currencyCode,
  customer,
  lines: quote.lines.map(line => ({
    variantId: line.variantId,
    productId: line.productId,
    productName: line.productName,
    variantName: line.variantName,
    sku: line.sku,
    unitName: line.unitName,
    quantity: line.quantity.toString(),
    unitPrice: line.unitPrice.toFixed(4),
    subtotal: line.subtotal.toFixed(4),
    discountAmount: line.discountAmount.toFixed(4),
    totalAmount: line.totalAmount.toFixed(4),
    isPromoGift: line.isPromoGift,
    promotionId: line.promotionId,
  })),
  appliedPromotions: quote.appliedPromotions.map(promo => ({ ...promo, discountAmount: promo.discountAmount.toFixed(4) })),
  subtotal: quote.subtotal.toFixed(4),
  lineDiscountTotal: quote.lineDiscountTotal.toFixed(4),
  billPromotionDiscount: quote.billPromotionDiscount.toFixed(4),
  manualDiscount: quote.manualDiscount.toFixed(4),
  discountAmount: quote.discountAmount.toFixed(4),
  taxAmount: quote.taxAmount.toFixed(4),
  grandTotal: quote.grandTotal.toFixed(4),
})
