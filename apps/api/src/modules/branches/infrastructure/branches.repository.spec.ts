import type { PrismaService } from '../../../core/database/prisma.service'
import type { TenantContextService } from '../../../core/tenancy/tenant-context.service'
import { BranchesRepository } from './branches.repository'

describe('BranchesRepository tenant scoping (TEN-001, TEN-003)', () => {
  it('always includes TenantContext.businessId in an ID lookup', async () => {
    const findFirst = vi.fn().mockResolvedValue(null)
    const prisma = { branch: { findFirst } } as unknown as PrismaService
    const tenantContext = {
      require: () => ({
        businessId: 'business-a',
        branchScope: { kind: 'all' as const },
      }),
    } as unknown as TenantContextService
    const repository = new BranchesRepository(prisma, tenantContext)

    await repository.findCurrentById('branch-from-business-b')

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: 'business-a', id: 'branch-from-business-b' } }),
    )
  })

  it('does not query a branch excluded by selected branch scope', () => {
    const findFirst = vi.fn()
    const prisma = { branch: { findFirst } } as unknown as PrismaService
    const tenantContext = {
      require: () => ({
        businessId: 'business-a',
        branchScope: { kind: 'selected' as const, branchIds: ['branch-a'] },
      }),
    } as unknown as TenantContextService
    const repository = new BranchesRepository(prisma, tenantContext)

    expect(repository.findCurrentById('branch-b')).toBeNull()
    expect(findFirst).not.toHaveBeenCalled()
  })
})
