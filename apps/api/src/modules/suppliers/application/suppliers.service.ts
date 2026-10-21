import { Inject, Injectable } from '@nestjs/common'
import { errors } from '../../../common/errors/app.error'
import { IdService } from '../../../core/ids/id.service'
import type { CreateSupplierDto } from '../api/dto/create-supplier.dto'
import type { SupplierListQueryDto } from '../api/dto/supplier-query.dto'
import type { UpdateSupplierDto } from '../api/dto/update-supplier.dto'
import { SuppliersRepository } from '../infrastructure/suppliers.repository'

@Injectable()
export class SuppliersService {
  constructor(
    @Inject(SuppliersRepository) private readonly repository: SuppliersRepository,
    @Inject(IdService) private readonly ids: IdService,
  ) {}

  list(query: SupplierListQueryDto) {
    return this.repository.list(query)
  }

  async getById(supplierId: string) {
    const supplier = await this.repository.findById(supplierId)
    if (!supplier) throw errors.resourceNotFound('Supplier')
    return supplier
  }

  create(actorUserId: string, dto: CreateSupplierDto, requestId?: string) {
    return this.repository.create({
      id: this.ids.generate(),
      auditId: this.ids.generate(),
      actorUserId,
      ...dto,
      ...(requestId ? { requestId } : {}),
    })
  }

  update(actorUserId: string, supplierId: string, dto: UpdateSupplierDto, requestId?: string) {
    return this.repository.update({
      supplierId,
      auditId: this.ids.generate(),
      actorUserId,
      ...dto,
      ...(requestId ? { requestId } : {}),
    })
  }

  archive(actorUserId: string, supplierId: string, requestId?: string) {
    return this.repository.archive({
      supplierId,
      auditId: this.ids.generate(),
      actorUserId,
      ...(requestId ? { requestId } : {}),
    })
  }
}
