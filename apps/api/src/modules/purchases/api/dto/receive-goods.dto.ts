import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsNotEmpty, IsNumberString, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator'

export class ReceiveGoodsItemDto {
  @IsUUID('7')
  purchaseItemId!: string

  @IsUUID('7')
  variantId!: string

  @IsNumberString()
  @IsNotEmpty()
  receivedQuantity!: string
}

export class ReceiveGoodsDto {
  @IsUUID('7')
  @IsOptional()
  warehouseId?: string

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiveGoodsItemDto)
  items!: ReceiveGoodsItemDto[]
}
