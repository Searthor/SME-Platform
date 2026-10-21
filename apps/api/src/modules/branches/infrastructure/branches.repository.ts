import { Inject, Injectable } from '@nestjs/common'
import { BranchStatus, Prisma } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { PrismaService } from '../../../core/database/prisma.service'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import { defaultWarehouseFor } from '../../inventory/domain/default-warehouse'

@Injectable()
export class BranchesRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
  ) {}

  listCurrent() {
    const context = this.tenantContext.require()
    return this.prisma.branch.findMany({
      where: {
        businessId: context.businessId,
        ...(context.branchScope.kind === 'selected' ? { id: { in: [...context.branchScope.branchIds] } } : {}),
      },
      select: { id: true, businessId: true, code: true, name: true, status: true, createdAt: true, updatedAt: true },
      orderBy: { name: 'asc' },
    })
  }

  findCurrentById(branchId: string) {
    const context = this.tenantContext.require()
    if (context.branchScope.kind === 'selected' && !context.branchScope.branchIds.includes(branchId)) {
      return null
    }
    return this.prisma.branch.findFirst({
      where: { businessId: context.businessId, id: branchId },
      select: { id: true, businessId: true, code: true, name: true, status: true, createdAt: true, updatedAt: true },
    })
  }

  async createCurrent(input: {
    id: string
    auditId: string
    actorUserId: string
    code: string
    name: string
    warehouseId: string
    requestId?: string
  }) {
    const context = this.tenantContext.require()
    if (context.branchScope.kind !== 'all') throw errors.branchAccessDenied()
    try {
      return await this.prisma.$transaction(async (tx) => {
        const branch = await tx.branch.create({
          data: { id: input.id, businessId: context.businessId, code: input.code, name: input.name },
          select: { id: true, businessId: true, code: true, name: true, status: true, createdAt: true, updatedAt: true },
        })
        await tx.warehouse.create({ data: defaultWarehouseFor(input.warehouseId, branch) })
        await tx.auditLog.create({
          data: {
            id: input.auditId,
            businessId: context.businessId,
            userId: input.actorUserId,
            action: 'branch.created',
            entityType: 'Branch',
            entityId: branch.id,
            after: { code: branch.code, name: branch.name, status: branch.status },
            requestId: input.requestId ?? null,
          },
        })
        return branch
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw errors.branchCodeExists()
      }
      throw error
    }
  }

  async updateCurrent(input: {
    branchId: string
    auditId: string
    actorUserId: string
    code: string
    name: string
    status: BranchStatus
    requestId?: string
  }) {
    const context = this.tenantContext.require()
    if (context.branchScope.kind === 'selected' && !context.branchScope.branchIds.includes(input.branchId)) {
      throw errors.resourceNotFound('Branch')
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await tx.branch.findFirst({
          where: { businessId: context.businessId, id: input.branchId },
          select: { code: true, name: true, status: true },
        })
        if (!before) throw errors.resourceNotFound('Branch')
        const after = await tx.branch.update({
          where: { businessId_id: { businessId: context.businessId, id: input.branchId } },
          data: { code: input.code, name: input.name, status: input.status },
          select: { id: true, businessId: true, code: true, name: true, status: true, createdAt: true, updatedAt: true },
        })
        await tx.auditLog.create({
          data: {
            id: input.auditId,
            businessId: context.businessId,
            userId: input.actorUserId,
            action: 'branch.updated',
            entityType: 'Branch',
            entityId: after.id,
            before,
            after: { code: after.code, name: after.name, status: after.status },
            requestId: input.requestId ?? null,
          },
        })
        return after
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw errors.branchCodeExists()
      }
      throw error
    }
  }
}
