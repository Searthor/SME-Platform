import type { Request } from 'express'
import type { PlatformRole } from '@prisma/client'

export type AuthenticatedActor = {
  userId: string
  sessionId: string
  platformRole: PlatformRole
  memberId?: string
  businessId?: string
  authorizationVersion?: number
}

export type AuthenticatedRequest = Request & { actor?: AuthenticatedActor; requestId?: string }
