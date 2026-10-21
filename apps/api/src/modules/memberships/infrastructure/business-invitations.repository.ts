import { Inject, Injectable } from '@nestjs/common'
import { BusinessInvitationStatus, MemberStatus, Prisma } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { PrismaService } from '../../../core/database/prisma.service'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'

const invitationSelect = {
  id: true,
  businessId: true,
  identityType: true,
  normalizedIdentity: true,
  status: true,
  allBranches: true,
  expiresAt: true,
  acceptedAt: true,
  createdAt: true,
  roles: { select: { role: { select: { id: true, code: true, name: true, isSystem: true } } } },
  branchAccess: { select: { branchId: true } },
} satisfies Prisma.BusinessInvitationSelect

type AuditMetadata = { requestId?: string; ipAddress?: string; userAgent?: string }

type InvitationGrantInput = {
  invitationId: string
  auditId: string
  actorUserId: string
  identityType: 'EMAIL' | 'PHONE'
  normalizedIdentity: string
  tokenHash: string
  allBranches: boolean
  branchIds: readonly string[]
  roleIds: readonly string[]
  expiresAt: Date
  metadata: AuditMetadata
}

type AcceptInvitationInput = {
  tokenHash: string
  userId: string
  memberId: string
  branchGrantIds: readonly string[]
  auditId: string
  now: Date
  newUser?: {
    identityId: string
    displayName: string
    passwordHash: string
  }
}

@Injectable()
export class BusinessInvitationsRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
  ) {}

  listCurrent() {
    const { businessId } = this.tenantContext.require()
    return this.prisma.businessInvitation.findMany({
      where: { businessId },
      select: invitationSelect,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  async createCurrent(input: InvitationGrantInput) {
    const { businessId } = this.tenantContext.require()
    const roleIds = [...new Set(input.roleIds)]
    const branchIds = input.allBranches ? [] : [...new Set(input.branchIds)]

    return this.prisma.$transaction(async (tx) => {
      await this.assertTenantReferences(tx, businessId, roleIds, branchIds)
      const existingMember = await tx.businessMember.count({
        where: {
          businessId,
          user: { identities: { some: { type: input.identityType, normalizedValue: input.normalizedIdentity } } },
        },
      })
      if (existingMember) throw errors.membershipAlreadyExists()

      const pending = await tx.businessInvitation.count({
        where: {
          businessId,
          identityType: input.identityType,
          normalizedIdentity: input.normalizedIdentity,
          status: BusinessInvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
      })
      if (pending) throw errors.invitationAlreadyPending()

      await tx.businessInvitation.create({
        data: {
          id: input.invitationId,
          businessId,
          identityType: input.identityType,
          normalizedIdentity: input.normalizedIdentity,
          tokenHash: input.tokenHash,
          allBranches: input.allBranches,
          expiresAt: input.expiresAt,
          createdByUserId: input.actorUserId,
        },
      })
      await tx.businessInvitationRole.createMany({
        data: roleIds.map(roleId => ({ businessId, invitationId: input.invitationId, roleId })),
      })
      if (branchIds.length) {
        await tx.businessInvitationBranchAccess.createMany({
          data: branchIds.map(branchId => ({ businessId, invitationId: input.invitationId, branchId })),
        })
      }
      const invitation = await tx.businessInvitation.findUniqueOrThrow({
        where: { businessId_id: { businessId, id: input.invitationId } },
        select: invitationSelect,
      })
      await tx.auditLog.create({
        data: {
          id: input.auditId,
          businessId,
          userId: input.actorUserId,
          action: 'membership.invited',
          entityType: 'BusinessInvitation',
          entityId: input.invitationId,
          after: {
            identityType: input.identityType,
            allBranches: input.allBranches,
            branchIds,
            roleIds,
            expiresAt: input.expiresAt.toISOString(),
          },
          ...this.auditMetadata(input.metadata),
        },
      })
      return invitation
    })
  }

  async previewByTokenHash(tokenHash: string, now: Date) {
    const invitation = await this.prisma.businessInvitation.findFirst({
      where: { tokenHash, status: BusinessInvitationStatus.PENDING, expiresAt: { gt: now } },
      select: {
        identityType: true,
        normalizedIdentity: true,
        expiresAt: true,
        business: { select: { name: true } },
      },
    })
    if (!invitation) throw errors.invitationInvalid()
    return invitation
  }

  async accept(input: AcceptInvitationInput) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const invitation = await tx.businessInvitation.findFirst({
          where: {
            tokenHash: input.tokenHash,
            status: BusinessInvitationStatus.PENDING,
            expiresAt: { gt: input.now },
          },
          include: { roles: true, branchAccess: true },
        })
        if (!invitation) throw errors.invitationInvalid()

        if (input.newUser) {
          await tx.user.create({
            data: {
              id: input.userId,
              displayName: input.newUser.displayName,
              identities: {
                create: {
                  id: input.newUser.identityId,
                  type: invitation.identityType,
                  normalizedValue: invitation.normalizedIdentity,
                  verifiedAt: null,
                },
              },
              credential: { create: { passwordHash: input.newUser.passwordHash } },
            },
          })
        } else {
          const identityMatches = await tx.user.count({
            where: {
              id: input.userId,
              status: 'ACTIVE',
              identities: { some: { type: invitation.identityType, normalizedValue: invitation.normalizedIdentity } },
            },
          })
          if (!identityMatches) throw errors.invitationInvalid()
        }

        const roleIds = invitation.roles.map(grant => grant.roleId)
        const branchIds = invitation.allBranches ? [] : invitation.branchAccess.map(grant => grant.branchId)
        if (!invitation.allBranches && !branchIds.length) throw errors.invalidBranchScope()
        await this.assertTenantReferences(tx, invitation.businessId, roleIds, branchIds)

        await tx.businessMember.create({
          data: {
            id: input.memberId,
            businessId: invitation.businessId,
            userId: input.userId,
            status: MemberStatus.ACTIVE,
            allBranches: invitation.allBranches,
          },
        })
        await tx.memberRole.createMany({
          data: roleIds.map(roleId => ({ businessId: invitation.businessId, memberId: input.memberId, roleId })),
        })
        if (branchIds.length) {
          await tx.memberBranchAccess.createMany({
            data: branchIds.map((branchId, index) => ({
              id: input.branchGrantIds[index]!,
              businessId: invitation.businessId,
              memberId: input.memberId,
              branchId,
            })),
          })
        }
        await tx.businessInvitation.update({
          where: { businessId_id: { businessId: invitation.businessId, id: invitation.id } },
          data: { status: BusinessInvitationStatus.ACCEPTED, acceptedAt: input.now, acceptedUserId: input.userId },
        })
        await tx.auditLog.create({
          data: {
            id: input.auditId,
            businessId: invitation.businessId,
            userId: input.userId,
            action: 'membership.invitation.accepted',
            entityType: 'BusinessMember',
            entityId: input.memberId,
            after: { invitationId: invitation.id, roleIds, branchIds, allBranches: invitation.allBranches },
          },
        })
        return { businessId: invitation.businessId, memberId: input.memberId }
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw input.newUser ? errors.identityAlreadyExists() : errors.membershipAlreadyExists()
      }
      throw error
    }
  }

  revokeCurrent(invitationId: string, actorUserId: string, auditId: string, metadata: AuditMetadata) {
    const { businessId } = this.tenantContext.require()
    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.businessInvitation.findFirst({
        where: { businessId, id: invitationId, status: BusinessInvitationStatus.PENDING },
        select: invitationSelect,
      })
      if (!invitation) throw errors.resourceNotFound('Business invitation')
      const after = await tx.businessInvitation.update({
        where: { businessId_id: { businessId, id: invitationId } },
        data: { status: BusinessInvitationStatus.REVOKED },
        select: invitationSelect,
      })
      await tx.auditLog.create({
        data: {
          id: auditId,
          businessId,
          userId: actorUserId,
          action: 'membership.invitation.revoked',
          entityType: 'BusinessInvitation',
          entityId: invitationId,
          before: { status: invitation.status },
          after: { status: after.status },
          ...this.auditMetadata(metadata),
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
    if (!roleIds.length || roleCount !== roleIds.length) throw errors.resourceNotFound('Role')
    if (branchCount !== branchIds.length) throw errors.resourceNotFound('Branch')
  }

  private auditMetadata(metadata: AuditMetadata) {
    return {
      requestId: metadata.requestId ?? null,
      ipAddress: metadata.ipAddress ?? null,
      userAgent: metadata.userAgent ?? null,
    }
  }
}
