import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator'
import { PurchaseItemInputDto } from './create-purchase.dto'

export class UpdatePurchaseDto {
  @IsUUID('7')
  @IsOptional()
  supplierId?: string

  @IsUUID('7')
  @IsOptional()
  branchId?: string

  @IsUUID('7')
  @IsOptional()
  warehouseId?: string

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string

  @IsDateString()
  @IsOptional()
  expectedAt?: string

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemInputDto)
  @IsOptional()
  items?: PurchaseItemInputDto[]
}
