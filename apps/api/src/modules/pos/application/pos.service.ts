import { Inject, Injectable } from '@nestjs/common'
import { PosSessionStatus } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { IdempotencyService } from '../../../core/idempotency/idempotency.service'
import type {
  CashMovementDto,
  CloseSessionDto,
  CreateSaleDto,
  OpenSessionDto,
  SaleListQueryDto,
} from '../api/dto/pos.dto'
import { PosRepository } from '../infrastructure/pos.repository'

const SALE_CREATE_OPERATION = 'pos.sale.create'

@Injectable()
export class PosService {
  constructor(
    @Inject(PosRepository) private readonly repository: PosRepository,
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
  ) {}

  listRegisters(branchId?: string) {
    return this.repository.listRegisters(branchId)
  }

  getCurrentSession(userId: string, branchId?: string) {
    return this.repository.getCurrentSession(userId, branchId)
  }

  async getSessionById(sessionId: string) {
    const session = await this.repository.getSessionById(sessionId)
    if (!session) throw errors.resourceNotFound('POS Session')
    return session
  }

  listSessions(query: { branchId?: string; status?: PosSessionStatus; limit?: number; offset?: number }) {
    return this.repository.listSessions(query)
  }

  openSession(userId: string, dto: OpenSessionDto) {
    return this.repository.openSession(userId, dto)
  }

  recordCashMovement(userId: string, sessionId: string, dto: CashMovementDto) {
    return this.repository.recordCashMovement(userId, sessionId, dto)
  }

  closeSession(userId: string, sessionId: string, dto: CloseSessionDto) {
    return this.repository.closeSession(userId, sessionId, dto)
  }

  getSessionSummary(sessionId: string) {
    return this.repository.calculateSessionSummary(sessionId)
  }

  searchProducts(query: { q?: string; branchId: string; warehouseId?: string }) {
    return this.repository.searchProducts(query)
  }

  /** A retry with the same Idempotency-Key returns the original sale instead of selling twice. */
  async createSale(userId: string, dto: CreateSaleDto, idempotencyKey?: string) {
    const claim = this.idempotency.prepare(SALE_CREATE_OPERATION, idempotencyKey, dto)
    if (!claim) return this.repository.createSale(userId, dto)

    const replayedSaleId = await this.idempotency.findReplay(claim)
    if (replayedSaleId) return this.getSaleById(replayedSaleId)

    try {
      return await this.repository.createSale(userId, dto, claim)
    } catch (error) {
      if (!this.idempotency.isDuplicateClaim(error)) throw error
      const concurrentSaleId = await this.idempotency.findReplay(claim)
      if (!concurrentSaleId) throw error
      return this.getSaleById(concurrentSaleId)
    }
  }

  listSales(query: SaleListQueryDto) {
    return this.repository.listSales(query)
  }

  async getSaleById(saleId: string) {
    const sale = await this.repository.getSaleById(saleId)
    if (!sale) throw errors.resourceNotFound('Sale')
    return sale
  }
}
