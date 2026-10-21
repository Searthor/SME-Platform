import { Module } from '@nestjs/common'
import { AccessControlModule } from '../access-control/access-control.module'
import { MembershipsModule } from '../memberships/memberships.module'
import { CustomerGroupsController } from './api/customer-groups.controller'
import { CustomersController } from './api/customers.controller'
import { CustomersService } from './application/customers.service'
import { CustomersRepository } from './infrastructure/customers.repository'

@Module({
  imports: [MembershipsModule, AccessControlModule],
  controllers: [CustomersController, CustomerGroupsController],
  providers: [CustomersService, CustomersRepository],
  exports: [CustomersService, CustomersRepository],
})
export class CustomersModule {}
