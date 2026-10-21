import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateNested } from 'class-validator'
import { MONEY_MESSAGE, MONEY_PATTERN, QUANTITY_MESSAGE, QUANTITY_PATTERN } from '../../../../common/validation/decimal-patterns'

export enum PurchasePaymentMethodInput {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  OTHER = 'OTHER',
}

export class PurchaseItemInputDto {
  @IsUUID('7')
  variantId!: string

  @Matches(QUANTITY_PATTERN, { message: QUANTITY_MESSAGE })
  @IsNotEmpty()
  orderedQuantity!: string

  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
  @IsNotEmpty()
  unitCost!: string

  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
  @IsOptional()
  taxAmount?: string
}

export class CreatePurchaseDto {
  @IsUUID('7')
  supplierId!: string

  @IsUUID('7')
  branchId!: string

  @IsUUID('7')
  warehouseId!: string

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string

  @IsDateString()
  @IsOptional()
  expectedAt?: string

  @IsBoolean()
  @IsOptional()
  receiveImmediately?: boolean

  @IsEnum(PurchasePaymentMethodInput)
  @IsOptional()
  paymentMethod?: PurchasePaymentMethodInput

  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
  @IsOptional()
  paidAmount?: string

  @IsString()
  @IsOptional()
  @MaxLength(120)
  paymentReference?: string

  @IsString()
  @IsOptional()
  @MaxLength(500)
  paymentNotes?: string

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemInputDto)
  items!: PurchaseItemInputDto[]
}

