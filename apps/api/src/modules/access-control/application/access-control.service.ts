import { Inject, Injectable } from '@nestjs/common'
import { IdService } from '../../../core/ids/id.service'
import type { CreateRoleDto } from '../api/dto/create-role.dto'
import type { UpdateRoleDto } from '../api/dto/update-role.dto'
import type { PermissionCode } from '../domain/permission-catalog'
import { AccessControlRepository } from '../infrastructure/access-control.repository'

export type AccessAuditMetadata = { requestId?: string; ipAddress?: string; userAgent?: string }

@Injectable()
export class AccessControlService {
  constructor(
    @Inject(AccessControlRepository) private readonly accessControl: AccessControlRepository,
    @Inject(IdService) private readonly ids: IdService,
  ) {}

  listPermissions() {
    return this.accessControl.listPermissions()
  }

  listRoles() {
    return this.accessControl.listRoles()
  }

  async hasAllPermissions(memberId: string, required: readonly PermissionCode[]): Promise<boolean> {
    const effective = new Set(await this.accessControl.effectivePermissionCodes(memberId))
    return required.every(permission => effective.has(permission))
  }

  listEffectivePermissions(memberId: string) {
    return this.accessControl.effectivePermissionCodes(memberId)
  }

  createRole(actorUserId: string, dto: CreateRoleDto, metadata: AccessAuditMetadata) {
    return this.accessControl.createRole({
      id: this.ids.generate(),
      auditId: this.ids.generate(),
      actorUserId,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      permissionCodes: dto.permissionCodes,
      metadata,
    })
  }

  updateRole(actorUserId: string, roleId: string, dto: UpdateRoleDto, metadata: AccessAuditMetadata) {
    return this.accessControl.updateRole({
      roleId,
      auditId: this.ids.generate(),
      actorUserId,
      name: dto.name.trim(),
      permissionCodes: dto.permissionCodes,
      metadata,
    })
  }
}
