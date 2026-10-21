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
}
