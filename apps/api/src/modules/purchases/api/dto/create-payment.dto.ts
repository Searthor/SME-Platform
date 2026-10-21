import { IsDateString, IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator'
import { PaymentMethod } from '@prisma/client'

export class CreatePurchasePaymentDto {
  @IsNumberString()
  @IsNotEmpty()
  amount!: string

  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod

  @IsDateString()
  @IsOptional()
  paidAt?: string

  @IsString()
  @IsOptional()
  @MaxLength(120)
  reference?: string

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string
}
