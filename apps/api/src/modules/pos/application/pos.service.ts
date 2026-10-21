import { Inject, Injectable } from '@nestjs/common'
import { PosSessionStatus } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import type {
  CashMovementDto,
  CloseSessionDto,
  CreateSaleDto,
  OpenSessionDto,
  SaleListQueryDto,
} from '../api/dto/pos.dto'
import { PosRepository } from '../infrastructure/pos.repository'

@Injectable()
export class PosService {
  constructor(
    @Inject(PosRepository) private readonly repository: PosRepository,
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

  createSale(userId: string, dto: CreateSaleDto) {
    return this.repository.createSale(userId, dto)
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
