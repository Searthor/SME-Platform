import { Inject, Injectable } from '@nestjs/common'
import { Prisma, type Promotion, type PromotionItem, PromotionRewardType as PrismaRewardType, PromotionType as PrismaPromoType } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { PrismaService } from '../../../core/database/prisma.service'
import { IdService } from '../../../core/ids/id.service'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import {
  CreatePromotionDto,
  PromotionQueryDto,
  PromotionRewardType,
  UpdatePromotionDto,
} from '../api/dto/promotion.dto'

@Injectable()
export class PromotionsRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(IdService) private readonly ids: IdService,
  ) {}

  async list(query: PromotionQueryDto) {
    const { businessId } = this.tenantContext.require()
    const now = new Date()

    const where: Prisma.PromotionWhereInput = { businessId }
    if (query.q?.trim()) {
      const q = query.q.trim()
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ]
    }

    if (query.type && query.type !== 'ALL') {
      where.type = query.type as Prisma.EnumPromotionTypeFilter
    }

    if (query.active !== undefined) {
      where.active = query.active === 'true'
    }

    if (query.status === 'ACTIVE') {
      where.active = true
      where.startDate = { lte: now }
      where.endDate = { gte: now }
    } else if (query.status === 'INACTIVE') {
      where.active = false
    } else if (query.status === 'EXPIRED') {
      where.endDate = { lt: now }
    }

    const page = query.page ? Math.max(1, parseInt(query.page, 10)) : 1
    const limit = query.limit ? Math.max(1, parseInt(query.limit, 10)) : 50

    const [promos, total] = await Promise.all([
      this.prisma.promotion.findMany({
        where,
        include: {
          items: true,
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.promotion.count({ where }),
    ])

    return {
      items: promos.map(p => this.mapPromotion(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    }
  }

  async getById(id: string) {
    const { businessId } = this.tenantContext.require()
    const promo = await this.prisma.promotion.findFirst({
      where: { businessId, id },
      include: {
        items: true,
      },
    })
    if (!promo) throw errors.resourceNotFound('Promotion')
    return this.mapPromotion(promo)
  }

  async create(dto: CreatePromotionDto) {
    const { businessId } = this.tenantContext.require()
    const code = dto.code.trim().toUpperCase()

    const existing = await this.prisma.promotion.findFirst({
      where: { businessId, code },
    })
    if (existing) {
      throw errors.conflict(`Promotion code "${code}" already exists`)
    }

    const id = this.ids.generate()

    const created = await this.prisma.$transaction(async tx => {
      await tx.promotion.create({
        data: {
          id,
          businessId,
          name: dto.name.trim(),
          code,
          description: dto.description?.trim() || null,
          type: dto.type as unknown as PrismaPromoType,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          startTime: dto.startTime?.trim() || null,
          endTime: dto.endTime?.trim() || null,
          daysOfWeek: Array.isArray(dto.daysOfWeek) ? dto.daysOfWeek.join(',') : (typeof dto.daysOfWeek === 'string' ? dto.daysOfWeek.trim() : null),
          branchScope: dto.branchId || dto.branchScope?.trim() || null,
          customerGroupScope: dto.customerGroupId || dto.customerGroupScope?.trim() || null,
          minQuantity: dto.minQuantity ? new Prisma.Decimal(dto.minQuantity) : new Prisma.Decimal(1),
          minAmount: dto.minAmount ? new Prisma.Decimal(dto.minAmount) : new Prisma.Decimal(0),
          rewardType: (dto.rewardType || PromotionRewardType.DISCOUNT_PERCENT) as unknown as PrismaRewardType,
          discountValue: dto.discountValue ? new Prisma.Decimal(dto.discountValue) : new Prisma.Decimal(0),
          rewardQuantity: dto.rewardQuantity ? new Prisma.Decimal(dto.rewardQuantity) : new Prisma.Decimal(1),
          rewardDiscountPercent: dto.rewardDiscountPercent ? new Prisma.Decimal(dto.rewardDiscountPercent) : new Prisma.Decimal(100),
          rewardProductId: dto.rewardProductId || null,
          rewardVariantId: dto.rewardVariantId || null,
          rewardUnitId: dto.rewardUnitId || null,
          maxDiscountCap: dto.maxDiscountCap ? new Prisma.Decimal(dto.maxDiscountCap) : null,
          active: dto.active ?? true,
        },
      })

      if (dto.items && dto.items.length > 0) {
        await tx.promotionItem.createMany({
          data: dto.items.map(i => ({
            id: this.ids.generate(),
            businessId,
            promotionId: id,
            productId: i.productId || null,
            variantId: i.variantId || null,
            unitId: i.unitId || null,
            categoryId: i.categoryId || null,
          })),
        })
      }

      return tx.promotion.findFirst({
        where: { businessId, id },
        include: { items: true },
      })
    })

    return this.mapPromotion(created!)
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const { businessId } = this.tenantContext.require()
    const existing = await this.prisma.promotion.findFirst({
      where: { businessId, id },
    })
    if (!existing) throw errors.resourceNotFound('Promotion')

    const data: Prisma.PromotionUpdateInput = {}
    if (dto.name !== undefined) data.name = dto.name.trim()
    if (dto.description !== undefined) data.description = dto.description?.trim() || null
    if (dto.type !== undefined) data.type = dto.type as unknown as PrismaPromoType
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate)
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate)
    if (dto.startTime !== undefined) data.startTime = dto.startTime?.trim() || null
    if (dto.endTime !== undefined) data.endTime = dto.endTime?.trim() || null
    if (dto.daysOfWeek !== undefined) {
      data.daysOfWeek = Array.isArray(dto.daysOfWeek) ? dto.daysOfWeek.join(',') : (typeof dto.daysOfWeek === 'string' ? dto.daysOfWeek.trim() : null)
    }
    if (dto.branchId !== undefined || dto.branchScope !== undefined) {
      data.branchScope = dto.branchId || dto.branchScope?.trim() || null
    }
    if (dto.customerGroupId !== undefined || dto.customerGroupScope !== undefined) {
      data.customerGroupScope = dto.customerGroupId || dto.customerGroupScope?.trim() || null
    }
    if (dto.minQuantity !== undefined) data.minQuantity = new Prisma.Decimal(dto.minQuantity)
    if (dto.minAmount !== undefined) data.minAmount = new Prisma.Decimal(dto.minAmount)
    if (dto.rewardType !== undefined) data.rewardType = dto.rewardType as unknown as PrismaRewardType
    if (dto.discountValue !== undefined) data.discountValue = new Prisma.Decimal(dto.discountValue)
    if (dto.rewardQuantity !== undefined) data.rewardQuantity = new Prisma.Decimal(dto.rewardQuantity)
    if (dto.rewardDiscountPercent !== undefined) data.rewardDiscountPercent = new Prisma.Decimal(dto.rewardDiscountPercent)
    if (dto.rewardProductId !== undefined) data.rewardProductId = dto.rewardProductId || null
    if (dto.rewardVariantId !== undefined) data.rewardVariantId = dto.rewardVariantId || null
    if (dto.rewardUnitId !== undefined) data.rewardUnitId = dto.rewardUnitId || null
    if (dto.maxDiscountCap !== undefined) data.maxDiscountCap = dto.maxDiscountCap ? new Prisma.Decimal(dto.maxDiscountCap) : null
    if (dto.active !== undefined) data.active = dto.active

    const updated = await this.prisma.$transaction(async tx => {
      await tx.promotion.update({
        where: { businessId_id: { businessId, id } },
        data,
      })

      if (dto.items !== undefined) {
        await tx.promotionItem.deleteMany({
          where: { businessId, promotionId: id },
        })
        if (dto.items.length > 0) {
          await tx.promotionItem.createMany({
            data: dto.items.map(i => ({
              id: this.ids.generate(),
              businessId,
              promotionId: id,
              productId: i.productId || null,
              variantId: i.variantId || null,
              unitId: i.unitId || null,
              categoryId: i.categoryId || null,
            })),
          })
        }
      }

      return tx.promotion.findFirst({
        where: { businessId, id },
        include: { items: true },
      })
    })

    return this.mapPromotion(updated!)
  }

  async delete(id: string) {
    const { businessId } = this.tenantContext.require()
    const existing = await this.prisma.promotion.findFirst({
      where: { businessId, id },
    })
    if (!existing) throw errors.resourceNotFound('Promotion')

    await this.prisma.$transaction(async tx => {
      await tx.promotionItem.deleteMany({
        where: { businessId, promotionId: id },
      })
      await tx.promotion.delete({
        where: { businessId_id: { businessId, id } },
      })
    })

    return { id, deleted: true }
  }

  async getActivePromotions(now = new Date(), branchId?: string, customerGroupId?: string) {
    const { businessId } = this.tenantContext.require()

    const promos = await this.prisma.promotion.findMany({
      where: {
        businessId,
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        items: true,
      },
      orderBy: [{ minQuantity: 'desc' }, { discountValue: 'desc' }],
    })

    // Filter by branch, customerGroup, daysOfWeek, and happy hour time
    const dayOfWeek = String(now.getDay()) // 0=Sun, 1=Mon, ..., 6=Sat
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    return promos.filter(p => {
      if (p.branchScope && branchId && p.branchScope !== branchId) return false
      if (p.customerGroupScope && customerGroupId && p.customerGroupScope !== customerGroupId) return false
      if (p.daysOfWeek) {
        const allowedDays = p.daysOfWeek.split(',').map(d => d.trim())
        if (!allowedDays.includes(dayOfWeek)) return false
      }
      if (p.startTime && p.endTime) {
        if (currentTimeStr < p.startTime || currentTimeStr > p.endTime) return false
      }
      return true
    })
  }

  private mapPromotion(p: Promotion & { items?: PromotionItem[] }) {
    const now = new Date()
    let status = 'ACTIVE'
    if (!p.active) {
      status = 'INACTIVE'
    } else if (p.endDate < now) {
      status = 'EXPIRED'
    } else if (p.startDate > now) {
      status = 'SCHEDULED'
    }

    return {
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      type: p.type,
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
      startTime: p.startTime,
      endTime: p.endTime,
      daysOfWeek: p.daysOfWeek,
      branchScope: p.branchScope,
      customerGroupScope: p.customerGroupScope,
      minQuantity: p.minQuantity.toString(),
      minAmount: p.minAmount.toString(),
      rewardType: p.rewardType,
      discountValue: p.discountValue.toString(),
      rewardQuantity: p.rewardQuantity.toString(),
      rewardDiscountPercent: p.rewardDiscountPercent.toString(),
      rewardProductId: p.rewardProductId,
      rewardVariantId: p.rewardVariantId,
      rewardUnitId: p.rewardUnitId,
      maxDiscountCap: p.maxDiscountCap ? p.maxDiscountCap.toString() : null,
      active: p.active,
      status,
      items: (p.items || []).map(i => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        unitId: i.unitId,
        categoryId: i.categoryId,
      })),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }
  }
}
