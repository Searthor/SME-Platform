import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common'
import { CurrentActor } from '../../../common/http/current-actor.decorator'
import type { AuthenticatedActor, AuthenticatedRequest } from '../../../common/http/request-context'
import { TenantGuard } from '../../../core/tenancy/tenant.guard'
import { PermissionGuard } from '../../access-control/api/permission.guard'
import { RequirePermissions } from '../../access-control/api/require-permissions.decorator'
import { PurchasesService } from '../application/purchases.service'
import { CreatePurchasePaymentDto } from './dto/create-payment.dto'
import { CreatePurchaseDto } from './dto/create-purchase.dto'
import { PurchaseListQueryDto } from './dto/purchase-query.dto'
import { ReceiveGoodsDto } from './dto/receive-goods.dto'

@Controller()
@UseGuards(TenantGuard, PermissionGuard)
export class PurchasesController {
  constructor(@Inject(PurchasesService) private readonly purchases: PurchasesService) {}

  @Get('warehouses')
  @RequirePermissions('purchase.view')
  listWarehouses() {
    return this.purchases.listWarehouses()
  }

  @Get('purchases')
  @RequirePermissions('purchase.view')
  list(@Query() query: PurchaseListQueryDto) {
    return this.purchases.list(query)
  }

  @Get('purchases/:purchaseId')
  @RequirePermissions('purchase.view')
  getById(@Param('purchaseId', new ParseUUIDPipe({ version: '7' })) purchaseId: string) {
    return this.purchases.getById(purchaseId)
  }

  @Post('purchases')
  @RequirePermissions('purchase.create')
  create(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: CreatePurchaseDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.purchases.create(actor.userId, dto, request.requestId)
  }

  @Post('purchases/:purchaseId/cancel')
  @RequirePermissions('purchase.create')
  cancel(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('purchaseId', new ParseUUIDPipe({ version: '7' })) purchaseId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.purchases.cancel(actor.userId, purchaseId, request.requestId)
  }

  @Post('purchases/:purchaseId/receive')
  @RequirePermissions('purchase.receive')
  receiveGoods(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('purchaseId', new ParseUUIDPipe({ version: '7' })) purchaseId: string,
    @Body() dto: ReceiveGoodsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.purchases.receiveGoods(actor.userId, purchaseId, dto, request.requestId)
  }

  @Post('purchases/:purchaseId/payments')
  @RequirePermissions('purchase.create')
  createPayment(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('purchaseId', new ParseUUIDPipe({ version: '7' })) purchaseId: string,
    @Body() dto: CreatePurchasePaymentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.purchases.createPayment(actor.userId, purchaseId, dto, request.requestId)
  }
}
