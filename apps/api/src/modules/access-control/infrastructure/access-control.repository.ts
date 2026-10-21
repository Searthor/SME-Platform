import { Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { PrismaService } from '../../../core/database/prisma.service'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import type { PermissionCode } from '../domain/permission-catalog'

type AuditMetadata = { requestId?: string; ipAddress?: string; userAgent?: string }

const roleSelect = {
  id: true,
  businessId: true,
  code: true,
  name: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  permissions: { select: { permissionCode: true }, orderBy: { permissionCode: 'asc' as const } },
  _count: { select: { members: true } },
} satisfies Prisma.RoleSelect

@Injectable()
export class AccessControlRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
  ) {}

  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] })
  }

  listRoles() {
    const { businessId } = this.tenantContext.require()
    return this.prisma.role.findMany({
      where: { businessId },
      select: roleSelect,
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    })
  }

  async effectivePermissionCodes(memberId: string): Promise<PermissionCode[]> {
    const { businessId } = this.tenantContext.require()
    const grants = await this.prisma.rolePermission.findMany({
      where: { businessId, role: { members: { some: { businessId, memberId } } } },
      select: { permissionCode: true },
      distinct: ['permissionCode'],
    })
    return grants.map(grant => grant.permissionCode as PermissionCode)
  }

  async createRole(input: {
    id: string
    auditId: string
    actorUserId: string
    code: string
    name: string
    permissionCodes: readonly PermissionCode[]
    metadata: AuditMetadata
  }) {
    const { businessId } = this.tenantContext.require()
    const permissionCodes = [...new Set(input.permissionCodes)]
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.assertPermissionsExist(tx, permissionCodes)
        const role = await tx.role.create({
          data: {
            id: input.id,
            businessId,
            code: input.code,
            name: input.name,
            permissions: { create: permissionCodes.map(permissionCode => ({ businessId, permissionCode })) },
          },
          select: roleSelect,
        })
        await tx.auditLog.create({
          data: {
            id: input.auditId,
            businessId,
            userId: input.actorUserId,
            action: 'role.created',
            entityType: 'Role',
            entityId: role.id,
            after: { code: role.code, name: role.name, permissionCodes },
            ...this.auditMetadata(input.metadata),
          },
        })
        return role
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw errors.roleCodeExists()
      }
      throw error
    }
  }

  async updateRole(input: {
    roleId: string
    auditId: string
    actorUserId: string
    name: string
    permissionCodes: readonly PermissionCode[]
    metadata: AuditMetadata
  }) {
    const { businessId } = this.tenantContext.require()
    const permissionCodes = [...new Set(input.permissionCodes)]
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.role.findFirst({ where: { businessId, id: input.roleId }, select: roleSelect })
      if (!before) throw errors.resourceNotFound('Role')
      if (before.isSystem) throw errors.roleProtected()
      await this.assertPermissionsExist(tx, permissionCodes)
      await this.assertOwnerRemainsAfterRoleUpdate(tx, businessId, input.roleId, before, permissionCodes)
      const memberIds = await tx.memberRole.findMany({
        where: { businessId, roleId: input.roleId },
        select: { memberId: true },
      })
      await tx.rolePermission.deleteMany({ where: { businessId, roleId: input.roleId } })
      await tx.rolePermission.createMany({
        data: permissionCodes.map(permissionCode => ({ businessId, roleId: input.roleId, permissionCode })),
      })
      const after = await tx.role.update({
        where: { businessId_id: { businessId, id: input.roleId } },
        data: { name: input.name },
        select: roleSelect,
      })
      if (memberIds.length) {
        await tx.businessMember.updateMany({
          where: { businessId, id: { in: memberIds.map(member => member.memberId) } },
          data: { authorizationVersion: { increment: 1 } },
        })
      }
      await tx.auditLog.create({
        data: {
          id: input.auditId,
          businessId,
          userId: input.actorUserId,
          action: 'role.updated',
          entityType: 'Role',
          entityId: input.roleId,
          before: { name: before.name, permissionCodes: before.permissions.map(item => item.permissionCode) },
          after: { name: after.name, permissionCodes },
          ...this.auditMetadata(input.metadata),
        },
      })
      return after
    })
  }

  private async assertPermissionsExist(tx: Prisma.TransactionClient, permissionCodes: readonly string[]): Promise<void> {
    const count = await tx.permission.count({ where: { code: { in: [...permissionCodes] } } })
    if (count !== permissionCodes.length) throw errors.resourceNotFound('Permission')
  }

  private async assertOwnerRemainsAfterRoleUpdate(
    tx: Prisma.TransactionClient,
    businessId: string,
    roleId: string,
    before: Prisma.RoleGetPayload<{ select: typeof roleSelect }>,
    nextPermissionCodes: readonly string[],
  ): Promise<void> {
    const removesOwnerCapability = before.permissions.some(item => item.permissionCode === 'business.manage')
      && !nextPermissionCodes.includes('business.manage')
    if (!removesOwnerCapability) return

    const activeMembersUsingRole = await tx.businessMember.count({
      where: { businessId, status: 'ACTIVE', roles: { some: { roleId } } },
    })
    if (activeMembersUsingRole === 0) return

    const ownerThroughOtherRole = await tx.businessMember.count({
      where: {
        businessId,
        status: 'ACTIVE',
        roles: {
          some: {
            roleId: { not: roleId },
            role: { permissions: { some: { permissionCode: 'business.manage' } } },
          },
        },
      },
    })
    if (ownerThroughOtherRole === 0) throw errors.lastOwnerRequired()
  }

  private auditMetadata(metadata: AuditMetadata) {
    return {
      requestId: metadata.requestId ?? null,
      ipAddress: metadata.ipAddress ?? null,
      userAgent: metadata.userAgent ?? null,
    }
  }
}
