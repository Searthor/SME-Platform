import { Inject, Injectable } from '@nestjs/common'
import { errors } from '../../../common/errors/app.error'
import { IdService } from '../../ids/id.service'
import type { UpdatePlatformSettingsDto } from '../api/dto/update-platform-settings.dto'
import { PlatformSettingsRepository } from '../infrastructure/platform-settings.repository'

type AuditMetadata = {
  requestId?: string
  ipAddress?: string
  userAgent?: string
}

const assertTimezone = (timezone: string): void => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
  } catch {
    throw errors.invalidTimezone()
  }
}

@Injectable()
export class PlatformSettingsService {
  constructor(
    @Inject(PlatformSettingsRepository) private readonly settings: PlatformSettingsRepository,
    @Inject(IdService) private readonly ids: IdService,
  ) {}

  async get() {
    const settings = await this.settings.find()
    if (!settings) throw errors.resourceNotFound('Platform settings')
    return settings
  }

  async assertRegistrationAllowed(): Promise<void> {
    const settings = await this.get()
    if (!settings.allowRegistration) throw errors.registrationDisabled()
  }

  update(userId: string, dto: UpdatePlatformSettingsDto, metadata: AuditMetadata) {
    assertTimezone(dto.defaultTimezone)
    return this.settings.updateWithAudit({
      auditId: this.ids.generate(),
      userId,
      platformName: dto.platformName.trim(),
      supportEmail: dto.supportEmail?.trim().toLowerCase() || null,
      defaultLocale: dto.defaultLocale,
      defaultCurrencyCode: dto.defaultCurrencyCode,
      defaultTimezone: dto.defaultTimezone,
      allowRegistration: dto.allowRegistration,
      ...metadata,
    })
  }
}
