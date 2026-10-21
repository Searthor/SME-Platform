import 'reflect-metadata'
import { ValidationPipe, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getStorageToken, type ThrottlerStorageService } from '@nestjs/throttler'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { AppExceptionFilter } from '../src/common/http/app-exception.filter'
import { ResponseEnvelopeInterceptor } from '../src/common/http/response-envelope.interceptor'
import { PrismaService } from '../src/core/database/prisma.service'

const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL)
const describeWithDatabase = hasTestDatabase ? describe : describe.skip

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected object')
  return value as Record<string, unknown>
}

const readAccessToken = (body: unknown): string => {
  const data = asRecord(asRecord(body).data)
  if (typeof data.accessToken !== 'string') throw new Error('Expected access token')
  return data.accessToken
}

describeWithDatabase('Tenant isolation E2E (TEN-002, TEN-003, TEN-004)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let throttlerStorage: ThrottlerStorageService

  const cleanDatabase = async (): Promise<void> => {
    await prisma.auditLog.deleteMany()
    await prisma.productBarcode.deleteMany()
    await prisma.productVariant.deleteMany()
    await prisma.productUnit.deleteMany()
    await prisma.product.deleteMany()
    await prisma.category.deleteMany()
    await prisma.unit.deleteMany()
    await prisma.businessInvitationBranchAccess.deleteMany()
    await prisma.businessInvitationRole.deleteMany()
    await prisma.businessInvitation.deleteMany()
    await prisma.memberRole.deleteMany()
    await prisma.rolePermission.deleteMany()
    await prisma.role.deleteMany()
    await prisma.memberBranchAccess.deleteMany()
    await prisma.authSession.deleteMany()
    await prisma.businessMember.deleteMany()
    await prisma.warehouse.deleteMany()
    await prisma.branch.deleteMany()
    await prisma.business.deleteMany()
    await prisma.passwordCredential.deleteMany()
    await prisma.userIdentity.deleteMany()
    await prisma.user.deleteMany()
  }

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
    throttlerStorage = app.get<ThrottlerStorageService>(getStorageToken())
  })

  afterAll(async () => {
    if (prisma) await cleanDatabase()
    await app?.close()
  })

  beforeEach(async () => {
    for (const record of throttlerStorage.storage.values()) {
      record.totalHits.set('default', 0)
      record.isBlocked = false
      record.blockExpiresAt = 0
    }
    await cleanDatabase()
  })

  it('does not expose Business B branch to Business A', async () => {
    const register = async (suffix: string) =>
      request(app.getHttpServer() as Parameters<typeof request>[0])
        .post('/api/v1/auth/register')
        .send({
          displayName: `Owner ${suffix}`,
          identifier: `owner-${suffix}@example.com`,
          password: 'strong-password-123',
          businessName: `Business ${suffix}`,
          branchName: `Branch ${suffix}`,
          branchCode: `B-${suffix}`,
          currencyCode: 'LAK',
          timezone: 'Asia/Vientiane',
          deviceName: 'E2E',
        })
        .expect(201)

    const responseA = await register('a')
    const responseB = await register('b')
    const tokenA = readAccessToken(responseA.body as unknown)
    const tokenB = readAccessToken(responseB.body as unknown)

    const branchesB = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200)
    const branchesData = asRecord(branchesB.body as unknown).data
    if (!Array.isArray(branchesData)) throw new Error('Expected branch list')
    const branchBValue = asRecord(branchesData[0]).id
    if (typeof branchBValue !== 'string') throw new Error('Expected branch ID')

    const crossTenant = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/v1/branches/${branchBValue}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404)

    const error = asRecord(asRecord(crossTenant.body as unknown).error)
    expect(error.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('does not expose a product from Business B to Business A', async () => {
    const register = async (suffix: string) => request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/auth/register')
      .send({
        displayName: `Catalog Owner ${suffix}`, identifier: `catalog-${suffix}@example.com`, password: 'strong-password-123',
        businessName: `Catalog Business ${suffix}`, branchName: 'Main', branchCode: `CAT-${suffix}`,
        currencyCode: 'LAK', timezone: 'Asia/Vientiane', deviceName: 'E2E',
      })
      .expect(201)

    const [responseA, responseB] = await Promise.all([register('a'), register('b')])
    const tokenA = readAccessToken(responseA.body as unknown)
    const tokenB = readAccessToken(responseB.body as unknown)
    const unitResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/catalog/units').set('Authorization', `Bearer ${tokenB}`)
      .send({ code: 'EA', name: 'Each', decimalPlaces: 0 }).expect(201)
    const unitId = asRecord(asRecord(unitResponse.body as unknown).data).id
    if (typeof unitId !== 'string') throw new Error('Expected unit ID')
    const productResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/products').set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Business B product', unitId, barcodes: ['899000000001'], cost: '1000.0000', sellingPrice: '1500.0000', minStock: '0.000000', trackStock: true, active: true })
      .expect(201)
    const productId = asRecord(asRecord(productResponse.body as unknown).data).id
    if (typeof productId !== 'string') throw new Error('Expected product ID')

    const crossTenant = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/v1/products/${productId}`).set('Authorization', `Bearer ${tokenA}`).expect(404)
    expect(asRecord(asRecord(crossTenant.body as unknown).error).code).toBe('RESOURCE_NOT_FOUND')
  })

  it('rejects a foreign-tenant role and denies a staff member from member administration', async () => {
    const register = async (suffix: string) => request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/auth/register')
      .send({
        displayName: `Owner ${suffix}`,
        identifier: `owner-${suffix}@example.com`,
        password: 'strong-password-123',
        businessName: `Business ${suffix}`,
        branchName: `Branch ${suffix}`,
        branchCode: `B-${suffix}`,
        currencyCode: 'LAK',
        timezone: 'Asia/Vientiane',
        deviceName: 'E2E',
      })
      .expect(201)

    const responseA = await register('a')
    const responseB = await register('b')
    const tokenA = readAccessToken(responseA.body as unknown)
    const tokenB = readAccessToken(responseB.body as unknown)
    const dataA = asRecord(asRecord(responseA.body as unknown).data)
    const claimsA = JSON.parse(Buffer.from(tokenA.split('.')[1] ?? '', 'base64url').toString()) as Record<string, unknown>
    const claimsB = JSON.parse(Buffer.from(tokenB.split('.')[1] ?? '', 'base64url').toString()) as Record<string, unknown>
    if (typeof claimsA.businessId !== 'string' || typeof claimsB.businessId !== 'string') throw new Error('Expected business claims')

    const foreignRole = await prisma.role.findFirstOrThrow({
      where: { businessId: claimsB.businessId, code: 'STAFF' },
      select: { id: true },
    })
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/memberships')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ identifier: 'owner-b@example.com', allBranches: true, branchIds: [], roleIds: [foreignRole.id] })
      .expect(404)

    const staffRole = await prisma.role.findFirstOrThrow({
      where: { businessId: claimsA.businessId, code: 'STAFF' },
      select: { id: true },
    })
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/memberships')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ identifier: 'owner-b@example.com', allBranches: true, branchIds: [], roleIds: [staffRole.id] })
      .expect(201)

    const selected = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/auth/select-business')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ businessId: claimsA.businessId })
      .expect(201)
    const staffToken = readAccessToken(selected.body as unknown)
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/memberships')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403)

    expect(typeof dataA.accessToken).toBe('string')
  })

  it('prevents suspending the last active owner-capable member', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Only Owner',
        identifier: 'only-owner@example.com',
        password: 'strong-password-123',
        businessName: 'Only Business',
        branchName: 'Main',
        branchCode: 'MAIN',
        currencyCode: 'LAK',
        timezone: 'Asia/Vientiane',
        deviceName: 'E2E',
      })
      .expect(201)
    const token = readAccessToken(response.body as unknown)
    const membersResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/memberships')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const members = asRecord(membersResponse.body as unknown).data
    if (!Array.isArray(members) || !members[0]) throw new Error('Expected owner member')
    const owner = asRecord(members[0])
    const roles = owner.roles
    if (!Array.isArray(roles)) throw new Error('Expected owner roles')
    const roleIds = roles.map(item => asRecord(asRecord(item).role).id)

    const rejected = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch(`/api/v1/memberships/${String(owner.id)}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SUSPENDED', allBranches: true, branchIds: [], roleIds })
      .expect(409)
    expect(asRecord(asRecord(rejected.body as unknown).error).code).toBe('LAST_OWNER_REQUIRED')
  })

  it('creates a tenant-scoped invitation and activates the invited member with branch grants', async () => {
    const ownerResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Invitation Owner',
        identifier: 'invitation-owner@example.com',
        password: 'strong-password-123',
        businessName: 'Invitation Business',
        branchName: 'Main',
        branchCode: 'MAIN',
        currencyCode: 'LAK',
        timezone: 'Asia/Vientiane',
        deviceName: 'E2E',
      })
      .expect(201)
    const ownerToken = readAccessToken(ownerResponse.body as unknown)
    const claims = JSON.parse(Buffer.from(ownerToken.split('.')[1] ?? '', 'base64url').toString()) as Record<string, unknown>
    if (typeof claims.businessId !== 'string') throw new Error('Expected business claim')
    const [staffRole, branch] = await Promise.all([
      prisma.role.findFirstOrThrow({ where: { businessId: claims.businessId, code: 'STAFF' } }),
      prisma.branch.findFirstOrThrow({ where: { businessId: claims.businessId } }),
    ])

    const created = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/membership-invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        identifier: 'new-staff@example.com',
        allBranches: false,
        branchIds: [branch.id],
        roleIds: [staffRole.id],
      })
      .expect(201)
    const invitation = asRecord(asRecord(created.body as unknown).data)
    if (typeof invitation.token !== 'string') throw new Error('Expected one-time invitation token')
    const stored = await prisma.businessInvitation.findFirstOrThrow({ where: { businessId: claims.businessId } })
    expect(stored.tokenHash).not.toContain(invitation.token)

    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/auth/invitations/${invitation.token}/accept`)
      .send({ displayName: 'New Staff', password: 'new-staff-password-123' })
      .expect(201)

    const login = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/auth/login')
      .send({ identifier: 'new-staff@example.com', password: 'new-staff-password-123', deviceName: 'E2E' })
      .expect(201)
    const selected = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/auth/select-business')
      .set('Authorization', `Bearer ${readAccessToken(login.body as unknown)}`)
      .send({ businessId: claims.businessId })
      .expect(201)
    const staffToken = readAccessToken(selected.body as unknown)
    const branches = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200)
    const branchData = asRecord(branches.body as unknown).data
    expect(Array.isArray(branchData) ? branchData.map(item => asRecord(item).id) : []).toEqual([branch.id])
  })
})
