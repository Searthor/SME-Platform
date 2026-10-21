import { Body, Controller, Get, Inject, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentActor } from '../../../common/http/current-actor.decorator'
import type { AuthenticatedActor } from '../../../common/http/request-context'
import { TenantGuard } from '../../../core/tenancy/tenant.guard'
import { PermissionGuard } from '../../access-control/api/permission.guard'
import { RequirePermissions } from '../../access-control/api/require-permissions.decorator'
import { InventoryService } from '../application/inventory.service'
import { CreateStockAdjustmentDto, StockBalanceQueryDto, StockMovementQueryDto } from './dto/inventory.dto'

@Controller('inventory')
@UseGuards(TenantGuard, PermissionGuard)
export class InventoryController {
  constructor(@Inject(InventoryService) private readonly inventory: InventoryService) {}

  @Get('balances')
  @RequirePermissions('stock.view')
  listBalances(@Query() query: StockBalanceQueryDto) {
    return this.inventory.listBalances(query)
  }

  @Get('movements')
  @RequirePermissions('stock.view')
  listMovements(@Query() query: StockMovementQueryDto) {
    return this.inventory.listMovements(query)
  }

  @Post('adjustments')
  @RequirePermissions('stock.adjust')
  adjust(@CurrentActor() actor: AuthenticatedActor, @Body() dto: CreateStockAdjustmentDto) {
    return this.inventory.adjust(actor.userId, dto)
  }
}
