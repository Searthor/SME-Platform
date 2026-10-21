import { Module } from '@nestjs/common'
import { AccessControlModule } from '../access-control/access-control.module'
import { InventoryModule } from '../inventory/inventory.module'
import { MembershipsModule } from '../memberships/memberships.module'
import { PosController } from './api/pos.controller'
import { PosService } from './application/pos.service'
import { PosRepository } from './infrastructure/pos.repository'

@Module({
  imports: [MembershipsModule, AccessControlModule, InventoryModule],
  controllers: [PosController],
  providers: [PosService, PosRepository],
  exports: [PosService, PosRepository],
})
export class PosModule {}
