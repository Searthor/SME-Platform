import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { CurrentActor } from '../../../common/http/current-actor.decorator'
import type { AuthenticatedActor, AuthenticatedRequest } from '../../../common/http/request-context'
import { TenantGuard } from '../../../core/tenancy/tenant.guard'
import { CurrentTenant } from '../../../core/tenancy/current-tenant.decorator'
import type { TenantContext } from '../../../core/tenancy/tenant-context'
import { AccessControlService } from '../application/access-control.service'
import { PermissionGuard } from './permission.guard'
import { RequirePermissions } from './require-permissions.decorator'
import { CreateRoleDto } from './dto/create-role.dto'
import { UpdateRoleDto } from './dto/update-role.dto'

const metadataFrom = (request: AuthenticatedRequest) => {
  const userAgent = request.header('user-agent')
  return {
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  }
}

@Controller('access-control')
@UseGuards(TenantGuard, PermissionGuard)
export class AccessControlController {
  constructor(@Inject(AccessControlService) private readonly accessControl: AccessControlService) {}

  @Get('permissions')
  @RequirePermissions('role.view')
  listPermissions() {
    return this.accessControl.listPermissions()
  }

  @Get('roles')
  @RequirePermissions('role.view')
  listRoles() {
    return this.accessControl.listRoles()
  }

  @Post('roles')
  @RequirePermissions('role.manage')
  createRole(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: CreateRoleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.accessControl.createRole(actor.userId, dto, metadataFrom(request))
  }

  @Patch('roles/:roleId')
  @RequirePermissions('role.manage')
  updateRole(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('roleId', new ParseUUIDPipe({ version: '7' })) roleId: string,
    @Body() dto: UpdateRoleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.accessControl.updateRole(actor.userId, roleId, dto, metadataFrom(request))
  }
}

@Controller('access-control/me')
@UseGuards(TenantGuard)
export class EffectiveAccessController {
  constructor(@Inject(AccessControlService) private readonly accessControl: AccessControlService) {}

  @Get()
  get(@CurrentTenant() tenant: TenantContext) {
    return this.accessControl.listEffectivePermissions(tenant.memberId)
  }
}
