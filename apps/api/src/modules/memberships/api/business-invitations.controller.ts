import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common'
import { CurrentActor } from '../../../common/http/current-actor.decorator'
import type { AuthenticatedActor, AuthenticatedRequest } from '../../../common/http/request-context'
import { TenantGuard } from '../../../core/tenancy/tenant.guard'
import { PermissionGuard } from '../../access-control/api/permission.guard'
import { RequirePermissions } from '../../access-control/api/require-permissions.decorator'
import { BusinessInvitationsService } from '../application/business-invitations.service'
import { CreateInvitationDto } from './dto/create-invitation.dto'

const metadataFrom = (request: AuthenticatedRequest) => {
  const userAgent = request.header('user-agent')
  return {
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  }
}

@Controller('membership-invitations')
@UseGuards(TenantGuard, PermissionGuard)
export class BusinessInvitationsController {
  constructor(@Inject(BusinessInvitationsService) private readonly invitations: BusinessInvitationsService) {}

  @Get()
  @RequirePermissions('user.view')
  list() {
    return this.invitations.listCurrent()
  }

  @Post()
  @RequirePermissions('user.manage')
  create(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: CreateInvitationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.invitations.createCurrent(actor.userId, dto, metadataFrom(request))
  }

  @Post(':invitationId/revoke')
  @RequirePermissions('user.manage')
  revoke(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('invitationId', new ParseUUIDPipe({ version: '7' })) invitationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.invitations.revokeCurrent(invitationId, actor.userId, metadataFrom(request))
  }
}
