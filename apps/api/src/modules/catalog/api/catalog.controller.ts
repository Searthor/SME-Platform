import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { CurrentActor } from '../../../common/http/current-actor.decorator'
import type { AuthenticatedActor, AuthenticatedRequest } from '../../../common/http/request-context'
import { TenantGuard } from '../../../core/tenancy/tenant.guard'
import { PermissionGuard } from '../../access-control/api/permission.guard'
import { RequirePermissions } from '../../access-control/api/require-permissions.decorator'
import { CatalogService } from '../application/catalog.service'
import { CreateCategoryDto, CreateUnitDto, UpdateCategoryDto, UpdateUnitDto } from './dto/catalog-reference.dto'
import { ArchiveProductDto, CreateProductDto, ProductListQueryDto, UpdateProductDto } from './dto/product.dto'

@Controller()
@UseGuards(TenantGuard, PermissionGuard)
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get('catalog/categories')
  @RequirePermissions('product.view')
  listCategories() { return this.catalog.listCategories() }

  @Post('catalog/categories')
  @RequirePermissions('product.create')
  createCategory(@CurrentActor() actor: AuthenticatedActor, @Body() dto: CreateCategoryDto, @Req() request: AuthenticatedRequest) {
    return this.catalog.createCategory(actor.userId, dto, request.requestId)
  }

  @Patch('catalog/categories/:categoryId')
  @RequirePermissions('product.update')
  updateCategory(@CurrentActor() actor: AuthenticatedActor, @Param('categoryId', new ParseUUIDPipe({ version: '7' })) categoryId: string, @Body() dto: UpdateCategoryDto, @Req() request: AuthenticatedRequest) {
    return this.catalog.updateCategory(actor.userId, categoryId, dto, request.requestId)
  }

  @Get('catalog/units')
  @RequirePermissions('product.view')
  listUnits() { return this.catalog.listUnits() }

  @Post('catalog/units')
  @RequirePermissions('product.create')
  createUnit(@CurrentActor() actor: AuthenticatedActor, @Body() dto: CreateUnitDto, @Req() request: AuthenticatedRequest) {
    return this.catalog.createUnit(actor.userId, dto, request.requestId)
  }

  @Patch('catalog/units/:unitId')
  @RequirePermissions('product.update')
  updateUnit(@CurrentActor() actor: AuthenticatedActor, @Param('unitId', new ParseUUIDPipe({ version: '7' })) unitId: string, @Body() dto: UpdateUnitDto, @Req() request: AuthenticatedRequest) {
    return this.catalog.updateUnit(actor.userId, unitId, dto, request.requestId)
  }

  @Get('products')
  @RequirePermissions('product.view')
  listProducts(@Query() query: ProductListQueryDto) { return this.catalog.listProducts(query) }

  @Get('products/:productId')
  @RequirePermissions('product.view')
  getProduct(@Param('productId', new ParseUUIDPipe({ version: '7' })) productId: string) {
    return this.catalog.getProduct(productId)
  }

  @Post('products')
  @RequirePermissions('product.create')
  createProduct(@CurrentActor() actor: AuthenticatedActor, @Body() dto: CreateProductDto, @Req() request: AuthenticatedRequest) {
    return this.catalog.createProduct(actor.userId, dto, request.requestId)
  }

  @Patch('products/:productId')
  @RequirePermissions('product.update')
  updateProduct(@CurrentActor() actor: AuthenticatedActor, @Param('productId', new ParseUUIDPipe({ version: '7' })) productId: string, @Body() dto: UpdateProductDto, @Req() request: AuthenticatedRequest) {
    return this.catalog.updateProduct(actor.userId, productId, dto, request.requestId)
  }

  @Post('products/:productId/archive')
  @RequirePermissions('product.delete')
  archiveProduct(@CurrentActor() actor: AuthenticatedActor, @Param('productId', new ParseUUIDPipe({ version: '7' })) productId: string, @Body() dto: ArchiveProductDto, @Req() request: AuthenticatedRequest) {
    return this.catalog.archiveProduct(actor.userId, productId, dto.version, request.requestId)
  }
}
