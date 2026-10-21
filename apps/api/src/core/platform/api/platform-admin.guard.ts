import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import { PlatformRole } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import type { AuthenticatedRequest } from '../../../common/http/request-context'

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    if (request.actor?.platformRole !== PlatformRole.SUPERADMIN) {
      throw errors.platformAccessDenied()
    }
    return true
  }
}
