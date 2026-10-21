import type { ExecutionContext } from '@nestjs/common'
import { PlatformRole } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { PlatformAdminGuard } from './platform-admin.guard'

const contextWithRole = (platformRole?: PlatformRole): ExecutionContext => ({
  switchToHttp: () => ({
    getRequest: () => ({
      actor: platformRole
        ? { userId: 'user-a', sessionId: 'session-a', platformRole }
        : undefined,
    }),
  }),
}) as unknown as ExecutionContext

describe('PlatformAdminGuard (PLA-001, PLA-002)', () => {
  const guard = new PlatformAdminGuard()

  it('allows a current superadmin actor', () => {
    expect(guard.canActivate(contextWithRole(PlatformRole.SUPERADMIN))).toBe(true)
  })

  it('denies a normal global user and a missing actor', () => {
    expect(() => guard.canActivate(contextWithRole(PlatformRole.USER))).toThrow(
      errors.platformAccessDenied(),
    )
    expect(() => guard.canActivate(contextWithRole())).toThrow(errors.platformAccessDenied())
  })
})
