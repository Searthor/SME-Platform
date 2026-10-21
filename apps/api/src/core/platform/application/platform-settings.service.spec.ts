import { errors } from '../../../common/errors/app.error'
import type { IdService } from '../../ids/id.service'
import type { PlatformSettingsRepository } from '../infrastructure/platform-settings.repository'
import { PlatformSettingsService } from './platform-settings.service'

describe('PlatformSettingsService (PLA-004, PLA-005)', () => {
  it('denies public registration when the authoritative setting is disabled', async () => {
    const repository = {
      find: vi.fn().mockResolvedValue({ allowRegistration: false }),
    } as unknown as PlatformSettingsRepository
    const service = new PlatformSettingsService(repository, {} as IdService)

    await expect(service.assertRegistrationAllowed()).rejects.toEqual(errors.registrationDisabled())
  })

  it('rejects an invalid IANA timezone before persistence', () => {
    const updateWithAudit = vi.fn()
    const repository = { updateWithAudit } as unknown as PlatformSettingsRepository
    const ids = { generate: vi.fn(() => 'audit-a') } as unknown as IdService
    const service = new PlatformSettingsService(repository, ids)

    expect(() => service.update('user-a', {
      platformName: 'SME Flow',
      supportEmail: null,
      defaultLocale: 'lo',
      defaultCurrencyCode: 'LAK',
      defaultTimezone: 'Invalid/Timezone',
      allowRegistration: true,
    }, {})).toThrow(errors.invalidTimezone())
    expect(updateWithAudit).not.toHaveBeenCalled()
  })
})
