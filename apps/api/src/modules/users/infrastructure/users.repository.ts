import { Inject, Injectable } from '@nestjs/common'
import { UserStatus, type Prisma } from '@prisma/client'
import { PrismaService } from '../../../core/database/prisma.service'

export type UserWithCredential = Prisma.UserGetPayload<{
  include: { identities: true; credential: true }
}>

@Injectable()
export class UsersRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findByNormalizedIdentity(type: 'EMAIL' | 'PHONE', normalizedValue: string): Promise<UserWithCredential | null> {
    return this.prisma.user.findFirst({
      where: { status: UserStatus.ACTIVE, identities: { some: { type, normalizedValue } } },
      include: { identities: true, credential: true },
    })
  }

  findPublicById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        locale: true,
        status: true,
        platformRole: true,
        createdAt: true,
      },
    })
  }

  findActivePublicByIdentity(type: 'EMAIL' | 'PHONE', normalizedValue: string) {
    return this.prisma.user.findFirst({
      where: { status: UserStatus.ACTIVE, identities: { some: { type, normalizedValue } } },
      select: { id: true, displayName: true, locale: true, status: true },
    })
  }

  exists(userId: string): Promise<boolean> {
    return this.prisma.user
      .count({ where: { id: userId, status: UserStatus.ACTIVE } })
      .then((count) => count === 1)
  }
}
