import { Prisma, PrismaClient, StockMovementType } from '@prisma/client'
import { v7 as uuidv7 } from 'uuid'
import { DocumentNumberService } from '../src/core/documents/document-number.service'
import { IdService } from '../src/core/ids/id.service'
import { StockLedgerRepository } from '../src/modules/inventory/infrastructure/stock-ledger.repository'

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip

describeWithDatabase('Stock ledger and document numbers under concurrency (INV-001, Rule 8, Rule 9)', () => {
  let prisma: PrismaClient
  const ledger = new StockLedgerRepository(new IdService())
  const documentNumbers = new DocumentNumberService()

  const businessId = uuidv7()
  const branchId = uuidv7()
  const warehouseId = uuidv7()
  const unitId = uuidv7()
  const productId = uuidv7()
  const variantId = uuidv7()
  const actorUserId = uuidv7()

  const change = (quantity: string) => ({
    businessId,
    warehouseId,
    variantId,
    quantity: new Prisma.Decimal(quantity),
    type: StockMovementType.SALE,
    referenceType: 'TEST',
    referenceId: uuidv7(),
    actorUserId,
    itemLabel: 'Test item',
  })

  const balance = async () => prisma.stockBalance.findUnique({
    where: { warehouseId_variantId: { warehouseId, variantId } },
  })

  const resetStock = async (quantity?: string) => {
    await prisma.stockMovement.deleteMany({ where: { businessId } })
    await prisma.stockBalance.deleteMany({ where: { businessId } })
    if (quantity) {
      await prisma.stockBalance.create({
        data: { id: uuidv7(), businessId, warehouseId, variantId, quantity: new Prisma.Decimal(quantity) },
      })
    }
  }

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl ?? '' } } })
    await prisma.business.create({ data: { id: businessId, name: 'Concurrency Test', currencyCode: 'LAK', timezone: 'Asia/Vientiane' } })
    await prisma.branch.create({ data: { id: branchId, businessId, code: 'MAIN', name: 'Main' } })
    await prisma.warehouse.create({ data: { id: warehouseId, businessId, branchId, code: 'WH', name: 'Warehouse', isDefault: true } })
    await prisma.unit.create({ data: { id: unitId, businessId, code: 'PCS', name: 'Piece' } })
    await prisma.product.create({ data: { id: productId, businessId, unitId, name: 'Test product' } })
    await prisma.productVariant.create({
      data: { id: variantId, businessId, productId, sellingPrice: new Prisma.Decimal('1000'), isDefault: true },
    })
  })

  afterAll(async () => {
    if (!prisma) return
    await resetStock()
    await prisma.documentSequence.deleteMany({ where: { businessId } })
    await prisma.productVariant.deleteMany({ where: { businessId } })
    await prisma.product.deleteMany({ where: { businessId } })
    await prisma.unit.deleteMany({ where: { businessId } })
    await prisma.warehouse.deleteMany({ where: { businessId } })
    await prisma.branch.deleteMany({ where: { businessId } })
    await prisma.business.deleteMany({ where: { id: businessId } })
    await prisma.$disconnect()
  })

  it('never sells more than the available quantity when sales race for the last units', async () => {
    await resetStock('3')

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => prisma.$transaction(tx => ledger.decrease(tx, change('1')))),
    )

    const succeeded = results.filter(result => result.status === 'fulfilled')
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    expect(succeeded).toHaveLength(3)
    expect(rejected.every(result => (result.reason as { code?: string }).code === 'INSUFFICIENT_STOCK')).toBe(true)
    expect((await balance())?.quantity.toString()).toBe('0')
    expect(await prisma.stockMovement.count({ where: { businessId } })).toBe(3)
  })

  it('does not lose concurrent increases, including the first one that creates the balance row', async () => {
    await resetStock()

    await Promise.all(
      Array.from({ length: 5 }, () => prisma.$transaction(tx => ledger.increase(tx, change('2')))),
    )

    const current = await balance()
    expect(current?.quantity.toString()).toBe('10')
    expect(current?.version).toBe(5)
    expect(await prisma.stockMovement.count({ where: { businessId } })).toBe(5)
  })

  it('rolls back the balance and the movement together when the transaction fails', async () => {
    await resetStock('5')

    await expect(prisma.$transaction(async tx => {
      await ledger.decrease(tx, change('2'))
      throw new Error('injected failure after stock deduction')
    })).rejects.toThrow('injected failure')

    expect((await balance())?.quantity.toString()).toBe('5')
    expect(await prisma.stockMovement.count({ where: { businessId } })).toBe(0)
  })

  it('issues unique, gap-free document numbers to concurrent transactions', async () => {
    const at = new Date('2026-10-15T05:00:00Z')

    const numbers = await Promise.all(
      Array.from({ length: 20 }, () => prisma.$transaction(tx => documentNumbers.next(tx, businessId, 'INV', at))),
    )

    expect(new Set(numbers).size).toBe(20)
    expect([...numbers].sort()).toEqual(
      Array.from({ length: 20 }, (_, index) => `INV-202610-${String(index + 1).padStart(4, '0')}`),
    )
  })

  it('uses the business timezone for the month boundary', async () => {
    // 2026-10-31T18:30Z is already 1 November in Asia/Vientiane (UTC+7)
    const number = await prisma.$transaction(tx => documentNumbers.next(tx, businessId, 'PO', new Date('2026-10-31T18:30:00Z')))
    expect(number).toBe('PO-202611-0001')
  })
})
