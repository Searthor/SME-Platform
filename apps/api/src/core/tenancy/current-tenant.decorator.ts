import { createParamDecorator } from '@nestjs/common'
import { errors } from '../../common/errors/app.error'
import type { TenantContext } from './tenant-context'
import type { TenantContextService } from './tenant-context.service'

export const CurrentTenant = createParamDecorator((_data: unknown, context): TenantContext => {
  const request = context.switchToHttp().getRequest<{ tenantContext?: TenantContext }>()
  if (!request.tenantContext) throw errors.tenantContextRequired()
  return request.tenantContext
})

export type TenantAwareRequest = { tenantContext?: TenantContext }
export type TenantContextReader = Pick<TenantContextService, 'require'>
