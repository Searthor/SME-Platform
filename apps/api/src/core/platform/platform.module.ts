import { Module } from '@nestjs/common'
import { PlatformAdminGuard } from './api/platform-admin.guard'
import { PlatformSettingsController } from './api/platform-settings.controller'
import { PlatformBusinessesController } from './api/platform-businesses.controller'
import { PlatformBusinessesService } from './application/platform-businesses.service'
import { PlatformSettingsService } from './application/platform-settings.service'
import { PlatformSettingsRepository } from './infrastructure/platform-settings.repository'
import { PlatformBusinessesRepository } from './infrastructure/platform-businesses.repository'

@Module({
  controllers: [PlatformSettingsController, PlatformBusinessesController],
  providers: [PlatformAdminGuard, PlatformSettingsService, PlatformSettingsRepository, PlatformBusinessesService, PlatformBusinessesRepository],
  exports: [PlatformSettingsService],
})
export class PlatformModule {}
