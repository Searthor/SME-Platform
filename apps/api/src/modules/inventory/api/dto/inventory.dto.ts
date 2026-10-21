import { Transform, Type } from 'class-transformer'
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator'
import { QUANTITY_MESSAGE, QUANTITY_PATTERN } from '../../../../common/validation/decimal-patterns'

export class StockBalanceQueryDto {
  @IsUUID()
  warehouseId!: string

  @IsString()
  @IsOptional()
  @MaxLength(100)
  search?: string

  /** Only variants at or below their minimum stock. */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  lowStock?: boolean

  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number.parseInt(String(value), 10) : 50))
  limit = 50

  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number.parseInt(String(value), 10) : 0))
  offset = 0
}

export class StockMovementQueryDto {
  @IsUUID()
  @IsOptional()
  warehouseId?: string

  @IsUUID()
  @IsOptional()
  variantId?: string

  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number.parseInt(String(value), 10) : 50))
  limit = 50

  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number.parseInt(String(value), 10) : 0))
  offset = 0
}

export class StockCountLineDto {
  @IsUUID()
  variantId!: string

  /** Physically counted quantity; the ledger records the difference as an ADJUSTMENT movement. */
  @Matches(QUANTITY_PATTERN, { message: QUANTITY_MESSAGE })
  countedQuantity!: string
}

/** Opening stock and stock counts (stock.adjust). */
export class CreateStockAdjustmentDto {
  @IsUUID()
  warehouseId!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reason!: string

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => StockCountLineDto)
  lines!: StockCountLineDto[]
}
