import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator'

export enum PurchasePaymentMethodInput {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  OTHER = 'OTHER',
}

export class PurchaseItemInputDto {
  @IsUUID('7')
  variantId!: string

  @IsNumberString()
  @IsNotEmpty()
  orderedQuantity!: string

  @IsNumberString()
  @IsNotEmpty()
  unitCost!: string

  @IsNumberString()
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

  @IsNumberString()
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

