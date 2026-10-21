import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

const MONEY_PATTERN = /^\d{1,16}(?:\.\d{1,4})?$/
const QUANTITY_PATTERN = /^\d{1,14}(?:\.\d{1,6})?$/
const trimBarcodes = (value: unknown): unknown =>
  Array.isArray(value) ? value.map((item: unknown) => typeof item === 'string' ? item.trim() : item) : value

export class ProductVariantInputDto {
  @IsOptional()
  @IsUUID('7')
  id?: string

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(1, 120)
  name?: string

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(1, 60)
  size?: string

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(1, 60)
  color?: string

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsString()
  @Length(1, 80)
  sku?: string

  @IsOptional()
  @IsArray()
  @Transform(({ value }: { value: unknown }) => trimBarcodes(value))
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  barcodes: string[] = []

  @IsString()
  @Matches(MONEY_PATTERN)
  cost!: string

  @IsString()
  @Matches(MONEY_PATTERN)
  sellingPrice!: string

  @IsString()
  @Matches(QUANTITY_PATTERN)
  minStock!: string

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean

  @IsOptional()
  @IsBoolean()
  active = true

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupPriceInputDto)
  groupPrices?: GroupPriceInputDto[] = []
}

export class GroupPriceInputDto {
  @IsUUID('7')
  customerGroupId!: string

  @IsString()
  @Matches(MONEY_PATTERN)
  price!: string
}

export class ProductUnitInputDto {
  @IsUUID('7')
  unitId!: string

  @IsString()
  @Matches(QUANTITY_PATTERN)
  conversionRate!: string

  @IsOptional()
  @IsString()
  @Matches(MONEY_PATTERN)
  sellingPrice?: string

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(1, 100)
  barcode?: string
}

export class ProductWriteDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(1, 180)
  name!: string

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(0, 1000)
  description?: string

  @IsOptional()
  @IsUUID('7')
  categoryId?: string

  @IsUUID('7')
  unitId!: string

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsString()
  @Length(1, 80)
  sku?: string

  @IsOptional()
  @IsArray()
  @Transform(({ value }: { value: unknown }) => trimBarcodes(value))
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  barcodes?: string[]

  @IsOptional()
  @IsString()
  @Matches(MONEY_PATTERN)
  cost?: string

  @IsOptional()
  @IsString()
  @Matches(MONEY_PATTERN)
  sellingPrice?: string

  @IsOptional()
  @IsString()
  @Matches(QUANTITY_PATTERN)
  minStock?: string

  @IsBoolean()
  trackStock!: boolean

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsString()
  @Length(1, 40)
  taxCode?: string

  @IsBoolean()
  active!: boolean

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants?: ProductVariantInputDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductUnitInputDto)
  packagingUnits?: ProductUnitInputDto[]
}

export class CreateProductDto extends ProductWriteDto {}

export class UpdateProductDto extends ProductWriteDto {
  @IsInt()
  @Min(1)
  version!: number
}

export class ArchiveProductDto {
  @IsInt()
  @Min(1)
  version!: number
}

export class ProductListQueryDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  q?: string

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'ALL'])
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'ALL' = 'ACTIVE'

  @IsOptional()
  @IsUUID('7')
  categoryId?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25
}
