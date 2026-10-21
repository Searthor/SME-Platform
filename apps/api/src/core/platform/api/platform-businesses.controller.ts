import { Controller, Get, Inject, UseGuards } from '@nestjs/common'
import { PlatformBusinessesService } from '../application/platform-businesses.service'
import { PlatformAdminGuard } from './platform-admin.guard'

@Controller('platform/admin/businesses')
@UseGuards(PlatformAdminGuard)
export class PlatformBusinessesController {
  constructor(@Inject(PlatformBusinessesService) private readonly businesses: PlatformBusinessesService) {}

  @Get()
  list() {
    return this.businesses.list()
  }
}
