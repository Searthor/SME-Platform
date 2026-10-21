import { Inject, Injectable } from '@nestjs/common'
import { errors } from '../../../common/errors/app.error'
import { normalizeIdentity } from '../../../common/identity/identity-normalizer'
import { UsersRepository } from '../infrastructure/users.repository'

@Injectable()
export class UsersService {
  constructor(@Inject(UsersRepository) private readonly users: UsersRepository) {}

  async getPublicUser(userId: string) {
    const user = await this.users.findPublicById(userId)
    if (!user) throw errors.resourceNotFound('User')
    return user
  }

  exists(userId: string): Promise<boolean> {
    return this.users.exists(userId)
  }

  async resolveActiveByIdentifier(identifier: string) {
    const identity = normalizeIdentity(identifier)
    const user = await this.users.findActivePublicByIdentity(identity.type, identity.value)
    if (!user) throw errors.resourceNotFound('User')
    return user
  }
}
