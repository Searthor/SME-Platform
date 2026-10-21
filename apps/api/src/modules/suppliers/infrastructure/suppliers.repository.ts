import { Inject, Injectable } from '@nestjs/common'
import { Prisma, SupplierStatus } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { PrismaService } from '../../../core/database/prisma.service'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import type { CreateSupplierDto } from '../api/dto/create-supplier.dto'
import type { SupplierListQueryDto } from '../api/dto/supplier-query.dto'
import type { UpdateSupplierDto } from '../api/dto/update-supplier.dto'

type AuditInput = { auditId: string; actorUserId: string; requestId?: string }

@Injectable()
export class SuppliersRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
  ) {}

  async list(query: SupplierListQueryDto) {
    const { businessId } = this.tenantContext.require()
    const where: Prisma.SupplierWhereInput = {
      businessId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
              { contactName: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: [{ name: 'asc' }],
        include: {
          purchases: {
            where: { lifecycleStatus: { not: 'CANCELLED' } },
            select: {
              grandTotal: true,
              paidAmount: true,
            },
          },
        },
      }),
      this.prisma.supplier.count({ where }),
    ])

    return {
      total,
      limit: query.limit,
      offset: query.offset,
      items: items.map((supplier) => {
        let totalPurchases = new Prisma.Decimal(0)
        let totalPaid = new Prisma.Decimal(0)

        for (const p of supplier.purchases) {
          totalPurchases = totalPurchases.add(p.grandTotal)
          totalPaid = totalPaid.add(p.paidAmount)
        }

        const outstandingDebt = totalPurchases.sub(totalPaid)

        return {
          id: supplier.id,
          businessId: supplier.businessId,
          code: supplier.code,
          name: supplier.name,
          contactName: supplier.contactName,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          taxId: supplier.taxId,
          notes: supplier.notes,
          status: supplier.status,
          totalPurchases: totalPurchases.toFixed(4),
          totalPaid: totalPaid.toFixed(4),
          outstandingDebt: outstandingDebt.isPositive() ? outstandingDebt.toFixed(4) : '0.0000',
          createdAt: supplier.createdAt,
          updatedAt: supplier.updatedAt,
        }
      }),
    }
  }

  async findById(supplierId: string) {
    const { businessId } = this.tenantContext.require()
    const supplier = await this.prisma.supplier.findFirst({
      where: { businessId, id: supplierId },
      include: {
        purchases: {
          where: { lifecycleStatus: { not: 'CANCELLED' } },
          select: {
            grandTotal: true,
            paidAmount: true,
          },
        },
      },
    })

    if (!supplier) return null

    let totalPurchases = new Prisma.Decimal(0)
    let totalPaid = new Prisma.Decimal(0)

    for (const p of supplier.purchases) {
      totalPurchases = totalPurchases.add(p.grandTotal)
      totalPaid = totalPaid.add(p.paidAmount)
    }

    const outstandingDebt = totalPurchases.sub(totalPaid)

    return {
      id: supplier.id,
      businessId: supplier.businessId,
      code: supplier.code,
      name: supplier.name,
      contactName: supplier.contactName,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      taxId: supplier.taxId,
      notes: supplier.notes,
      status: supplier.status,
      totalPurchases: totalPurchases.toFixed(4),
      totalPaid: totalPaid.toFixed(4),
      outstandingDebt: outstandingDebt.isPositive() ? outstandingDebt.toFixed(4) : '0.0000',
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    }
  }

  async create(input: { id: string } & CreateSupplierDto & AuditInput) {
    const { businessId } = this.tenantContext.require()
    try {
      return await this.prisma.$transaction(async (tx) => {
        const supplier = await tx.supplier.create({
          data: {
            id: input.id,
            businessId,
            code: input.code.trim().toUpperCase(),
            name: input.name.trim(),
            contactName: input.contactName?.trim() || null,
            phone: input.phone?.trim() || null,
            email: input.email?.trim().toLowerCase() || null,
            address: input.address?.trim() || null,
            taxId: input.taxId?.trim() || null,
            notes: input.notes?.trim() || null,
            status: SupplierStatus.ACTIVE,
          },
        })

        await tx.auditLog.create({
          data: {
            id: input.auditId,
            businessId,
            userId: input.actorUserId,
            action: 'supplier.created',
            entityType: 'Supplier',
            entityId: supplier.id,
            after: { code: supplier.code, name: supplier.name, status: supplier.status },
            requestId: input.requestId ?? null,
          },
        })

        return supplier
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw errors.supplierCodeExists()
      }
      throw error
    }
  }

  async update(input: { supplierId: string } & UpdateSupplierDto & AuditInput) {
    const { businessId } = this.tenantContext.require()
    const existing = await this.prisma.supplier.findFirst({
      where: { businessId, id: input.supplierId },
    })

    if (!existing) throw errors.resourceNotFound('Supplier')

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.supplier.update({
          where: { businessId_id: { businessId, id: input.supplierId } },
          data: {
            code: input.code.trim().toUpperCase(),
            name: input.name.trim(),
            contactName: input.contactName?.trim() || null,
            phone: input.phone?.trim() || null,
            email: input.email?.trim().toLowerCase() || null,
            address: input.address?.trim() || null,
            taxId: input.taxId?.trim() || null,
            notes: input.notes?.trim() || null,
            ...(input.status ? { status: input.status } : {}),
          },
        })

        await tx.auditLog.create({
          data: {
            id: input.auditId,
            businessId,
            userId: input.actorUserId,
            action: 'supplier.updated',
            entityType: 'Supplier',
            entityId: updated.id,
            before: { code: existing.code, name: existing.name, status: existing.status },
            after: { code: updated.code, name: updated.name, status: updated.status },
            requestId: input.requestId ?? null,
          },
        })

        return updated
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw errors.supplierCodeExists()
      }
      throw error
    }
  }

  async archive(input: { supplierId: string } & AuditInput) {
    const { businessId } = this.tenantContext.require()
    const existing = await this.prisma.supplier.findFirst({
      where: { businessId, id: input.supplierId },
    })

    if (!existing) throw errors.resourceNotFound('Supplier')

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.supplier.update({
        where: { businessId_id: { businessId, id: input.supplierId } },
        data: { status: SupplierStatus.ARCHIVED },
      })

      await tx.auditLog.create({
        data: {
          id: input.auditId,
          businessId,
          userId: input.actorUserId,
          action: 'supplier.archived',
          entityType: 'Supplier',
          entityId: updated.id,
          before: { status: existing.status },
          after: { status: updated.status },
          requestId: input.requestId ?? null,
        },
      })

      return updated
    })
  }
}
