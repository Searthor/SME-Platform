import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { errors } from '../../../common/errors/app.error'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import { AccessControlService } from '../application/access-control.service'
import type { PermissionCode } from '../domain/permission-catalog'
import { REQUIRED_PERMISSIONS_KEY } from './require-permissions.decorator'

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(AccessControlService) private readonly accessControl: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<readonly PermissionCode[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required?.length) throw errors.permissionDenied()

    const tenant = this.tenantContext.require()
    const allowed = await this.accessControl.hasAllPermissions(tenant.memberId, required)
    if (!allowed) throw errors.permissionDenied()
    return true
  }
}
