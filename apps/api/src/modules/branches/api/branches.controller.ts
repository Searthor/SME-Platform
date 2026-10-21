import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { CurrentActor } from '../../../common/http/current-actor.decorator'
import type { AuthenticatedActor, AuthenticatedRequest } from '../../../common/http/request-context'
import { TenantGuard } from '../../../core/tenancy/tenant.guard'
import { PermissionGuard } from '../../access-control/api/permission.guard'
import { RequirePermissions } from '../../access-control/api/require-permissions.decorator'
import { BranchesService } from '../application/branches.service'
import { CreateBranchDto } from './dto/create-branch.dto'
import { UpdateBranchDto } from './dto/update-branch.dto'

@Controller('branches')
@UseGuards(TenantGuard, PermissionGuard)
export class BranchesController {
  constructor(@Inject(BranchesService) private readonly branches: BranchesService) {}

  @Get()
  @RequirePermissions('branch.view')
  list() {
    return this.branches.listCurrent()
  }

  @Get(':branchId')
  @RequirePermissions('branch.view')
  get(@Param('branchId', new ParseUUIDPipe({ version: '7' })) branchId: string) {
    return this.branches.getCurrent(branchId)
  }

  @Post()
  @RequirePermissions('branch.manage')
  create(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: CreateBranchDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.branches.createCurrent(actor.userId, dto, request.requestId)
  }

  @Patch(':branchId')
  @RequirePermissions('branch.manage')
  update(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('branchId', new ParseUUIDPipe({ version: '7' })) branchId: string,
    @Body() dto: UpdateBranchDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.branches.updateCurrent(actor.userId, branchId, dto, request.requestId)
  }
}
