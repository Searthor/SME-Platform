import { Inject, Injectable } from '@nestjs/common'
import { UsersService } from '../../users/application/users.service'
import { MembershipsService } from '../../memberships/application/memberships.service'

@Injectable()
export class AuthQueryService {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(MembershipsService) private readonly memberships: MembershipsService,
  ) {}

  async me(userId: string) {
    const [user, memberships] = await Promise.all([
      this.users.getPublicUser(userId),
      this.memberships.listForUser(userId),
    ])
    return { user, memberships }
  }
}
