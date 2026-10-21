import { Module } from '@nestjs/common'
import { MembershipsModule } from '../memberships/memberships.module'
import { AccessControlModule } from '../access-control/access-control.module'
import { BranchesController } from './api/branches.controller'
import { BranchesService } from './application/branches.service'
import { BranchesRepository } from './infrastructure/branches.repository'

@Module({
  imports: [MembershipsModule, AccessControlModule],
  controllers: [BranchesController],
  providers: [BranchesRepository, BranchesService],
})
export class BranchesModule {}
