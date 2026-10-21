import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsEnum, IsISO8601, IsNotEmpty, IsNumberString, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateNested } from 'class-validator'
import { MONEY_MESSAGE, MONEY_PATTERN, PERCENT_MESSAGE, PERCENT_PATTERN, QUANTITY_MESSAGE, QUANTITY_PATTERN } from '../../../../common/validation/decimal-patterns'

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

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: '$property must be HH:MM (24-hour)' })
  @IsOptional()
  startTime?: string

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: '$property must be HH:MM (24-hour)' })
  @IsOptional()
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

  @Matches(QUANTITY_PATTERN, { message: QUANTITY_MESSAGE })
  @IsOptional()
  minQuantity?: string

  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
  @IsOptional()
  minAmount?: string

  @IsEnum(PromotionRewardType)
  @IsOptional()
  rewardType?: PromotionRewardType

  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
  @IsOptional()
  discountValue?: string

  @Matches(QUANTITY_PATTERN, { message: QUANTITY_MESSAGE })
  @IsOptional()
  rewardQuantity?: string

  @Matches(PERCENT_PATTERN, { message: PERCENT_MESSAGE })
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

  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
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

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: '$property must be HH:MM (24-hour)' })
  @IsOptional()
  startTime?: string

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: '$property must be HH:MM (24-hour)' })
  @IsOptional()
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

  @Matches(QUANTITY_PATTERN, { message: QUANTITY_MESSAGE })
  @IsOptional()
  minQuantity?: string

  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
  @IsOptional()
  minAmount?: string

  @IsEnum(PromotionRewardType)
  @IsOptional()
  rewardType?: PromotionRewardType

  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
  @IsOptional()
  discountValue?: string

  @Matches(QUANTITY_PATTERN, { message: QUANTITY_MESSAGE })
  @IsOptional()
  rewardQuantity?: string

  @Matches(PERCENT_PATTERN, { message: PERCENT_MESSAGE })
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

  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
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
