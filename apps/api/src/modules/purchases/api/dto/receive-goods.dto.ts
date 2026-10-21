import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateNested } from 'class-validator'
import { QUANTITY_MESSAGE, QUANTITY_PATTERN } from '../../../../common/validation/decimal-patterns'

export class ReceiveGoodsItemDto {
  @IsUUID('7')
  purchaseItemId!: string

  /** Ignored: the received variant always comes from the purchase line. Kept for older clients. */
  @IsUUID('7')
  @IsOptional()
  variantId?: string

  @Matches(QUANTITY_PATTERN, { message: QUANTITY_MESSAGE })
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
