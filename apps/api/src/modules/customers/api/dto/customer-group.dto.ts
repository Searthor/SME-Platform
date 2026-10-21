import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator'
import { MONEY_MESSAGE, MONEY_PATTERN } from '../../../../common/validation/decimal-patterns'

export class CreateCustomerGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code!: string

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  discountPercent?: number

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isDefault?: boolean
}

export class UpdateCustomerGroupDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  discountPercent?: number

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isDefault?: boolean

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  active?: boolean
}

export class CustomerGroupQueryDto {
  @IsString()
  @IsOptional()
  q?: string

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  active?: boolean
}


export class GroupProductPriceItemDto {
  @IsUUID()
  variantId!: string

  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
  price!: string
}

export class SetGroupProductPricesDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => GroupProductPriceItemDto)
  items!: GroupProductPriceItemDto[]
}
