import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator'

export enum PromotionType {
  DISCOUNT = 'DISCOUNT',
  BUY_X_GET_Y = 'BUY_X_GET_Y',
  BUNDLE_CROSS = 'BUNDLE_CROSS',
  BILL_TOTAL = 'BILL_TOTAL',
}

export enum PromotionRewardType {
  DISCOUNT_PERCENT = 'DISCOUNT_PERCENT',
  DISCOUNT_AMOUNT = 'DISCOUNT_AMOUNT',
  SPECIAL_PRICE = 'SPECIAL_PRICE',
  FREE_ITEM = 'FREE_ITEM',
}

export class PromotionItemInputDto {
  @IsUUID()
  @IsOptional()
  productId?: string

  @IsUUID()
  @IsOptional()
  variantId?: string

  @IsUUID()
  @IsOptional()
  unitId?: string

  @IsUUID()
  @IsOptional()
  categoryId?: string
}

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string

  @IsEnum(PromotionType)
  @IsNotEmpty()
  type!: PromotionType

  @IsISO8601()
  @IsNotEmpty()
  startDate!: string

  @IsISO8601()
  @IsNotEmpty()
  endDate!: string

  @IsString()
  @IsOptional()
  @MaxLength(10)
  startTime?: string

  @IsString()
  @IsOptional()
  @MaxLength(10)
  endTime?: string

  @IsOptional()
  daysOfWeek?: string | string[]

  @IsString()
  @IsOptional()
  @MaxLength(40)
  branchScope?: string

  @IsString()
  @IsOptional()
  @MaxLength(40)
  customerGroupScope?: string

  @IsString()
  @IsOptional()
  @MaxLength(40)
  customerGroupId?: string

  @IsString()
  @IsOptional()
  @MaxLength(40)
  branchId?: string

  @IsOptional()
  usageLimit?: number

  @IsNumberString()
  @IsOptional()
  minQuantity?: string

  @IsNumberString()
  @IsOptional()
  minAmount?: string

  @IsEnum(PromotionRewardType)
  @IsOptional()
  rewardType?: PromotionRewardType

  @IsNumberString()
  @IsOptional()
  discountValue?: string

  @IsNumberString()
  @IsOptional()
  rewardQuantity?: string

  @IsNumberString()
  @IsOptional()
  rewardDiscountPercent?: string

  @IsUUID()
  @IsOptional()
  rewardProductId?: string

  @IsUUID()
  @IsOptional()
  rewardVariantId?: string

  @IsUUID()
  @IsOptional()
  rewardUnitId?: string

  @IsNumberString()
  @IsOptional()
  maxDiscountCap?: string

  @IsBoolean()
  @IsOptional()
  active?: boolean

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromotionItemInputDto)
  @IsOptional()
  items?: PromotionItemInputDto[]
}

export class UpdatePromotionDto {
  @IsString()
  @IsOptional()
  @MaxLength(160)
  name?: string

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string

  @IsEnum(PromotionType)
  @IsOptional()
  type?: PromotionType

  @IsISO8601()
  @IsOptional()
  startDate?: string

  @IsISO8601()
  @IsOptional()
  endDate?: string

  @IsString()
  @IsOptional()
  @MaxLength(10)
  startTime?: string

  @IsString()
  @IsOptional()
  @MaxLength(10)
  endTime?: string

  @IsOptional()
  daysOfWeek?: string | string[]

  @IsString()
  @IsOptional()
  @MaxLength(40)
  branchScope?: string

  @IsString()
  @IsOptional()
  @MaxLength(40)
  customerGroupScope?: string

  @IsString()
  @IsOptional()
  @MaxLength(40)
  customerGroupId?: string

  @IsString()
  @IsOptional()
  @MaxLength(40)
  branchId?: string

  @IsOptional()
  usageLimit?: number

  @IsNumberString()
  @IsOptional()
  minQuantity?: string

  @IsNumberString()
  @IsOptional()
  minAmount?: string

  @IsEnum(PromotionRewardType)
  @IsOptional()
  rewardType?: PromotionRewardType

  @IsNumberString()
  @IsOptional()
  discountValue?: string

  @IsNumberString()
  @IsOptional()
  rewardQuantity?: string

  @IsNumberString()
  @IsOptional()
  rewardDiscountPercent?: string

  @IsUUID()
  @IsOptional()
  rewardProductId?: string

  @IsUUID()
  @IsOptional()
  rewardVariantId?: string

  @IsUUID()
  @IsOptional()
  rewardUnitId?: string

  @IsNumberString()
  @IsOptional()
  maxDiscountCap?: string

  @IsBoolean()
  @IsOptional()
  active?: boolean

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromotionItemInputDto)
  @IsOptional()
  items?: PromotionItemInputDto[]
}

export class PromotionQueryDto {
  @IsString()
  @IsOptional()
  q?: string

  @IsString()
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'ALL'

  @IsString()
  @IsOptional()
  type?: string

  @IsString()
  @IsOptional()
  active?: string

  @IsNumberString()
  @IsOptional()
  page?: string

  @IsNumberString()
  @IsOptional()
  limit?: string
}

export class EvaluatePromotionCartItemDto {
  @IsUUID()
  variantId!: string

  @IsUUID()
  @IsOptional()
  productId?: string

  @IsUUID()
  @IsOptional()
  unitId?: string

  @IsUUID()
  @IsOptional()
  categoryId?: string

  @IsNumberString()
  quantity!: string

  @IsNumberString()
  unitPrice!: string
}

export class EvaluatePromotionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluatePromotionCartItemDto)
  items!: EvaluatePromotionCartItemDto[]

  @IsUUID()
  @IsOptional()
  branchId?: string

  @IsUUID()
  @IsOptional()
  customerId?: string

  @IsUUID()
  @IsOptional()
  priceGroupId?: string
}
