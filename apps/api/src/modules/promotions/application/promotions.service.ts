import { Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import {
  CreatePromotionDto,
  EvaluatePromotionDto,
  PromotionQueryDto,
  PromotionRewardType,
  PromotionType,
  UpdatePromotionDto,
} from '../api/dto/promotion.dto'
import { PromotionsRepository } from '../infrastructure/promotions.repository'

export type CartEvaluationResult = {
  appliedPromotions: Array<{
    id: string
    name: string
    code: string
    type: string
    discountAmount: string
    description: string
  }>
  lineDiscounts: Record<string, string> // variantId -> discountAmount
  freeGifts: Array<{
    promotionId: string
    promotionName: string
    variantId: string
    productId?: string | undefined
    unitId?: string | undefined
    quantity: string
    unitPrice: string
    discountAmount: string // equal to unitPrice * quantity for free
  }>
  billDiscount: string
  totalDiscount: string
}

@Injectable()
export class PromotionsService {
  constructor(
    @Inject(PromotionsRepository) private readonly repository: PromotionsRepository,
  ) {}

  list(query: PromotionQueryDto) {
    return this.repository.list(query)
  }

  getById(id: string) {
    return this.repository.getById(id)
  }

  create(dto: CreatePromotionDto) {
    return this.repository.create(dto)
  }

  update(id: string, dto: UpdatePromotionDto) {
    return this.repository.update(id, dto)
  }

  delete(id: string) {
    return this.repository.delete(id)
  }

  getActivePromotions(branchId?: string, customerGroupId?: string) {
    return this.repository.getActivePromotions(new Date(), branchId, customerGroupId)
  }

  async evaluateCart(dto: EvaluatePromotionDto): Promise<CartEvaluationResult> {
    const activePromos = await this.repository.getActivePromotions(
      new Date(),
      dto.branchId,
      dto.priceGroupId,
    )

    const appliedPromotions: CartEvaluationResult['appliedPromotions'] = []
    const lineDiscounts: Record<string, Prisma.Decimal> = {}
    const freeGifts: CartEvaluationResult['freeGifts'] = []
    let billDiscount = new Prisma.Decimal(0)

    let subtotal = new Prisma.Decimal(0)
    dto.items.forEach(item => {
      const lineSubtotal = new Prisma.Decimal(item.unitPrice).mul(new Prisma.Decimal(item.quantity))
      subtotal = subtotal.add(lineSubtotal)
    })

    // Process each active promotion
    for (const promo of activePromos) {
      if (promo.type === PromotionType.BILL_TOTAL) {
        const minAmt = new Prisma.Decimal(promo.minAmount)
        if (subtotal.gte(minAmt)) {
          let disc = new Prisma.Decimal(0)
          if (promo.rewardType === PromotionRewardType.DISCOUNT_PERCENT) {
            disc = subtotal.mul(new Prisma.Decimal(promo.discountValue).div(100))
          } else if (promo.rewardType === PromotionRewardType.DISCOUNT_AMOUNT) {
            disc = new Prisma.Decimal(promo.discountValue)
          }
          if (promo.maxDiscountCap && disc.gt(new Prisma.Decimal(promo.maxDiscountCap))) {
            disc = new Prisma.Decimal(promo.maxDiscountCap)
          }

          if (disc.gt(0)) {
            billDiscount = billDiscount.add(disc)
            appliedPromotions.push({
              id: promo.id,
              name: promo.name,
              code: promo.code,
              type: promo.type,
              discountAmount: disc.toFixed(4),
              description: `ຊື້ຄົບ ${Number(promo.minAmount).toLocaleString()} ₭ ຫຼຸດ ${disc.toFixed(0)} ₭`,
            })
          }
        }
      } else if (promo.type === PromotionType.BUY_X_GET_Y) {
        // Buy X Get Y Free (same product/variant/unit)
        for (const item of dto.items) {
          const isTarget = this.itemMatchesPromoTarget(item, promo.items)
          if (!isTarget) continue

          const qty = new Prisma.Decimal(item.quantity)
          const minQty = new Prisma.Decimal(promo.minQuantity)
          if (qty.gte(minQty)) {
            const sets = Math.floor(qty.div(minQty).toNumber())
            const freeQty = new Prisma.Decimal(sets).mul(new Prisma.Decimal(promo.rewardQuantity))
            const uPrice = new Prisma.Decimal(item.unitPrice)
            const itemDiscount = uPrice.mul(freeQty).mul(new Prisma.Decimal(promo.rewardDiscountPercent).div(100))

            if (itemDiscount.gt(0)) {
              lineDiscounts[item.variantId] = (lineDiscounts[item.variantId] || new Prisma.Decimal(0)).add(itemDiscount)
              appliedPromotions.push({
                id: promo.id,
                name: promo.name,
                code: promo.code,
                type: promo.type,
                discountAmount: itemDiscount.toFixed(4),
                description: `ຊື້ ${promo.minQuantity} ແຖມ ${freeQty.toString()}`,
              })
            }
          }
        }
      } else if (promo.type === PromotionType.BUNDLE_CROSS) {
        // Buy Item A, get Item B free / discounted
        let triggerCount = 0
        for (const item of dto.items) {
          if (this.itemMatchesPromoTarget(item, promo.items)) {
            const qty = new Prisma.Decimal(item.quantity)
            const minQty = new Prisma.Decimal(promo.minQuantity)
            if (qty.gte(minQty)) {
              triggerCount += Math.floor(qty.div(minQty).toNumber())
            }
          }
        }

        if (triggerCount > 0 && promo.rewardVariantId) {
          const rewardTotalQty = new Prisma.Decimal(triggerCount).mul(new Prisma.Decimal(promo.rewardQuantity))
          freeGifts.push({
            promotionId: promo.id,
            promotionName: promo.name,
            variantId: promo.rewardVariantId,
            productId: promo.rewardProductId || undefined,
            unitId: promo.rewardUnitId || undefined,
            quantity: rewardTotalQty.toString(),
            unitPrice: '0',
            discountAmount: '0',
          })
          appliedPromotions.push({
            id: promo.id,
            name: promo.name,
            code: promo.code,
            type: promo.type,
            discountAmount: '0',
            description: `ແຖມຟຣີ ${rewardTotalQty.toString()} ລາຍການ`,
          })
        }
      } else if (promo.type === PromotionType.DISCOUNT) {
        // Time-based or item-based percentage or fixed discount
        for (const item of dto.items) {
          if (promo.items.length > 0 && !this.itemMatchesPromoTarget(item, promo.items)) {
            continue
          }

          const qty = new Prisma.Decimal(item.quantity)
          const minQty = new Prisma.Decimal(promo.minQuantity)
          if (qty.lt(minQty)) continue

          const uPrice = new Prisma.Decimal(item.unitPrice)
          let itemDiscount = new Prisma.Decimal(0)

          if (promo.rewardType === PromotionRewardType.DISCOUNT_PERCENT) {
            itemDiscount = uPrice.mul(qty).mul(new Prisma.Decimal(promo.discountValue).div(100))
          } else if (promo.rewardType === PromotionRewardType.DISCOUNT_AMOUNT) {
            itemDiscount = new Prisma.Decimal(promo.discountValue).mul(qty)
          } else if (promo.rewardType === PromotionRewardType.SPECIAL_PRICE) {
            const specialPrice = new Prisma.Decimal(promo.discountValue)
            if (uPrice.gt(specialPrice)) {
              itemDiscount = uPrice.sub(specialPrice).mul(qty)
            }
          }

          if (promo.maxDiscountCap && itemDiscount.gt(new Prisma.Decimal(promo.maxDiscountCap))) {
            itemDiscount = new Prisma.Decimal(promo.maxDiscountCap)
          }

          if (itemDiscount.gt(0)) {
            lineDiscounts[item.variantId] = (lineDiscounts[item.variantId] || new Prisma.Decimal(0)).add(itemDiscount)
            appliedPromotions.push({
              id: promo.id,
              name: promo.name,
              code: promo.code,
              type: promo.type,
              discountAmount: itemDiscount.toFixed(4),
              description: `ສ່ວນຫຼຸດສິນຄ້າ: ${itemDiscount.toFixed(0)} ₭`,
            })
          }
        }
      }
    }

    let totalDiscount = billDiscount
    const serializedLineDiscounts: Record<string, string> = {}
    for (const [k, v] of Object.entries(lineDiscounts)) {
      totalDiscount = totalDiscount.add(v)
      serializedLineDiscounts[k] = v.toFixed(4)
    }

    return {
      appliedPromotions,
      lineDiscounts: serializedLineDiscounts,
      freeGifts,
      billDiscount: billDiscount.toFixed(4),
      totalDiscount: totalDiscount.toFixed(4),
    }
  }

  private itemMatchesPromoTarget(
    item: { variantId: string; productId?: string; unitId?: string; categoryId?: string },
    targets: Array<{ productId?: string | null; variantId?: string | null; unitId?: string | null; categoryId?: string | null }>,
  ): boolean {
    if (!targets || targets.length === 0) return true // empty target means applies to all products
    return targets.some(t => {
      // If target specifies unitId and item unitId doesn't match -> false!
      if (t.unitId && item.unitId && t.unitId !== item.unitId) return false
      if (t.variantId && t.variantId === item.variantId) return true
      if (t.productId && item.productId && t.productId === item.productId) return true
      if (t.categoryId && item.categoryId && t.categoryId === item.categoryId) return true
      return false
    })
  }
}
