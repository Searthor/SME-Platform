import { Module } from '@nestjs/common'
import { UsersModule } from '../users/users.module'
import { MembershipsController } from './api/memberships.controller'
import { BusinessInvitationsController } from './api/business-invitations.controller'
import { BusinessInvitationsService } from './application/business-invitations.service'
import { MembershipsService } from './application/memberships.service'
import { BusinessInvitationsRepository } from './infrastructure/business-invitations.repository'
import { InvitationTokenService } from './infrastructure/invitation-token.service'
import { MembershipsRepository } from './infrastructure/memberships.repository'

@Module({
  imports: [UsersModule],
  controllers: [MembershipsController, BusinessInvitationsController],
  providers: [MembershipsRepository, MembershipsService, BusinessInvitationsRepository, BusinessInvitationsService, InvitationTokenService],
  exports: [MembershipsService, BusinessInvitationsService],
})
export class MembershipsModule {}
