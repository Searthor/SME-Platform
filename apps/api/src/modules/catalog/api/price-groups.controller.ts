import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { TenantGuard } from '../../../core/tenancy/tenant.guard'
import { PermissionGuard } from '../../access-control/api/permission.guard'
import { RequirePermissions } from '../../access-control/api/require-permissions.decorator'
import { CustomersService } from '../../customers/application/customers.service'
import { CreateCustomerGroupDto, CustomerGroupQueryDto, SetGroupProductPricesDto, UpdateCustomerGroupDto } from '../../customers/api/dto/customer-group.dto'

@Controller('price-groups')
@UseGuards(TenantGuard, PermissionGuard)
export class PriceGroupsController {
  constructor(
    @Inject(CustomersService) private readonly customers: CustomersService,
  ) {}

  @Get()
  @RequirePermissions('product.view')
  list(@Query() query: CustomerGroupQueryDto) {
    return this.customers.listGroups(query)
  }

  @Get(':id')
  @RequirePermissions('product.view')
  getById(@Param('id', new ParseUUIDPipe({ version: '7' })) id: string) {
    return this.customers.getGroupById(id)
  }

  @Post()
  @RequirePermissions('product.create')
  create(@Body() dto: CreateCustomerGroupDto) {
    return this.customers.createGroup(dto)
  }

  @Patch(':id')
  @RequirePermissions('product.update')
  update(
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
    @Body() dto: UpdateCustomerGroupDto,
  ) {
    return this.customers.updateGroup(id, dto)
  }

  @Delete(':id')
  @RequirePermissions('product.delete')
  delete(@Param('id', new ParseUUIDPipe({ version: '7' })) id: string) {
    return this.customers.deleteGroup(id)
  }

  @Get(':id/products')
  @RequirePermissions('product.view')
  getGroupProducts(@Param('id', new ParseUUIDPipe({ version: '7' })) id: string) {
    return this.customers.getGroupProducts(id)
  }

  @Put(':id/products')
  @RequirePermissions('product.update')
  setGroupProducts(
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
    @Body() dto: SetGroupProductPricesDto,
  ) {
    return this.customers.setGroupProducts(id, dto.items || [])
  }

  @Delete(':id/products/:variantId')
  @RequirePermissions('product.update')
  removeGroupProduct(
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
    @Param('variantId', new ParseUUIDPipe({ version: '7' })) variantId: string,
  ) {
    return this.customers.removeGroupProduct(id, variantId)
  }
}
