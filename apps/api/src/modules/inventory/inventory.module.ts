import { Module } from '@nestjs/common'
import { StockLedgerRepository } from './infrastructure/stock-ledger.repository'

@Module({
  providers: [StockLedgerRepository],
  exports: [StockLedgerRepository],
})
export class InventoryModule {}
