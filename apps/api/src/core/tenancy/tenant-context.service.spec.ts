import type { TenantContext } from './tenant-context'
import { TenantContextService } from './tenant-context.service'

const contextFor = (businessId: string): TenantContext => ({
  requestId: `request-${businessId}`,
  userId: `user-${businessId}`,
  sessionId: `session-${businessId}`,
  memberId: `member-${businessId}`,
  businessId,
  authorizationVersion: 1,
  branchScope: { kind: 'all' },
})

describe('TenantContextService request isolation (TEN-002)', () => {
  it('keeps concurrent request contexts isolated', async () => {
    const service = new TenantContextService()
    const run = (businessId: string, delay: number) =>
      new Promise<string>((resolve) => {
        service.runForRequest(() => {
          service.set(contextFor(businessId))
          setTimeout(() => resolve(service.require().businessId), delay)
        })
      })

    await expect(Promise.all([run('business-a', 10), run('business-b', 0)])).resolves.toEqual([
      'business-a',
      'business-b',
    ])
  })
})

describe('TenantContextService branch scope (TEN-004)', () => {
  const withScope = <T>(branchScope: TenantContext['branchScope'], fn: (service: TenantContextService) => T): T => {
    const service = new TenantContextService()
    let result!: T
    service.runForRequest(() => {
      service.set({ ...contextFor('business-a'), branchScope })
      result = fn(service)
    })
    return result
  }

  it('lets an all-branch member filter by any branch', () => {
    expect(withScope({ kind: 'all' }, service => service.branchFilter())).toEqual({})
    expect(withScope({ kind: 'all' }, service => service.branchFilter('branch-x'))).toEqual({ branchId: 'branch-x' })
  })

  it('limits a restricted member to their branches, even when another branch is requested', () => {
    const scope = { kind: 'selected', branchIds: ['branch-a'] } as const
    expect(withScope(scope, service => service.branchFilter())).toEqual({ branchId: { in: ['branch-a'] } })
    expect(withScope(scope, service => service.branchFilter('branch-a'))).toEqual({ branchId: 'branch-a' })
    expect(() => withScope(scope, service => service.branchFilter('branch-b'))).toThrow(expect.objectContaining({ code: 'BRANCH_ACCESS_DENIED' }) as Error)
    expect(() => withScope(scope, service => service.assertBranchAccess('branch-b'))).toThrow(expect.objectContaining({ code: 'BRANCH_ACCESS_DENIED' }) as Error)
  })
})
