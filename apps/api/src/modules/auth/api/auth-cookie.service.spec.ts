import type { Response } from 'express'
import type { AppConfigService } from '../../../config/app-config.service'
import type { IssuedSession } from '../application/auth.service'
import { AuthCookieService } from './auth-cookie.service'

describe('AuthCookieService browser cookie policy (SEC-003)', () => {
  const config = {
    values: { cookieSecure: false, refreshTokenTtlSeconds: 3600 },
  } as AppConfigService

  it('keeps refresh scoped to auth APIs and exposes CSRF at the web route path', () => {
    const cookie = vi.fn()
    const response = { cookie } as unknown as Response
    const session = {
      accessToken: 'access',
      refreshToken: 'refresh',
      csrfToken: 'csrf',
      expiresIn: 900,
    } satisfies IssuedSession

    new AuthCookieService(config).set(response, session)

    expect(cookie).toHaveBeenNthCalledWith(
      1,
      'sme_refresh',
      'refresh',
      expect.objectContaining({ httpOnly: true, path: '/api/v1/auth' }),
    )
    expect(cookie).toHaveBeenNthCalledWith(
      2,
      'sme_csrf',
      'csrf',
      expect.objectContaining({ httpOnly: false, path: '/' }),
    )
  })

  it('clears each cookie with the same path used when setting it', () => {
    const clearCookie = vi.fn()
    const response = { clearCookie } as unknown as Response

    new AuthCookieService(config).clear(response)

    expect(clearCookie).toHaveBeenCalledWith(
      'sme_refresh',
      expect.objectContaining({ path: '/api/v1/auth' }),
    )
    expect(clearCookie).toHaveBeenCalledWith(
      'sme_csrf',
      expect.objectContaining({ path: '/' }),
    )
  })
})
