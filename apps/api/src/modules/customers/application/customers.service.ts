import { Inject, Injectable } from '@nestjs/common'
import type { CreateCustomerGroupDto, CustomerGroupQueryDto, UpdateCustomerGroupDto } from '../api/dto/customer-group.dto'
import type { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from '../api/dto/customer.dto'
import { CustomersRepository } from '../infrastructure/customers.repository'

@Injectable()
export class CustomersService {
  constructor(
    @Inject(CustomersRepository) private readonly repository: CustomersRepository,
  ) {}

  // Groups
  listGroups(query: CustomerGroupQueryDto) {
    return this.repository.listGroups(query)
  }

  getGroupById(id: string) {
    return this.repository.getGroupById(id)
  }

  createGroup(dto: CreateCustomerGroupDto) {
    return this.repository.createGroup(dto)
  }

  updateGroup(id: string, dto: UpdateCustomerGroupDto) {
    return this.repository.updateGroup(id, dto)
  }

  deleteGroup(id: string) {
    return this.repository.deleteGroup(id)
  }

  getGroupProducts(customerGroupId: string) {
    return this.repository.getGroupProducts(customerGroupId)
  }

  setGroupProducts(customerGroupId: string, items: Array<{ variantId: string; price: string }>) {
    return this.repository.setGroupProducts(customerGroupId, items)
  }

  removeGroupProduct(customerGroupId: string, variantId: string) {
    return this.repository.removeGroupProduct(customerGroupId, variantId)
  }

  // Customers
  listCustomers(query: CustomerQueryDto) {
    return this.repository.listCustomers(query)
  }

  getCustomerById(id: string) {
    return this.repository.getCustomerById(id)
  }

  createCustomer(dto: CreateCustomerDto) {
    return this.repository.createCustomer(dto)
  }

  updateCustomer(id: string, dto: UpdateCustomerDto) {
    return this.repository.updateCustomer(id, dto)
  }

  deleteCustomer(id: string) {
    return this.repository.deleteCustomer(id)
  }
}
