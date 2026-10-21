import 'reflect-metadata'
import { ValidationPipe, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { Prisma, PromotionRewardType, PromotionType } from '@prisma/client'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import { v7 as uuidv7 } from 'uuid'
import { AppModule } from '../src/app.module'
import { AppExceptionFilter } from '../src/common/http/app-exception.filter'
import { ResponseEnvelopeInterceptor } from '../src/common/http/response-envelope.interceptor'
import { PrismaService } from '../src/core/database/prisma.service'

const describeWithDatabase = process.env.TEST_DATABASE_URL ? describe : describe.skip

type Body = { data?: Record<string, unknown>; error?: { code?: string } }

describeWithDatabase('POS server-side pricing E2E (MON-003, SAL-005, PAY-004)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let token: string
  let businessId: string
  let branchId: string
  let variantId: string
  let vipGroupId: string
  let vipCustomerId: string
  const identifier = `pricing-owner-${uuidv7()}@example.com`

  const http = () => request(app.getHttpServer() as Parameters<typeof request>[0])
  const post = (path: string, body: object) => http().post(`/api/v1${path}`).set('Authorization', `Bearer ${token}`).send(body)
  const data = (response: request.Response) => (response.body as Body).data ?? {}
  const errorCode = (response: request.Response) => (response.body as Body).error?.code

  const stock = async () =>
    (await prisma.stockBalance.findFirst({ where: { businessId, variantId } }))?.quantity.toString()

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
    process.env.ACCESS_TOKEN_SECRET = 'test-access-secret-with-at-least-32-characters'
    process.env.REFRESH_TOKEN_PEPPER = 'test-refresh-pepper-with-at-least-32-characters'
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.use(cookieParser())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    app.useGlobalFilters(new AppExceptionFilter())
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor())
    await app.init()
    prisma = app.get(PrismaService)

    const registered = await http().post('/api/v1/auth/register').send({
      displayName: 'Pricing Owner', identifier, password: 'strong-password-123',
      businessName: 'Pricing Cafe', branchName: 'Main', branchCode: 'MAIN',
      currencyCode: 'LAK', timezone: 'Asia/Vientiane', deviceName: 'E2E',
    }).expect(201)
    token = data(registered).accessToken as string

    const identity = await prisma.userIdentity.findFirstOrThrow({ where: { normalizedValue: identifier } })
    const member = await prisma.businessMember.findFirstOrThrow({ where: { userId: identity.userId } })
    const branch = await prisma.branch.findFirstOrThrow({ where: { businessId: member.businessId } })
    businessId = branch.businessId
    branchId = branch.id

    // Catalog and stock fixtures (onboarding does not create a warehouse yet)
    const warehouseId = uuidv7()
    const unitId = uuidv7()
    const productId = uuidv7()
    variantId = uuidv7()
    vipGroupId = uuidv7()
    vipCustomerId = uuidv7()
    await prisma.warehouse.create({ data: { id: warehouseId, businessId, branchId, code: 'WH', name: 'Main', isDefault: true } })
    await prisma.unit.create({ data: { id: unitId, businessId, code: 'CUP', name: 'Cup' } })
    await prisma.product.create({ data: { id: productId, businessId, unitId, name: 'Latte' } })
    await prisma.productVariant.create({
      data: { id: variantId, businessId, productId, sellingPrice: new Prisma.Decimal('10000'), cost: new Prisma.Decimal('6000'), isDefault: true },
    })
    await prisma.stockBalance.create({ data: { id: uuidv7(), businessId, warehouseId, variantId, quantity: new Prisma.Decimal('20') } })
    await prisma.customerGroup.create({ data: { id: vipGroupId, businessId, code: 'VIP', name: 'VIP' } })
    await prisma.customer.create({ data: { id: vipCustomerId, businessId, groupId: vipGroupId, name: 'VIP Customer' } })
    await prisma.promotion.create({
      data: {
        id: uuidv7(), businessId, name: 'VIP half price', code: 'VIP50', type: PromotionType.DISCOUNT,
        startDate: new Date('2020-01-01'), endDate: new Date('2099-01-01'), customerGroupScope: vipGroupId,
        rewardType: PromotionRewardType.DISCOUNT_PERCENT, discountValue: new Prisma.Decimal('50'),
      },
    })

    await post('/pos/sessions/open', { branchId, openingCash: '0' }).expect(201)
  })

  afterAll(async () => {
    if (prisma && businessId) {
      const where = { businessId }
      await prisma.salePayment.deleteMany({ where })
      await prisma.saleItem.deleteMany({ where })
      await prisma.sale.deleteMany({ where })
      await prisma.posCashMovement.deleteMany({ where })
      await prisma.posSession.deleteMany({ where })
      await prisma.posRegister.deleteMany({ where })
      await prisma.stockMovement.deleteMany({ where })
      await prisma.stockBalance.deleteMany({ where })
      await prisma.idempotencyRecord.deleteMany({ where })
      await prisma.documentSequence.deleteMany({ where })
      await prisma.promotionItem.deleteMany({ where })
      await prisma.promotion.deleteMany({ where })
      await prisma.customer.deleteMany({ where })
      await prisma.customerGroup.deleteMany({ where })
      await prisma.productVariant.deleteMany({ where })
      await prisma.product.deleteMany({ where })
      await prisma.unit.deleteMany({ where })
      await prisma.warehouse.deleteMany({ where })
      await prisma.auditLog.deleteMany({ where })
      await prisma.memberRole.deleteMany({ where })
      await prisma.rolePermission.deleteMany({ where })
      await prisma.role.deleteMany({ where })
      await prisma.memberBranchAccess.deleteMany({ where })
      await prisma.businessMember.deleteMany({ where })
      await prisma.branch.deleteMany({ where })
      await prisma.business.deleteMany({ where: { id: businessId } })
      const user = await prisma.userIdentity.findFirst({ where: { normalizedValue: identifier } })
      if (user) {
        await prisma.authSession.deleteMany({ where: { userId: user.userId } })
        await prisma.passwordCredential.deleteMany({ where: { userId: user.userId } })
        await prisma.userIdentity.deleteMany({ where: { userId: user.userId } })
        await prisma.user.deleteMany({ where: { id: user.userId } })
      }
    }
    await app?.close()
  })

  // Rejecting client prices is covered by pos.dto.spec.ts: vitest's esbuild transform does not emit
  // decorator metadata, so ValidationPipe cannot see DTO types in these HTTP tests.

  it('quotes from catalog prices and does not give a group promotion to walk-in customers', async () => {
    const walkIn = data(await post('/pos/quote', { branchId, items: [{ variantId, quantity: '3' }] }).expect(201))
    expect(walkIn.grandTotal).toBe('30000.0000')

    const vip = data(await post('/pos/quote', { branchId, customerId: vipCustomerId, items: [{ variantId, quantity: '3' }] }).expect(201))
    expect(vip.discountAmount).toBe('15000.0000')
    expect(vip.grandTotal).toBe('15000.0000')
  })

  it('posts the sale with server totals, a cost snapshot and a matching stock movement', async () => {
    const before = await stock()
    const sale = data(await post('/pos/sales', {
      branchId,
      items: [{ variantId, quantity: '3' }],
      manualDiscount: { type: 'AMOUNT', value: '5000' },
      expectedGrandTotal: '25000',
      payments: [{ method: 'CASH', amount: '25000', tenderedAmount: '30000' }],
    }).expect(201))

    expect(sale).toMatchObject({ subtotal: '30000.0000', discountAmount: '5000.0000', grandTotal: '25000.0000', changeAmount: '5000.0000', paymentStatus: 'PAID' })
    const item = await prisma.saleItem.findFirstOrThrow({ where: { businessId, saleId: sale.id as string } })
    expect(item.unitPrice.toString()).toBe('10000')
    expect(item.unitCost.toString()).toBe('6000')
    expect(Number(before) - Number(await stock())).toBe(3)
    expect(await prisma.stockMovement.count({ where: { businessId, referenceId: sale.id as string } })).toBe(1)
  })

  it('refuses to charge a total different from what the cashier saw', async () => {
    const before = await stock()
    const response = await post('/pos/sales', { branchId, items: [{ variantId, quantity: '1' }], expectedGrandTotal: '9000' }).expect(409)
    expect(errorCode(response)).toBe('SALE_TOTAL_CHANGED')
    expect(await stock()).toBe(before)
  })

  it('requires sale.discount for manual discounts', async () => {
    await prisma.rolePermission.deleteMany({ where: { businessId, permissionCode: 'sale.discount' } })

    const denied = await post('/pos/quote', { branchId, items: [{ variantId, quantity: '1' }], manualDiscount: { type: 'PERCENT', value: '10' } }).expect(403)
    expect(errorCode(denied)).toBe('DISCOUNT_PERMISSION_REQUIRED')
    await post('/pos/quote', { branchId, items: [{ variantId, quantity: '1' }] }).expect(201)
  })
})
