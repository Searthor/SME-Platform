import { Inject, Injectable } from '@nestjs/common'
import { BusinessStatus, type Prisma } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { PrismaService } from '../../../core/database/prisma.service'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import { defaultWarehouseFor } from '../../inventory/domain/default-warehouse'

@Injectable()
export class BusinessesRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
  ) {}

  findCurrent() {
    const { businessId } = this.tenantContext.require()
    return this.prisma.business.findFirst({
      where: { id: businessId, status: BusinessStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        currencyCode: true,
        timezone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  updateCurrent(input: {
    auditId: string
    actorUserId: string
    name: string
    currencyCode: string
    timezone: string
    metadata: { requestId?: string; ipAddress?: string; userAgent?: string }
  }) {
    const { businessId } = this.tenantContext.require()
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.business.findFirst({ where: { id: businessId, status: BusinessStatus.ACTIVE } })
      if (!before) throw errors.resourceNotFound('Business')
      const after = await tx.business.update({
        where: { id: businessId },
        data: { name: input.name, currencyCode: input.currencyCode, timezone: input.timezone },
        select: {
          id: true, name: true, currencyCode: true, timezone: true, status: true,
          createdAt: true, updatedAt: true,
        },
      })
      await tx.auditLog.create({
        data: {
          id: input.auditId,
          businessId,
          userId: input.actorUserId,
          action: 'business.updated',
          entityType: 'Business',
          entityId: businessId,
          before: this.snapshot(before),
          after: this.snapshot(after),
          requestId: input.metadata.requestId ?? null,
          ipAddress: input.metadata.ipAddress ?? null,
          userAgent: input.metadata.userAgent ?? null,
        },
      })
      return after
    })
  }

  createBusiness(input: {
    businessId: string
    name: string
    currencyCode: string
    timezone: string
    branchId: string
    branchCode: string
    branchName: string
    warehouseId: string
    memberId: string
    actorUserId: string
    defaultRoles: ReadonlyArray<{
      id: string
      code: string
      name: string
      isSystem: boolean
      permissions: readonly string[]
    }>
    auditId: string
    metadata: { requestId?: string; ipAddress?: string; userAgent?: string }
  }) {
    return this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          id: input.businessId,
          name: input.name,
          currencyCode: input.currencyCode,
          timezone: input.timezone,
        },
      })
      const branch = await tx.branch.create({
        data: {
          id: input.branchId,
          businessId: business.id,
          code: input.branchCode,
          name: input.branchName,
        },
      })
      await tx.warehouse.create({ data: defaultWarehouseFor(input.warehouseId, branch) })
      const member = await tx.businessMember.create({
        data: {
          id: input.memberId,
          businessId: business.id,
          userId: input.actorUserId,
          allBranches: true,
        },
      })
      await tx.role.createMany({
        data: input.defaultRoles.map(role => ({
          id: role.id,
          businessId: business.id,
          code: role.code,
          name: role.name,
          isSystem: role.isSystem,
        })),
      })
      await tx.rolePermission.createMany({
        data: input.defaultRoles.flatMap(role => role.permissions.map(permissionCode => ({
          businessId: business.id,
          roleId: role.id,
          permissionCode,
        }))),
      })
      const ownerRole = input.defaultRoles.find(role => role.code === 'OWNER')
      if (!ownerRole) throw new Error('OWNER role template is required')
      await tx.memberRole.create({
        data: { businessId: business.id, memberId: member.id, roleId: ownerRole.id },
      })
      await tx.auditLog.create({
        data: {
          id: input.auditId,
          businessId: business.id,
          userId: input.actorUserId,
          action: 'business.created',
          entityType: 'Business',
          entityId: business.id,
          ...(input.metadata.requestId ? { requestId: input.metadata.requestId } : {}),
          ...(input.metadata.ipAddress ? { ipAddress: input.metadata.ipAddress } : {}),
          ...(input.metadata.userAgent ? { userAgent: input.metadata.userAgent } : {}),
          after: { ownerMemberId: member.id, defaultBranchId: branch.id },
        },
      })
      return {
        id: business.id,
        name: business.name,
        currencyCode: business.currencyCode,
        timezone: business.timezone,
        status: business.status,
      }
    })
  }

  private snapshot(business: { name: string; currencyCode: string; timezone: string; status: BusinessStatus }): Prisma.InputJsonObject {
    return {
      name: business.name,
      currencyCode: business.currencyCode,
      timezone: business.timezone,
      status: business.status,
    }
  }
}
