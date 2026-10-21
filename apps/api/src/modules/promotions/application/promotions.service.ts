import { Inject, Injectable } from '@nestjs/common'
import {
  CreatePromotionDto,
  PromotionQueryDto,
  UpdatePromotionDto,
} from '../api/dto/promotion.dto'
import { isPromotionApplicable } from '../domain/promotion-engine'
import { PromotionsRepository } from '../infrastructure/promotions.repository'

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

  /** Promotions that would apply right now; cart pricing itself happens in POST /pos/quote. */
  async getActivePromotions(branchId?: string, customerGroupId?: string) {
    const at = new Date()
    const [promotions, timeZone] = await Promise.all([
      this.repository.findActiveAt(at),
      this.repository.businessTimeZone(),
    ])
    const context = { branchId: branchId ?? '', customerGroupId: customerGroupId ?? null, at, timeZone }
    return promotions.filter(promo => isPromotionApplicable(promo, context))
  }
}
