import { Inject, Injectable } from '@nestjs/common'
import { AuditRepository } from '../infrastructure/audit.repository'

@Injectable()
export class AuditService {
  constructor(@Inject(AuditRepository) private readonly audit: AuditRepository) {}

  listCurrent(requestedLimit: number) {
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50
    return this.audit.listCurrent(limit)
  }
}
