import { Transform } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { SupplierStatus } from '@prisma/client'

export class SupplierListQueryDto {
  @IsString()
  @IsOptional()
  search?: string

  @IsEnum(SupplierStatus)
  @IsOptional()
  status?: SupplierStatus

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number.parseInt(String(value), 10) : 50))
  limit = 50

  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number.parseInt(String(value), 10) : 0))
  offset = 0
}
