import { Inject, Injectable } from '@nestjs/common'
import { errors } from '../../../common/errors/app.error'
import { IdService } from '../../../core/ids/id.service'
import { defaultRoleTemplates } from '../../access-control/domain/permission-catalog'
import type { CreateBusinessDto } from '../api/dto/create-business.dto'
import type { UpdateBusinessDto } from '../api/dto/update-business.dto'
import { BusinessesRepository } from '../infrastructure/businesses.repository'

type AuditMetadata = { requestId?: string; ipAddress?: string; userAgent?: string }

@Injectable()
export class BusinessesService {
  constructor(
    @Inject(BusinessesRepository) private readonly businesses: BusinessesRepository,
    @Inject(IdService) private readonly ids: IdService,
  ) {}

  async getCurrent() {
    const business = await this.businesses.findCurrent()
    if (!business) throw errors.resourceNotFound('Business')
    return business
  }

  create(actorUserId: string, dto: CreateBusinessDto, metadata: AuditMetadata) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: dto.timezone }).format()
    } catch {
      throw errors.invalidTimezone()
    }
    const businessId = this.ids.generate()
    const branchId = this.ids.generate()
    const memberId = this.ids.generate()
    const roles = defaultRoleTemplates.map(t => ({
      id: this.ids.generate(),
      code: t.code,
      name: t.name,
      isSystem: t.isSystem,
      permissions: t.permissions,
    }))

    return this.businesses.createBusiness({
      businessId,
      name: dto.name.trim(),
      currencyCode: dto.currencyCode,
      timezone: dto.timezone,
      branchId,
      branchCode: dto.branchCode?.trim().toUpperCase() || 'MAIN',
      branchName: dto.branchName?.trim() || 'ສາຂາຫຼັກ',
      memberId,
      actorUserId,
      defaultRoles: roles,
      auditId: this.ids.generate(),
      metadata,
    })
  }

  updateCurrent(actorUserId: string, dto: UpdateBusinessDto, metadata: AuditMetadata) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: dto.timezone }).format()
    } catch {
      throw errors.invalidTimezone()
    }
    return this.businesses.updateCurrent({
      auditId: this.ids.generate(),
      actorUserId,
      name: dto.name.trim(),
      currencyCode: dto.currencyCode,
      timezone: dto.timezone,
      metadata,
    })
  }
}
