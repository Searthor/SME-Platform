import { Inject, Injectable } from '@nestjs/common'
import { errors } from '../../../common/errors/app.error'
import { AppConfigService } from '../../../config/app-config.service'
import { IdService } from '../../../core/ids/id.service'
import { PlatformSettingsService } from '../../../core/platform/application/platform-settings.service'
import { defaultRoleTemplates } from '../../access-control/domain/permission-catalog'
import { MembershipsService } from '../../memberships/application/memberships.service'
import { BusinessInvitationsService } from '../../memberships/application/business-invitations.service'
import { UsersRepository } from '../../users/infrastructure/users.repository'
import type { LoginDto } from '../api/dto/login.dto'
import type { RegisterDto } from '../api/dto/register.dto'
import type { AcceptInvitationDto } from '../api/dto/accept-invitation.dto'
import { normalizeIdentity } from '../domain/identity-normalizer'
import { AuthSessionsRepository } from '../infrastructure/auth-sessions.repository'
import { PasswordService } from '../infrastructure/password.service'
import { RegistrationRepository } from '../infrastructure/registration.repository'
import { TokenService } from '../infrastructure/token.service'

export type RequestMetadata = {
  requestId?: string
  ipAddress?: string
  userAgent?: string
}

export type IssuedSession = {
  accessToken: string
  refreshToken: string
  csrfToken: string
  expiresIn: number
}

const validateTimezone = (timezone: string): void => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
  } catch {
    throw new Error('Invalid IANA timezone')
  }
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(UsersRepository) private readonly users: UsersRepository,
    @Inject(MembershipsService) private readonly memberships: MembershipsService,
    @Inject(BusinessInvitationsService) private readonly invitations: BusinessInvitationsService,
    @Inject(AuthSessionsRepository) private readonly sessions: AuthSessionsRepository,
    @Inject(RegistrationRepository) private readonly registration: RegistrationRepository,
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(IdService) private readonly ids: IdService,
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Inject(PlatformSettingsService) private readonly platformSettings: PlatformSettingsService,
  ) {}

  async register(dto: RegisterDto, metadata: RequestMetadata): Promise<IssuedSession> {
    await this.platformSettings.assertRegistrationAllowed()
    const identity = normalizeIdentity(dto.identifier)
    validateTimezone(dto.timezone)
    const passwordHash = await this.passwords.hash(dto.password)
    const refreshToken = this.tokens.generateRefreshToken()
    const sessionId = this.ids.generate()
    const memberId = this.ids.generate()
    const businessId = this.ids.generate()

    const result = await this.registration.register({
        userId: this.ids.generate(),
        identityId: this.ids.generate(),
        displayName: dto.displayName.trim(),
        identityType: identity.type,
        normalizedIdentity: identity.value,
        passwordHash,
        businessId,
        businessName: dto.businessName.trim(),
        currencyCode: dto.currencyCode,
        timezone: dto.timezone,
        branchId: this.ids.generate(),
        branchCode: dto.branchCode.trim().toUpperCase(),
        branchName: dto.branchName.trim(),
        warehouseId: this.ids.generate(),
        memberId,
        sessionId,
        tokenFamilyId: this.ids.generate(),
        refreshTokenHash: this.tokens.hashRefreshToken(refreshToken),
        sessionExpiresAt: this.refreshExpiresAt(),
        deviceName: dto.deviceName,
        auditId: this.ids.generate(),
        defaultRoles: defaultRoleTemplates.map(role => ({ ...role, id: this.ids.generate() })),
        ...metadata,
    })

    return this.issueSessionTokens(refreshToken, result.session.id, result.user.id, {
      businessId,
      memberId,
      authorizationVersion: result.member.authorizationVersion,
    })
  }

  async login(dto: LoginDto, metadata: RequestMetadata): Promise<IssuedSession> {
    const identity = normalizeIdentity(dto.identifier)
    const user = await this.users.findByNormalizedIdentity(identity.type, identity.value)
    if (!user?.credential || user.status !== 'ACTIVE') throw errors.invalidCredentials()
    if (!(await this.passwords.verify(user.credential.passwordHash, dto.password))) {
      throw errors.invalidCredentials()
    }

    const refreshToken = this.tokens.generateRefreshToken()
    const session = await this.sessions.create({
      id: this.ids.generate(),
      userId: user.id,
      tokenFamilyId: this.ids.generate(),
      refreshTokenHash: this.tokens.hashRefreshToken(refreshToken),
      expiresAt: this.refreshExpiresAt(),
      deviceName: dto.deviceName,
      ...(metadata.ipAddress ? { ipAddress: metadata.ipAddress } : {}),
      ...(metadata.userAgent ? { userAgent: metadata.userAgent } : {}),
    })
    return this.issueSessionTokens(refreshToken, session.id, user.id)
  }

  async previewInvitation(token: string) {
    const invitation = await this.invitations.preview(token)
    const existing = await this.users.findByNormalizedIdentity(invitation.identityType, invitation.normalizedIdentity)
    return {
      businessName: invitation.business.name,
      identityType: invitation.identityType,
      normalizedIdentity: invitation.normalizedIdentity,
      expiresAt: invitation.expiresAt,
      accountExists: Boolean(existing),
    }
  }

  async acceptInvitation(token: string, dto: AcceptInvitationDto) {
    const invitation = await this.invitations.preview(token)
    const existing = await this.users.findByNormalizedIdentity(invitation.identityType, invitation.normalizedIdentity)
    if (existing) {
      if (!existing.credential || !(await this.passwords.verify(existing.credential.passwordHash, dto.password))) {
        throw errors.invalidCredentials()
      }
      return this.invitations.accept({ token, userId: existing.id })
    }

    return this.invitations.accept({
      token,
      userId: this.ids.generate(),
      newUser: {
        identityId: this.ids.generate(),
        displayName: dto.displayName.trim(),
        passwordHash: await this.passwords.hash(dto.password),
      },
    })
  }

  async refresh(refreshToken: string): Promise<IssuedSession> {
    const tokenHash = this.tokens.hashRefreshToken(refreshToken)
    const existing = await this.sessions.findByHash(tokenHash)
    if (!existing || existing.revokedAt || existing.expiresAt <= new Date()) {
      throw errors.invalidRefreshToken()
    }
    if (existing.rotatedAt) {
      await this.sessions.revokeFamily(existing.tokenFamilyId)
      throw errors.refreshTokenReused()
    }

    const newRefreshToken = this.tokens.generateRefreshToken()
    const newSessionId = this.ids.generate()
    const now = new Date()
    const result = await this.sessions.rotate(existing, {
      id: newSessionId,
      refreshTokenHash: this.tokens.hashRefreshToken(newRefreshToken),
      expiresAt: this.refreshExpiresAt(),
      now,
    })

    if (result.reused) {
      await this.sessions.revokeFamily(existing.tokenFamilyId)
      throw errors.refreshTokenReused()
    }
    return this.issueSessionTokens(newRefreshToken, newSessionId, existing.userId, result.selected)
  }

  async selectBusiness(userId: string, sessionId: string, businessId: string): Promise<{ accessToken: string }> {
    const membership = await this.memberships.findForSelection(userId, businessId)
    if (!membership) throw errors.businessAccessDenied()
    await this.sessions.selectMembership(sessionId, userId, membership.businessId, membership.id)
    return {
      accessToken: this.tokens.issueAccessToken({
        sub: userId,
        sid: sessionId,
        businessId: membership.businessId,
        memberId: membership.id,
        authorizationVersion: membership.authorizationVersion,
      }),
    }
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    await this.sessions.revokeSessionFamily(sessionId, userId)
  }

  logoutAll(userId: string): Promise<void> {
    return this.sessions.revokeUserSessions(userId)
  }

  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await this.sessions.listActiveForUser(userId)
    return sessions.map(session => ({ ...session, current: session.id === currentSessionId }))
  }

  revokeSession(userId: string, sessionId: string, requestId?: string): Promise<void> {
    return this.sessions.revokeOwnedSession({
      userId,
      sessionId,
      auditId: this.ids.generate(),
      ...(requestId ? { requestId } : {}),
    })
  }

  private refreshExpiresAt(): Date {
    return new Date(Date.now() + this.config.values.refreshTokenTtlSeconds * 1000)
  }

  private issueSessionTokens(
    refreshToken: string,
    sessionId: string,
    userId: string,
    selected?: { businessId: string; memberId: string; authorizationVersion: number },
  ): IssuedSession {
    return {
      accessToken: this.tokens.issueAccessToken({ sub: userId, sid: sessionId, ...selected }),
      refreshToken,
      csrfToken: this.tokens.generateCsrfToken(),
      expiresIn: this.config.values.accessTokenTtlSeconds,
    }
  }
}
