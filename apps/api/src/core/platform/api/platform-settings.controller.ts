import { Body, Controller, Get, Inject, Patch, Req, UseGuards } from '@nestjs/common'
import { CurrentActor } from '../../../common/http/current-actor.decorator'
import type { AuthenticatedActor, AuthenticatedRequest } from '../../../common/http/request-context'
import { PlatformSettingsService } from '../application/platform-settings.service'
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto'
import { PlatformAdminGuard } from './platform-admin.guard'

@Controller('platform/admin/settings')
@UseGuards(PlatformAdminGuard)
export class PlatformSettingsController {
  constructor(
    @Inject(PlatformSettingsService) private readonly settings: PlatformSettingsService,
  ) {}

  @Get()
  get() {
    return this.settings.get()
  }

  @Patch()
  update(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: UpdatePlatformSettingsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const userAgent = request.header('user-agent')
    return this.settings.update(actor.userId, dto, {
      ...(request.requestId ? { requestId: request.requestId } : {}),
      ...(request.ip ? { ipAddress: request.ip } : {}),
      ...(userAgent ? { userAgent } : {}),
    })
  }
}
