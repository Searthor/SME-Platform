import { Module } from '@nestjs/common'
import { AccessControlModule } from '../access-control/access-control.module'
import { MembershipsModule } from '../memberships/memberships.module'
import { AuditController } from './api/audit.controller'
import { AuditService } from './application/audit.service'
import { AuditRepository } from './infrastructure/audit.repository'

@Module({
  imports: [AccessControlModule, MembershipsModule],
  controllers: [AuditController],
  providers: [AuditRepository, AuditService],
})
export class AuditModule {}
