import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { TenantGuard } from '../../../core/tenancy/tenant.guard'
import { PermissionGuard } from '../../access-control/api/permission.guard'
import { RequirePermissions } from '../../access-control/api/require-permissions.decorator'
import { CustomersService } from '../application/customers.service'
import { CreateCustomerGroupDto, CustomerGroupQueryDto, SetGroupProductPricesDto, UpdateCustomerGroupDto } from './dto/customer-group.dto'

@Controller('customer-groups')
@UseGuards(TenantGuard, PermissionGuard)
export class CustomerGroupsController {
  constructor(
    @Inject(CustomersService) private readonly customers: CustomersService,
  ) {}

  @Get()
  @RequirePermissions('customer.view')
  list(@Query() query: CustomerGroupQueryDto) {
    return this.customers.listGroups(query)
  }

  @Get(':id')
  @RequirePermissions('customer.view')
  getById(@Param('id', new ParseUUIDPipe({ version: '7' })) id: string) {
    return this.customers.getGroupById(id)
  }

  @Post()
  @RequirePermissions('customer.manage')
  create(@Body() dto: CreateCustomerGroupDto) {
    return this.customers.createGroup(dto)
  }

  @Patch(':id')
  @RequirePermissions('customer.manage')
  update(
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
    @Body() dto: UpdateCustomerGroupDto,
  ) {
    return this.customers.updateGroup(id, dto)
  }

  @Delete(':id')
  @RequirePermissions('customer.manage')
  delete(@Param('id', new ParseUUIDPipe({ version: '7' })) id: string) {
    return this.customers.deleteGroup(id)
  }

  @Get(':id/products')
  @RequirePermissions('customer.view')
  getGroupProducts(@Param('id', new ParseUUIDPipe({ version: '7' })) id: string) {
    return this.customers.getGroupProducts(id)
  }

  @Put(':id/products')
  @RequirePermissions('customer.manage')
  setGroupProducts(
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
    @Body() dto: SetGroupProductPricesDto,
  ) {
    return this.customers.setGroupProducts(id, dto.items || [])
  }

  @Delete(':id/products/:variantId')
  @RequirePermissions('customer.manage')
  removeGroupProduct(
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
    @Param('variantId', new ParseUUIDPipe({ version: '7' })) variantId: string,
  ) {
    return this.customers.removeGroupProduct(id, variantId)
  }
}
