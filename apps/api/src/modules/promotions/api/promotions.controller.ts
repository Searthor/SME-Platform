import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { TenantGuard } from '../../../core/tenancy/tenant.guard'
import { PermissionGuard } from '../../access-control/api/permission.guard'
import { RequirePermissions } from '../../access-control/api/require-permissions.decorator'
import { PromotionsService } from '../application/promotions.service'
import {
  CreatePromotionDto,
  EvaluatePromotionDto,
  PromotionQueryDto,
  UpdatePromotionDto,
} from './dto/promotion.dto'

@Controller('promotions')
@UseGuards(TenantGuard, PermissionGuard)
export class PromotionsController {
  constructor(
    @Inject(PromotionsService) private readonly promotions: PromotionsService,
  ) {}

  @Get()
  @RequirePermissions('product.view')
  list(@Query() query: PromotionQueryDto) {
    return this.promotions.list(query)
  }

  @Get('active')
  @RequirePermissions('sale.view')
  getActive(
    @Query('branchId') branchId?: string,
    @Query('customerGroupId') customerGroupId?: string,
  ) {
    return this.promotions.getActivePromotions(branchId, customerGroupId)
  }

  @Post('evaluate')
  @RequirePermissions('sale.view')
  evaluate(@Body() dto: EvaluatePromotionDto) {
    return this.promotions.evaluateCart(dto)
  }

  @Get(':id')
  @RequirePermissions('product.view')
  getById(@Param('id', new ParseUUIDPipe({ version: '7' })) id: string) {
    return this.promotions.getById(id)
  }

  @Post()
  @RequirePermissions('product.create')
  create(@Body() dto: CreatePromotionDto) {
    return this.promotions.create(dto)
  }

  @Patch(':id')
  @RequirePermissions('product.update')
  update(
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotions.update(id, dto)
  }

  @Delete(':id')
  @RequirePermissions('product.delete')
  delete(@Param('id', new ParseUUIDPipe({ version: '7' })) id: string) {
    return this.promotions.delete(id)
  }
}
