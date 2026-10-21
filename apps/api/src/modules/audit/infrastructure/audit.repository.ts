import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../../../core/database/prisma.service'
import { TenantContextService } from '../../../core/tenancy/tenant-context.service'

@Injectable()
export class AuditRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
  ) {}

  listCurrent(limit: number) {
    const { businessId } = this.tenantContext.require()
    return this.prisma.auditLog.findMany({
      where: { businessId },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        before: true,
        after: true,
        requestId: true,
        createdAt: true,
        user: { select: { id: true, displayName: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    })
  }
}
