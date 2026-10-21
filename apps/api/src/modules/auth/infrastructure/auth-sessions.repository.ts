import { Inject, Injectable } from '@nestjs/common'
import type { AuthSession, Prisma } from '@prisma/client'
import { PrismaService } from '../../../core/database/prisma.service'

export type TransactionClient = Prisma.TransactionClient

@Injectable()
export class AuthSessionsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findByHash(refreshTokenHash: string) {
    return this.prisma.authSession.findUnique({ where: { refreshTokenHash } })
  }

  findForAccess(sessionId: string, userId: string) {
    return this.prisma.authSession.findFirst({
      where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, user: { select: { status: true, platformRole: true } } },
    })
  }

  create(data: Prisma.AuthSessionUncheckedCreateInput, tx?: TransactionClient) {
    return (tx ?? this.prisma).authSession.create({ data })
  }

  async revokeFamily(tokenFamilyId: string, at = new Date(), tx?: TransactionClient): Promise<void> {
    await (tx ?? this.prisma).authSession.updateMany({
      where: { tokenFamilyId, revokedAt: null },
      data: { revokedAt: at },
    })
  }

  async revokeUserSessions(userId: string, at = new Date()): Promise<void> {
    await this.prisma.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: at } })
  }

  async revokeSessionFamily(sessionId: string, userId: string): Promise<void> {
    const session = await this.prisma.authSession.findFirst({
      where: { id: sessionId, userId },
      select: { tokenFamilyId: true },
    })
    if (session) await this.revokeFamily(session.tokenFamilyId)
  }

  listActiveForUser(userId: string) {
    return this.prisma.authSession.findMany({
      where: { userId, revokedAt: null, rotatedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        deviceName: true,
        ipAddress: true,
        userAgent: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async revokeOwnedSession(input: { sessionId: string; userId: string; auditId: string; requestId?: string }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const session = await tx.authSession.findFirst({
        where: { id: input.sessionId, userId: input.userId },
        select: { tokenFamilyId: true },
      })
      if (!session) return
      await tx.authSession.updateMany({
        where: { tokenFamilyId: session.tokenFamilyId, userId: input.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      await tx.auditLog.create({
        data: {
          id: input.auditId,
          userId: input.userId,
          action: 'auth.session.revoked',
          entityType: 'AuthSession',
          entityId: input.sessionId,
          requestId: input.requestId ?? null,
        },
      })
    })
  }

  async selectMembership(sessionId: string, userId: string, businessId: string, memberId: string): Promise<void> {
    const result = await this.prisma.authSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { selectedBusinessId: businessId, selectedMemberId: memberId },
    })
    if (result.count !== 1) throw new Error('Session unavailable')
  }

  rotate(
    existing: AuthSession,
    input: { id: string; refreshTokenHash: string; expiresAt: Date; now: Date },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const consumed = await tx.authSession.updateMany({
        where: {
          id: existing.id,
          rotatedAt: null,
          revokedAt: null,
          expiresAt: { gt: input.now },
        },
        data: { rotatedAt: input.now, lastUsedAt: input.now, replacedById: input.id },
      })
      if (consumed.count !== 1) return { reused: true as const }

      let selected:
        | { businessId: string; memberId: string; authorizationVersion: number }
        | undefined
      if (existing.selectedBusinessId && existing.selectedMemberId) {
        const member = await tx.businessMember.findFirst({
          where: {
            id: existing.selectedMemberId,
            businessId: existing.selectedBusinessId,
            userId: existing.userId,
            status: 'ACTIVE',
            business: { status: 'ACTIVE' },
          },
          select: { businessId: true, id: true, authorizationVersion: true },
        })
        if (member) {
          selected = {
            businessId: member.businessId,
            memberId: member.id,
            authorizationVersion: member.authorizationVersion,
          }
        }
      }

      await tx.authSession.create({
        data: {
          id: input.id,
          userId: existing.userId,
          tokenFamilyId: existing.tokenFamilyId,
          refreshTokenHash: input.refreshTokenHash,
          expiresAt: input.expiresAt,
          deviceName: existing.deviceName,
          ipAddress: existing.ipAddress,
          userAgent: existing.userAgent,
          ...(selected
            ? { selectedBusinessId: selected.businessId, selectedMemberId: selected.memberId }
            : {}),
        },
      })
      return { reused: false as const, selected }
    })
  }
}
