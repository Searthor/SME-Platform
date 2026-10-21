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
