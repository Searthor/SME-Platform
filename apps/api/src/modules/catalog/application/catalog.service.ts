import { Inject, Injectable } from '@nestjs/common'
import { errors } from '../../../common/errors/app.error'
import { IdService } from '../../../core/ids/id.service'
import type { CreateCategoryDto, CreateUnitDto, UpdateCategoryDto, UpdateUnitDto } from '../api/dto/catalog-reference.dto'
import type { CreateProductDto, ProductListQueryDto, UpdateProductDto } from '../api/dto/product.dto'
import { CatalogRepository, type PackagingUnitItemInput, type VariantItemInput } from '../infrastructure/catalog.repository'

@Injectable()
export class CatalogService {
  constructor(
    @Inject(CatalogRepository) private readonly catalog: CatalogRepository,
    @Inject(IdService) private readonly ids: IdService,
  ) {}

  listCategories() { return this.catalog.listCategories() }
  listUnits() { return this.catalog.listUnits() }
  listProducts(query: ProductListQueryDto) { return this.catalog.listProducts(query) }

  async getProduct(productId: string) {
    const product = await this.catalog.findProductById(productId)
    if (!product) throw errors.resourceNotFound('Product')
    return product
  }

  createCategory(actorUserId: string, dto: CreateCategoryDto, requestId?: string) {
    return this.catalog.createCategory({
      id: this.ids.generate(), auditId: this.ids.generate(), actorUserId,
      name: dto.name.trim(),
      ...(dto.parentId ? { parentId: dto.parentId } : {}),
      ...(requestId ? { requestId } : {}),
    })
  }

  updateCategory(actorUserId: string, categoryId: string, dto: UpdateCategoryDto, requestId?: string) {
    return this.catalog.updateCategory({ categoryId, auditId: this.ids.generate(), actorUserId, name: dto.name.trim(), ...(requestId ? { requestId } : {}) })
  }

  createUnit(actorUserId: string, dto: CreateUnitDto, requestId?: string) {
    return this.catalog.createUnit({
      id: this.ids.generate(), auditId: this.ids.generate(), actorUserId,
      code: dto.code.trim().toUpperCase(), name: dto.name.trim(), decimalPlaces: dto.decimalPlaces, ...(requestId ? { requestId } : {}),
    })
  }

  updateUnit(actorUserId: string, unitId: string, dto: UpdateUnitDto, requestId?: string) {
    return this.catalog.updateUnit({
      unitId, auditId: this.ids.generate(), actorUserId,
      code: dto.code.trim().toUpperCase(), name: dto.name.trim(), decimalPlaces: dto.decimalPlaces,
      active: dto.active, ...(requestId ? { requestId } : {}),
    })
  }

  createProduct(actorUserId: string, dto: CreateProductDto, requestId?: string) {
    const { variants, packagingUnits, ...productData } = this.normalizeProductData(dto)
    return this.catalog.createProduct({
      productId: this.ids.generate(),
      auditId: this.ids.generate(),
      actorUserId,
      ...productData,
      variants,
      packagingUnits,
      ...(requestId ? { requestId } : {}),
    })
  }

  updateProduct(actorUserId: string, productId: string, dto: UpdateProductDto, requestId?: string) {
    const { variants, packagingUnits, ...productData } = this.normalizeProductData(dto)
    return this.catalog.updateProduct({
      productId,
      version: dto.version,
      auditId: this.ids.generate(),
      actorUserId,
      ...productData,
      variants,
      packagingUnits,
      ...(requestId ? { requestId } : {}),
    })
  }

  archiveProduct(actorUserId: string, productId: string, version: number, requestId?: string) {
    return this.catalog.archiveProduct({ productId, version, auditId: this.ids.generate(), actorUserId, ...(requestId ? { requestId } : {}) })
  }

  private normalizeProductData(dto: CreateProductDto | UpdateProductDto) {
    const variants: VariantItemInput[] = []

    if (dto.variants && dto.variants.length > 0) {
      let hasDefault = false
      for (let i = 0; i < dto.variants.length; i++) {
        const v = dto.variants[i]!
        const isDefault = v.isDefault ?? (i === 0 && !hasDefault)
        if (isDefault) hasDefault = true
        variants.push({
          id: v.id || this.ids.generate(),
          name: v.name?.trim() || null,
          size: v.size?.trim() || null,
          color: v.color?.trim() || null,
          sku: v.sku?.trim().toUpperCase() || null,
          cost: v.cost,
          sellingPrice: v.sellingPrice,
          minStock: v.minStock,
          isDefault,
          active: v.active ?? true,
          barcodes: (v.barcodes || []).map(b => ({ id: this.ids.generate(), barcode: b.trim() })).filter(b => b.barcode.length > 0),
          groupPrices: (v.groupPrices || []).map(gp => ({
            customerGroupId: gp.customerGroupId,
            price: gp.price,
          })),
        })
      }
      if (!hasDefault && variants.length > 0) {
        variants[0]!.isDefault = true
      }
    } else {
      const barcodes = (dto.barcodes || []).map(b => ({ id: this.ids.generate(), barcode: b.trim() })).filter(b => b.barcode.length > 0)
      variants.push({
        id: this.ids.generate(),
        name: null,
        size: null,
        color: null,
        sku: dto.sku?.trim().toUpperCase() || null,
        cost: dto.cost ?? '0.0000',
        sellingPrice: dto.sellingPrice ?? '0.0000',
        minStock: dto.minStock ?? '0.000000',
        isDefault: true,
        active: dto.active,
        barcodes,
      })
    }

    const packagingUnits: PackagingUnitItemInput[] = (dto.packagingUnits || []).map(pu => ({
      id: this.ids.generate(),
      unitId: pu.unitId,
      conversionRate: pu.conversionRate,
      sellingPrice: pu.sellingPrice ?? null,
      barcode: pu.barcode?.trim() || null,
    }))

    return {
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      categoryId: dto.categoryId ?? null,
      unitId: dto.unitId,
      trackStock: dto.trackStock,
      taxCode: dto.taxCode?.trim().toUpperCase() || null,
      active: dto.active,
      variants,
      packagingUnits,
    }
  }
}
