import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumberString, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator'
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

export class SaleItemInputDto {
  @IsUUID()
  variantId!: string

  @IsNumberString()
  @IsNotEmpty()
  quantity!: string

  @IsNumberString()
  @IsOptional()
  unitPrice?: string

  @IsNumberString()
  @IsOptional()
  discountAmount?: string

  @IsUUID()
  @IsOptional()
  promotionId?: string

  @IsBoolean()
  @IsOptional()
  isPromoGift?: boolean
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

export class CreateSaleDto {
  @IsUUID()
  branchId!: string

  @IsUUID()
  @IsOptional()
  warehouseId?: string

  @IsUUID()
  @IsOptional()
  posSessionId?: string

  @IsUUID()
  @IsOptional()
  customerId?: string

  @IsUUID()
  @IsOptional()
  priceGroupId?: string

  @IsString()
  @IsOptional()
  @MaxLength(160)
  customerName?: string

  @IsNumberString()
  @IsOptional()
  discountAmount?: string

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string

  @IsUUID()
  @IsOptional()
  promotionId?: string

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemInputDto)
  items!: SaleItemInputDto[]

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
