import { Inject, Injectable } from '@nestjs/common'
import { errors } from '../../../common/errors/app.error'
import { normalizeIdentity } from '../../../common/identity/identity-normalizer'
import { IdService } from '../../../core/ids/id.service'
import type { CreateInvitationDto } from '../api/dto/create-invitation.dto'
import { BusinessInvitationsRepository } from '../infrastructure/business-invitations.repository'
import { InvitationTokenService } from '../infrastructure/invitation-token.service'

type AuditMetadata = { requestId?: string; ipAddress?: string; userAgent?: string }

@Injectable()
export class BusinessInvitationsService {
  constructor(
    @Inject(BusinessInvitationsRepository) private readonly invitations: BusinessInvitationsRepository,
    @Inject(InvitationTokenService) private readonly tokens: InvitationTokenService,
    @Inject(IdService) private readonly ids: IdService,
  ) {}

  listCurrent() {
    return this.invitations.listCurrent()
  }

  async createCurrent(actorUserId: string, dto: CreateInvitationDto, metadata: AuditMetadata) {
    if (!dto.allBranches && !dto.branchIds.length) throw errors.invalidBranchScope()
    const identity = normalizeIdentity(dto.identifier)
    const token = this.tokens.generate()
    const invitation = await this.invitations.createCurrent({
      invitationId: this.ids.generate(),
      auditId: this.ids.generate(),
      actorUserId,
      identityType: identity.type,
      normalizedIdentity: identity.value,
      tokenHash: this.tokens.hash(token),
      allBranches: dto.allBranches,
      branchIds: dto.branchIds,
      roleIds: dto.roleIds,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      metadata,
    })
    return { ...invitation, token }
  }

  preview(token: string) {
    this.assertToken(token)
    return this.invitations.previewByTokenHash(this.tokens.hash(token), new Date())
  }

  accept(input: {
    token: string
    userId: string
    newUser?: { identityId: string; displayName: string; passwordHash: string }
  }) {
    this.assertToken(input.token)
    return this.invitations.accept({
      tokenHash: this.tokens.hash(input.token),
      userId: input.userId,
      memberId: this.ids.generate(),
      branchGrantIds: Array.from({ length: 100 }, () => this.ids.generate()),
      auditId: this.ids.generate(),
      now: new Date(),
      ...(input.newUser ? { newUser: input.newUser } : {}),
    })
  }

  revokeCurrent(invitationId: string, actorUserId: string, metadata: AuditMetadata) {
    return this.invitations.revokeCurrent(invitationId, actorUserId, this.ids.generate(), metadata)
  }

  private assertToken(token: string): void {
    if (!this.tokens.isValidFormat(token)) throw errors.invitationInvalid()
  }
}
