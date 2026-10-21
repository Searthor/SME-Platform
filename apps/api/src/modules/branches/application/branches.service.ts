import { Inject, Injectable } from '@nestjs/common'
import { errors } from '../../../common/errors/app.error'
import { IdService } from '../../../core/ids/id.service'
import type { CreateBranchDto } from '../api/dto/create-branch.dto'
import type { UpdateBranchDto } from '../api/dto/update-branch.dto'
import { BranchesRepository } from '../infrastructure/branches.repository'

@Injectable()
export class BranchesService {
  constructor(
    @Inject(BranchesRepository) private readonly branches: BranchesRepository,
    @Inject(IdService) private readonly ids: IdService,
  ) {}

  listCurrent() {
    return this.branches.listCurrent()
  }

  async getCurrent(branchId: string) {
    const branch = await this.branches.findCurrentById(branchId)
    if (!branch) throw errors.resourceNotFound('Branch')
    return branch
  }

  createCurrent(actorUserId: string, dto: CreateBranchDto, requestId?: string) {
    return this.branches.createCurrent({
      id: this.ids.generate(),
      auditId: this.ids.generate(),
      actorUserId,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      ...(requestId ? { requestId } : {}),
    })
  }

  updateCurrent(actorUserId: string, branchId: string, dto: UpdateBranchDto, requestId?: string) {
    return this.branches.updateCurrent({
      branchId,
      auditId: this.ids.generate(),
      actorUserId,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      status: dto.status,
      ...(requestId ? { requestId } : {}),
    })
  }
}
