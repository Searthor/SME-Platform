import type { ExecutionContext } from '@nestjs/common'
import { PlatformRole } from '@prisma/client'
import type { AppError } from '../../common/errors/app.error'
import type { MembershipsService } from '../../modules/memberships/application/memberships.service'
import { TenantGuard } from './tenant.guard'
import type { TenantContextService } from './tenant-context.service'

const contextFor = (request: unknown): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext

describe('TenantGuard (TEN-002, TEN-004)', () => {
  const membership = {
    id: 'member-a',
    businessId: 'business-a',
    userId: 'user-a',
    status: 'ACTIVE',
    allBranches: false,
    authorizationVersion: 2,
    business: { id: 'business-a', name: 'A', currencyCode: 'LAK', timezone: 'Asia/Vientiane', status: 'ACTIVE' },
    branchAccess: [{ branchId: 'branch-a' }],
  }

  it('fails closed when a token is not business-scoped', async () => {
    const memberships = { findForTenantClaims: vi.fn() } as unknown as MembershipsService
    const contexts = { set: vi.fn() } as unknown as TenantContextService
    const guard = new TenantGuard(memberships, contexts)

    await expect(
      guard.canActivate(contextFor({ actor: { userId: 'user-a', sessionId: 'session-a' } })),
    ).rejects.toMatchObject({ code: 'BUSINESS_ACCESS_DENIED' } satisfies Partial<AppError>)
  })

  it('does not let a platform superadmin bypass tenant membership context', async () => {
    const findForTenantClaims = vi.fn()
    const memberships = { findForTenantClaims } as unknown as MembershipsService
    const contexts = { set: vi.fn() } as unknown as TenantContextService
    const guard = new TenantGuard(memberships, contexts)

    await expect(
      guard.canActivate(contextFor({
        actor: {
          userId: 'platform-admin',
          sessionId: 'session-a',
          platformRole: PlatformRole.SUPERADMIN,
        },
      })),
    ).rejects.toMatchObject({ code: 'BUSINESS_ACCESS_DENIED' } satisfies Partial<AppError>)
    expect(findForTenantClaims).not.toHaveBeenCalled()
  })

  it('rejects a branch outside the active member branch grants', async () => {
    const memberships = {
      findForTenantClaims: vi.fn().mockResolvedValue(membership),
    } as unknown as MembershipsService
    const contexts = { set: vi.fn() } as unknown as TenantContextService
    const guard = new TenantGuard(memberships, contexts)
    const request = {
      actor: {
        userId: 'user-a',
        sessionId: 'session-a',
        businessId: 'business-a',
        memberId: 'member-a',
        authorizationVersion: 2,
      },
      requestId: 'request-a',
      header: vi.fn((name: string) => (name === 'x-branch-id' ? 'branch-b' : undefined)),
    }

    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({
      code: 'BRANCH_ACCESS_DENIED',
    })
  })

  it('creates context only from the server-resolved membership', async () => {
    const memberships = {
      findForTenantClaims: vi.fn().mockResolvedValue(membership),
      activeBranchBelongsToBusiness: vi.fn(),
    } as unknown as MembershipsService
    const set = vi.fn()
    const contexts = { set } as unknown as TenantContextService
    const guard = new TenantGuard(memberships, contexts)
    const request = {
      actor: {
        userId: 'user-a',
        sessionId: 'session-a',
        businessId: 'business-a',
        memberId: 'member-a',
        authorizationVersion: 2,
      },
      requestId: 'request-a',
      header: vi.fn(() => undefined),
    }

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true)
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'business-a',
        memberId: 'member-a',
        branchScope: { kind: 'selected', branchIds: ['branch-a'] },
      }),
    )
  })

  it('rejects a foreign branch even for an all-branches member', async () => {
    const memberships = {
      findForTenantClaims: vi.fn().mockResolvedValue({ ...membership, allBranches: true }),
      activeBranchBelongsToBusiness: vi.fn().mockResolvedValue(false),
    } as unknown as MembershipsService
    const contexts = { set: vi.fn() } as unknown as TenantContextService
    const guard = new TenantGuard(memberships, contexts)
    const request = {
      actor: {
        userId: 'user-a', sessionId: 'session-a', businessId: 'business-a',
        memberId: 'member-a', authorizationVersion: 2,
      },
      requestId: 'request-a',
      header: vi.fn((name: string) => name === 'x-branch-id' ? 'foreign-branch' : undefined),
    }

    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({
      code: 'BRANCH_ACCESS_DENIED',
    })
  })
})
