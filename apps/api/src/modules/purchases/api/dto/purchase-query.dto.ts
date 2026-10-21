import { Transform } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'
import { PurchaseLifecycleStatus, PurchasePaymentStatus } from '@prisma/client'

export class PurchaseListQueryDto {
  @IsString()
  @IsOptional()
  search?: string

  @IsUUID('7')
  @IsOptional()
  supplierId?: string

  @IsUUID('7')
  @IsOptional()
  branchId?: string

  @IsEnum(PurchaseLifecycleStatus)
  @IsOptional()
  lifecycleStatus?: PurchaseLifecycleStatus

  @IsEnum(PurchasePaymentStatus)
  @IsOptional()
  paymentStatus?: PurchasePaymentStatus

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
