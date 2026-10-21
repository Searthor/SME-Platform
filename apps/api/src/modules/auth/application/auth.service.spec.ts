import { errors } from '../../../common/errors/app.error'
import type { AppConfigService } from '../../../config/app-config.service'
import type { IdService } from '../../../core/ids/id.service'
import type { PlatformSettingsService } from '../../../core/platform/application/platform-settings.service'
import type { MembershipsService } from '../../memberships/application/memberships.service'
import type { BusinessInvitationsService } from '../../memberships/application/business-invitations.service'
import type { UsersRepository } from '../../users/infrastructure/users.repository'
import type { AuthSessionsRepository } from '../infrastructure/auth-sessions.repository'
import type { PasswordService } from '../infrastructure/password.service'
import type { RegistrationRepository } from '../infrastructure/registration.repository'
import type { TokenService } from '../infrastructure/token.service'
import { AuthService } from './auth.service'

describe('AuthService refresh rotation (SEC-003, SEC-004)', () => {
  it('revokes the complete token family when a rotated refresh token is reused', async () => {
    const revokeFamily = vi.fn().mockResolvedValue(undefined)
    const sessions = {
      findByHash: vi.fn().mockResolvedValue({
        id: 'old-session',
        userId: 'user-a',
        tokenFamilyId: 'family-a',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        rotatedAt: new Date(),
      }),
      revokeFamily,
    } as unknown as AuthSessionsRepository
    const tokens = { hashRefreshToken: vi.fn(() => 'hash') } as unknown as TokenService
    const service = new AuthService(
      {} as UsersRepository,
      {} as MembershipsService,
      {} as BusinessInvitationsService,
      sessions,
      {} as RegistrationRepository,
      {} as PasswordService,
      tokens,
      {} as IdService,
      {} as AppConfigService,
      {} as PlatformSettingsService,
    )

    await expect(service.refresh('reused-token')).rejects.toEqual(errors.refreshTokenReused())
    expect(revokeFamily).toHaveBeenCalledWith('family-a')
  })
})

describe('AuthService login session persistence', () => {
  it('does not pass request-only metadata into the Prisma auth session input', async () => {
    const users = {
      findByNormalizedIdentity: vi.fn().mockResolvedValue({
        id: 'user-a',
        status: 'ACTIVE',
        credential: { passwordHash: 'stored-hash' },
      }),
    } as unknown as UsersRepository
    const create = vi.fn().mockResolvedValue({ id: 'session-a' })
    const sessions = { create } as unknown as AuthSessionsRepository
    const passwords = { verify: vi.fn().mockResolvedValue(true) } as unknown as PasswordService
    const tokens = {
      generateRefreshToken: vi.fn(() => 'refresh-token'),
      hashRefreshToken: vi.fn(() => 'refresh-hash'),
      issueAccessToken: vi.fn(() => 'access-token'),
      generateCsrfToken: vi.fn(() => 'csrf-token'),
    } as unknown as TokenService
    const ids = { generate: vi.fn(() => 'generated-id') } as unknown as IdService
    const config = {
      values: { refreshTokenTtlSeconds: 3600, accessTokenTtlSeconds: 900 },
    } as AppConfigService
    const service = new AuthService(
      users,
      {} as MembershipsService,
      {} as BusinessInvitationsService,
      sessions,
      {} as RegistrationRepository,
      passwords,
      tokens,
      ids,
      config,
      {} as PlatformSettingsService,
    )

    await service.login(
      { identifier: 'admin@example.com', password: 'password', deviceName: 'Safari' },
      { requestId: 'request-a', ipAddress: '::1', userAgent: 'Safari' },
    )

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      ipAddress: '::1',
      userAgent: 'Safari',
    }))
    const sessionInput = create.mock.calls[0]?.[0] as Record<string, unknown>
    expect(sessionInput).not.toHaveProperty('requestId')
  })
})
