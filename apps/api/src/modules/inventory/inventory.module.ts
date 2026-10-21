import { Module } from '@nestjs/common'
import { AccessControlModule } from '../access-control/access-control.module'
import { MembershipsModule } from '../memberships/memberships.module'
import { InventoryController } from './api/inventory.controller'
import { InventoryService } from './application/inventory.service'
import { InventoryRepository } from './infrastructure/inventory.repository'
import { StockLedgerRepository } from './infrastructure/stock-ledger.repository'

@Module({
  imports: [MembershipsModule, AccessControlModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository, StockLedgerRepository],
  exports: [StockLedgerRepository],
})
export class InventoryModule {}
