import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { CurrentActor } from '../../../common/http/current-actor.decorator'
import { Public } from '../../../common/http/public.decorator'
import type { AuthenticatedActor, AuthenticatedRequest } from '../../../common/http/request-context'
import { AuthQueryService } from '../application/auth-query.service'
import { AuthService, type IssuedSession } from '../application/auth.service'
import { AuthCookieService } from './auth-cookie.service'
import { LoginDto } from './dto/login.dto'
import { AcceptInvitationDto } from './dto/accept-invitation.dto'
import { RegisterDto } from './dto/register.dto'
import { SelectBusinessDto } from './dto/select-business.dto'

const metadataFrom = (request: AuthenticatedRequest) => {
  const userAgent = request.header('user-agent')
  return {
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  }
}

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AuthQueryService) private readonly queries: AuthQueryService,
    @Inject(AuthCookieService) private readonly cookies: AuthCookieService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.withCookies(response, await this.auth.register(dto, metadataFrom(request)))
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.withCookies(response, await this.auth.login(dto, metadataFrom(request)))
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('invitations/:token')
  previewInvitation(@Param('token') token: string) {
    return this.auth.previewInvitation(token)
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('invitations/:token/accept')
  acceptInvitation(@Param('token') token: string, @Body() dto: AcceptInvitationDto) {
    return this.auth.acceptInvitation(token, dto)
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.refresh(this.cookies.requireRefresh(request))
    return this.withCookies(response, session)
  }

  @Post('logout')
  async logout(
    @CurrentActor() actor: AuthenticatedActor,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.cookies.assertCsrf(request)
    await this.auth.logout(actor.sessionId, actor.userId)
    this.cookies.clear(response)
    return { loggedOut: true }
  }

  @Post('logout-all')
  async logoutAll(
    @CurrentActor() actor: AuthenticatedActor,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.cookies.assertCsrf(request)
    await this.auth.logoutAll(actor.userId)
    this.cookies.clear(response)
    return { loggedOut: true }
  }

  @Get('me')
  me(@CurrentActor() actor: AuthenticatedActor) {
    return this.queries.me(actor.userId)
  }

  @Get('sessions')
  sessions(@CurrentActor() actor: AuthenticatedActor) {
    return this.auth.listSessions(actor.userId, actor.sessionId)
  }

  @Post('sessions/:sessionId/revoke')
  async revokeSession(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('sessionId', new ParseUUIDPipe({ version: '7' })) sessionId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.auth.revokeSession(actor.userId, sessionId, request.requestId)
    return { revoked: true }
  }

  @Post('select-business')
  selectBusiness(@CurrentActor() actor: AuthenticatedActor, @Body() dto: SelectBusinessDto) {
    return this.auth.selectBusiness(actor.userId, actor.sessionId, dto.businessId)
  }

  private withCookies(response: Response, session: IssuedSession) {
    this.cookies.set(response, session)
    return { accessToken: session.accessToken, expiresIn: session.expiresIn, csrfToken: session.csrfToken }
  }
}
