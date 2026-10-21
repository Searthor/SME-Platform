import { Body, Controller, Get, Inject, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { CurrentActor } from '../../../common/http/current-actor.decorator'
import type { AuthenticatedActor, AuthenticatedRequest } from '../../../common/http/request-context'
import { TenantGuard } from '../../../core/tenancy/tenant.guard'
import { PermissionGuard } from '../../access-control/api/permission.guard'
import { RequirePermissions } from '../../access-control/api/require-permissions.decorator'
import { BusinessesService } from '../application/businesses.service'
import { CreateBusinessDto } from './dto/create-business.dto'
import { UpdateBusinessDto } from './dto/update-business.dto'

@Controller('business')
@UseGuards(TenantGuard, PermissionGuard)
export class BusinessesController {
  constructor(@Inject(BusinessesService) private readonly businesses: BusinessesService) {}

  @Get()
  @RequirePermissions('business.manage')
  getCurrent() {
    return this.businesses.getCurrent()
  }

  @Post()
  @RequirePermissions('business.manage')
  create(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: CreateBusinessDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const userAgent = request.header('user-agent')
    return this.businesses.create(actor.userId, dto, {
      ...(request.requestId ? { requestId: request.requestId } : {}),
      ...(request.ip ? { ipAddress: request.ip } : {}),
      ...(userAgent ? { userAgent } : {}),
    })
  }

  @Patch()
  @RequirePermissions('business.manage')
  updateCurrent(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: UpdateBusinessDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const userAgent = request.header('user-agent')
    return this.businesses.updateCurrent(actor.userId, dto, {
      ...(request.requestId ? { requestId: request.requestId } : {}),
      ...(request.ip ? { ipAddress: request.ip } : {}),
      ...(userAgent ? { userAgent } : {}),
    })
  }
}
