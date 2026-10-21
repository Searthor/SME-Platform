import { Test } from '@nestjs/testing'

describe('AppModule dependency graph', () => {
  it('compiles the Phase 1 modular monolith without unresolved providers', async () => {
    process.env.DATABASE_URL = 'postgresql://sme:sme@127.0.0.1:55432/sme_test'
    process.env.ACCESS_TOKEN_SECRET = 'test-access-secret-with-at-least-32-characters'
    process.env.REFRESH_TOKEN_PEPPER = 'test-refresh-pepper-with-at-least-32-characters'
    const { AppModule } = await import('./app.module')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    expect(moduleRef).toBeDefined()
    await moduleRef.close()
  })
})
