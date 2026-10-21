import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { CurrentActor } from '../../../common/http/current-actor.decorator'
import type { AuthenticatedActor, AuthenticatedRequest } from '../../../common/http/request-context'
import { TenantGuard } from '../../../core/tenancy/tenant.guard'
import { PermissionGuard } from '../../access-control/api/permission.guard'
import { RequirePermissions } from '../../access-control/api/require-permissions.decorator'
import { SuppliersService } from '../application/suppliers.service'
import { CreateSupplierDto } from './dto/create-supplier.dto'
import { SupplierListQueryDto } from './dto/supplier-query.dto'
import { UpdateSupplierDto } from './dto/update-supplier.dto'

@Controller('suppliers')
@UseGuards(TenantGuard, PermissionGuard)
export class SuppliersController {
  constructor(@Inject(SuppliersService) private readonly suppliers: SuppliersService) {}

  @Get()
  @RequirePermissions('supplier.view')
  list(@Query() query: SupplierListQueryDto) {
    return this.suppliers.list(query)
  }

  @Get(':supplierId')
  @RequirePermissions('supplier.view')
  getById(@Param('supplierId', new ParseUUIDPipe({ version: '7' })) supplierId: string) {
    return this.suppliers.getById(supplierId)
  }

  @Post()
  @RequirePermissions('supplier.manage')
  create(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: CreateSupplierDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.suppliers.create(actor.userId, dto, request.requestId)
  }

  @Patch(':supplierId')
  @RequirePermissions('supplier.manage')
  update(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('supplierId', new ParseUUIDPipe({ version: '7' })) supplierId: string,
    @Body() dto: UpdateSupplierDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.suppliers.update(actor.userId, supplierId, dto, request.requestId)
  }

  @Post(':supplierId/archive')
  @RequirePermissions('supplier.manage')
  archive(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('supplierId', new ParseUUIDPipe({ version: '7' })) supplierId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.suppliers.archive(actor.userId, supplierId, request.requestId)
  }
}
