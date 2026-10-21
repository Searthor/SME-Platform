import { Inject, Injectable } from '@nestjs/common'
import { createHmac, randomBytes } from 'node:crypto'
import { sign, verify, type JwtPayload } from 'jsonwebtoken'
import { AppConfigService } from '../../../config/app-config.service'
import { IdService } from '../../../core/ids/id.service'

export type AccessTokenClaims = {
  sub: string
  sid: string
  jti: string
  businessId?: string
  memberId?: string
  authorizationVersion?: number
}

@Injectable()
export class TokenService {
  constructor(
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Inject(IdService) private readonly ids: IdService,
  ) {}

  issueAccessToken(input: Omit<AccessTokenClaims, 'jti'>): string {
    return sign({ ...input, jti: this.ids.generate() }, this.config.values.accessTokenSecret, {
      algorithm: 'HS256',
      issuer: this.config.values.accessTokenIssuer,
      audience: this.config.values.accessTokenAudience,
      expiresIn: this.config.values.accessTokenTtlSeconds,
    })
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    const payload = verify(token, this.config.values.accessTokenSecret, {
      algorithms: ['HS256'],
      issuer: this.config.values.accessTokenIssuer,
      audience: this.config.values.accessTokenAudience,
    }) as JwtPayload

    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string' || typeof payload.jti !== 'string') {
      throw new Error('Missing required access token claims')
    }

    const claims: AccessTokenClaims = { sub: payload.sub, sid: payload.sid, jti: payload.jti }
    if (typeof payload.businessId === 'string') claims.businessId = payload.businessId
    if (typeof payload.memberId === 'string') claims.memberId = payload.memberId
    if (typeof payload.authorizationVersion === 'number') {
      claims.authorizationVersion = payload.authorizationVersion
    }
    return claims
  }

  generateRefreshToken(): string {
    return randomBytes(48).toString('base64url')
  }

  generateCsrfToken(): string {
    return randomBytes(32).toString('base64url')
  }

  hashRefreshToken(token: string): string {
    return createHmac('sha256', this.config.values.refreshTokenPepper).update(token).digest('hex')
  }
}
