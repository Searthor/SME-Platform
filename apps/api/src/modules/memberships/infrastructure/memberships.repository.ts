import { Inject, Injectable } from '@nestjs/common'
import { MemberStatus, Prisma } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { PrismaService } from '../../../core/database/prisma.service'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'

const membershipSelect = {
  id: true,
  businessId: true,
  userId: true,
  status: true,
  allBranches: true,
  authorizationVersion: true,
  business: { select: { id: true, name: true, currencyCode: true, timezone: true, status: true } },
  branchAccess: { select: { branchId: true } },
} satisfies Prisma.BusinessMemberSelect

const tenantMembershipSelect = {
  id: true,
  businessId: true,
  status: true,
  allBranches: true,
  authorizationVersion: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      displayName: true,
      locale: true,
      status: true,
      identities: { select: { type: true, normalizedValue: true, verifiedAt: true } },
    },
  },
  branchAccess: { select: { branchId: true } },
  roles: { select: { role: { select: { id: true, code: true, name: true, isSystem: true } } } },
} satisfies Prisma.BusinessMemberSelect

type AuditMetadata = { requestId?: string; ipAddress?: string; userAgent?: string }

@Injectable()
export class MembershipsRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
  ) {}

  listActiveForUser(userId: string) {
    return this.prisma.businessMember.findMany({
      where: { userId, status: MemberStatus.ACTIVE, business: { status: 'ACTIVE' } },
      select: membershipSelect,
      orderBy: { createdAt: 'asc' },
    })
  }

  findActiveForSelection(userId: string, businessId: string) {
    return this.prisma.businessMember.findFirst({
      where: { userId, businessId, status: MemberStatus.ACTIVE, business: { status: 'ACTIVE' } },
      select: membershipSelect,
    })
  }

  findActiveForTenantClaims(input: {
    userId: string
    businessId: string
    memberId: string
    authorizationVersion: number
  }) {
    return this.prisma.businessMember.findFirst({
      where: {
        id: input.memberId,
        userId: input.userId,
        businessId: input.businessId,
        authorizationVersion: input.authorizationVersion,
        status: MemberStatus.ACTIVE,
        business: { status: 'ACTIVE' },
      },
      select: membershipSelect,
    })
  }

  activeBranchBelongsToBusiness(businessId: string, branchId: string): Promise<boolean> {
    return this.prisma.branch
      .count({ where: { businessId, id: branchId, status: 'ACTIVE' } })
      .then(count => count === 1)
  }

  listCurrent() {
    const { businessId } = this.tenantContext.require()
    return this.prisma.businessMember.findMany({
      where: { businessId },
      select: tenantMembershipSelect,
      orderBy: { createdAt: 'asc' },
    })
  }

  findCurrentById(memberId: string) {
    const { businessId } = this.tenantContext.require()
    return this.prisma.businessMember.findFirst({
      where: { businessId, id: memberId },
      select: tenantMembershipSelect,
    })
  }

  async createCurrent(input: {
    id: string
    auditId: string
    actorUserId: string
    userId: string
    allBranches: boolean
    branchGrants: ReadonlyArray<{ id: string; branchId: string }>
    roleIds: readonly string[]
    metadata: AuditMetadata
  }) {
    const { businessId } = this.tenantContext.require()
    const roleIds = [...new Set(input.roleIds)]
    const branchGrants = input.allBranches
      ? []
      : [...new Map(input.branchGrants.map(grant => [grant.branchId, grant])).values()]
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.assertTenantReferences(tx, businessId, roleIds, branchGrants.map(grant => grant.branchId))
        await tx.businessMember.create({
          data: {
            id: input.id,
            businessId,
            userId: input.userId,
            allBranches: input.allBranches,
          },
        })
        if (branchGrants.length) {
          await tx.memberBranchAccess.createMany({
            data: branchGrants.map(grant => ({ ...grant, businessId, memberId: input.id })),
          })
        }
        if (roleIds.length) {
          await tx.memberRole.createMany({
            data: roleIds.map(roleId => ({ businessId, memberId: input.id, roleId })),
          })
        }
        const member = await tx.businessMember.findUniqueOrThrow({
          where: { businessId_id: { businessId, id: input.id } },
          select: tenantMembershipSelect,
        })
        await tx.auditLog.create({
          data: {
            id: input.auditId,
            businessId,
            userId: input.actorUserId,
            action: 'membership.created',
            entityType: 'BusinessMember',
            entityId: member.id,
            after: {
              userId: input.userId,
              status: member.status,
              allBranches: member.allBranches,
              branchIds: branchGrants.map(grant => grant.branchId),
              roleIds,
            },
            ...this.auditMetadata(input.metadata),
          },
        })
        return member
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw errors.membershipAlreadyExists()
      }
      throw error
    }
  }

  updateCurrent(input: {
    memberId: string
    auditId: string
    actorUserId: string
    status: MemberStatus
    allBranches: boolean
    branchGrants: ReadonlyArray<{ id: string; branchId: string }>
    roleIds: readonly string[]
    metadata: AuditMetadata
  }) {
    const { businessId } = this.tenantContext.require()
    const roleIds = [...new Set(input.roleIds)]
    const branchGrants = input.allBranches
      ? []
      : [...new Map(input.branchGrants.map(grant => [grant.branchId, grant])).values()]
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.businessMember.findFirst({
        where: { businessId, id: input.memberId },
        select: tenantMembershipSelect,
      })
      if (!before) throw errors.resourceNotFound('Business member')
      await this.assertTenantReferences(tx, businessId, roleIds, branchGrants.map(grant => grant.branchId))
      await this.assertOwnerRemains(tx, businessId, input.memberId, input.status, roleIds)

      await tx.memberBranchAccess.deleteMany({ where: { businessId, memberId: input.memberId } })
      await tx.memberRole.deleteMany({ where: { businessId, memberId: input.memberId } })
      if (branchGrants.length) {
        await tx.memberBranchAccess.createMany({
          data: branchGrants.map(grant => ({ ...grant, businessId, memberId: input.memberId })),
        })
      }
      if (roleIds.length) {
        await tx.memberRole.createMany({
          data: roleIds.map(roleId => ({ businessId, memberId: input.memberId, roleId })),
        })
      }
      const after = await tx.businessMember.update({
        where: { businessId_id: { businessId, id: input.memberId } },
        data: {
          status: input.status,
          allBranches: input.allBranches,
          authorizationVersion: { increment: 1 },
        },
        select: tenantMembershipSelect,
      })
      await tx.auditLog.create({
        data: {
          id: input.auditId,
          businessId,
          userId: input.actorUserId,
          action: 'membership.updated',
          entityType: 'BusinessMember',
          entityId: input.memberId,
          before: this.memberSnapshot(before),
          after: this.memberSnapshot(after),
          ...this.auditMetadata(input.metadata),
        },
      })
      return after
    })
  }

  private async assertTenantReferences(
    tx: Prisma.TransactionClient,
    businessId: string,
    roleIds: readonly string[],
    branchIds: readonly string[],
  ): Promise<void> {
    const [roleCount, branchCount] = await Promise.all([
      tx.role.count({ where: { businessId, id: { in: [...roleIds] } } }),
      tx.branch.count({ where: { businessId, id: { in: [...branchIds] }, status: 'ACTIVE' } }),
    ])
    if (roleCount !== roleIds.length) throw errors.resourceNotFound('Role')
    if (branchCount !== branchIds.length) throw errors.resourceNotFound('Branch')
  }

  private async assertOwnerRemains(
    tx: Prisma.TransactionClient,
    businessId: string,
    memberId: string,
    nextStatus: MemberStatus,
    nextRoleIds: readonly string[],
  ): Promise<void> {
    const currentlyOwnerCapable = await tx.businessMember.count({
      where: {
        businessId,
        id: memberId,
        status: MemberStatus.ACTIVE,
        roles: { some: { role: { permissions: { some: { permissionCode: 'business.manage' } } } } },
      },
    })
    if (!currentlyOwnerCapable) return

    const remainsOwnerCapable = nextStatus === MemberStatus.ACTIVE && await tx.role.count({
      where: {
        businessId,
        id: { in: [...nextRoleIds] },
        permissions: { some: { permissionCode: 'business.manage' } },
      },
    }) > 0
    if (remainsOwnerCapable) return

    const otherOwnerCount = await tx.businessMember.count({
      where: {
        businessId,
        id: { not: memberId },
        status: MemberStatus.ACTIVE,
        roles: { some: { role: { permissions: { some: { permissionCode: 'business.manage' } } } } },
      },
    })
    if (otherOwnerCount === 0) throw errors.lastOwnerRequired()
  }

  private memberSnapshot(member: Prisma.BusinessMemberGetPayload<{ select: typeof tenantMembershipSelect }>): Prisma.InputJsonObject {
    return {
      status: member.status,
      allBranches: member.allBranches,
      authorizationVersion: member.authorizationVersion,
      branchIds: member.branchAccess.map(grant => grant.branchId),
      roleIds: member.roles.map(grant => grant.role.id),
    }
  }

  private auditMetadata(metadata: AuditMetadata) {
    return {
      requestId: metadata.requestId ?? null,
      ipAddress: metadata.ipAddress ?? null,
      userAgent: metadata.userAgent ?? null,
    }
  }

}
