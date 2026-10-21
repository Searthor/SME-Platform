import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string

  @IsString()
  @IsOptional()
  @MaxLength(120)
  contactName?: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string

  @IsEmail()
  @IsOptional()
  email?: string

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  taxId?: string

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string
}
