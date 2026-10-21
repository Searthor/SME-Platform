import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { errors } from '../../../common/errors/app.error'
import { IS_PUBLIC_KEY } from '../../../common/http/public.decorator'
import type { AuthenticatedActor, AuthenticatedRequest } from '../../../common/http/request-context'
import { AuthSessionsRepository } from '../infrastructure/auth-sessions.repository'
import { TokenService } from '../infrastructure/token.service'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(AuthSessionsRepository) private readonly sessions: AuthSessionsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const authorization = request.header('authorization')
    if (!authorization?.startsWith('Bearer ')) throw errors.authenticationRequired()

    try {
      const claims = this.tokens.verifyAccessToken(authorization.slice(7))
      const session = await this.sessions.findForAccess(claims.sid, claims.sub)
      if (!session || session.user.status !== 'ACTIVE') throw errors.sessionRevoked()

      const actor: AuthenticatedActor = {
        userId: claims.sub,
        sessionId: claims.sid,
        platformRole: session.user.platformRole,
      }
      if (claims.businessId) actor.businessId = claims.businessId
      if (claims.memberId) actor.memberId = claims.memberId
      if (claims.authorizationVersion !== undefined) {
        actor.authorizationVersion = claims.authorizationVersion
      }
      request.actor = actor
      return true
    } catch (error) {
      if (error instanceof Error && ['SESSION_REVOKED', 'AUTHENTICATION_REQUIRED'].includes(error.message)) {
        throw error
      }
      if (error && typeof error === 'object' && 'code' in error) throw error
      throw errors.authenticationRequired()
    }
  }
}
