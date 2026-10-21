import { Inject, Injectable } from '@nestjs/common'
import { PlatformBusinessesRepository } from '../infrastructure/platform-businesses.repository'

@Injectable()
export class PlatformBusinessesService {
  constructor(@Inject(PlatformBusinessesRepository) private readonly businesses: PlatformBusinessesRepository) {}

  list() {
    return this.businesses.list()
  }
}
