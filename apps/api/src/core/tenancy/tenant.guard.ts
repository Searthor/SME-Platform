import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common'
import { errors } from '../../common/errors/app.error'
import type { AuthenticatedRequest } from '../../common/http/request-context'
import { MembershipsService } from '../../modules/memberships/application/memberships.service'
import type { TenantAwareRequest } from './current-tenant.decorator'
import type { TenantContext } from './tenant-context'
import { TenantContextService } from './tenant-context.service'

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @Inject(MembershipsService) private readonly memberships: MembershipsService,
    @Inject(TenantContextService) private readonly contexts: TenantContextService,
  ) {}

  async canActivate(executionContext: ExecutionContext): Promise<boolean> {
    const request = executionContext
      .switchToHttp()
      .getRequest<AuthenticatedRequest & TenantAwareRequest>()
    const actor = request.actor
    if (!actor?.businessId || !actor.memberId || actor.authorizationVersion === undefined) {
      throw errors.businessAccessDenied()
    }

    const member = await this.memberships.findForTenantClaims({
      userId: actor.userId,
      businessId: actor.businessId,
      memberId: actor.memberId,
      authorizationVersion: actor.authorizationVersion,
    })
    if (!member) throw errors.businessAccessDenied()

    const branchIds = member.branchAccess.map((grant) => grant.branchId)
    const activeBranchId = request.header('x-branch-id')
    if (activeBranchId && !member.allBranches && !branchIds.includes(activeBranchId)) {
      throw errors.branchAccessDenied()
    }
    if (activeBranchId && !(await this.memberships.activeBranchBelongsToBusiness(member.businessId, activeBranchId))) {
      throw errors.branchAccessDenied()
    }

    const tenantContext: TenantContext = {
      requestId: request.requestId ?? 'unknown',
      userId: actor.userId,
      sessionId: actor.sessionId,
      memberId: member.id,
      businessId: member.businessId,
      authorizationVersion: member.authorizationVersion,
      branchScope: member.allBranches ? { kind: 'all' } : { kind: 'selected', branchIds },
      ...(activeBranchId ? { activeBranchId } : {}),
    }
    request.tenantContext = tenantContext
    this.contexts.set(tenantContext)
    return true
  }
}
