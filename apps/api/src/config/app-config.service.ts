import { Injectable } from '@nestjs/common'

export type AppConfigValues = {
  nodeEnv: string
  port: number
  databaseUrl: string
  accessTokenSecret: string
  accessTokenIssuer: string
  accessTokenAudience: string
  accessTokenTtlSeconds: number
  refreshTokenTtlSeconds: number
  refreshTokenPepper: string
  corsAllowedOrigins: string[]
  cookieSecure: boolean
}

const required = (name: string, value: string | undefined): string => {
  if (!value) throw new Error(`Missing required configuration: ${name}`)
  return value
}

const positiveInteger = (name: string, value: string | undefined, fallback: number): number => {
  const parsed = Number(value ?? fallback)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return parsed
}

@Injectable()
export class AppConfigService {
  readonly values: AppConfigValues

  constructor() {
    const accessTokenSecret = required('ACCESS_TOKEN_SECRET', process.env.ACCESS_TOKEN_SECRET)
    const refreshTokenPepper = required('REFRESH_TOKEN_PEPPER', process.env.REFRESH_TOKEN_PEPPER)

    if (accessTokenSecret.length < 32 || refreshTokenPepper.length < 32) {
      throw new Error('Token secrets must contain at least 32 characters')
    }

    this.values = {
      nodeEnv: process.env.NODE_ENV ?? 'development',
      port: positiveInteger('PORT', process.env.PORT, 3001),
      databaseUrl: required('DATABASE_URL', process.env.DATABASE_URL),
      accessTokenSecret,
      accessTokenIssuer: process.env.ACCESS_TOKEN_ISSUER ?? 'sme-platform-api',
      accessTokenAudience: process.env.ACCESS_TOKEN_AUDIENCE ?? 'sme-platform-web',
      accessTokenTtlSeconds:
        positiveInteger('ACCESS_TOKEN_TTL_SECONDS', process.env.ACCESS_TOKEN_TTL_SECONDS, 900),
      refreshTokenTtlSeconds:
        positiveInteger('REFRESH_TOKEN_TTL_SECONDS', process.env.REFRESH_TOKEN_TTL_SECONDS, 2_592_000),
      refreshTokenPepper,
      corsAllowedOrigins:
        (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000')
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      cookieSecure: process.env.COOKIE_SECURE === 'true',
    }
  }
}
