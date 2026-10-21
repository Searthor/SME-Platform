import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class PlatformBusinessesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.business.findMany({
      select: {
        id: true,
        name: true,
        currencyCode: true,
        timezone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { branches: true, members: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }
}
