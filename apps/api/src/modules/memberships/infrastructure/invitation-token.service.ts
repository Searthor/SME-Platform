import { Inject, Injectable } from '@nestjs/common'
import { createHmac, randomBytes } from 'node:crypto'
import { AppConfigService } from '../../../config/app-config.service'

@Injectable()
export class InvitationTokenService {
  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  generate(): string {
    return randomBytes(48).toString('base64url')
  }

  hash(token: string): string {
    return createHmac('sha256', this.config.values.refreshTokenPepper)
      .update(`business-invitation:${token}`)
      .digest('hex')
  }

  isValidFormat(token: string): boolean {
    return /^[A-Za-z0-9_-]{64}$/.test(token)
  }
}
