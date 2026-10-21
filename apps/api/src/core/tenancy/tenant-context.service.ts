import { Injectable } from '@nestjs/common'
import { AsyncLocalStorage } from 'node:async_hooks'
import { errors } from '../../common/errors/app.error'
import type { TenantContext } from './tenant-context'

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<{ context?: TenantContext }>()

  runForRequest(callback: () => void): void {
    this.storage.run({}, callback)
  }

  set(context: TenantContext): void {
    const store = this.storage.getStore()
    if (!store) throw errors.tenantContextRequired()
    store.context = context
  }

  current(): TenantContext | undefined {
    return this.storage.getStore()?.context
  }

  require(): TenantContext {
    const context = this.current()
    if (!context) throw errors.tenantContextRequired()
    return context
  }

  /** TEN-004: the member may only act on branches in their scope. */
  assertBranchAccess(branchId: string): void {
    const { branchScope } = this.require()
    if (branchScope.kind === 'selected' && !branchScope.branchIds.includes(branchId)) throw errors.branchAccessDenied()
  }

  /** Where-fragment for branch-owned rows: the requested branch (after the scope check) or the whole scope. */
  branchFilter(requestedBranchId?: string): { branchId?: string | { in: string[] } } {
    if (requestedBranchId) {
      this.assertBranchAccess(requestedBranchId)
      return { branchId: requestedBranchId }
    }
    const { branchScope } = this.require()
    return branchScope.kind === 'selected' ? { branchId: { in: [...branchScope.branchIds] } } : {}
  }
}
