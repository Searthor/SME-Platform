import { Module } from '@nestjs/common'
import { AccessControlModule } from '../access-control/access-control.module'
import { MembershipsModule } from '../memberships/memberships.module'
import { SuppliersController } from './api/suppliers.controller'
import { SuppliersService } from './application/suppliers.service'
import { SuppliersRepository } from './infrastructure/suppliers.repository'

@Module({
  imports: [MembershipsModule, AccessControlModule],
  controllers: [SuppliersController],
  providers: [SuppliersService, SuppliersRepository],
  exports: [SuppliersService, SuppliersRepository],
})
export class SuppliersModule {}
