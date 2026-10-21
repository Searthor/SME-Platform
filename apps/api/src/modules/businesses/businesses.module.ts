import { Module } from '@nestjs/common'
import { MembershipsModule } from '../memberships/memberships.module'
import { AccessControlModule } from '../access-control/access-control.module'
import { BusinessesController } from './api/businesses.controller'
import { BusinessesService } from './application/businesses.service'
import { BusinessesRepository } from './infrastructure/businesses.repository'

@Module({
  imports: [MembershipsModule, AccessControlModule],
  controllers: [BusinessesController],
  providers: [BusinessesRepository, BusinessesService],
  exports: [BusinessesService],
})
export class BusinessesModule {}
