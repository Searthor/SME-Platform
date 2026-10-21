import type { AppConfigService, AppConfigValues } from '../../../config/app-config.service'
import type { IdService } from '../../../core/ids/id.service'
import { TokenService } from './token.service'

describe('TokenService', () => {
  const values: AppConfigValues = {
    nodeEnv: 'test',
    port: 3001,
    databaseUrl: 'postgresql://unused',
    accessTokenSecret: 'access-secret-with-at-least-32-characters',
    refreshTokenPepper: 'refresh-pepper-with-at-least-32-characters',
    accessTokenIssuer: 'test-issuer',
    accessTokenAudience: 'test-audience',
    accessTokenTtlSeconds: 60,
    refreshTokenTtlSeconds: 3600,
    corsAllowedOrigins: [],
    cookieSecure: false,
  }
  const config = { values } as AppConfigService
  const ids = { generate: vi.fn(() => '0198e2d5-2e5c-7a01-8d3c-3c446e49df51') } as unknown as IdService
  const service = new TokenService(config, ids)

  it('issues and verifies explicit scoped claims', () => {
    const token = service.issueAccessToken({
      sub: '0198e2d5-2e5c-7a01-8d3c-3c446e49df52',
      sid: '0198e2d5-2e5c-7a01-8d3c-3c446e49df53',
      businessId: '0198e2d5-2e5c-7a01-8d3c-3c446e49df54',
      memberId: '0198e2d5-2e5c-7a01-8d3c-3c446e49df55',
      authorizationVersion: 3,
    })

    expect(service.verifyAccessToken(token)).toMatchObject({
      businessId: '0198e2d5-2e5c-7a01-8d3c-3c446e49df54',
      memberId: '0198e2d5-2e5c-7a01-8d3c-3c446e49df55',
      authorizationVersion: 3,
    })
  })

  it('hashes refresh tokens deterministically without storing the raw value', () => {
    const raw = service.generateRefreshToken()
    const digest = service.hashRefreshToken(raw)
    expect(digest).toHaveLength(64)
    expect(digest).not.toContain(raw)
    expect(service.hashRefreshToken(raw)).toBe(digest)
  })
})
