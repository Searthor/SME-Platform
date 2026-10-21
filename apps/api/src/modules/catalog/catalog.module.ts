import { Module } from '@nestjs/common'
import { AccessControlModule } from '../access-control/access-control.module'
import { MembershipsModule } from '../memberships/memberships.module'
import { CustomersModule } from '../customers/customers.module'
import { CatalogController } from './api/catalog.controller'
import { PriceGroupsController } from './api/price-groups.controller'
import { CatalogService } from './application/catalog.service'
import { CatalogRepository } from './infrastructure/catalog.repository'

@Module({
  imports: [MembershipsModule, AccessControlModule, CustomersModule],
  controllers: [CatalogController, PriceGroupsController],
  providers: [CatalogRepository, CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
