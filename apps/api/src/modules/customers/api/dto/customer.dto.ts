import { Type } from 'class-transformer'
import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator'

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string

  @IsString()
  @IsOptional()
  @MaxLength(40)
  phone?: string

  @IsEmail()
  @IsOptional()
  email?: string

  @IsUUID('7')
  @IsOptional()
  groupId?: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  taxNumber?: string

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string

  @IsString()
  @IsOptional()
  creditLimit?: string

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string
}

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  @MaxLength(160)
  name?: string

  @IsString()
  @IsOptional()
  @MaxLength(40)
  phone?: string

  @IsEmail()
  @IsOptional()
  email?: string

  @IsUUID('7')
  @IsOptional()
  groupId?: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  taxNumber?: string

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string

  @IsString()
  @IsOptional()
  creditLimit?: string

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  active?: boolean
}

export class CustomerQueryDto {
  @IsString()
  @IsOptional()
  q?: string

  @IsUUID('7')
  @IsOptional()
  groupId?: string

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  active?: boolean

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50
}
