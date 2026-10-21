import { Inject, Injectable } from '@nestjs/common'
import { PosSessionStatus } from '@prisma/client'
import { errors } from '../../../common/errors/app.error'
import { type IdempotencyClaim, IdempotencyService } from '../../../core/idempotency/idempotency.service'
import type {
  CashMovementDto,
  CloseSessionDto,
  CreateSaleDto,
  OpenSessionDto,
  QuoteSaleDto,
  SaleListQueryDto,
} from '../api/dto/pos.dto'
import { preparePayments } from '../domain/sale-pricing'
import { PosRepository } from '../infrastructure/pos.repository'
import { SalePricingService, serializeQuote } from './sale-pricing.service'

const SALE_CREATE_OPERATION = 'pos.sale.create'

@Injectable()
export class PosService {
  constructor(
    @Inject(PosRepository) private readonly repository: PosRepository,
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
    @Inject(SalePricingService) private readonly pricing: SalePricingService,
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

  /** Preview of exactly what POST /pos/sales would charge for this cart. */
  async quoteSale(dto: QuoteSaleDto) {
    return serializeQuote(await this.pricing.price(dto))
  }

  /** A retry with the same Idempotency-Key returns the original sale instead of selling twice. */
  async createSale(userId: string, dto: CreateSaleDto, idempotencyKey?: string) {
    const claim = this.idempotency.prepare(SALE_CREATE_OPERATION, idempotencyKey, dto)
    return this.idempotency.run(
      claim,
      () => this.priceAndCreateSale(userId, dto, claim),
      saleId => this.getSaleById(saleId),
    )
  }

  private async priceAndCreateSale(userId: string, dto: CreateSaleDto, claim?: IdempotencyClaim) {
    const { quote, customer } = await this.pricing.price(dto)

    // The cashier charged what the preview showed; never post a different total silently
    if (dto.expectedGrandTotal !== undefined && !quote.grandTotal.eq(dto.expectedGrandTotal)) {
      throw errors.saleTotalChanged(quote.grandTotal.toFixed(4))
    }

    const payment = preparePayments(quote.grandTotal, dto.payments ?? [], quote.currencyCode)
    return this.repository.createSale(userId, {
      branchId: dto.branchId,
      warehouseId: dto.warehouseId,
      posSessionId: dto.posSessionId,
      customer,
      customerName: dto.customerName,
      notes: dto.notes,
      quote,
      payment,
    }, claim)
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
