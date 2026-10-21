import { Controller, DefaultValuePipe, Get, Inject, ParseIntPipe, Query, UseGuards } from '@nestjs/common'
import { TenantGuard } from '../../../core/tenancy/tenant.guard'
import { PermissionGuard } from '../../access-control/api/permission.guard'
import { RequirePermissions } from '../../access-control/api/require-permissions.decorator'
import { AuditService } from '../application/audit.service'

@Controller('audit-logs')
@UseGuards(TenantGuard, PermissionGuard)
export class AuditController {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions('audit.view')
  list(@Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number) {
    return this.audit.listCurrent(limit)
  }
}
