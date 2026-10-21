import { Inject, Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'

const settingsSelect = {
  id: true,
  platformName: true,
  supportEmail: true,
  defaultLocale: true,
  defaultCurrencyCode: true,
  defaultTimezone: true,
  allowRegistration: true,
  version: true,
  updatedAt: true,
} satisfies Prisma.PlatformSettingsSelect

type UpdateInput = {
  auditId: string
  userId: string
  platformName: string
  supportEmail: string | null
  defaultLocale: string
  defaultCurrencyCode: string
  defaultTimezone: string
  allowRegistration: boolean
  requestId?: string
  ipAddress?: string
  userAgent?: string
}

const auditSnapshot = (settings: {
  platformName: string
  supportEmail: string | null
  defaultLocale: string
  defaultCurrencyCode: string
  defaultTimezone: string
  allowRegistration: boolean
  version: number
  updatedAt: Date
}): Prisma.InputJsonObject => ({
  platformName: settings.platformName,
  supportEmail: settings.supportEmail,
  defaultLocale: settings.defaultLocale,
  defaultCurrencyCode: settings.defaultCurrencyCode,
  defaultTimezone: settings.defaultTimezone,
  allowRegistration: settings.allowRegistration,
  version: settings.version,
  updatedAt: settings.updatedAt.toISOString(),
})

@Injectable()
export class PlatformSettingsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  find() {
    return this.prisma.platformSettings.findUnique({ where: { id: 'default' }, select: settingsSelect })
  }

  updateWithAudit(input: UpdateInput) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.platformSettings.findUniqueOrThrow({
        where: { id: 'default' },
        select: settingsSelect,
      })
      const after = await tx.platformSettings.update({
        where: { id: 'default' },
        data: {
          platformName: input.platformName,
          supportEmail: input.supportEmail,
          defaultLocale: input.defaultLocale,
          defaultCurrencyCode: input.defaultCurrencyCode,
          defaultTimezone: input.defaultTimezone,
          allowRegistration: input.allowRegistration,
          version: { increment: 1 },
        },
        select: settingsSelect,
      })
      await tx.auditLog.create({
        data: {
          id: input.auditId,
          userId: input.userId,
          action: 'platform.settings.updated',
          entityType: 'PlatformSettings',
          before: auditSnapshot(before),
          after: auditSnapshot(after),
          requestId: input.requestId ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
      })
      return after
    })
  }
}
