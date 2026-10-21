import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsEnum, IsInt, IsNotEmpty, IsNumberString, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator'
import { CashMovementType, PaymentMethod } from '@prisma/client'

export class OpenSessionDto {
  @IsUUID()
  branchId!: string

  @IsUUID()
  @IsOptional()
  registerId?: string

  @IsNumberString()
  @IsNotEmpty()
  openingCash!: string

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string
}

export class CloseSessionDto {
  @IsNumberString()
  @IsNotEmpty()
  closingCashCount!: string

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string
}

export class CashMovementDto {
  @IsEnum(CashMovementType)
  type!: CashMovementType

  @IsNumberString()
  @IsNotEmpty()
  amount!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string
}

/** Client intent only (MON-003): no prices, discounts or gift lines; the server resolves them. */
export class SaleItemInputDto {
  @IsUUID()
  variantId!: string

  @IsNumberString()
  @IsNotEmpty()
  quantity!: string
}

export enum ManualDiscountType {
  AMOUNT = 'AMOUNT',
  PERCENT = 'PERCENT',
}

/** Requires the sale.discount permission; applied to the bill after promotions. */
export class ManualDiscountDto {
  @IsEnum(ManualDiscountType)
  type!: ManualDiscountType

  @IsNumberString()
  @IsNotEmpty()
  value!: string
}

export class SalePaymentInputDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod

  @IsNumberString()
  @IsNotEmpty()
  amount!: string

  @IsNumberString()
  @IsOptional()
  tenderedAmount?: string

  @IsString()
  @IsOptional()
  @MaxLength(120)
  reference?: string
}

export class QuoteSaleDto {
  @IsUUID()
  branchId!: string

  @IsUUID()
  @IsOptional()
  customerId?: string

  @IsUUID()
  @IsOptional()
  priceGroupId?: string

  @ValidateNested()
  @Type(() => ManualDiscountDto)
  @IsOptional()
  manualDiscount?: ManualDiscountDto

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemInputDto)
  items!: SaleItemInputDto[]
}

export class CreateSaleDto extends QuoteSaleDto {
  @IsUUID()
  @IsOptional()
  warehouseId?: string

  @IsUUID()
  @IsOptional()
  posSessionId?: string

  @IsString()
  @IsOptional()
  @MaxLength(160)
  customerName?: string

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string

  /** The total the cashier saw; if the server total differs the sale is refused with SALE_TOTAL_CHANGED. */
  @IsNumberString()
  @IsOptional()
  expectedGrandTotal?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalePaymentInputDto)
  @IsOptional()
  payments?: SalePaymentInputDto[]
}

export class SaleListQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit: number = 30

  @IsUUID()
  @IsOptional()
  branchId?: string

  @IsUUID()
  @IsOptional()
  posSessionId?: string

  @IsString()
  @IsOptional()
  q?: string

  @IsString()
  @IsOptional()
  from?: string

  @IsString()
  @IsOptional()
  to?: string
}
