import { Global, Module } from '@nestjs/common'
import { MembershipsModule } from '../memberships/memberships.module'
import { AccessControlController, EffectiveAccessController } from './api/access-control.controller'
import { PermissionGuard } from './api/permission.guard'
import { AccessControlService } from './application/access-control.service'
import { AccessControlRepository } from './infrastructure/access-control.repository'

@Global()
@Module({
  imports: [MembershipsModule],
  controllers: [AccessControlController, EffectiveAccessController],
  providers: [AccessControlRepository, AccessControlService, PermissionGuard],
  exports: [AccessControlService, PermissionGuard],
})
export class AccessControlModule {}
