import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { TenantGuard } from '../../../core/tenancy/tenant.guard'
import { PermissionGuard } from '../../access-control/api/permission.guard'
import { RequirePermissions } from '../../access-control/api/require-permissions.decorator'
import { CustomersService } from '../application/customers.service'
import { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from './dto/customer.dto'

@Controller('customers')
@UseGuards(TenantGuard, PermissionGuard)
export class CustomersController {
  constructor(
    @Inject(CustomersService) private readonly customers: CustomersService,
  ) {}

  @Get()
  @RequirePermissions('customer.view')
  list(@Query() query: CustomerQueryDto) {
    return this.customers.listCustomers(query)
  }

  @Get(':id')
  @RequirePermissions('customer.view')
  getById(@Param('id', new ParseUUIDPipe({ version: '7' })) id: string) {
    return this.customers.getCustomerById(id)
  }

  @Post()
  @RequirePermissions('customer.manage')
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.createCustomer(dto)
  }

  @Patch(':id')
  @RequirePermissions('customer.manage')
  update(
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.updateCustomer(id, dto)
  }

  @Delete(':id')
  @RequirePermissions('customer.manage')
  delete(@Param('id', new ParseUUIDPipe({ version: '7' })) id: string) {
    return this.customers.deleteCustomer(id)
  }
}
