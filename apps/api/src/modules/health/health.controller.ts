import { Controller, Get } from '@nestjs/common'
import { Public } from '../../common/http/public.decorator'

@Controller('health')
export class HealthController {
  @Public()
  @Get('live')
  live() {
    return { status: 'ok' }
  }
}
