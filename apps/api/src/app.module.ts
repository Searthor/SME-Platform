import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AuthModule } from './modules/auth/auth.module'
import { AccessControlModule } from './modules/access-control/access-control.module'
import { AuditModule } from './modules/audit/audit.module'
import { BranchesModule } from './modules/branches/branches.module'
import { BusinessesModule } from './modules/businesses/businesses.module'
import { HealthModule } from './modules/health/health.module'
import { MembershipsModule } from './modules/memberships/memberships.module'
import { UsersModule } from './modules/users/users.module'
import { RequestIdMiddleware } from './common/http/request-id.middleware'
import { ConfigModule } from './config/config.module'
import { DatabaseModule } from './core/database/database.module'
import { DocumentsModule } from './core/documents/documents.module'
import { IdempotencyModule } from './core/idempotency/idempotency.module'
import { IdsModule } from './core/ids/ids.module'
import { PlatformModule } from './core/platform/platform.module'
import { TenantModule } from './core/tenancy/tenant.module'
import { TenantContextMiddleware } from './core/tenancy/tenant-context.middleware'
import { CatalogModule } from './modules/catalog/catalog.module'
import { PurchasesModule } from './modules/purchases/purchases.module'
import { InventoryModule } from './modules/inventory/inventory.module'
import { SuppliersModule } from './modules/suppliers/suppliers.module'
import { CustomersModule } from './modules/customers/customers.module'
import { PosModule } from './modules/pos/pos.module'
import { PromotionsModule } from './modules/promotions/promotions.module'

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    IdsModule,
    DocumentsModule,
    IdempotencyModule,
    TenantModule,
    PlatformModule,
    AccessControlModule,
    AuditModule,
    UsersModule,
    MembershipsModule,
    AuthModule,
    BusinessesModule,
    BranchesModule,
    CatalogModule,
    SuppliersModule,
    CustomersModule,
    InventoryModule,
    PurchasesModule,
    PosModule,
    PromotionsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, TenantContextMiddleware).forRoutes('*')
  }
}
