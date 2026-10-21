import { Module } from '@nestjs/common'
import { AccessControlModule } from '../access-control/access-control.module'
import { InventoryModule } from '../inventory/inventory.module'
import { PromotionsModule } from '../promotions/promotions.module'
import { MembershipsModule } from '../memberships/memberships.module'
import { PosController } from './api/pos.controller'
import { PosService } from './application/pos.service'
import { SalePricingService } from './application/sale-pricing.service'
import { PosRepository } from './infrastructure/pos.repository'
import { SalePricingRepository } from './infrastructure/sale-pricing.repository'

@Module({
  imports: [MembershipsModule, AccessControlModule, InventoryModule, PromotionsModule],
  controllers: [PosController],
  providers: [PosService, PosRepository, SalePricingService, SalePricingRepository],
  exports: [PosService, PosRepository],
})
export class PosModule {}
