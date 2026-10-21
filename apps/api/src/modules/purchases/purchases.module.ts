import { Module } from '@nestjs/common'
import { AccessControlModule } from '../access-control/access-control.module'
import { InventoryModule } from '../inventory/inventory.module'
import { MembershipsModule } from '../memberships/memberships.module'
import { PurchasesController } from './api/purchases.controller'
import { PurchasesService } from './application/purchases.service'
import { PurchasesRepository } from './infrastructure/purchases.repository'

@Module({
  imports: [MembershipsModule, AccessControlModule, InventoryModule],
  controllers: [PurchasesController],
  providers: [PurchasesService, PurchasesRepository],
  exports: [PurchasesService, PurchasesRepository],
})
export class PurchasesModule {}
