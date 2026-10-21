import { Type } from 'class-transformer'
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

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

  @IsNumber()
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

  @IsNumber()
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

const MONEY_PATTERN = /^\d{1,16}(?:\.\d{1,4})?$/

export class GroupProductPriceItemDto {
  @IsString()
  variantId!: string

  @IsString()
  price!: string
}

export class SetGroupProductPricesDto {
  items!: GroupProductPriceItemDto[]
}
