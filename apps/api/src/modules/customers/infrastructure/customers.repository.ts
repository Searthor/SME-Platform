import { Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { PrismaService } from '../../../core/database/prisma.service'
import { IdService } from '../../../core/ids/id.service'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import type { CreateCustomerGroupDto, CustomerGroupQueryDto, UpdateCustomerGroupDto } from '../api/dto/customer-group.dto'
import type { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from '../api/dto/customer.dto'

@Injectable()
export class CustomersRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(IdService) private readonly ids: IdService,
  ) {}

  /** Group discounts and group prices change what customers pay, so every change is audited (AUD-001). */
  private async audit(
    tx: Prisma.TransactionClient,
    action: string,
    entityId: string,
    before: Prisma.InputJsonValue | null,
    after: Prisma.InputJsonValue,
  ) {
    const { businessId, userId, requestId } = this.tenantContext.require()
    await tx.auditLog.create({
      data: {
        id: this.ids.generate(),
        businessId,
        userId,
        action,
        entityType: 'CustomerGroup',
        entityId,
        before: before ?? Prisma.JsonNull,
        after,
        requestId,
      },
    })
  }

  // =========================================================================
  // CUSTOMER GROUPS
  // =========================================================================

  async listGroups(query: CustomerGroupQueryDto) {
    const { businessId } = this.tenantContext.require()
    const groups = await this.prisma.customerGroup.findMany({
      where: {
        businessId,
        ...(query.active !== undefined ? { active: query.active } : {}),
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q.trim(), mode: 'insensitive' } },
                { code: { contains: query.q.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { customers: true, groupPrices: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })

    return groups.map(g => ({
      id: g.id,
      name: g.name,
      code: g.code,
      description: g.description,
      discountPercent: Number(g.discountPercent),
      isDefault: g.isDefault,
      active: g.active,
      customerCount: g._count.customers,
      boundProductsCount: g._count.groupPrices,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    }))
  }

  async getGroupById(id: string) {
    const { businessId } = this.tenantContext.require()
    const g = await this.prisma.customerGroup.findFirst({
      where: { businessId, id },
      include: {
        _count: { select: { customers: true, groupPrices: true } },
      },
    })
    if (!g) throw errors.resourceNotFound('CustomerGroup')

    return {
      id: g.id,
      name: g.name,
      code: g.code,
      description: g.description,
      discountPercent: Number(g.discountPercent),
      isDefault: g.isDefault,
      active: g.active,
      customerCount: g._count.customers,
      boundProductsCount: g._count.groupPrices,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    }
  }

  async createGroup(dto: CreateCustomerGroupDto) {
    const { businessId } = this.tenantContext.require()

    const existingCode = await this.prisma.customerGroup.findFirst({
      where: { businessId, code: dto.code.trim().toUpperCase() },
    })
    if (existingCode) {
      throw errors.conflict('ລະຫັດກຸ່ມລູກຄ້ານີ້ມີໃນລະບົບແລ້ວ (Duplicate group code)')
    }

    const created = await this.prisma.$transaction(async tx => {
      if (dto.isDefault) {
        await tx.customerGroup.updateMany({
          where: { businessId, isDefault: true },
          data: { isDefault: false },
        })
      }

      const group = await tx.customerGroup.create({
        data: {
          id: this.ids.generate(),
          businessId,
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
          description: dto.description?.trim() || null,
          discountPercent: dto.discountPercent !== undefined ? new Prisma.Decimal(dto.discountPercent) : new Prisma.Decimal(0),
          isDefault: Boolean(dto.isDefault),
          active: true,
        },
      })
      await this.audit(tx, 'customer_group.created', group.id, null, {
        code: group.code,
        discountPercent: group.discountPercent.toString(),
      })
      return group
    })

    return this.getGroupById(created.id)
  }

  async updateGroup(id: string, dto: UpdateCustomerGroupDto) {
    const { businessId } = this.tenantContext.require()
    const group = await this.prisma.customerGroup.findFirst({
      where: { businessId, id },
    })
    if (!group) throw errors.resourceNotFound('CustomerGroup')

    const data: Prisma.CustomerGroupUpdateInput = {}
    if (dto.name !== undefined) data.name = dto.name.trim()
    if (dto.description !== undefined) data.description = dto.description.trim() || null
    if (dto.discountPercent !== undefined) data.discountPercent = new Prisma.Decimal(dto.discountPercent)
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault
    if (dto.active !== undefined) data.active = dto.active

    await this.prisma.$transaction(async tx => {
      if (dto.isDefault) {
        await tx.customerGroup.updateMany({
          where: { businessId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        })
      }
      const updated = await tx.customerGroup.update({
        where: { businessId_id: { businessId, id } },
        data,
      })
      await this.audit(
        tx,
        'customer_group.updated',
        id,
        { discountPercent: group.discountPercent.toString(), active: group.active, isDefault: group.isDefault },
        { discountPercent: updated.discountPercent.toString(), active: updated.active, isDefault: updated.isDefault },
      )
    })

    return this.getGroupById(id)
  }

  async deleteGroup(id: string) {
    const { businessId } = this.tenantContext.require()
    const group = await this.prisma.customerGroup.findFirst({
      where: { businessId, id },
    })
    if (!group) throw errors.resourceNotFound('CustomerGroup')

    await this.prisma.$transaction(async tx => {
      // Unlink any customers from this group so they become regular customers (using default prices)
      await tx.customer.updateMany({
        where: { businessId, groupId: id },
        data: { groupId: null },
      })
      // Remove any product price bindings for this group
      await tx.productVariantGroupPrice.deleteMany({
        where: { businessId, customerGroupId: id },
      })
      // Delete the group
      await tx.customerGroup.delete({
        where: { businessId_id: { businessId, id } },
      })
      await this.audit(tx, 'customer_group.deleted', id, { code: group.code, name: group.name }, { deleted: true })
    })

    return { id, deleted: true }
  }

  // =========================================================================
  // GROUP PRODUCT PRICE BINDINGS
  // =========================================================================

  async getGroupProducts(customerGroupId: string) {
    const { businessId } = this.tenantContext.require()
    const group = await this.prisma.customerGroup.findFirst({
      where: { businessId, id: customerGroupId },
    })
    if (!group) throw errors.resourceNotFound('CustomerGroup')

    const records = await this.prisma.productVariantGroupPrice.findMany({
      where: { businessId, customerGroupId },
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: { select: { id: true, name: true, code: true } },
                category: { select: { id: true, name: true } },
              },
            },
            barcodes: { select: { barcode: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return records.map(r => ({
      id: r.id,
      variantId: r.variantId,
      customerGroupId: r.customerGroupId,
      groupPrice: r.price.toString(),
      productId: r.variant.productId,
      productName: r.variant.product.name,
      variantName: r.variant.name || '',
      size: r.variant.size || '',
      color: r.variant.color || '',
      sku: r.variant.sku || '',
      normalPrice: r.variant.sellingPrice.toString(),
      cost: r.variant.cost.toString(),
      unitName: r.variant.product.unit.name,
      categoryName: r.variant.product.category?.name || 'ທົ່ວໄປ',
      barcodes: r.variant.barcodes.map(b => b.barcode),
    }))
  }

  async setGroupProducts(customerGroupId: string, items: Array<{ variantId: string; price: string }>) {
    const { businessId } = this.tenantContext.require()
    const group = await this.prisma.customerGroup.findFirst({
      where: { businessId, id: customerGroupId },
    })
    if (!group) throw errors.resourceNotFound('CustomerGroup')

    const variantIds = items.map(i => i.variantId)
    if (new Set(variantIds).size !== variantIds.length) {
      throw errors.badRequest('ສິນຄ້າແຕ່ລະລາຍການເລືອກໄດ້ຄັ້ງດຽວ (Duplicate variants)')
    }
    if (variantIds.length > 0) {
      const existingVariants = await this.prisma.productVariant.findMany({
        where: { businessId, id: { in: variantIds } },
        select: { id: true },
      })
      if (existingVariants.length !== variantIds.length) {
        throw errors.badRequest('ບາງສິນຄ້າທີ່ເລືອກບໍ່ພົບໃນລະບົບ (Some variants not found)')
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productVariantGroupPrice.deleteMany({
        where: { businessId, customerGroupId },
      })

      if (items.length > 0) {
        await tx.productVariantGroupPrice.createMany({
          data: items.map(i => ({
            id: this.ids.generate(),
            businessId,
            customerGroupId,
            variantId: i.variantId,
            price: new Prisma.Decimal(i.price),
          })),
        })
      }
      await this.audit(tx, 'customer_group.prices_set', customerGroupId, null, { prices: items })
    })

    return this.getGroupProducts(customerGroupId)
  }

  async removeGroupProduct(customerGroupId: string, variantId: string) {
    const { businessId } = this.tenantContext.require()
    await this.prisma.$transaction(async tx => {
      const removed = await tx.productVariantGroupPrice.deleteMany({
        where: { businessId, customerGroupId, variantId },
      })
      if (removed.count > 0) await this.audit(tx, 'customer_group.price_removed', customerGroupId, { variantId }, { removed: true })
    })
    return { success: true }
  }

  // =========================================================================
  // CUSTOMERS
  // =========================================================================

  async listCustomers(query: CustomerQueryDto) {
    const { businessId } = this.tenantContext.require()
    const page = query.page || 1
    const limit = query.limit || 50
    const skip = (page - 1) * limit

    const where: Prisma.CustomerWhereInput = {
      businessId,
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.groupId ? { groupId: query.groupId } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q.trim(), mode: 'insensitive' } },
              { phone: { contains: query.q.trim(), mode: 'insensitive' } },
              { code: { contains: query.q.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [total, items] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        include: {
          group: {
            select: { id: true, name: true, code: true, discountPercent: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ])

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: items.map(c => ({
        id: c.id,
        groupId: c.groupId,
        code: c.code,
        name: c.name,
        phone: c.phone,
        email: c.email,
        taxNumber: c.taxNumber,
        address: c.address,
        creditLimit: c.creditLimit.toFixed(4),
        notes: c.notes,
        active: c.active,
        group: c.group
          ? {
              id: c.group.id,
              name: c.group.name,
              code: c.group.code,
              discountPercent: Number(c.group.discountPercent),
            }
          : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    }
  }

  async getCustomerById(id: string) {
    const { businessId } = this.tenantContext.require()
    const c = await this.prisma.customer.findFirst({
      where: { businessId, id },
      include: {
        group: {
          select: { id: true, name: true, code: true, discountPercent: true },
        },
      },
    })
    if (!c) throw errors.resourceNotFound('Customer')

    return {
      id: c.id,
      groupId: c.groupId,
      code: c.code,
      name: c.name,
      phone: c.phone,
      email: c.email,
      taxNumber: c.taxNumber,
      address: c.address,
      creditLimit: c.creditLimit.toFixed(4),
      notes: c.notes,
      active: c.active,
      group: c.group
        ? {
            id: c.group.id,
            name: c.group.name,
            code: c.group.code,
            discountPercent: Number(c.group.discountPercent),
          }
        : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }
  }

  async createCustomer(dto: CreateCustomerDto) {
    const { businessId } = this.tenantContext.require()

    const groupId: string | null = dto.groupId?.trim() || null
    if (groupId) {
      const groupExists = await this.prisma.customerGroup.findFirst({
        where: { businessId, id: groupId },
      })
      if (!groupExists) throw errors.resourceNotFound('CustomerGroup')
    }

    const created = await this.prisma.customer.create({
      data: {
        id: this.ids.generate(),
        businessId,
        groupId: groupId ?? null,
        code: dto.code?.trim() || null,
        name: dto.name.trim(),
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim().toLowerCase() || null,
        taxNumber: dto.taxNumber?.trim() || null,
        address: dto.address?.trim() || null,
        creditLimit: dto.creditLimit ? new Prisma.Decimal(dto.creditLimit) : new Prisma.Decimal(0),
        notes: dto.notes?.trim() || null,
        active: true,
      },
    })

    return this.getCustomerById(created.id)
  }

  async updateCustomer(id: string, dto: UpdateCustomerDto) {
    const { businessId } = this.tenantContext.require()
    const customer = await this.prisma.customer.findFirst({
      where: { businessId, id },
    })
    if (!customer) throw errors.resourceNotFound('Customer')

    if (dto.groupId) {
      const groupExists = await this.prisma.customerGroup.findFirst({
        where: { businessId, id: dto.groupId },
      })
      if (!groupExists) throw errors.resourceNotFound('CustomerGroup')
    }

    const data: Prisma.CustomerUpdateInput = {}
    if (dto.name !== undefined) data.name = dto.name.trim()
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase() || null
    if (dto.code !== undefined) data.code = dto.code.trim() || null
    if (dto.taxNumber !== undefined) data.taxNumber = dto.taxNumber.trim() || null
    if (dto.address !== undefined) data.address = dto.address.trim() || null
    if (dto.notes !== undefined) data.notes = dto.notes.trim() || null
    if (dto.creditLimit !== undefined) data.creditLimit = new Prisma.Decimal(dto.creditLimit)
    if (dto.active !== undefined) data.active = dto.active
    if (dto.groupId !== undefined) {
      if (dto.groupId) {
        data.group = { connect: { businessId_id: { businessId, id: dto.groupId } } }
      } else {
        data.group = { disconnect: true }
      }
    }

    await this.prisma.customer.update({
      where: { businessId_id: { businessId, id } },
      data,
    })

    return this.getCustomerById(id)
  }

  async deleteCustomer(id: string) {
    const { businessId } = this.tenantContext.require()
    const customer = await this.prisma.customer.findFirst({
      where: { businessId, id },
      include: { _count: { select: { sales: true } } },
    })
    if (!customer) throw errors.resourceNotFound('Customer')

    if (customer._count.sales > 0) {
      await this.prisma.customer.update({
        where: { businessId_id: { businessId, id } },
        data: { active: false },
      })
      return { id, active: false, deactivated: true }
    }

    await this.prisma.customer.delete({
      where: { businessId_id: { businessId, id } },
    })
    return { id, deleted: true }
  }
}
