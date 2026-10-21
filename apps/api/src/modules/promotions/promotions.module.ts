import { Module } from '@nestjs/common'
import { AccessControlModule } from '../access-control/access-control.module'
import { MembershipsModule } from '../memberships/memberships.module'
import { PromotionsController } from './api/promotions.controller'
import { PromotionsService } from './application/promotions.service'
import { PromotionsRepository } from './infrastructure/promotions.repository'

@Module({
  imports: [MembershipsModule, AccessControlModule],
  controllers: [PromotionsController],
  providers: [PromotionsService, PromotionsRepository],
  exports: [PromotionsService, PromotionsRepository],
})
export class PromotionsModule {}
