import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { CurrentActor } from '../../../common/http/current-actor.decorator'
import type { AuthenticatedActor, AuthenticatedRequest } from '../../../common/http/request-context'
import { TenantGuard } from '../../../core/tenancy/tenant.guard'
import { PermissionGuard } from '../../access-control/api/permission.guard'
import { RequirePermissions } from '../../access-control/api/require-permissions.decorator'
import { MembershipsService } from '../application/memberships.service'
import { CreateMembershipDto } from './dto/create-membership.dto'
import { UpdateMembershipDto } from './dto/update-membership.dto'

const metadataFrom = (request: AuthenticatedRequest) => {
  const userAgent = request.header('user-agent')
  return {
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  }
}

@Controller('memberships')
@UseGuards(TenantGuard, PermissionGuard)
export class MembershipsController {
  constructor(@Inject(MembershipsService) private readonly memberships: MembershipsService) {}

  @Get()
  @RequirePermissions('user.view')
  list() {
    return this.memberships.listCurrent()
  }

  @Get(':memberId')
  @RequirePermissions('user.view')
  get(@Param('memberId', new ParseUUIDPipe({ version: '7' })) memberId: string) {
    return this.memberships.getCurrent(memberId)
  }

  @Post()
  @RequirePermissions('user.manage')
  create(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: CreateMembershipDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.memberships.createCurrent(actor.userId, dto, metadataFrom(request))
  }

  @Patch(':memberId')
  @RequirePermissions('user.manage')
  update(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('memberId', new ParseUUIDPipe({ version: '7' })) memberId: string,
    @Body() dto: UpdateMembershipDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.memberships.updateCurrent(actor.userId, memberId, dto, metadataFrom(request))
  }
}
