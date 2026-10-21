import { Body, Controller, Get, Headers, Inject, Param, ParseEnumPipe, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common'
import { PosSessionStatus } from '@prisma/client'
import { CurrentActor } from '../../../common/http/current-actor.decorator'
import type { AuthenticatedActor } from '../../../common/http/request-context'
import { TenantGuard } from '../../../core/tenancy/tenant.guard'
import { PermissionGuard } from '../../access-control/api/permission.guard'
import { RequirePermissions } from '../../access-control/api/require-permissions.decorator'
import { PosService } from '../application/pos.service'
import {
  CashMovementDto,
  CloseSessionDto,
  CreateSaleDto,
  OpenSessionDto,
  SaleListQueryDto,
} from './dto/pos.dto'

@Controller('pos')
@UseGuards(TenantGuard, PermissionGuard)
export class PosController {
  constructor(@Inject(PosService) private readonly posService: PosService) {}

  @Get('registers')
  @RequirePermissions('sale.view')
  listRegisters(@Query('branchId') branchId?: string) {
    return this.posService.listRegisters(branchId)
  }

  @Get('sessions/current')
  @RequirePermissions('sale.view')
  getCurrentSession(
    @CurrentActor() actor: AuthenticatedActor,
    @Query('branchId') branchId?: string,
  ) {
    return this.posService.getCurrentSession(actor.userId, branchId)
  }

  @Get('sessions')
  @RequirePermissions('sale.view')
  listSessions(
    @Query('branchId') branchId?: string,
    @Query('status', new ParseEnumPipe(PosSessionStatus, { optional: true })) status?: PosSessionStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const params: { branchId?: string; status?: PosSessionStatus; limit?: number; offset?: number } = {}
    if (branchId) params.branchId = branchId
    if (status) params.status = status
    if (limit) params.limit = Number(limit)
    if (offset) params.offset = Number(offset)
    return this.posService.listSessions(params)
  }

  @Get('sessions/:id')
  @RequirePermissions('sale.view')
  getSessionById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.posService.getSessionById(id)
  }

  @Get('sessions/:id/summary')
  @RequirePermissions('sale.view')
  getSessionSummary(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.posService.getSessionSummary(id)
  }

  @Post('sessions/open')
  @RequirePermissions('sale.create')
  openSession(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: OpenSessionDto,
  ) {
    return this.posService.openSession(actor.userId, dto)
  }

  @Post('sessions/:id/cash-movement')
  @RequirePermissions('sale.create')
  recordCashMovement(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CashMovementDto,
  ) {
    return this.posService.recordCashMovement(actor.userId, id, dto)
  }

  @Post('sessions/:id/close')
  @RequirePermissions('sale.create')
  closeSession(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CloseSessionDto,
  ) {
    return this.posService.closeSession(actor.userId, id, dto)
  }

  @Get('products')
  @RequirePermissions('sale.view')
  searchProducts(
    @Query('branchId') branchId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('q') q?: string,
  ) {
    const params: { q?: string; branchId: string; warehouseId?: string } = { branchId }
    if (q) params.q = q
    if (warehouseId) params.warehouseId = warehouseId
    return this.posService.searchProducts(params)
  }

  @Post('sales')
  @RequirePermissions('sale.create')
  createSale(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: CreateSaleDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.posService.createSale(actor.userId, dto, idempotencyKey)
  }

  @Get('sales')
  @RequirePermissions('sale.view')
  listSales(@Query() query: SaleListQueryDto) {
    return this.posService.listSales(query)
  }

  @Get('sales/:id')
  @RequirePermissions('sale.view')
  getSaleById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.posService.getSaleById(id)
  }
}
