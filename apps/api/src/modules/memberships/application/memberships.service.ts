import { Inject, Injectable } from '@nestjs/common'
import { errors } from '../../../common/errors/app.error'
import { IdService } from '../../../core/ids/id.service'
import { UsersService } from '../../users/application/users.service'
import type { CreateMembershipDto } from '../api/dto/create-membership.dto'
import type { UpdateMembershipDto } from '../api/dto/update-membership.dto'
import { MembershipsRepository } from '../infrastructure/memberships.repository'

type AuditMetadata = { requestId?: string; ipAddress?: string; userAgent?: string }

@Injectable()
export class MembershipsService {
  constructor(
    @Inject(MembershipsRepository) private readonly memberships: MembershipsRepository,
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(IdService) private readonly ids: IdService,
  ) {}

  listForUser(userId: string) {
    return this.memberships.listActiveForUser(userId)
  }

  findForSelection(userId: string, businessId: string) {
    return this.memberships.findActiveForSelection(userId, businessId)
  }

  findForTenantClaims(input: {
    userId: string
    businessId: string
    memberId: string
    authorizationVersion: number
  }) {
    return this.memberships.findActiveForTenantClaims(input)
  }

  activeBranchBelongsToBusiness(businessId: string, branchId: string): Promise<boolean> {
    return this.memberships.activeBranchBelongsToBusiness(businessId, branchId)
  }

  listCurrent() {
    return this.memberships.listCurrent()
  }

  async getCurrent(memberId: string) {
    const member = await this.memberships.findCurrentById(memberId)
    if (!member) throw errors.resourceNotFound('Business member')
    return member
  }

  async createCurrent(actorUserId: string, dto: CreateMembershipDto, metadata: AuditMetadata) {
    const user = await this.users.resolveActiveByIdentifier(dto.identifier)
    return this.memberships.createCurrent({
      id: this.ids.generate(),
      auditId: this.ids.generate(),
      actorUserId,
      userId: user.id,
      allBranches: dto.allBranches,
      branchGrants: dto.branchIds.map(branchId => ({ id: this.ids.generate(), branchId })),
      roleIds: dto.roleIds,
      metadata,
    })
  }

  updateCurrent(
    actorUserId: string,
    memberId: string,
    dto: UpdateMembershipDto,
    metadata: AuditMetadata,
  ) {
    return this.memberships.updateCurrent({
      memberId,
      auditId: this.ids.generate(),
      actorUserId,
      status: dto.status,
      allBranches: dto.allBranches,
      branchGrants: dto.branchIds.map(branchId => ({ id: this.ids.generate(), branchId })),
      roleIds: dto.roleIds,
      metadata,
    })
  }
}
