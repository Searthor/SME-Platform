import type { ExecutionContext } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import type { AppError } from '../../../common/errors/app.error'
import type { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import type { AccessControlService } from '../application/access-control.service'
import { PermissionGuard } from './permission.guard'

const executionContext = {
  getHandler: () => function handler() {},
  getClass: () => class Controller {},
} as unknown as ExecutionContext

describe('PermissionGuard (AUT-001, AUT-003)', () => {
  it('denies a tenant route without explicit permission metadata', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) } as unknown as Reflector
    const tenantContext = { require: vi.fn() } as unknown as TenantContextService
    const accessControl = { hasAllPermissions: vi.fn() } as unknown as AccessControlService
    const guard = new PermissionGuard(reflector, tenantContext, accessControl)

    await expect(guard.canActivate(executionContext)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    } satisfies Partial<AppError>)
  })

  it('requires every declared permission for the active member', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['user.view', 'user.manage']) } as unknown as Reflector
    const tenantContext = { require: vi.fn().mockReturnValue({ memberId: 'member-a' }) } as unknown as TenantContextService
    const hasAllPermissions = vi.fn().mockResolvedValue(false)
    const accessControl = { hasAllPermissions } as unknown as AccessControlService
    const guard = new PermissionGuard(reflector, tenantContext, accessControl)

    await expect(guard.canActivate(executionContext)).rejects.toMatchObject({ code: 'PERMISSION_DENIED' })
    expect(hasAllPermissions).toHaveBeenCalledWith('member-a', ['user.view', 'user.manage'])
  })

  it('allows the request only when the server-resolved member has all permissions', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['branch.view']) } as unknown as Reflector
    const tenantContext = { require: vi.fn().mockReturnValue({ memberId: 'member-a' }) } as unknown as TenantContextService
    const accessControl = { hasAllPermissions: vi.fn().mockResolvedValue(true) } as unknown as AccessControlService
    const guard = new PermissionGuard(reflector, tenantContext, accessControl)

    await expect(guard.canActivate(executionContext)).resolves.toBe(true)
  })
})
