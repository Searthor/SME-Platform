import { Global, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { TenantGuard } from '../../core/tenancy/tenant.guard'
import { PlatformModule } from '../../core/platform/platform.module'
import { MembershipsModule } from '../memberships/memberships.module'
import { UsersModule } from '../users/users.module'
import { AuthController } from './api/auth.controller'
import { AuthCookieService } from './api/auth-cookie.service'
import { AuthGuard } from './api/auth.guard'
import { AuthQueryService } from './application/auth-query.service'
import { AuthService } from './application/auth.service'
import { AuthSessionsRepository } from './infrastructure/auth-sessions.repository'
import { PasswordService } from './infrastructure/password.service'
import { RegistrationRepository } from './infrastructure/registration.repository'
import { TokenService } from './infrastructure/token.service'

@Global()
@Module({
  imports: [UsersModule, MembershipsModule, PlatformModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthQueryService,
    AuthCookieService,
    AuthGuard,
    TenantGuard,
    AuthSessionsRepository,
    PasswordService,
    RegistrationRepository,
    TokenService,
    { provide: APP_GUARD, useExisting: AuthGuard },
  ],
  exports: [AuthGuard, TenantGuard],
})
export class AuthModule {}
