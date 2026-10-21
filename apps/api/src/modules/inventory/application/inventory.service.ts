import { Inject, Injectable } from '@nestjs/common'
import type { CreateStockAdjustmentDto, StockBalanceQueryDto, StockMovementQueryDto } from '../api/dto/inventory.dto'
import { InventoryRepository } from '../infrastructure/inventory.repository'

@Injectable()
export class InventoryService {
  constructor(@Inject(InventoryRepository) private readonly repository: InventoryRepository) {}

  listBalances(query: StockBalanceQueryDto) {
    return this.repository.listBalances(query)
  }

  listMovements(query: StockMovementQueryDto) {
    return this.repository.listMovements(query)
  }

  adjust(actorUserId: string, dto: CreateStockAdjustmentDto) {
    return this.repository.adjust(actorUserId, dto)
  }
}
