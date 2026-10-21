import { Inject, Injectable } from '@nestjs/common'
import type { Request, Response } from 'express'
import { timingSafeEqual } from 'node:crypto'
import { errors } from '../../../common/errors/app.error'
import { AppConfigService } from '../../../config/app-config.service'
import type { IssuedSession } from '../application/auth.service'

const REFRESH_COOKIE = 'sme_refresh'
const CSRF_COOKIE = 'sme_csrf'

@Injectable()
export class AuthCookieService {
  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  set(response: Response, session: IssuedSession): void {
    const common = {
      secure: this.config.values.cookieSecure,
      sameSite: 'strict' as const,
      maxAge: this.config.values.refreshTokenTtlSeconds * 1000,
    }
    response.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...common,
      httpOnly: true,
      path: '/api/v1/auth',
    })
    response.cookie(CSRF_COOKIE, session.csrfToken, {
      ...common,
      httpOnly: false,
      path: '/',
    })
  }

  clear(response: Response): void {
    const common = {
      secure: this.config.values.cookieSecure,
      sameSite: 'strict' as const,
    }
    response.clearCookie(REFRESH_COOKIE, { ...common, path: '/api/v1/auth' })
    response.clearCookie(CSRF_COOKIE, { ...common, path: '/' })
  }

  requireRefresh(request: Request): string {
    this.assertCsrf(request)
    const cookies = request.cookies as Record<string, unknown> | undefined
    const token = cookies?.[REFRESH_COOKIE]
    if (typeof token !== 'string' || !token) throw errors.invalidRefreshToken()
    return token
  }

  assertCsrf(request: Request): void {
    const cookies = request.cookies as Record<string, unknown> | undefined
    const cookieToken = cookies?.[CSRF_COOKIE]
    const headerToken = request.header('x-csrf-token')
    if (typeof cookieToken !== 'string' || !headerToken) throw errors.csrfValidationFailed()
    const left = Buffer.from(cookieToken)
    const right = Buffer.from(headerToken)
    if (left.length !== right.length || !timingSafeEqual(left, right)) throw errors.csrfValidationFailed()
  }
}
