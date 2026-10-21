import { Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { PrismaService } from '../../../core/database/prisma.service'

export type RegistrationData = {
  userId: string
  identityId: string
  displayName: string
  identityType: 'EMAIL' | 'PHONE'
  normalizedIdentity: string
  passwordHash: string
  businessId: string
  businessName: string
  currencyCode: string
  timezone: string
  branchId: string
  branchCode: string
  branchName: string
  memberId: string
  sessionId: string
  tokenFamilyId: string
  refreshTokenHash: string
  sessionExpiresAt: Date
  deviceName: string
  ipAddress?: string
  userAgent?: string
  auditId: string
  requestId?: string
  defaultRoles: ReadonlyArray<{
    id: string
    code: string
    name: string
    isSystem: boolean
    permissions: readonly string[]
  }>
}

@Injectable()
export class RegistrationRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async register(data: RegistrationData) {
    try {
      return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: data.userId,
          displayName: data.displayName,
          identities: {
            create: {
              id: data.identityId,
              type: data.identityType,
              normalizedValue: data.normalizedIdentity,
              verifiedAt: null,
            },
          },
          credential: { create: { passwordHash: data.passwordHash } },
        },
      })

      const business = await tx.business.create({
        data: {
          id: data.businessId,
          name: data.businessName,
          currencyCode: data.currencyCode,
          timezone: data.timezone,
        },
      })

      const branch = await tx.branch.create({
        data: {
          id: data.branchId,
          businessId: business.id,
          code: data.branchCode,
          name: data.branchName,
        },
      })

      const member = await tx.businessMember.create({
        data: {
          id: data.memberId,
          businessId: business.id,
          userId: user.id,
          allBranches: true,
        },
      })

      await tx.role.createMany({
        data: data.defaultRoles.map(role => ({
          id: role.id,
          businessId: business.id,
          code: role.code,
          name: role.name,
          isSystem: role.isSystem,
        })),
      })
      await tx.rolePermission.createMany({
        data: data.defaultRoles.flatMap(role => role.permissions.map(permissionCode => ({
          businessId: business.id,
          roleId: role.id,
          permissionCode,
        }))),
      })
      const ownerRole = data.defaultRoles.find(role => role.code === 'OWNER')
      if (!ownerRole) throw new Error('OWNER role template is required')
      await tx.memberRole.create({
        data: { businessId: business.id, memberId: member.id, roleId: ownerRole.id },
      })

      const session = await tx.authSession.create({
        data: {
          id: data.sessionId,
          userId: user.id,
          tokenFamilyId: data.tokenFamilyId,
          refreshTokenHash: data.refreshTokenHash,
          selectedBusinessId: business.id,
          selectedMemberId: member.id,
          expiresAt: data.sessionExpiresAt,
          deviceName: data.deviceName,
          ...(data.ipAddress ? { ipAddress: data.ipAddress } : {}),
          ...(data.userAgent ? { userAgent: data.userAgent } : {}),
        },
      })

      await tx.auditLog.create({
        data: {
          id: data.auditId,
          businessId: business.id,
          userId: user.id,
          action: 'business.onboarded',
          entityType: 'Business',
          entityId: business.id,
          ...(data.requestId ? { requestId: data.requestId } : {}),
          ...(data.ipAddress ? { ipAddress: data.ipAddress } : {}),
          ...(data.userAgent ? { userAgent: data.userAgent } : {}),
          after: { ownerMemberId: member.id, defaultBranchId: branch.id },
        },
      })

        return { user, business, branch, member, session }
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw errors.identityAlreadyExists()
      }
      throw error
    }
  }
}
